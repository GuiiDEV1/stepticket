const { PermissionFlagsBits } = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { createEmbed, warningEmbed, COLORS } = require('../../utils/embedBuilder');

// Cache em memória para detecção de spam/flood (Map: userId -> array de timestamps)
const userMessageTimestamps = new Map();
// Cache em memória para cooldown de ganho de XP (Map: guildId:userId -> timestamp)
const xpCooldowns = new Map();

// Limpeza de caches a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of xpCooldowns.entries()) {
    if (now - timestamp > 120000) xpCooldowns.delete(key);
  }
  for (const [userId, timestamps] of userMessageTimestamps.entries()) {
    if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > 60000) {
      userMessageTimestamps.delete(userId);
    }
  }
}, 600000);

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
    // 1. SISTEMA DE AUTOMOD & PROTEÇÃO DE CHAT
    // ==========================================
    if (config.automod_enabled && !isStaff) {
      const content = message.content;

      // Anti-Invite do Discord
      if (config.automod_anti_invites) {
        const discordInviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9_-]+/gi;
        if (discordInviteRegex.test(content)) {
          await message.delete().catch(() => {});
          DatabaseManager.logActivity(message.guild.id, {
            type: 'automod',
            icon: '🛡️',
            title: 'Convite Bloqueado',
            description: `Mensagem de ${message.author.tag} contendo convite foi apagada em #${message.channel.name}.`,
            user_tag: message.author.tag,
            user_avatar: message.author.displayAvatarURL()
          });
          const warning = warningEmbed('Anti-Invite', `${message.author}, você não tem permissão para divulgar links de outros servidores aqui!`);
          return message.channel.send({ embeds: [warning] }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }
      }

      // Anti-Links Genéricos
      if (config.automod_anti_links) {
        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        if (urlRegex.test(content)) {
          await message.delete().catch(() => {});
          DatabaseManager.logActivity(message.guild.id, {
            type: 'automod',
            icon: '🔗',
            title: 'Link Não Autorizado',
            description: `Link enviado por ${message.author.tag} foi apagado em #${message.channel.name}.`,
            user_tag: message.author.tag,
            user_avatar: message.author.displayAvatarURL()
          });
          const warning = warningEmbed('Anti-Link', `${message.author}, o envio de links externos está desativado para membros neste servidor.`);
          return message.channel.send({ embeds: [warning] }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }
      }

      // Bloqueio de Palavras Proibidas
      if (config.automod_badwords) {
        const badwords = config.automod_badwords.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
        const lowerContent = content.toLowerCase();

        const containsBadword = badwords.some(word => lowerContent.includes(word));
        if (containsBadword) {
          await message.delete().catch(() => {});
          DatabaseManager.logActivity(message.guild.id, {
            type: 'automod',
            icon: '🤬',
            title: 'Palavra Proibida',
            description: `Mensagem de ${message.author.tag} com termo censurado foi removida em #${message.channel.name}.`,
            user_tag: message.author.tag,
            user_avatar: message.author.displayAvatarURL()
          });
          const warning = warningEmbed('Filtro de Palavras', `${message.author}, sua mensagem continha palavras não permitidas pelas diretrizes do servidor.`);
          return message.channel.send({ embeds: [warning] }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }
      }

      // Anti-Spam / Anti-Flood (Detecção: mais de 5 mensagens em menos de 5 segundos)
      if (config.automod_anti_spam) {
        const now = Date.now();
        const userHistory = userMessageTimestamps.get(message.author.id) || [];
        const recentMessages = userHistory.filter(timestamp => now - timestamp < 5000);
        recentMessages.push(now);
        userMessageTimestamps.set(message.author.id, recentMessages);

        if (recentMessages.length >= 5) {
          await message.delete().catch(() => {});
          DatabaseManager.logActivity(message.guild.id, {
            type: 'automod',
            icon: '⚡',
            title: 'Anti-Flood Acionado',
            description: `${message.author.tag} enviou mensagens rápidas demais em #${message.channel.name}.`,
            user_tag: message.author.tag,
            user_avatar: message.author.displayAvatarURL()
          });

          // Timeout de 1 minuto se tiver permissão
          if (member && member.moderatable) {
            await member.timeout(60 * 1000, 'Anti-Spam / Anti-Flood automático').catch(() => {});
          }

          const warning = warningEmbed('Anti-Spam Ativado', `${message.author}, por favor diminua a velocidade! Você está enviando mensagens rápido demais.`);
          return message.channel.send({ embeds: [warning] }).then(m => setTimeout(() => m.delete().catch(() => {}), 6000));
        }
      }

      // Anti-Mass Mention (Detecção: 5 ou mais menções em uma única mensagem)
      if (config.automod_anti_mass_mention) {
        const mentionsCount = message.mentions.users.size + message.mentions.roles.size;
        if (mentionsCount >= 5) {
          await message.delete().catch(() => {});
          DatabaseManager.logActivity(message.guild.id, {
            type: 'automod',
            icon: '📢',
            title: 'Menção em Massa Bloqueada',
            description: `${message.author.tag} tentou mencionar ${mentionsCount} usuários/cargos simultaneamente.`,
            user_tag: message.author.tag,
            user_avatar: message.author.displayAvatarURL()
          });

          if (member && member.moderatable) {
            await member.timeout(5 * 60 * 1000, 'Detecção de menção em massa (Mass Mention)').catch(() => {});
          }

          const warning = warningEmbed('Menção em Massa', `${message.author}, você não pode mencionar múltiplos usuários ou cargos simultaneamente.`);
          return message.channel.send({ embeds: [warning] }).then(m => setTimeout(() => m.delete().catch(() => {}), 6000));
        }
      }
    }

    // ==========================================
    // 2. SISTEMA DE XP & LEVELING (COM COOLDOWN DE 60 SEGUNDOS)
    // ==========================================
    if (config.level_enabled) {
      const cooldownKey = `${message.guild.id}:${message.author.id}`;
      const lastXPTime = xpCooldowns.get(cooldownKey) || 0;
      const now = Date.now();

      if (now - lastXPTime >= 60000) {
        xpCooldowns.set(cooldownKey, now);

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
  }
};
