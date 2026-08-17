const { SlashCommandBuilder } = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { createEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Exibe os 10 membros com maior nível e atividade no servidor'),

  async execute(interaction, client) {
    const list = DatabaseManager.getLeaderboard(interaction.guild.id, 10);

    if (list.length === 0) {
      return interaction.reply({
        content: 'Nenhum membro acumulou XP ainda neste servidor.',
        ephemeral: true
      });
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    let description = '';

    list.forEach((item, index) => {
      const medal = medals[index] || `#${index + 1}`;
      description += `${medal} <@${item.user_id}> • **Nível ${item.level}** (${item.xp} XP)\n`;
    });

    const lbEmbed = createEmbed({
      title: `🏆 Ranking de Atividade - ${interaction.guild.name}`,
      description,
      color: COLORS.WARNING,
      thumbnail: interaction.guild.iconURL({ dynamic: true }),
      footerText: 'Envie mensagens no chat para subir de nível!'
    });

    return interaction.reply({ embeds: [lbEmbed] });
  }
};
