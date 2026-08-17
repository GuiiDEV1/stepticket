const DatabaseManager = require('../../database/manager');
const { createEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return; // Mudança apenas de embed/link preview

    const config = DatabaseManager.getConfig(newMessage.guild.id);
    if (!config.logs_channel_id) return;

    const logsChannel = newMessage.guild.channels.cache.get(config.logs_channel_id);
    if (!logsChannel) return;

    const embed = createEmbed({
      title: '✏️ Mensagem Editada',
      color: COLORS.WARNING,
      fields: [
        { name: '👤 Autor', value: `${newMessage.author} (\`${newMessage.author.id}\`)`, inline: true },
        { name: '📍 Canal', value: `${newMessage.channel} (\`#${newMessage.channel.name}\`)`, inline: true },
        { name: '🔗 Link', value: `[Ir para Mensagem](${newMessage.url})`, inline: true },
        { name: '⬅️ Antes', value: oldMessage.content ? oldMessage.content.slice(0, 1024) : '*Indisponível*', inline: false },
        { name: '➡️ Depois', value: newMessage.content ? newMessage.content.slice(0, 1024) : '*Indisponível*', inline: false }
      ]
    });

    logsChannel.send({ embeds: [embed] }).catch(() => {});
  }
};
