const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delwarn')
    .setDescription('Remove uma advertência específica pelo ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addIntegerOption(opt => opt.setName('id').setDescription('ID da advertência a ser removida').setRequired(true)),

  async execute(interaction, client) {
    if (!checkPermissions({
      interaction,
      userPermissions: [PermissionFlagsBits.ModerateMembers]
    })) return;

    const warnId = interaction.options.getInteger('id');
    const result = DatabaseManager.deleteWarn(warnId, interaction.guild.id);

    if (result.changes === 0) {
      return interaction.reply({
        embeds: [errorEmbed('Não Encontrado', `Nenhuma advertência com ID **#${warnId}** foi encontrada neste servidor.`)],
        ephemeral: true
      });
    }

    return interaction.reply({
      embeds: [successEmbed('Advertência Removida', `A advertência de ID **#${warnId}** foi removida com sucesso!`)]
    });
  }
};
