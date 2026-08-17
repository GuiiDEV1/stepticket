const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const { createEmbed, errorEmbed, COLORS } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');
const DatabaseManager = require('../../database/manager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Aplica um castigo temporário (silencia) a um membro')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Membro a ser mutado/castigado').setRequired(true))
    .addStringOption(opt =>
      opt.setName('duracao').setDescription('Tempo de duração (ex: 5m, 10m, 1h, 1d, 7d, máx 28d)').setRequired(true)
    )
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo do castigo').setRequired(false)),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('usuario');
    const durationStr = interaction.options.getString('duracao');
    const reason = interaction.options.getString('motivo') || 'Nenhum motivo especificado.';
    const durationMs = ms(durationStr);

    if (!durationMs || durationMs < 5000 || durationMs > 28 * 24 * 60 * 60 * 1000) {
      return interaction.reply({
        embeds: [errorEmbed('Duração Inválida', 'Informe uma duração válida entre 5 segundos e 28 dias (ex: `10m`, `1h`, `1d`).')],
        ephemeral: true
      });
    }

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
      await targetMember.timeout(durationMs, `${reason} | Aplicado por ${interaction.user.tag}`);

      const timeoutEmbed = createEmbed({
        title: '🔇 Membro Silenciado (Timeout)',
        color: COLORS.WARNING,
        fields: [
          { name: '👤 Membro', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
          { name: '👮 Moderador', value: `${interaction.user.tag}`, inline: true },
          { name: '⏱️ Duração', value: `${durationStr}`, inline: true },
          { name: '📝 Motivo', value: reason, inline: false }
        ]
      });

      const config = DatabaseManager.getConfig(interaction.guild.id);
      if (config.logs_channel_id) {
        const logChan = interaction.guild.channels.cache.get(config.logs_channel_id);
        if (logChan) logChan.send({ embeds: [timeoutEmbed] }).catch(() => {});
      }

      return interaction.reply({ embeds: [timeoutEmbed] });
    } catch (err) {
      console.error('Erro no timeout:', err);
      return interaction.reply({
        embeds: [errorEmbed('Erro', 'Não foi possível aplicar timeout neste membro.')],
        ephemeral: true
      });
    }
  }
};
