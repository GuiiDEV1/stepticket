const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, errorEmbed, COLORS } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');
const DatabaseManager = require('../../database/manager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa um membro do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Membro a ser expulso').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo da expulsão').setRequired(false)),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('motivo') || 'Nenhum motivo especificado.';
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      return interaction.reply({
        embeds: [errorEmbed('Não Encontrado', 'Este membro não está no servidor.')],
        ephemeral: true
      });
    }

    if (!checkPermissions({
      interaction,
      userPermissions: [PermissionFlagsBits.KickMembers],
      botPermissions: [PermissionFlagsBits.KickMembers],
      targetMember
    })) return;

    await targetUser.send({
      embeds: [createEmbed({
        title: `👢 Você foi expulso de ${interaction.guild.name}`,
        description: `**Motivo:** ${reason}\n**Moderador:** ${interaction.user.tag}`,
        color: COLORS.WARNING
      })]
    }).catch(() => {});

    try {
      await targetMember.kick(`${reason} | Expulso por ${interaction.user.tag}`);

      const kickEmbed = createEmbed({
        title: '👢 Membro Expulso',
        color: COLORS.WARNING,
        fields: [
          { name: '👤 Membro', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
          { name: '👮 Moderador', value: `${interaction.user.tag}`, inline: true },
          { name: '📝 Motivo', value: reason, inline: false }
        ]
      });

      const config = DatabaseManager.getConfig(interaction.guild.id);
      if (config.logs_channel_id) {
        const logChan = interaction.guild.channels.cache.get(config.logs_channel_id);
        if (logChan) logChan.send({ embeds: [kickEmbed] }).catch(() => {});
      }

      return interaction.reply({ embeds: [kickEmbed] });
    } catch (err) {
      console.error('Erro ao expulsar:', err);
      return interaction.reply({
        embeds: [errorEmbed('Erro', 'Não foi possível expulsar este membro.')],
        ephemeral: true
      });
    }
  }
};
