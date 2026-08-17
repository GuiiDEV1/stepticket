const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, COLORS, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Define o tempo de espera entre mensagens no canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(opt =>
      opt.setName('segundos').setDescription('Tempo em segundos (0 para desligar, máx 21600 = 6h)').setMinValue(0).setMaxValue(21600).setRequired(true)
    ),

  async execute(interaction, client) {
    if (!checkPermissions({
      interaction,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      botPermissions: [PermissionFlagsBits.ManageChannels]
    })) return;

    const seconds = interaction.options.getInteger('segundos');

    try {
      await interaction.channel.setRateLimitPerUser(seconds);

      const slowEmbed = createEmbed({
        title: '⏳ Modo Lento Atualizado',
        description: seconds === 0 
          ? `O modo lento foi **desativado** por ${interaction.user}.`
          : `O tempo de espera entre mensagens foi definido para **${seconds} segundo(s)** por ${interaction.user}.`,
        color: COLORS.INFO
      });

      return interaction.reply({ embeds: [slowEmbed] });
    } catch (err) {
      console.error('Erro no slowmode:', err);
      return interaction.reply({
        embeds: [errorEmbed('Erro', 'Não foi possível alterar o modo lento deste canal.')],
        ephemeral: true
      });
    }
  }
};
