const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, COLORS, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Tranca o canal para que membros normais não enviem mensagens')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo do trancamento').setRequired(false)),

  async execute(interaction, client) {
    if (!checkPermissions({
      interaction,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      botPermissions: [PermissionFlagsBits.ManageChannels]
    })) return;

    const reason = interaction.options.getString('motivo') || 'Canal bloqueado pela moderação.';

    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false
      });

      const lockEmbed = createEmbed({
        title: '🔒 Canal Trancado',
        description: `Este canal foi bloqueado temporariamente por ${interaction.user}.\n**Motivo:** ${reason}`,
        color: COLORS.ERROR
      });

      return interaction.reply({ embeds: [lockEmbed] });
    } catch (err) {
      console.error('Erro no lock:', err);
      return interaction.reply({
        embeds: [errorEmbed('Erro', 'Não foi possível alterar as permissões deste canal.')],
        ephemeral: true
      });
    }
  }
};
