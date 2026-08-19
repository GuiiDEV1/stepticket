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
        automod_antimassmention: 0
      };
      saveToDisk();
    }
    return store.guild_config[guildId];
  },

  updateConfig(guildId, updates) {
    const current = this.getConfig(guildId);
    store.guild_config[guildId] = { ...current, ...updates };
    saveToDisk();
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
  }
};

module.exports = DatabaseManager;
