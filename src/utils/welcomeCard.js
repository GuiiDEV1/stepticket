const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

// Semáforo para limitar a concorrência de renderização a no máximo 3 processos simultâneos
let activeRenders = 0;
const MAX_CONCURRENT_RENDERS = 3;
const renderQueue = [];

function acquireSlot() {
  if (activeRenders < MAX_CONCURRENT_RENDERS) {
    activeRenders++;
    return Promise.resolve();
  }
  return new Promise(resolve => renderQueue.push(resolve));
}

function releaseSlot() {
  activeRenders--;
  if (renderQueue.length > 0) {
    activeRenders++;
    const next = renderQueue.shift();
    next();
  }
}

/**
 * Desenha um retângulo com cantos arredondados
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Renderiza internamente o cartão de boas-vindas
 */
async function renderCard({
  username,
  avatarURL,
  memberCount,
  guildName,
  title = 'BEM-VINDO(A)!',
  color1 = '#5865F2',
  color2 = '#23A55A',
  backgroundImageUrl = null
}) {
  const width = 900;
  const height = 360;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. FUNDO BASE
  ctx.save();
  roundRect(ctx, 0, 0, width, height, 20);
  ctx.clip();

  const { isSafePublicUrl } = require('./security.js');

  let hasCustomBg = false;
  if (backgroundImageUrl && isSafePublicUrl(backgroundImageUrl)) {
    try {
      const bgImg = await loadImage(backgroundImageUrl);
      ctx.drawImage(bgImg, 0, 0, width, height);
      ctx.fillStyle = 'rgba(9, 10, 15, 0.78)';
      ctx.fillRect(0, 0, width, height);
      hasCustomBg = true;
    } catch (e) {
      hasCustomBg = false;
    }
  }

  if (!hasCustomBg) {
    // Fundo padrão gradiente moderno
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#090A10');
    grad.addColorStop(0.5, '#121522');
    grad.addColorStop(1, '#0B0D14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Efeitos de luz neon ambiente
    const rad1 = ctx.createRadialGradient(150, 180, 10, 150, 180, 260);
    rad1.addColorStop(0, `${color1}33`);
    rad1.addColorStop(1, 'transparent');
    ctx.fillStyle = rad1;
    ctx.fillRect(0, 0, width, height);

    const rad2 = ctx.createRadialGradient(750, 180, 10, 750, 180, 260);
    rad2.addColorStop(0, `${color2}22`);
    rad2.addColorStop(1, 'transparent');
    ctx.fillStyle = rad2;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. BORDA BRILHANTE EXTERNA
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Borda interna de destaque neon
  const borderGrad = ctx.createLinearGradient(0, 0, width, height);
  borderGrad.addColorStop(0, color1);
  borderGrad.addColorStop(1, color2);
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 3. AVATAR CIRCULAR
  const avatarX = 140;
  const avatarY = 180;
  const avatarRadius = 75;

  // Anel de brilho do avatar
  ctx.save();
  ctx.shadowColor = color1;
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 5, 0, Math.PI * 2);
  ctx.strokeStyle = color1;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Imagem do Avatar
  try {
    const avatar = await loadImage(avatarURL);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    ctx.restore();
  } catch (err) {
    // Fallback caso o avatar falhe
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.fillStyle = color1;
    ctx.fill();
    ctx.restore();
  }

  // 4. TIPOGRAFIA & TEXTOS
  const textStartX = 260;

  // Título Superior (BEM-VINDO / CUSTOM)
  ctx.save();
  ctx.fillStyle = color1;
  ctx.font = 'bold 26px sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText(title.toUpperCase(), textStartX, 135);
  ctx.restore();

  // Nome do Membro (com limitação de tamanho para não vazar)
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 42px sans-serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 10;
  
  let displayNick = username;
  if (displayNick.length > 18) {
    displayNick = displayNick.substring(0, 16) + '...';
  }
  ctx.fillText(displayNick, textStartX, 195);
  ctx.restore();

  // Subtítulo / Contador de Membros
  ctx.save();
  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 20px sans-serif';
  const cleanGuildName = guildName.length > 24 ? guildName.substring(0, 22) + '...' : guildName;
  ctx.fillText(`Você é o membro #${memberCount} no ${cleanGuildName}`, textStartX, 245);

  // Badge decorativo de entrada
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  roundRect(ctx, textStartX, 265, 170, 32, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = color2;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`🎉 NOVO MEMBRO`, textStartX + 20, 286);
  ctx.restore();

  const buffer = await canvas.encode('png');
  return new AttachmentBuilder(buffer, { name: 'welcome-card.png' });
}

/**
 * Gera um cartão de boas-vindas em alta definição respeitando o limite de concorrência
 */
async function generateWelcomeCard(options) {
  await acquireSlot();
  try {
    return await renderCard(options);
  } finally {
    releaseSlot();
  }
}

module.exports = {
  generateWelcomeCard
};
