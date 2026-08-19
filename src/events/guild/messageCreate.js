const { PermissionFlagsBits } = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { createEmbed, warningEmbed, COLORS } = require('../../utils/embedBuilder');

// Cache em memória para detecção de spam/flood (Map: userId -> array de timestamps)
const userMessageTimestamps = new Map();

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;

    const config = DatabaseManager.getConfig(message.guild.id);
    const member = message.member;

    const isStaff = member && (
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.permissions.has(PermissionFlagsBits.ManageMessages) ||
      member.permissions.has(PermissionFlagsBits.ManageGuild)
    );

    // ==========================================
    // 1. AUTO-MODERAÇÃO (Se não for staff)
    // ==========================================
    if (!isStaff) {
      let violated = false;
      let violationReason = '';

      // A) Anti-Invite (Convites do Discord)
      if (config.automod_antiinvite) {
        const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/i;
        if (inviteRegex.test(message.content)) {
          violated = true;
          violationReason = 'Divulgação de convites do Discord não é permitida!';
        }
      }

      // B) Anti-Link Geral
      if (!violated && config.automod_antilink) {
        const linkRegex = /https?:\/\/[^\s]+/i;
        if (linkRegex.test(message.content)) {
          violated = true;
          violationReason = 'O envio de links externos está desativado neste servidor!';
        }
      }

      // C) Anti-Mass Mention
      if (!violated && config.automod_antimassmention) {
        if (message.mentions.users.size >= 4 || message.mentions.roles.size >= 3 || message.content.includes('@everyone') || message.content.includes('@here')) {
          violated = true;
          violationReason = 'Menções em massa não são permitidas!';
        }
      }

      // D) Anti-Spam / Anti-Flood
      if (!violated && config.automod_antispam) {
        const now = Date.now();
        const userTimes = userMessageTimestamps.get(message.author.id) || [];
        const recentTimes = userTimes.filter(time => now - time < 4000); // Últimos 4 segundos

        recentTimes.push(now);
        userMessageTimestamps.set(message.author.id, recentTimes);

        if (recentTimes.length >= 5) {
          violated = true;
          violationReason = 'Você está enviando mensagens rápido demais (Anti-Spam)!';
          // Aplica timeout de 1 minuto
          await member.timeout(60 * 1000, 'AutoMod: Anti-Spam/Flood').catch(() => {});
        }
      }

      // Se violou alguma regra do AutoMod
      if (violated) {
        await message.delete().catch(() => {});

        const warnMsg = await message.channel.send({
          content: `${message.author}`,
          embeds: [warningEmbed('AutoMod - Ação Bloqueada', violationReason)]
        }).catch(() => {});

        setTimeout(() => {
          warnMsg?.delete().catch(() => {});
        }, 6000);

        // Enviar log de AutoMod
        if (config.logs_channel_id) {
          const logChannel = message.guild.channels.cache.get(config.logs_channel_id);
          if (logChannel) {
            const logEmbed = createEmbed({
              title: '🤖 AutoMod - Violação Detectada',
              color: COLORS.ERROR,
              fields: [
                { name: '👤 Infrator', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
                { name: '📍 Canal', value: `${message.channel}`, inline: true },
                { name: '⚠️ Motivo', value: violationReason, inline: false },
                { name: '💬 Mensagem Bloqueada', value: message.content ? message.content.slice(0, 1000) : '*Sem texto*', inline: false }
              ]
            });
            logChannel.send({ embeds: [logEmbed] }).catch(() => {});
          }
        }

        // FEED DE ATIVIDADES AO VIVO NO DASHBOARD
        DatabaseManager.logActivity(message.guild.id, {
          type: 'automod',
          icon: '🤖',
          title: 'AutoMod: Violação Bloqueada',
          description: `${message.author.tag} teve mensagem deletada em #${message.channel.name}. Motivo: ${violationReason}`,
          user_tag: message.author.tag,
          user_avatar: message.author.displayAvatarURL({ dynamic: true })
        });

        return; // Interrompe para não computar XP
      }
    }

    // ==========================================
    // 2. SISTEMA DE XP & LEVELING
    // ==========================================
    if (config.level_enabled) {
      // Ganho aleatório de 15 a 25 XP por mensagem
      const randomXP = Math.floor(Math.random() * 11) + 15;
      const xpResult = DatabaseManager.addXP(message.guild.id, message.author.id, randomXP);

      if (xpResult.leveledUp) {
        const targetChannel = config.level_channel_id 
          ? message.guild.channels.cache.get(config.level_channel_id) || message.channel 
          : message.channel;

        const levelUpEmbed = createEmbed({
          title: '⭐ Subiu de Nível!',
          description: `Parabéns ${message.author}! Você alcançou o **Nível ${xpResult.newLevel}**! 🎉\nContinue participando do chat para subir ainda mais no ranking!`,
          thumbnail: message.author.displayAvatarURL({ dynamic: true }),
          color: COLORS.PRIMARY
        });

        targetChannel.send({ content: `${message.author}`, embeds: [levelUpEmbed] }).catch(() => {});
      }
    }
  }
};
