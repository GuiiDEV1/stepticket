const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, successEmbed, errorEmbed, COLORS } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');
const DatabaseManager = require('../../database/manager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Desbane um usuário do servidor pelo ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(opt => opt.setName('id_usuario').setDescription('ID do usuário a ser desbanido').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo do desbanimento').setRequired(false)),

  async execute(interaction, client) {
    if (!checkPermissions({
      interaction,
      userPermissions: [PermissionFlagsBits.BanMembers],
      botPermissions: [PermissionFlagsBits.BanMembers]
    })) return;

    const userId = interaction.options.getString('id_usuario');
    const reason = interaction.options.getString('motivo') || 'Desbanido pela moderação.';

    try {
      const banInfo = await interaction.guild.bans.fetch(userId).catch(() => null);
      if (!banInfo) {
        return interaction.reply({
          embeds: [errorEmbed('Não Encontrado', 'Este usuário não está na lista de banidos deste servidor.')],
          ephemeral: true
        });
      }

      await interaction.guild.bans.remove(userId, `${reason} | Desbanido por ${interaction.user.tag}`);

      const unbanEmbed = createEmbed({
        title: '🔓 Usuário Desbanido',
        color: COLORS.SUCCESS,
        fields: [
          { name: '👤 Usuário', value: `${banInfo.user.tag} (\`${userId}\`)`, inline: true },
          { name: '👮 Moderador', value: `${interaction.user.tag}`, inline: true },
          { name: '📝 Motivo', value: reason, inline: false }
        ]
      });

      const config = DatabaseManager.getConfig(interaction.guild.id);
      if (config.logs_channel_id) {
        const logChan = interaction.guild.channels.cache.get(config.logs_channel_id);
        if (logChan) logChan.send({ embeds: [unbanEmbed] }).catch(() => {});
      }

      return interaction.reply({ embeds: [unbanEmbed] });
    } catch (err) {
      console.error('Erro ao desbanir:', err);
      return interaction.reply({
        embeds: [errorEmbed('Erro', 'Ocorreu um erro ao tentar desbanir este ID.')],
        ephemeral: true
      });
    }
  }
};
