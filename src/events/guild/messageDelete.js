const DatabaseManager = require('../../database/manager');
const { createEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;

    const config = DatabaseManager.getConfig(message.guild.id);
    if (!config.logs_channel_id) return;

    const logsChannel = message.guild.channels.cache.get(config.logs_channel_id);
    if (!logsChannel) return;

    const embed = createEmbed({
      title: '🗑️ Mensagem Apagada',
      color: COLORS.ERROR,
      fields: [
        { name: '👤 Autor', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
        { name: '📍 Canal', value: `${message.channel} (\`#${message.channel.name}\`)`, inline: true },
        { name: '💬 Conteúdo', value: message.content ? message.content.slice(0, 1024) : '*Nenhum conteúdo de texto (provável anexo/embed)*', inline: false }
      ]
    });

    if (message.attachments.size > 0) {
      embed.addFields({
        name: '📎 Anexos',
        value: message.attachments.map(a => a.url).join('\n').slice(0, 1024)
      });
    }

    logsChannel.send({ embeds: [embed] }).catch(() => {});
  }
};
