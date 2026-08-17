const { SlashCommandBuilder, version: djsVersion } = require('discord.js');
const { createEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Exibe estatísticas de desempenho, memória e tempo de atividade do bot'),

  async execute(interaction, client) {
    const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const totalMemory = (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2);

    const uptimeSeconds = Math.floor(process.uptime());
    const days = Math.floor(uptimeSeconds / (3600 * 24));
    const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    const embed = createEmbed({
      title: `🤖 Informações do ${client.user.username}`,
      thumbnail: client.user.displayAvatarURL({ dynamic: true }),
      color: COLORS.PRIMARY,
      fields: [
        { name: '⚡ Latência / Ping', value: `WebSocket: **${client.ws.ping}ms**`, inline: true },
        { name: '⏱️ Tempo Online (Uptime)', value: `\`${uptimeStr}\``, inline: true },
        { name: '💾 Uso de Memória RAM', value: `\`${memoryUsage} MB / ${totalMemory} MB\``, inline: true },
        { name: '🌐 Servidores Conectados', value: `\`${client.guilds.cache.size}\``, inline: true },
        { name: '👥 Usuários Totais', value: `\`${client.users.cache.size}\``, inline: true },
        { name: '🛠️ Versão do Node / Discord.js', value: `Node: \`${process.version}\`\nDiscord.js: \`v${djsVersion}\``, inline: true },
        { name: '🚀 Plataforma / Arquitetura', value: `\`${process.platform} (${process.arch})\``, inline: true },
        { name: '💾 Banco de Dados', value: '`SQLite (better-sqlite3)`', inline: true }
      ]
    });

    return interaction.reply({ embeds: [embed] });
  }
};
