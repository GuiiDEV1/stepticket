const { store, saveToDisk } = require('./sqlite.js');

const DatabaseManager = {
  // ===================== GUILD CONFIG =====================
  getConfig(guildId) {
    if (!store.guild_config[guildId]) {
      store.guild_config[guildId] = {
        guild_id: guildId,
        ticket_category_id: null,
        ticket_logs_id: null,
        ticket_staff_role_id: null,
        logs_channel_id: null,
        welcome_channel_id: null,
        welcome_message: null,
        leave_channel_id: null,
        autorole_id: null,
        bot_autorole_id: null,
        suggestions_channel_id: null,
        level_channel_id: null,
        level_enabled: 1,
        automod_antilink: 0,
        automod_antiinvite: 0,
        automod_antispam: 0,
        automod_antimassmention: 0,
        ticket_title: '🎫 Central de Atendimento',
        ticket_description: 'Precisa de suporte, tirar dúvidas, fazer compras ou denunciar algo?\n\nSelecione uma das opções abaixo para abrir um ticket privado.',
        ticket_color: '#5865F2',
        ticket_banner: null,
        ticket_style: 'select',
        ticket_categories: [
          { id: 'suporte', label: 'Suporte Geral', emoji: '🛠️', desc: 'Dúvidas e ajuda geral' },
          { id: 'flags', label: 'FastFlags & Otimização', emoji: '⚡', desc: 'Ajuda com configurações e Roblox' },
          { id: 'denuncia', label: 'Denúncias', emoji: '🚨', desc: 'Reportar usuários ou infrações' },
          { id: 'compras', label: 'Compras & VIP', emoji: '🛒', desc: 'Assuntos comerciais e VIP' }
        ],
        security_anti_alt_enabled: 0,
        security_min_account_age: 7,
        security_alt_action: 'kick',
        security_quarantine_role_id: null,
        welcome_style: 'embed',
        welcome_canvas_title: 'BEM-VINDO(A)!',
        welcome_canvas_color1: '#5865F2',
        welcome_canvas_color2: '#23A55A',
        welcome_canvas_background: null,
        welcome_dm_enabled: 0,
        welcome_dm_message: 'Olá {user}, seja bem-vindo(a) ao **{server}**! Esperamos que você se divirta na nossa comunidade.',
        welcome_dm_color: '#5865F2',
        welcome_dm_safety_alert: 1
      };
      saveToDisk();
    }

    const cfg = store.guild_config[guildId];
    if (!cfg.ticket_title) cfg.ticket_title = '🎫 Central de Atendimento';
    if (!cfg.ticket_description) cfg.ticket_description = 'Precisa de suporte, tirar dúvidas, fazer compras ou denunciar algo?\n\nSelecione uma das opções abaixo para abrir um ticket privado.';
    if (!cfg.ticket_color) cfg.ticket_color = '#5865F2';
    if (!cfg.ticket_style) cfg.ticket_style = 'select';
    if (cfg.security_anti_alt_enabled === undefined) cfg.security_anti_alt_enabled = 0;
    if (!cfg.security_min_account_age) cfg.security_min_account_age = 7;
    if (!cfg.security_alt_action) cfg.security_alt_action = 'kick';
    if (!cfg.welcome_style) cfg.welcome_style = 'embed';
    if (!cfg.welcome_canvas_title) cfg.welcome_canvas_title = 'BEM-VINDO(A)!';
    if (!cfg.welcome_canvas_color1) cfg.welcome_canvas_color1 = '#5865F2';
    if (!cfg.welcome_canvas_color2) cfg.welcome_canvas_color2 = '#23A55A';
    if (cfg.welcome_dm_enabled === undefined) cfg.welcome_dm_enabled = 0;
    if (!cfg.welcome_dm_message) cfg.welcome_dm_message = 'Olá {user}, seja bem-vindo(a) ao **{server}**! Esperamos que você se divirta na nossa comunidade.';
    if (!cfg.welcome_dm_color) cfg.welcome_dm_color = '#5865F2';
    if (cfg.welcome_dm_safety_alert === undefined) cfg.welcome_dm_safety_alert = 1;
    if (!Array.isArray(cfg.ticket_categories) || cfg.ticket_categories.length === 0) {
      cfg.ticket_categories = [
        { id: 'suporte', label: 'Suporte Geral', emoji: '🛠️', desc: 'Dúvidas e ajuda geral' },
        { id: 'flags', label: 'FastFlags & Otimização', emoji: '⚡', desc: 'Ajuda com configurações e Roblox' },
        { id: 'denuncia', label: 'Denúncias', emoji: '🚨', desc: 'Reportar usuários ou infrações' },
        { id: 'compras', label: 'Compras & VIP', emoji: '🛒', desc: 'Assuntos comerciais e VIP' }
      ];
    }
    return cfg;
  },

  updateConfig(guildId, updates) {
    const current = this.getConfig(guildId);
    store.guild_config[guildId] = { ...current, ...updates };
    saveToDisk();
  },

  getAutoMod(guildId) {
    const config = this.getConfig(guildId);
    return {
      anti_invite: config.automod_antiinvite || 0,
      anti_links: config.automod_antilink || 0,
      anti_spam: config.automod_antispam || 0,
      anti_mass_mention: config.automod_antimassmention || 0
    };
  },

  updateAutoMod(guildId, updates) {
    const patch = {};
    if (updates.anti_invite !== undefined) patch.automod_antiinvite = updates.anti_invite ? 1 : 0;
    if (updates.anti_links !== undefined) patch.automod_antilink = updates.anti_links ? 1 : 0;
    if (updates.anti_spam !== undefined) patch.automod_antispam = updates.anti_spam ? 1 : 0;
    if (updates.anti_mass_mention !== undefined) patch.automod_antimassmention = updates.anti_mass_mention ? 1 : 0;
    this.updateConfig(guildId, patch);
  },

  // ===================== TICKETS =====================
  createTicket({ ticketId, guildId, channelId, userId, category }) {
    store.tickets[channelId] = {
      ticket_id: ticketId,
      guild_id: guildId,
      channel_id: channelId,
      user_id: userId,
      category,
      status: 'open',
      claimed_by: null,
      closed_by: null,
      close_reason: null,
      created_at: Date.now(),
      closed_at: null
    };
    saveToDisk();
  },

  getTicketByChannel(channelId) {
    return store.tickets[channelId] || null;
  },

  getTicket(ticketId) {
    return Object.values(store.tickets).find(t => t.ticket_id === ticketId) || null;
  },

  getUserOpenTicket(guildId, userId, category = null) {
    return Object.values(store.tickets).find(t => {
      const match = t.guild_id === guildId && t.user_id === userId && t.status === 'open';
      if (category) return match && t.category === category;
      return match;
    }) || null;
  },

  updateTicket(channelId, updates) {
    if (store.tickets[channelId]) {
      store.tickets[channelId] = { ...store.tickets[channelId], ...updates };
      saveToDisk();
    }
  },

  // ===================== WARNS =====================
  addWarn(guildId, userId, moderatorId, reason) {
    const newId = (store.warns.length > 0 ? Math.max(...store.warns.map(w => w.id)) : 0) + 1;
    const warn = {
      id: newId,
      guild_id: guildId,
      user_id: userId,
      moderator_id: moderatorId,
      reason,
      timestamp: Date.now()
    };
    store.warns.push(warn);
    saveToDisk();
    return newId;
  },

  getWarns(guildId, userId) {
    return store.warns
      .filter(w => w.guild_id === guildId && w.user_id === userId)
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  deleteWarn(id, guildId) {
    const initialLen = store.warns.length;
    store.warns = store.warns.filter(w => !(w.id === id && w.guild_id === guildId));
    const changes = initialLen - store.warns.length;
    if (changes > 0) saveToDisk();
    return { changes };
  },

  clearWarns(guildId, userId) {
    const initialLen = store.warns.length;
    store.warns = store.warns.filter(w => !(w.guild_id === guildId && w.user_id === userId));
    const changes = initialLen - store.warns.length;
    if (changes > 0) saveToDisk();
    return { changes };
  },

  // ===================== GIVEAWAYS =====================
  createGiveaway({ id, messageId, channelId, guildId, prize, winnersCount, hostId, endsAt }) {
    store.giveaways[messageId] = {
      id,
      message_id: messageId,
      channel_id: channelId,
      guild_id: guildId,
      prize,
      winners_count: winnersCount,
      host_id: hostId,
      ends_at: endsAt,
      ended: 0,
      entries: []
    };
    saveToDisk();
  },

  getGiveaway(id) {
    return Object.values(store.giveaways).find(g => g.id === id) || null;
  },

  getGiveawayByMessage(messageId) {
    return store.giveaways[messageId] || null;
  },

  getActiveGiveaways() {
    return Object.values(store.giveaways).filter(g => g.ended === 0);
  },

  toggleGiveawayEntry(messageId, userId) {
    const g = this.getGiveawayByMessage(messageId);
    if (!g || g.ended) return { success: false, reason: 'ended' };

    const index = g.entries.indexOf(userId);
    let entered = false;

    if (index === -1) {
      g.entries.push(userId);
      entered = true;
    } else {
      g.entries.splice(index, 1);
      entered = false;
    }

    saveToDisk();
    return { success: true, entered, count: g.entries.length };
  },

  endGiveaway(messageId) {
    if (store.giveaways[messageId]) {
      store.giveaways[messageId].ended = 1;
      saveToDisk();
    }
  },

  // ===================== XP & NÍVEIS =====================
  getUserLevel(guildId, userId) {
    const key = `${guildId}_${userId}`;
    if (!store.levels[key]) {
      store.levels[key] = {
        guild_id: guildId,
        user_id: userId,
        xp: 0,
        level: 0,
        last_message_at: 0
      };
      saveToDisk();
    }
    return store.levels[key];
  },

  addXP(guildId, userId, amount) {
    const current = this.getUserLevel(guildId, userId);
    const now = Date.now();

    if (now - current.last_message_at < 60000) {
      return { leveledUp: false, currentXP: current.xp, currentLevel: current.level };
    }

    const newXP = current.xp + amount;
    const neededForNextLevel = (current.level + 1) * 150;
    let newLevel = current.level;
    let leveledUp = false;

    if (newXP >= neededForNextLevel) {
      newLevel += 1;
      leveledUp = true;
    }

    const key = `${guildId}_${userId}`;
    store.levels[key] = {
      guild_id: guildId,
      user_id: userId,
      xp: newXP,
      level: newLevel,
      last_message_at: now
    };

    saveToDisk();
    return { leveledUp, newLevel, newXP };
  },

  getLeaderboard(guildId, limit = 10) {
    return Object.values(store.levels)
      .filter(l => l.guild_id === guildId)
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit);
  },

  getUserRank(guildId, userId) {
    const list = Object.values(store.levels)
      .filter(l => l.guild_id === guildId)
      .sort((a, b) => b.xp - a.xp);

    const rank = list.findIndex(u => u.user_id === userId) + 1;
    return rank || list.length + 1;
  },

  // ===================== REACTION ROLES =====================
  addReactionRole({ messageId, guildId, channelId, roleId, emoji, label, style }) {
    store.reaction_roles.push({
      message_id: messageId,
      guild_id: guildId,
      channel_id: channelId,
      role_id: roleId,
      emoji: emoji || '',
      label,
      style: style || 'Primary'
    });
    saveToDisk();
  },

  getReactionRoles(messageId) {
    return store.reaction_roles.filter(r => r.message_id === messageId);
  },

  getReactionRoleByButton(messageId, roleId) {
    return store.reaction_roles.find(r => r.message_id === messageId && r.role_id === roleId) || null;
  },

  // ===================== SUGESTÕES =====================
  createSuggestion({ messageId, guildId, channelId, authorId, text }) {
    store.suggestions[messageId] = {
      message_id: messageId,
      guild_id: guildId,
      channel_id: channelId,
      author_id: authorId,
      suggestion_text: text,
      upvotes: [],
      downvotes: [],
      status: 'pending',
      staff_reason: '',
      staff_id: null,
      created_at: Date.now()
    };
    saveToDisk();
    return messageId;
  },

  getSuggestionByMessage(messageId) {
    return store.suggestions[messageId] || null;
  },

  voteSuggestion(messageId, userId, type) {
    const s = this.getSuggestionByMessage(messageId);
    if (!s || s.status !== 'pending') return null;

    const upIndex = s.upvotes.indexOf(userId);
    const downIndex = s.downvotes.indexOf(userId);

    if (type === 'up') {
      if (upIndex > -1) {
        s.upvotes.splice(upIndex, 1);
      } else {
        s.upvotes.push(userId);
        if (downIndex > -1) s.downvotes.splice(downIndex, 1);
      }
    } else if (type === 'down') {
      if (downIndex > -1) {
        s.downvotes.splice(downIndex, 1);
      } else {
        s.downvotes.push(userId);
        if (upIndex > -1) s.upvotes.splice(upIndex, 1);
      }
    }

    saveToDisk();
    return { upvotes: s.upvotes.length, downvotes: s.downvotes.length };
  },

  updateSuggestionStatus(messageId, status, staffId, staffReason) {
    if (store.suggestions[messageId]) {
      store.suggestions[messageId].status = status;
      store.suggestions[messageId].staff_id = staffId;
      store.suggestions[messageId].staff_reason = staffReason || '';
      saveToDisk();
    }
  },

  // ===================== ENQUETES (POLLS) =====================
  createPoll({ id, messageId, guildId, channelId, authorId, question, options }) {
    store.polls[messageId] = {
      id,
      message_id: messageId,
      guild_id: guildId,
      channel_id: channelId,
      author_id: authorId,
      question,
      options,
      votes: {},
      created_at: Date.now()
    };
    saveToDisk();
  },

  getPollByMessage(messageId) {
    return store.polls[messageId] || null;
  },

  votePoll(messageId, userId, optionIndex) {
    const p = this.getPollByMessage(messageId);
    if (!p) return null;

    p.votes[userId] = optionIndex;
    saveToDisk();
    return { options: p.options, votes: p.votes };
  },

  // ===================== ROBLOX TRACKER =====================
  getRobloxTracker() {
    if (!store.roblox_tracker) {
      store.roblox_tracker = { last_version: null, last_upload_guid: null, last_checked_at: 0, channels: [] };
      saveToDisk();
    }
    return store.roblox_tracker;
  },

  updateRobloxTracker(updates) {
    store.roblox_tracker = { ...this.getRobloxTracker(), ...updates };
    saveToDisk();
  },

  addRobloxTrackerChannel(guildId, channelId, pingRoleId = null) {
    const tracker = this.getRobloxTracker();
    const existingIndex = tracker.channels.findIndex(c => c.guild_id === guildId);
    if (existingIndex > -1) {
      tracker.channels[existingIndex] = { guild_id: guildId, channel_id: channelId, ping_role_id: pingRoleId };
    } else {
      tracker.channels.push({ guild_id: guildId, channel_id: channelId, ping_role_id: pingRoleId });
    }
    saveToDisk();
  },

  removeRobloxTrackerChannel(guildId) {
    const tracker = this.getRobloxTracker();
    tracker.channels = tracker.channels.filter(c => c.guild_id !== guildId);
    saveToDisk();
  },

  // ===================== VERIFICAÇÃO (CAPTCHA & BOTÃO) =====================
  getVerification(guildId) {
    return store.verification[guildId] || null;
  },

  setVerification(guildId, config) {
    store.verification[guildId] = {
      guild_id: guildId,
      channel_id: config.channel_id,
      role_id: config.role_id,
      type: config.type || 'captcha', // 'captcha' ou 'button'
      enabled: config.enabled !== undefined ? config.enabled : 1
    };
    saveToDisk();
  },

  // ===================== ECONOMIA =====================
  getEconomy(guildId, userId) {
    const key = `${guildId}_${userId}`;
    if (!store.economy[key]) {
      store.economy[key] = {
        guild_id: guildId,
        user_id: userId,
        wallet: 0,
        bank: 0,
        last_daily: 0,
        last_work: 0
      };
      saveToDisk();
    }
    return store.economy[key];
  },

  addWallet(guildId, userId, amount) {
    const eco = this.getEconomy(guildId, userId);
    eco.wallet += amount;
    saveToDisk();
    return eco.wallet;
  },

  removeWallet(guildId, userId, amount) {
    const eco = this.getEconomy(guildId, userId);
    if (eco.wallet < amount) return false;
    eco.wallet -= amount;
    saveToDisk();
    return true;
  },

  depositBank(guildId, userId, amount) {
    const eco = this.getEconomy(guildId, userId);
    const depositAmount = amount === 'all' ? eco.wallet : parseInt(amount, 10);
    if (isNaN(depositAmount) || depositAmount <= 0 || eco.wallet < depositAmount) return false;

    eco.wallet -= depositAmount;
    eco.bank += depositAmount;
    saveToDisk();
    return { wallet: eco.wallet, bank: eco.bank, amount: depositAmount };
  },

  withdrawBank(guildId, userId, amount) {
    const eco = this.getEconomy(guildId, userId);
    const withdrawAmount = amount === 'all' ? eco.bank : parseInt(amount, 10);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0 || eco.bank < withdrawAmount) return false;

    eco.bank -= withdrawAmount;
    eco.wallet += withdrawAmount;
    saveToDisk();
    return { wallet: eco.wallet, bank: eco.bank, amount: withdrawAmount };
  },

  transferMoney(guildId, fromUserId, toUserId, amount) {
    const from = this.getEconomy(guildId, fromUserId);
    const to = this.getEconomy(guildId, toUserId);
    const transferAmount = parseInt(amount, 10);

    if (isNaN(transferAmount) || transferAmount <= 0 || from.wallet < transferAmount) return false;

    from.wallet -= transferAmount;
    to.wallet += transferAmount;
    saveToDisk();
    return true;
  },

  setLastDaily(guildId, userId, timestamp = Date.now()) {
    const eco = this.getEconomy(guildId, userId);
    eco.last_daily = timestamp;
    saveToDisk();
  },

  setLastWork(guildId, userId, timestamp = Date.now()) {
    const eco = this.getEconomy(guildId, userId);
    eco.last_work = timestamp;
    saveToDisk();
  },

  // ===================== LOJA DA ECONOMIA =====================
  getShopItems(guildId) {
    if (!store.economy_shop) store.economy_shop = [];
    return store.economy_shop.filter(i => i.guild_id === guildId);
  },

  addShopItem({ guildId, roleId, name, price, description }) {
    if (!store.economy_shop) store.economy_shop = [];
    const newId = (store.economy_shop.length > 0 ? Math.max(...store.economy_shop.map(i => i.id)) : 0) + 1;
    const item = {
      id: newId,
      guild_id: guildId,
      role_id: roleId,
      name,
      price: parseInt(price, 10),
      description: description || ''
    };
    store.economy_shop.push(item);
    saveToDisk();
    return item;
  },

  removeShopItem(id, guildId) {
    if (!store.economy_shop) return false;
    const initialLen = store.economy_shop.length;
    store.economy_shop = store.economy_shop.filter(i => !(i.id === id && i.guild_id === guildId));
    const removed = initialLen - store.economy_shop.length > 0;
    if (removed) saveToDisk();
    return removed;
  },

  getShopItem(id, guildId) {
    if (!store.economy_shop) return null;
    return store.economy_shop.find(i => i.id === id && i.guild_id === guildId) || null;
  },

  // ===================== YOUTUBE NOTIFICATIONS =====================
  getYouTubeNotifications() {
    if (!store.youtube_notifications) store.youtube_notifications = [];
    return store.youtube_notifications;
  },

  addYouTubeNotification({ guildId, channelId, youtubeChannelId, customMessage }) {
    if (!store.youtube_notifications) store.youtube_notifications = [];
    const existingIndex = store.youtube_notifications.findIndex(n => n.guild_id === guildId && n.youtube_channel_id === youtubeChannelId);
    
    if (existingIndex > -1) {
      store.youtube_notifications[existingIndex] = {
        guild_id: guildId,
        channel_id: channelId,
        youtube_channel_id: youtubeChannelId,
        last_video_id: store.youtube_notifications[existingIndex].last_video_id || null,
        custom_message: customMessage || null
      };
    } else {
      store.youtube_notifications.push({
        guild_id: guildId,
        channel_id: channelId,
        youtube_channel_id: youtubeChannelId,
        last_video_id: null,
        custom_message: customMessage || null
      });
    }
    saveToDisk();
  },

  updateYouTubeLastVideo(guildId, youtubeChannelId, videoId) {
    const item = store.youtube_notifications.find(n => n.guild_id === guildId && n.youtube_channel_id === youtubeChannelId);
    if (item) {
      item.last_video_id = videoId;
      saveToDisk();
    }
  },

  removeYouTubeNotification(guildId, youtubeChannelId) {
    if (!store.youtube_notifications) return;
    store.youtube_notifications = store.youtube_notifications.filter(n => !(n.guild_id === guildId && n.youtube_channel_id === youtubeChannelId));
    saveToDisk();
  },

  // ===================== WEB SESSIONS =====================
  getSession(sessionId) {
    if (!store.web_sessions) store.web_sessions = {};
    const session = store.web_sessions[sessionId];
    if (session && session.expiresAt > Date.now()) {
      return session;
    }
    return null;
  },

  setSession(sessionId, data) {
    if (!store.web_sessions) store.web_sessions = {};
    store.web_sessions[sessionId] = data;
    saveToDisk();
  },

  deleteSession(sessionId) {
    if (!store.web_sessions) store.web_sessions = {};
    delete store.web_sessions[sessionId];
    saveToDisk();
  },

  // ===================== AUTO ANNOUNCEMENTS (AVISOS AGENDADOS) =====================
  getAnnouncements(guildId) {
    if (!store.auto_announcements) store.auto_announcements = [];
    return store.auto_announcements.filter(a => a.guild_id === guildId);
  },

  getAllActiveAnnouncements() {
    if (!store.auto_announcements) store.auto_announcements = [];
    return store.auto_announcements.filter(a => a.enabled);
  },

  createAnnouncement(guildId, data) {
    if (!store.auto_announcements) store.auto_announcements = [];
    const id = 'ann_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const item = {
      id,
      guild_id: guildId,
      channel_id: data.channel_id,
      title: data.title || null,
      message: data.message || '',
      color: data.color || '#5865F2',
      interval_minutes: parseInt(data.interval_minutes) || 60,
      enabled: data.enabled !== undefined ? Boolean(data.enabled) : true,
      last_sent_at: 0,
      created_at: Date.now()
    };
    store.auto_announcements.push(item);
    saveToDisk();
    return item;
  },

  updateAnnouncement(guildId, id, updates) {
    if (!store.auto_announcements) store.auto_announcements = [];
    const idx = store.auto_announcements.findIndex(a => a.id === id && a.guild_id === guildId);
    if (idx !== -1) {
      store.auto_announcements[idx] = { ...store.auto_announcements[idx], ...updates, guild_id: guildId };
      saveToDisk();
      return store.auto_announcements[idx];
    }
    return null;
  },

  deleteAnnouncement(guildId, id) {
    if (!store.auto_announcements) store.auto_announcements = [];
    const initialLen = store.auto_announcements.length;
    store.auto_announcements = store.auto_announcements.filter(a => !(a.id === id && a.guild_id === guildId));
    const removed = initialLen !== store.auto_announcements.length;
    if (removed) saveToDisk();
    return removed;
  },

  // ===================== ACTIVITY LOGS (FEED DE ATIVIDADES AO VIVO) =====================
  logActivity(guildId, { type = 'general', icon = '📌', title, description, user_tag = null, user_avatar = null, metadata = {} }) {
    if (!store.activity_logs) store.activity_logs = {};
    if (!store.activity_logs[guildId]) store.activity_logs[guildId] = [];

    const activity = {
      id: 'act_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      type, // 'ticket' | 'mod' | 'automod' | 'member' | 'economy' | 'general'
      icon,
      title,
      description,
      user_tag,
      user_avatar,
      metadata
    };

    store.activity_logs[guildId].unshift(activity);

    // Mantém no máximo os 100 eventos mais recentes por servidor
    if (store.activity_logs[guildId].length > 100) {
      store.activity_logs[guildId] = store.activity_logs[guildId].slice(0, 100);
    }

    saveToDisk();
    return activity;
  },

  getActivityLogs(guildId, limit = 50) {
    if (!store.activity_logs) store.activity_logs = {};
    if (!store.activity_logs[guildId]) store.activity_logs[guildId] = [];
    return store.activity_logs[guildId].slice(0, limit);
  },

  // ===================== SISTEMA SOCIAL DE CASAMENTO =====================
  getMarriage(userId) {
    if (!store.marriages) store.marriages = {};
    return store.marriages[userId] || null;
  },

  createMarriage(user1Id, user2Id, guildId, ringType = '💍 Aliança de Ouro') {
    if (!store.marriages) store.marriages = {};
    const marriedAt = Date.now();
    const data1 = {
      partner_id: user2Id,
      married_at: marriedAt,
      ring_type: ringType,
      affinity: 10,
      guild_id: guildId
    };
    const data2 = {
      partner_id: user1Id,
      married_at: marriedAt,
      ring_type: ringType,
      affinity: 10,
      guild_id: guildId
    };

    store.marriages[user1Id] = data1;
    store.marriages[user2Id] = data2;
    saveToDisk();
    return data1;
  },

  deleteMarriage(userId) {
    if (!store.marriages) store.marriages = {};
    const marriage = store.marriages[userId];
    if (marriage) {
      const partnerId = marriage.partner_id;
      delete store.marriages[userId];
      if (partnerId) delete store.marriages[partnerId];
      saveToDisk();
      return true;
    }
    return false;
  },

  addAffinity(userId, points = 1) {
    if (!store.marriages) store.marriages = {};
    const marriage = store.marriages[userId];
    if (marriage) {
      marriage.affinity = (marriage.affinity || 0) + points;
      const partner = store.marriages[marriage.partner_id];
      if (partner) partner.affinity = marriage.affinity;
      saveToDisk();
      return marriage.affinity;
    }
    return 0;
  },

  // ===================== HUB DE CRIADORES & LIVES =====================
  getCreators(guildId) {
    if (!store.creator_notifications) store.creator_notifications = [];
    return store.creator_notifications.filter(c => c.guild_id === guildId);
  },

  getAllActiveCreators() {
    if (!store.creator_notifications) store.creator_notifications = [];
    return store.creator_notifications.filter(c => c.enabled);
  },

  createCreator(guildId, { platform, username, channel_id, ping_role_id = null, custom_message = '', color = '#5865F2' }) {
    if (!store.creator_notifications) store.creator_notifications = [];
    const item = {
      id: 'cr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      guild_id: guildId,
      platform: platform.toLowerCase(),
      username: username.trim(),
      channel_id,
      ping_role_id: ping_role_id || null,
      custom_message: custom_message.trim(),
      color: color || '#5865F2',
      enabled: 1,
      last_id: null,
      is_live: false,
      last_checked_at: 0
    };
    store.creator_notifications.push(item);
    saveToDisk();
    return item;
  },

  updateCreator(guildId, id, updates) {
    if (!store.creator_notifications) store.creator_notifications = [];
    const item = store.creator_notifications.find(c => c.guild_id === guildId && c.id === id);
    if (item) {
      Object.assign(item, updates);
      saveToDisk();
      return item;
    }
    return null;
  },

  deleteCreator(guildId, id) {
    if (!store.creator_notifications) store.creator_notifications = [];
    const initialLen = store.creator_notifications.length;
    store.creator_notifications = store.creator_notifications.filter(c => !(c.guild_id === guildId && c.id === id));
    const deleted = store.creator_notifications.length !== initialLen;
    if (deleted) saveToDisk();
    return deleted;
  },

  updateCreatorState(id, updates) {
    if (!store.creator_notifications) store.creator_notifications = [];
    const item = store.creator_notifications.find(c => c.id === id);
    if (item) {
      Object.assign(item, updates);
      saveToDisk();
    }
  }
};

module.exports = DatabaseManager;
