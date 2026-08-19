const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { AttachmentBuilder } = require('discord.js');

// Garante que a pasta persistente de transcrições exista
const transcriptsDir = path.join(process.cwd(), 'data', 'transcripts');
try {
  if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
  }
} catch (err) {
  console.warn('[TRANSCRIPTS] Aviso ao criar pasta data/transcripts:', err.message);
}

/**
 * Gera um arquivo HTML com o histórico do ticket, salva no disco com ID de alta entropia para a Web e retorna o anexo
 * @param {import('discord.js').TextChannel} channel 
 * @param {string} fileName 
 */
async function generateTranscript(channel, fileName = `transcript-${channel.name}.html`) {
  // Gera token de alta entropia (128 bits / 32 hex chars) para evitar enumeração de tickets confidenciais
  const secureToken = crypto.randomBytes(16).toString('hex');
  const safeId = `tr_${secureToken}_${channel.id}`;
  const filePath = path.join(transcriptsDir, `${safeId}.html`);

  try {
    const discordTranscripts = require('discord-html-transcripts');
    const buffer = await discordTranscripts.createTranscript(channel, {
      limit: -1,
      returnType: 'buffer',
      filename: fileName,
      saveImages: false, // Economiza RAM
      footerText: 'Exportado via rikeozinho',
      poweredBy: false
    });

    // Salva no disco persistente para visualização web
    try {
      fs.writeFileSync(filePath, buffer);
    } catch (e) {
      console.warn('[TRANSCRIPTS] Erro ao salvar arquivo local:', e.message);
    }

    const attachment = new AttachmentBuilder(buffer, { name: fileName });
    attachment.transcriptId = safeId;
    attachment.webPath = `/transcript/${safeId}`;
    return attachment;
  } catch (error) {
    console.error('Erro ao gerar transcrição em HTML:', error);
    
    // Fallback em texto puro formatado
    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => []);
    let txt = `HISTÓRICO DO TICKET: #${channel.name}\nData: ${new Date().toLocaleString('pt-BR')}\n===============================\n\n`;
    messages.reverse().forEach(m => {
      txt += `[${m.createdAt.toLocaleString('pt-BR')}] ${m.author.tag}: ${m.cleanContent}\n`;
    });

    const buffer = Buffer.from(txt, 'utf-8');
    try {
      fs.writeFileSync(path.join(transcriptsDir, `${safeId}.txt`), buffer);
    } catch (e) {}

    const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });
    attachment.transcriptId = safeId;
    attachment.webPath = `/transcript/${safeId}`;
    return attachment;
  }
}

/**
 * Retorna o caminho do arquivo de transcrição salvo
 */
function getTranscriptFilePath(id) {
  if (!id || typeof id !== 'string') return null;
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeId) return null;

  const htmlPath = path.join(transcriptsDir, `${safeId}.html`);
  if (fs.existsSync(htmlPath)) return { path: htmlPath, type: 'html' };

  const txtPath = path.join(transcriptsDir, `${safeId}.txt`);
  if (fs.existsSync(txtPath)) return { path: txtPath, type: 'text' };

  return null;
}

module.exports = {
  generateTranscript,
  getTranscriptFilePath
};
