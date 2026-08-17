const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, successEmbed, errorEmbed, COLORS } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');
const DatabaseManager = require('../../database/manager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bane um membro do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Membro a ser banido').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo do banimento').setRequired(false))
    .addIntegerOption(opt =>
      opt.setName('deletar_mensagens').setDescription('Dias de mensagens a deletar (0 a 7)').setMinValue(0).setMaxValue(7).setRequired(false)
    ),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('motivo') || 'Nenhum motivo especificado.';
    const deleteDays = interaction.options.getInteger('deletar_mensagens') || 0;

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (targetMember) {
      if (!checkPermissions({
        interaction,
        userPermissions: [PermissionFlagsBits.BanMembers],
        botPermissions: [PermissionFlagsBits.BanMembers],
        targetMember
      })) return;
    }

    // Tenta enviar DM para o usuário avisando da punição
    await targetUser.send({
      embeds: [createEmbed({
        title: `🔨 Você foi banido de ${interaction.guild.name}`,
        description: `**Motivo:** ${reason}\n**Moderador:** ${interaction.user.tag}`,
        color: COLORS.ERROR
      })]
    }).catch(() => {});

    try {
      await interaction.guild.bans.create(targetUser.id, {
        reason: `${reason} | Banido por ${interaction.user.tag}`,
        deleteMessageSeconds: deleteDays * 24 * 60 * 60
      });

      const banEmbed = createEmbed({
        title: '🔨 Membro Banido',
        color: COLORS.ERROR,
        fields: [
          { name: '👤 Usuário', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
          { name: '👮 Moderador', value: `${interaction.user.tag}`, inline: true },
          { name: '📝 Motivo', value: reason, inline: false }
        ]
      });

      // Envia log se houver
      const config = DatabaseManager.getConfig(interaction.guild.id);
      if (config.logs_channel_id) {
        const logChan = interaction.guild.channels.cache.get(config.logs_channel_id);
        if (logChan) logChan.send({ embeds: [banEmbed] }).catch(() => {});
      }

      return interaction.reply({ embeds: [banEmbed] });
    } catch (err) {
      console.error('Erro ao banir:', err);
      return interaction.reply({
        embeds: [errorEmbed('Erro ao Banir', 'Não foi possível banir este usuário. Verifique minhas permissões e hierarquia.')],
        ephemeral: true
      });
    }
  }
};
