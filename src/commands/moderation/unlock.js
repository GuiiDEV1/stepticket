const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, COLORS, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Destranca o canal permitindo que os membros voltem a enviar mensagens')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, client) {
    if (!checkPermissions({
      interaction,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      botPermissions: [PermissionFlagsBits.ManageChannels]
    })) return;

    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null // Restaura o padrão da categoria ou libera
      });

      const unlockEmbed = createEmbed({
        title: '🔓 Canal Destrancado',
        description: `O canal foi desbloqueado por ${interaction.user}. O chat está liberado novamente!`,
        color: COLORS.SUCCESS
      });

      return interaction.reply({ embeds: [unlockEmbed] });
    } catch (err) {
      console.error('Erro no unlock:', err);
      return interaction.reply({
        embeds: [errorEmbed('Erro', 'Não foi possível alterar as permissões deste canal.')],
        ephemeral: true
      });
    }
  }
};
