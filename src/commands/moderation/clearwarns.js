const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('Limpa todas as advertências de um membro')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => opt.setName('usuario').setDescription('Membro a ter os warns zerados').setRequired(true)),

  async execute(interaction, client) {
    if (!checkPermissions({
      interaction,
      userPermissions: [PermissionFlagsBits.Administrator]
    })) return;

    const targetUser = interaction.options.getUser('usuario');
    const result = DatabaseManager.clearWarns(interaction.guild.id, targetUser.id);

    if (result.changes === 0) {
      return interaction.reply({
        embeds: [errorEmbed('Nenhuma Advertência', `O membro ${targetUser} não possui nenhuma advertência para ser limpa.`)],
        ephemeral: true
      });
    }

    return interaction.reply({
      embeds: [successEmbed('Advertências Limpas', `Todas as **${result.changes}** advertência(s) de ${targetUser} foram removidas com sucesso por ${interaction.user}!`)]
    });
  }
};
