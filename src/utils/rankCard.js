const { AttachmentBuilder } = require('discord.js');

/**
 * Gera um Rank Card limpo, moderno e sem bordas externas (Lazy-load de canvas para economizar RAM)
 */
async function generateRankCard({ username, avatarURL, level, currentXP, neededXP, rank }) {
  // Lazy-load da biblioteca apenas quando o comando for chamado
  const { createCanvas, loadImage } = require('@napi-rs/canvas');

  const width = 850;
  const height = 230;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Fundo do Card - Dark Limpo estilo Discord
  drawRoundedRect(ctx, 0, 0, width, height, 22);
  ctx.fillStyle = '#1e1f24';
  ctx.fill();

  // 2. Avatar do Usuário (Circular)
  const avatarSize = 135;
  const avatarX = 40;
  const avatarY = (height - avatarSize) / 2;

  try {
    const avatarImg = await loadImage(avatarURL);

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Borda sutil no avatar combinando com o tema dark
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#2b2d31';
    ctx.stroke();
    ctx.restore();
  } catch (err) {
    console.error('Erro ao desenhar avatar no canvas:', err);
  }

  // 3. Textos e Estatísticas
  const textStartX = 210;

  // Nome do Usuário
  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  const displayName = username.length > 15 ? username.slice(0, 15) + '...' : username;
  ctx.fillText(displayName, textStartX, 75);

  // RANK # e NÍVEL
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#949ba4';
  ctx.textAlign = 'right';
  ctx.fillText('RANK', width - 105, 68);

  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`#${rank}`, width - 45, 68);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#949ba4';
  ctx.fillText('NÍVEL', width - 105, 108);

  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = '#5865F2';
  ctx.fillText(`${level}`, width - 45, 108);
  ctx.textAlign = 'left';

  // 4. Barra de Progresso
  const barX = textStartX;
  const barY = 145;
  const barWidth = width - textStartX - 45;
  const barHeight = 28;
  const barRadius = 14;

  // Fundo da barra
  drawRoundedRect(ctx, barX, barY, barWidth, barHeight, barRadius);
  ctx.fillStyle = '#2b2d31';
  ctx.fill();

  // Cálculo da porcentagem
  const currentBase = level * 150;
  const currentLevelProgress = Math.max(0, currentXP - currentBase);
  const neededLevelProgress = 150;
  const percent = Math.min(1, Math.max(0, currentLevelProgress / neededLevelProgress));

  // Preenchimento da barra de progresso
  if (percent > 0) {
    const fillWidth = Math.max(barRadius * 2, barWidth * percent);
    ctx.save();
    drawRoundedRect(ctx, barX, barY, fillWidth, barHeight, barRadius);
    ctx.fillStyle = '#5865F2';
    ctx.fill();
    ctx.restore();
  }

  // Texto de XP (Ex: 21 / 150 XP (14%))
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#949ba4';
  ctx.textAlign = 'right';
  ctx.fillText(`${currentXP} / ${neededXP} XP (${Math.round(percent * 100)}%)`, barX + barWidth, barY - 10);
  ctx.textAlign = 'left';

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: `rank-${username.toLowerCase()}.png` });
}

/**
 * Utilitário para desenhar retângulos com cantos arredondados
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
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

module.exports = {
  generateRankCard
};
