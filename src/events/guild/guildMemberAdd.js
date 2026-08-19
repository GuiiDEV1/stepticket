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

    // 2. MENSAGEM DE BOAS-VINDAS NO CANAL
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

        // Se o estilo for Canvas, gera a imagem
        if (config.welcome_style === 'canvas') {
          const { generateWelcomeCard } = require('../../utils/welcomeCard');
          try {
            const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 512, forceStatic: true });
            const cardAttachment = await generateWelcomeCard({
              username: member.user.username,
              avatarURL,
              memberCount: member.guild.memberCount,
              guildName: member.guild.name,
              title: config.welcome_canvas_title || 'BEM-VINDO(A)!',
              color1: config.welcome_canvas_color1 || '#5865F2',
              color2: config.welcome_canvas_color2 || '#23A55A',
              backgroundImageUrl: config.welcome_canvas_background || null
            });

            welcomeEmbed.setImage('attachment://welcome-card.png');
            welcomeChannel.send({ content: `${member}`, embeds: [welcomeEmbed], files: [cardAttachment] }).catch(() => {});
          } catch (canvasErr) {
            console.error('Erro ao gerar Canvas de boas-vindas:', canvasErr);
            welcomeChannel.send({ content: `${member}`, embeds: [welcomeEmbed] }).catch(() => {});
          }
        } else {
          welcomeChannel.send({ content: `${member}`, embeds: [welcomeEmbed] }).catch(() => {});
        }
      }
    }

    // 2.1 MENSAGEM DE BOAS-VINDAS PRIVADA NA DM (COM ALERTA ANTI-GOLPES)
    if (config.welcome_dm_enabled && !member.user.bot) {
      let dmMsg = config.welcome_dm_message || 'Olá {user}, seja bem-vindo(a) ao **{server}**! Esperamos que você se divirta na nossa comunidade.';
      dmMsg = dmMsg
        .replace(/{user}/g, `${member}`)
        .replace(/{username}/g, member.user.username)
        .replace(/{server}/g, member.guild.name)
        .replace(/{members}/g, member.guild.memberCount.toString());

      let dmColor = COLORS.PRIMARY;
      if (config.welcome_dm_color && config.welcome_dm_color.startsWith('#')) {
        const parsed = parseInt(config.welcome_dm_color.replace('#', ''), 16);
        if (!isNaN(parsed)) dmColor = parsed;
      }

      const dmEmbedFields = [];
      if (config.welcome_dm_safety_alert) {
        dmEmbedFields.push({
          name: '🛡️ Dica de Segurança & Proteção',
          value: '⚠️ **Atenção:** A Staff deste servidor **NUNCA** entrará em contato pedindo sua senha, token de conta, código de verificação ou downloads de arquivos suspeitos (.exe, .scr). Desconfie de mensagens oferecendo Nitro ou Robux grátis!',
          inline: false
        });
      }

      const dmEmbed = createEmbed({
        title: `👋 Bem-vindo(a) ao ${member.guild.name}!`,
        description: dmMsg,
        color: dmColor,
        thumbnail: member.guild.iconURL({ dynamic: true }) || member.user.displayAvatarURL({ dynamic: true }),
        fields: dmEmbedFields,
        footerText: `Mensagem de segurança oficial • ${member.guild.name}`
      });

      member.send({ embeds: [dmEmbed] }).catch(() => {});
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
