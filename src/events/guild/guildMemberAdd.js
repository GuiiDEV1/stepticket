const DatabaseManager = require('../../database/manager');
const { createEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const config = DatabaseManager.getConfig(member.guild.id);

    // 1. APLICAÇÃO DE AUTOROLE
    try {
      if (member.user.bot && config.bot_autorole_id) {
        const botRole = member.guild.roles.cache.get(config.bot_autorole_id);
        if (botRole) await member.roles.add(botRole).catch(() => {});
      } else if (!member.user.bot && config.autorole_id) {
        const userRole = member.guild.roles.cache.get(config.autorole_id);
        if (userRole) await member.roles.add(userRole).catch(() => {});
      }
    } catch (err) {
      console.error('Erro ao atribuir AutoRole:', err);
    }

    // 2. MENSAGEM DE BOAS-VINDAS
    if (config.welcome_channel_id) {
      const welcomeChannel = member.guild.channels.cache.get(config.welcome_channel_id);
      if (welcomeChannel) {
        let msg = config.welcome_message || 'Olá {user}, seja muito bem-vindo(a) ao servidor **{server}**! Agora somos **{members}** membros.';
        msg = msg
          .replace(/{user}/g, `${member}`)
          .replace(/{username}/g, member.user.username)
          .replace(/{server}/g, member.guild.name)
          .replace(/{members}/g, member.guild.memberCount.toString());

        const welcomeEmbed = createEmbed({
          title: `👋 Bem-vindo(a) ao ${member.guild.name}!`,
          description: msg,
          thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
          color: COLORS.SUCCESS,
          footerText: `Membro #${member.guild.memberCount}`
        });

        welcomeChannel.send({ content: `${member}`, embeds: [welcomeEmbed] }).catch(() => {});
      }
    }

    // 3. LOGS DE AUDITORIA
    if (config.logs_channel_id) {
      const logsChannel = member.guild.channels.cache.get(config.logs_channel_id);
      if (logsChannel) {
        const logEmbed = createEmbed({
          title: '📥 Membro Entrou',
          description: `**Usuário:** ${member.user.tag} (${member})\n**ID:** \`${member.id}\`\n**Conta Criada em:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
          thumbnail: member.user.displayAvatarURL({ dynamic: true }),
          color: COLORS.SUCCESS
        });
        logsChannel.send({ embeds: [logEmbed] }).catch(() => {});
      }
    }
  }
};
