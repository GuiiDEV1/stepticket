const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Exibe a latência de resposta do bot e da conexão WebSocket'),

  async execute(interaction, client) {
    const sent = await interaction.reply({ content: 'Calculando ping...', fetchReply: true });
    const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = client.ws.ping;

    const pingEmbed = createEmbed({
      title: '🏓 Pong!',
      color: COLORS.SUCCESS,
      fields: [
        { name: '⚡ Latência de Resposta', value: `\`${roundtripLatency}ms\``, inline: true },
        { name: '🌐 Latência da API (WebSocket)', value: `\`${wsPing}ms\``, inline: true }
      ]
    });

    return interaction.editReply({ content: null, embeds: [pingEmbed] });
  }
};
