const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, COLORS, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Recria o canal do zero com todas as permissões clonadas, limpando todo o chat')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, client) {
    if (!checkPermissions({
      interaction,
      userPermissions: [PermissionFlagsBits.ManageChannels],
      botPermissions: [PermissionFlagsBits.ManageChannels]
    })) return;

    const channel = interaction.channel;
    const position = channel.position;

    try {
      const clonedChannel = await channel.clone({
        reason: `Nuke executado por ${interaction.user.tag}`
      });

      await clonedChannel.setPosition(position);
      await channel.delete(`Nuke executado por ${interaction.user.tag}`);

      const nukeEmbed = createEmbed({
        title: '💥 Canal Limpo (Nuke)',
        description: `Este canal foi completamente recriado e limpo por ${interaction.user}!`,
        color: COLORS.MODERATION,
        image: 'https://media.giphy.com/media/HhTXt43zEX8uQ/giphy.gif'
      });

      await clonedChannel.send({ embeds: [nukeEmbed] });
    } catch (err) {
      console.error('Erro no nuke:', err);
      return interaction.reply({
        embeds: [errorEmbed('Erro no Nuke', 'Não foi possível recriar o canal. Verifique minhas permissões.')],
        ephemeral: true
      });
    }
  }
};
