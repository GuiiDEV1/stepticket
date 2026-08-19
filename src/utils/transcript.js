const { AttachmentBuilder } = require('discord.js');

/**
 * Gera um arquivo HTML com o histórico completo do canal do ticket (Lazy-load para economizar RAM)
 * @param {import('discord.js').TextChannel} channel 
 * @param {string} fileName 
 */
async function generateTranscript(channel, fileName = `transcript-${channel.name}.html`) {
  try {
    const discordTranscripts = require('discord-html-transcripts');
    const attachment = await discordTranscripts.createTranscript(channel, {
      limit: -1,
      returnType: 'attachment',
      filename: fileName,
      saveImages: false, // Economiza muita RAM em hosts de 100MB
      footerText: 'Exportado via rikeozinho',
      poweredBy: false
    });

    return attachment;
  } catch (error) {
    console.error('Erro ao gerar transcrição em HTML:', error);
    // Fallback simples e ultra leve em texto
    const messages = await channel.messages.fetch({ limit: 50 }).catch(() => []);
    let txt = `HISTÓRICO DO TICKET: #${channel.name}\nData: ${new Date().toLocaleString('pt-BR')}\n===============================\n\n`;
    messages.reverse().forEach(m => {
      txt += `[${m.createdAt.toLocaleString('pt-BR')}] ${m.author.tag}: ${m.cleanContent}\n`;
    });

    const buffer = Buffer.from(txt, 'utf-8');
    return new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });
  }
}

module.exports = {
  generateTranscript
};
