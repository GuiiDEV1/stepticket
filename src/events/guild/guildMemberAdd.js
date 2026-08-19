const DatabaseManager = require('../../database/manager');
const { createEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const config = DatabaseManager.getConfig(member.guild.id);

    // ==========================================
    // 0. FILTRO ANTI-CONTAS FAKE & IDADE MÍNIMA
    // ==========================================
    if (config.security_anti_alt_enabled && !member.user.bot) {
      const minDays = parseInt(config.security_min_account_age, 10) || 7;
      const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);

      if (accountAgeDays < minDays) {
        const action = config.security_alt_action || 'kick';
        const formattedDays = Math.floor(accountAgeDays);

        if (action === 'ban') {
          await member.ban({ reason: `Anti-Alt: Conta criada há apenas ${formattedDays} dias (Mínimo: ${minDays} dias)` }).catch(() => {});
        } else if (action === 'quarantine' && config.security_quarantine_role_id) {
          const qRole = member.guild.roles.cache.get(config.security_quarantine_role_id);
          if (qRole) await member.roles.set([qRole.id]).catch(() => {});
        } else {
          await member.kick(`Anti-Alt: Conta criada há apenas ${formattedDays} dias (Mínimo: ${minDays} dias)`).catch(() => {});
        }

        // Log nos canais de auditoria
        if (config.logs_channel_id) {
          const logsChannel = member.guild.channels.cache.get(config.logs_channel_id);
          if (logsChannel) {
            const altEmbed = createEmbed({
              title: '🛡️ Anti-Alt: Conta Nova Bloqueada',
              description: `**Membro:** ${member.user.tag} (\`${member.id}\`)\n` +
                `**Idade da Conta:** ${formattedDays} dia(s)\n` +
                `**Idade Mínima Exigida:** ${minDays} dias\n` +
                `**Ação Aplicada:** \`${action.toUpperCase()}\``,
              color: COLORS.ERROR,
              thumbnail: member.user.displayAvatarURL({ dynamic: true })
            });
            logsChannel.send({ embeds: [altEmbed] }).catch(() => {});
          }
        }

        // Log no Feed ao Vivo
        DatabaseManager.logActivity(member.guild.id, {
          type: 'automod',
          icon: '🛡️',
          title: 'Anti-Alt: Ação Executada',
          description: `${member.user.tag} punido (${action.toUpperCase()}) por conta com menos de ${minDays} dias.`,
          user_tag: member.user.tag,
          user_avatar: member.user.displayAvatarURL({ dynamic: true })
        });

        return; // Interrompe para não enviar boas-vindas nem autorole para contas bloqueadas
      }
    }

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

    // 4. FEED DE ATIVIDADES AO VIVO NO DASHBOARD
    DatabaseManager.logActivity(member.guild.id, {
      type: 'member',
      icon: '📥',
      title: 'Novo Membro',
      description: `${member.user.tag} entrou no servidor. Total agora: ${member.guild.memberCount} membros.`,
      user_tag: member.user.tag,
      user_avatar: member.user.displayAvatarURL({ dynamic: true })
    });
  }
};
