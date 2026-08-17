const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { createEmbed, COLORS, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Aplica uma advertência formal a um membro')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Membro a ser advertido').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo da advertência').setRequired(true)),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('motivo');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (targetMember) {
      if (!checkPermissions({
        interaction,
        userPermissions: [PermissionFlagsBits.ModerateMembers],
        targetMember
      })) return;
    }

    const warnId = DatabaseManager.addWarn(
      interaction.guild.id,
      targetUser.id,
      interaction.user.id,
      reason
    );

    const userWarns = DatabaseManager.getWarns(interaction.guild.id, targetUser.id);

    // Enviar DM ao membro
    await targetUser.send({
      embeds: [createEmbed({
        title: `⚠️ Advertência Recebida em ${interaction.guild.name}`,
        description: `Você recebeu uma advertência formal.\n**Motivo:** ${reason}\n**Moderador:** ${interaction.user.tag}\n**Total de Advertências:** ${userWarns.length}`,
        color: COLORS.WARNING
      })]
    }).catch(() => {});

    const warnEmbed = createEmbed({
      title: '⚠️ Advertência Aplicada',
      color: COLORS.WARNING,
      fields: [
        { name: '👤 Membro', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
        { name: '👮 Moderador', value: `${interaction.user}`, inline: true },
        { name: '🆔 ID do Warn', value: `\`#${warnId}\``, inline: true },
        { name: '📝 Motivo', value: reason, inline: false },
        { name: '📊 Total de Advertências', value: `\`${userWarns.length}\` advertência(s)`, inline: false }
      ]
    });

    const config = DatabaseManager.getConfig(interaction.guild.id);
    if (config.logs_channel_id) {
      const logChan = interaction.guild.channels.cache.get(config.logs_channel_id);
      if (logChan) logChan.send({ embeds: [warnEmbed] }).catch(() => {});
    }

    return interaction.reply({ embeds: [warnEmbed] });
  }
};
