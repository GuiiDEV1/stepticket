const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { createEmbed, COLORS, infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Consulta o histórico de advertências de um membro')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Membro a ser consultado').setRequired(true)),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('usuario');
    const warns = DatabaseManager.getWarns(interaction.guild.id, targetUser.id);

    if (warns.length === 0) {
      return interaction.reply({
        embeds: [infoEmbed('Histórico Limpo', `O membro ${targetUser} não possui nenhuma advertência registrada neste servidor.`)],
        ephemeral: true
      });
    }

    let description = `Histórico de **${warns.length}** advertência(s) de ${targetUser}:\n\n`;

    warns.forEach((w, idx) => {
      const dateStr = `<t:${Math.floor(w.timestamp / 1000)}:d>`;
      description += `**#${w.id}** • ${dateStr}\n**Moderador:** <@${w.moderator_id}>\n**Motivo:** ${w.reason}\n\n`;
    });

    const warnsEmbed = createEmbed({
      title: `📋 Advertências - ${targetUser.tag}`,
      description: description.slice(0, 4000),
      thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
      color: COLORS.WARNING,
      footerText: `Total: ${warns.length} advertências`
    });

    return interaction.reply({ embeds: [warnsEmbed] });
  }
};
