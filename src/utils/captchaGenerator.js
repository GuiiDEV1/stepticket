const { AttachmentBuilder } = require('discord.js');

/**
 * Gera um Captcha visual com Canvas (Lazy-loaded para baixo consumo de RAM)
 */
async function generateCaptcha() {
  const { createCanvas } = require('@napi-rs/canvas');

  // Caracteres legíveis (sem 0/O ou 1/I/l para não gerar confusão)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const width = 300;
  const height = 100;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Fundo Dark Moderno
  ctx.fillStyle = '#18191c';
  ctx.fillRect(0, 0, width, height);

  // 2. Linhas de ruído sutis (Anti-OCR simples)
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `rgba(88, 101, 242, ${0.2 + Math.random() * 0.3})`;
    ctx.lineWidth = 1.5 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, Math.random() * height);
    ctx.bezierCurveTo(
      Math.random() * width, Math.random() * height,
      Math.random() * width, Math.random() * height,
      Math.random() * width, Math.random() * height
    );
    ctx.stroke();
  }

  // 3. Pontos de ruído
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Desenho de cada letra individual com rotação e cores
  const colors = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#FFFFFF'];
  const startX = 35;
  const spacing = 40;

  for (let i = 0; i < code.length; i++) {
    ctx.save();
    const char = code[i];
    const x = startX + i * spacing;
    const y = 60 + (Math.random() * 10 - 5);
    const angle = (Math.random() * 24 - 12) * (Math.PI / 180);

    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = colors[i % colors.length];
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(char, 0, 0);
    ctx.restore();
  }

  const buffer = canvas.toBuffer('image/png');
  const attachment = new AttachmentBuilder(buffer, { name: 'captcha.png' });

  return {
    code,
    attachment
  };
}

module.exports = {
  generateCaptcha
};
