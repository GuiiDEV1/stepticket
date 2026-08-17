const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, errorEmbed, COLORS } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');
const DatabaseManager = require('../../database/manager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove o silenciamento/castigo de um membro')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Membro para remover o timeout').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo da remoção do castigo').setRequired(false)),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('motivo') || 'Castigo removido pela moderação.';

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return interaction.reply({
        embeds: [errorEmbed('Não Encontrado', 'Este membro não está no servidor.')],
        ephemeral: true
      });
    }

    if (!checkPermissions({
      interaction,
      userPermissions: [PermissionFlagsBits.ModerateMembers],
      botPermissions: [PermissionFlagsBits.ModerateMembers],
      targetMember
    })) return;

    try {
      await targetMember.timeout(null, `${reason} | Removido por ${interaction.user.tag}`);

      const untimeoutEmbed = createEmbed({
        title: '🔊 Silenciamento Removido',
        color: COLORS.SUCCESS,
        fields: [
          { name: '👤 Membro', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
          { name: '👮 Moderador', value: `${interaction.user.tag}`, inline: true },
          { name: '📝 Motivo', value: reason, inline: false }
        ]
      });

      const config = DatabaseManager.getConfig(interaction.guild.id);
      if (config.logs_channel_id) {
        const logChan = interaction.guild.channels.cache.get(config.logs_channel_id);
        if (logChan) logChan.send({ embeds: [untimeoutEmbed] }).catch(() => {});
      }

      return interaction.reply({ embeds: [untimeoutEmbed] });
    } catch (err) {
      console.error('Erro ao remover timeout:', err);
      return interaction.reply({
        embeds: [errorEmbed('Erro', 'Não foi possível remover o castigo deste membro.')],
        ephemeral: true
      });
    }
  }
};
