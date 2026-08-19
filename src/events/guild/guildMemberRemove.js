const DatabaseManager = require('../../database/manager');
const { createEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    const config = DatabaseManager.getConfig(member.guild.id);

    // Canal de despedida
    if (config.leave_channel_id) {
      const leaveChannel = member.guild.channels.cache.get(config.leave_channel_id);
      if (leaveChannel) {
        const leaveEmbed = createEmbed({
          title: '👋 Membro Saiu',
          description: `**${member.user.tag}** deixou o servidor. Agora somos **${member.guild.memberCount}** membros.`,
          thumbnail: member.user.displayAvatarURL({ dynamic: true }),
          color: COLORS.ERROR
        });
        leaveChannel.send({ embeds: [leaveEmbed] }).catch(() => {});
      }
    }

    // Logs de auditoria
    if (config.logs_channel_id) {
      const logsChannel = member.guild.channels.cache.get(config.logs_channel_id);
      if (logsChannel) {
        const logEmbed = createEmbed({
          title: '📤 Membro Saiu do Servidor',
          description: `**Usuário:** ${member.user.tag} (${member})\n**ID:** \`${member.id}\`\n**Cargos:** ${member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ') || 'Nenhum'}`,
          thumbnail: member.user.displayAvatarURL({ dynamic: true }),
          color: COLORS.ERROR
        });
        logsChannel.send({ embeds: [logEmbed] }).catch(() => {});
      }
    }

    // FEED DE ATIVIDADES AO VIVO NO DASHBOARD
    DatabaseManager.logActivity(member.guild.id, {
      type: 'member',
      icon: '📤',
      title: 'Membro Saiu',
      description: `${member.user.tag} saiu do servidor. Total restante: ${member.guild.memberCount} membros.`,
      user_tag: member.user.tag,
      user_avatar: member.user.displayAvatarURL({ dynamic: true })
    });
  }
};
