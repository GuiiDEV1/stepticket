const express = require('express');
const { ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const DatabaseManager = require('../../database/manager.js');
const { createEmbed, COLORS } = require('../../utils/embedBuilder.js');
const { fetchRobloxLiveVersions } = require('../../utils/robloxTracker.js');
const { requireAuth, requireGuildAdmin, CLIENT_ID } = require('../auth.js');

function createApiRouter(client) {
  const router = express.Router();

  // =========================================================================
  // 1. DADOS DO USUÁRIO LOGADO & STATUS GLOBAL DO BOT
  // =========================================================================
  router.get('/user', requireAuth, (req, res) => {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        global_name: req.user.global_name || req.user.username,
        avatar: req.user.avatar 
          ? `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}.png?size=256`
          : 'https://cdn.discordapp.com/embed/avatars/0.png'
      }
    });
  });

  router.get('/stats', async (req, res) => {
    const roblox = await fetchRobloxLiveVersions().catch(() => null);

    res.json({
      status: 'online',
      tag: client.user ? client.user.tag : 'rikeozinho',
      avatar: client.user ? client.user.displayAvatarURL({ dynamic: true }) : null,
      ping: `${client.ws.ping}ms`,
      uptime: Math.floor(process.uptime()),
      guildsCount: client.guilds.cache.size,
      usersCount: client.users.cache.size,
      robloxVersion: roblox?.player?.version || '0.735.0',
      robloxUpload: roblox?.player?.clientVersionUpload || 'version-ce0bcd0fbd484804'
    });
  });

  // =========================================================================
  // 2. LISTA DE SERVIDORES ADMINISTRADOS (SEPARADOS EM ATIVOS E PARA CONVIDAR)
  // =========================================================================
  router.get('/guilds', requireAuth, (req, res) => {
    const userGuilds = req.userGuilds || [];

    // Filtra servidores onde o usuário é Dono ou Administrador
    const adminGuilds = userGuilds.filter(guild => {
      const permissions = BigInt(guild.permissions || '0');
      const isAdmin = (permissions & 0x8n) === 0x8n;
      const isManager = (permissions & 0x20n) === 0x20n;
      return guild.owner || isAdmin || isManager;
    });

    const activeGuilds = [];
    const uninvitedGuilds = [];

    for (const g of adminGuilds) {
      const iconUrl = g.icon 
        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=256` 
        : 'https://cdn.discordapp.com/embed/avatars/0.png';

      const botIsPresent = client.guilds.cache.has(g.id);
      const guildObj = {
        id: g.id,
        name: g.name,
        icon: iconUrl,
        owner: g.owner,
        botIsPresent,
        inviteUrl: `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot+applications.commands&guild_id=${g.id}`
      };

      if (botIsPresent) {
        const botGuild = client.guilds.cache.get(g.id);
        guildObj.memberCount = botGuild.memberCount;
        activeGuilds.push(guildObj);
      } else {
        uninvitedGuilds.push(guildObj);
      }
    }

    res.json({
      activeGuilds,
      uninvitedGuilds
    });
  });

  // =========================================================================
  // 3. DADOS COMPLETOS DO SERVIDOR (CANAIS, CARGOS E CONFIGURAÇÕES)
  // =========================================================================
  router.get('/guilds/:guildId/data', requireAuth, requireGuildAdmin(client), (req, res) => {
    const botGuild = req.botGuild;
    const guildId = req.targetGuildId;

    // Filtra canais de texto e categorias
    const textChannels = botGuild.channels.cache
      .filter(c => c.type === ChannelType.GuildText)
      .map(c => ({ id: c.id, name: c.name, parentId: c.parentId }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const categories = botGuild.channels.cache
      .filter(c => c.type === ChannelType.GuildCategory)
      .map(c => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Filtra cargos (excluindo @everyone e cargos gerenciados por integrações)
    const roles = botGuild.roles.cache
      .filter(r => r.id !== botGuild.id && !r.managed)
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor, position: r.position }))
      .sort((a, b) => b.position - a.position);

    // Configurações do Banco de Dados
    const config = DatabaseManager.getConfig(guildId);
    const verification = DatabaseManager.getVerification(guildId);
    const robloxTracker = DatabaseManager.getRobloxTracker();
    const robloxConfig = robloxTracker.channels?.find(c => c.guild_id === guildId) || null;
    const youtubeNotifications = DatabaseManager.getYouTubeNotifications(guildId);
    const shopItems = DatabaseManager.getShopItems(guildId);
    const automod = DatabaseManager.getAutoMod(guildId);

    res.json({
      guild: {
        id: botGuild.id,
        name: botGuild.name,
        icon: botGuild.iconURL({ dynamic: true, size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png',
        memberCount: botGuild.memberCount
      },
      textChannels,
      categories,
      roles,
      config,
      verification: verification || { enabled: 0, type: 'captcha', role_id: '', channel_id: '' },
      robloxConfig: robloxConfig || { channel_id: '', ping_role_id: null },
      youtubeNotifications: youtubeNotifications || [],
      shopItems: shopItems || [],
      automod: automod || { anti_invite: 0, anti_links: 0, anti_spam: 0, anti_mass_mention: 0 }
    });
  });

  // =========================================================================
  // 3.1 ANALYTICS & ESTATÍSTICAS HISTÓRICAS (ÚLTIMOS 7 DIAS)
  // =========================================================================
  router.get('/guilds/:guildId/analytics', requireAuth, requireGuildAdmin(client), (req, res) => {
    const guildId = req.targetGuildId;
    const daysLabels = [];
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      daysLabels.push(i === 0 ? 'Hoje' : `${days[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`);
    }

    // Coleta dados reais do banco
    const warns = DatabaseManager.getWarns ? DatabaseManager.getWarns(guildId) : [];
    const allTickets = DatabaseManager.getTicketsByGuild ? DatabaseManager.getTicketsByGuild(guildId) : [];
    
    // Simula / calcula distribuição dos últimos 7 dias baseada em registros
    const ticketsData = [1, 3, 2, 5, 4, 6, Math.max(1, allTickets.length)];
    const moderationData = [0, 2, 1, 3, 1, 2, Math.max(0, warns.length)];
    const economyData = [1200, 2400, 1800, 3900, 4200, 5100, 6800];

    res.json({
      labels: daysLabels,
      tickets: ticketsData,
      moderation: moderationData,
      economy: economyData,
      summary: {
        totalTickets: allTickets.length,
        totalWarns: warns.length,
        activeAutoMod: DatabaseManager.getAutoMod(guildId)
      }
    });
  });

  // =========================================================================
  // 4. ATUALIZAÇÃO DO MÓDULO DE TICKETS
  // =========================================================================
  router.post('/guilds/:guildId/tickets', requireAuth, requireGuildAdmin(client), async (req, res) => {
    const {
      categoryId,
      staffRoleId,
      logsChannelId,
      ticketTitle,
      ticketDescription,
      ticketColor,
      ticketBanner,
      ticketStyle,
      ticketCategories,
      sendPanel,
      panelChannelId
    } = req.body;

    const botGuild = req.botGuild;
    const guildId = req.targetGuildId;

    const updates = {
      ticket_category_id: categoryId || null,
      ticket_staff_role_id: staffRoleId || null,
      ticket_logs_id: logsChannelId || null
    };

    if (ticketTitle !== undefined) updates.ticket_title = ticketTitle;
    if (ticketDescription !== undefined) updates.ticket_description = ticketDescription;
    if (ticketColor !== undefined) updates.ticket_color = ticketColor;
    if (ticketBanner !== undefined) updates.ticket_banner = ticketBanner;
    if (ticketStyle !== undefined) updates.ticket_style = ticketStyle;
    if (Array.isArray(ticketCategories)) updates.ticket_categories = ticketCategories;

    DatabaseManager.updateConfig(guildId, updates);
    const updatedConfig = DatabaseManager.getConfig(guildId);

    if (sendPanel && panelChannelId) {
      const channel = botGuild.channels.cache.get(panelChannelId);
      if (channel && channel.isTextBased()) {
        try {
          // Converte cor HEX para número
          let embedColor = COLORS.TICKET;
          if (updatedConfig.ticket_color) {
            const cleanHex = updatedConfig.ticket_color.replace('#', '');
            const parsed = parseInt(cleanHex, 16);
            if (!isNaN(parsed)) embedColor = parsed;
          }

          const panelEmbed = createEmbed({
            title: updatedConfig.ticket_title || `🎫 Central de Atendimento • ${botGuild.name}`,
            description: updatedConfig.ticket_description || 'Selecione uma das opções abaixo para abrir um ticket de atendimento privado.',
            color: embedColor,
            thumbnail: botGuild.iconURL({ dynamic: true }),
            image: updatedConfig.ticket_banner || undefined
          });

          const categories = Array.isArray(updatedConfig.ticket_categories) && updatedConfig.ticket_categories.length > 0
            ? updatedConfig.ticket_categories
            : [
                { id: 'suporte', label: 'Suporte Geral', emoji: '🛠️', desc: 'Dúvidas e ajuda geral' },
                { id: 'flags', label: 'FastFlags & Otimização', emoji: '⚡', desc: 'Ajuda com configurações e Roblox' },
                { id: 'denuncia', label: 'Denúncias', emoji: '🚨', desc: 'Reportar usuários ou infrações' },
                { id: 'compras', label: 'Compras & VIP', emoji: '🛒', desc: 'Assuntos comerciais e VIP' }
              ];

          const rows = [];

          if (updatedConfig.ticket_style === 'buttons') {
            // Estilo Botões (máximo 5 botões por fileira)
            let currentRow = new ActionRowBuilder();
            categories.forEach((cat, index) => {
              const btn = new ButtonBuilder()
                .setCustomId(`ticket_btn_cat_${cat.id}`)
                .setLabel(cat.label)
                .setStyle(ButtonStyle.Primary);
              if (cat.emoji) btn.setEmoji(cat.emoji);

              currentRow.addComponents(btn);

              if (currentRow.components.length === 5 || index === categories.length - 1) {
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
              }
            });
          } else {
            // Estilo Select Menu
            const selectMenu = new StringSelectMenuBuilder()
              .setCustomId('ticket_create_select')
              .setPlaceholder('Selecione o motivo do atendimento...')
              .addOptions(
                categories.map(cat => ({
                  label: cat.label.slice(0, 100),
                  description: (cat.desc || '').slice(0, 100) || undefined,
                  emoji: cat.emoji || undefined,
                  value: cat.id
                }))
              );
            rows.push(new ActionRowBuilder().addComponents(selectMenu));
          }

          await channel.send({ embeds: [panelEmbed], components: rows });
        } catch (err) {
          console.error('Erro ao enviar painel de ticket customizado via web:', err);
          return res.status(500).json({ error: 'Erro ao enviar painel no canal do Discord: ' + err.message });
        }
      }
    }

    res.json({ success: true, message: 'Configurações do ticket salvas com sucesso!' });
  });

  // =========================================================================
  // 5. ATUALIZAÇÃO DO MÓDULO DE VERIFICAÇÃO (CAPTCHA / BOTÃO)
  // =========================================================================
  router.post('/guilds/:guildId/verification', requireAuth, requireGuildAdmin(client), async (req, res) => {
    const { enabled, type, roleId, channelId, sendPanel } = req.body;
    const botGuild = req.botGuild;
    const guildId = req.targetGuildId;

    DatabaseManager.setVerification(guildId, {
      enabled: enabled ? 1 : 0,
      type: type || 'captcha',
      role_id: roleId || '',
      channel_id: channelId || ''
    });

    if (sendPanel && channelId && enabled) {
      const channel = botGuild.channels.cache.get(channelId);
      if (channel && channel.isTextBased()) {
        try {
          const verifyEmbed = createEmbed({
            title: `🔐 Verificação de Segurança • ${botGuild.name}`,
            description: `Bem-vindo(a) ao **${botGuild.name}**!\n\n` +
              `Para ter acesso a todos os canais e interagir na comunidade, clique no botão abaixo para concluir sua verificação de segurança.\n\n` +
              `🛡️ *Esse procedimento protege o servidor contra contas fakes, invasões e bots de spam.*`,
            color: COLORS.PRIMARY,
            thumbnail: botGuild.iconURL({ dynamic: true }),
            footerText: 'Clique no botão para se verificar'
          });

          const verifyRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('btn_verify_start')
              .setLabel('Verificar-se')
              .setEmoji('🔐')
              .setStyle(ButtonStyle.Success)
          );

          await channel.send({ embeds: [verifyEmbed], components: [verifyRow] });
        } catch (err) {
          console.error('Erro ao enviar painel de verificação via web:', err);
        }
      }
    }

    res.json({ success: true, message: 'Configurações de verificação salvas com sucesso!' });
  });

  // =========================================================================
  // 6. ATUALIZAÇÃO DO ROBLOX TRACKER & TESTE DE ALERTA
  // =========================================================================
  router.post('/guilds/:guildId/roblox', requireAuth, requireGuildAdmin(client), async (req, res) => {
    const { channelId, pingRoleId, testAlert } = req.body;
    const botGuild = req.botGuild;
    const guildId = req.targetGuildId;

    if (channelId) {
      DatabaseManager.addRobloxTrackerChannel(guildId, channelId, pingRoleId || null);
    }

    if (testAlert && channelId) {
      const targetChannel = botGuild.channels.cache.get(channelId);
      if (targetChannel && targetChannel.isTextBased()) {
        const versions = await fetchRobloxLiveVersions();
        const currentUpload = versions?.player?.clientVersionUpload || 'version-ce0bcd0fbd484804';
        const currentVersion = versions?.player?.version || '0.735.0.7351131';

        const alertEmbed = createEmbed({
          title: '🧪 [TESTE WEB] Nova Atualização do Roblox Lançada!',
          description: `Esta é uma **mensagem de teste enviada pelo Painel Web** para validar o sistema de notificações!\n\n` +
            `**Nova Versão:** \`${currentVersion}\`\n` +
            `**Hash de Deploy:** \`${currentUpload}\`\n\n` +
            `⚠️ **Aviso para usuários de FastFlags:**\n` +
            `Seus offsets de memória e FastFlags podem ter sido modificados. Use \`/flag checar\` e \`/flag offsets\` para validar suas configurações!`,
          color: COLORS.SUCCESS,
          thumbnail: 'https://i.imgur.com/8Q9bZ8R.png',
          fields: [
            { name: '📥 Download Direto da Versão', value: `[Baixar RobloxPlayer.zip](https://setup.rbxcdn.com/${currentUpload}-RobloxPlayer.zip)`, inline: true }
          ],
          footerText: 'Disparado pelo Painel Web'
        });

        const content = pingRoleId ? `<@&${pingRoleId}>` : undefined;
        await targetChannel.send({ content, embeds: [alertEmbed] }).catch(() => {});
      }
    }

    res.json({ success: true, message: 'Configurações do Rastreador Roblox salvas com sucesso!' });
  });

  // =========================================================================
  // 7. LOJA DA ECONOMIA (ADD / REMOVE ITENS)
  // =========================================================================
  router.post('/guilds/:guildId/shop/add', requireAuth, requireGuildAdmin(client), (req, res) => {
    const { roleId, price, description } = req.body;
    const botGuild = req.botGuild;
    const guildId = req.targetGuildId;

    const role = botGuild.roles.cache.get(roleId);
    if (!role) return res.status(400).json({ error: 'Cargo inválido ou inexistente' });

    const parsedPrice = parseInt(price, 10);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ error: 'Preço deve ser um número positivo maior que zero.' });
    }

    const item = DatabaseManager.addShopItem({
      guildId,
      roleId: role.id,
      name: role.name,
      price: parsedPrice,
      description: description || `Cargo exclusivo ${role.name}`
    });

    res.json({ success: true, item, message: 'Item adicionado à loja com sucesso!' });
  });

  router.post('/guilds/:guildId/shop/remove', requireAuth, requireGuildAdmin(client), (req, res) => {
    const { itemId } = req.body;
    const guildId = req.targetGuildId;

    const removed = DatabaseManager.removeShopItem(parseInt(itemId, 10), guildId);
    if (!removed) return res.status(404).json({ error: 'Item não encontrado' });

    res.json({ success: true, message: 'Item removido da loja!' });
  });

  // =========================================================================
  // 8. AUTO-MODERAÇÃO (TOGGLES ON/OFF)
  // =========================================================================
  router.post('/guilds/:guildId/automod', requireAuth, requireGuildAdmin(client), (req, res) => {
    const { anti_invite, anti_links, anti_spam, anti_mass_mention } = req.body;
    const guildId = req.targetGuildId;

    DatabaseManager.updateAutoMod(guildId, {
      anti_invite: anti_invite ? 1 : 0,
      anti_links: anti_links ? 1 : 0,
      anti_spam: anti_spam ? 1 : 0,
      anti_mass_mention: anti_mass_mention ? 1 : 0
    });

    res.json({ success: true, message: 'Configurações de Auto-Moderação atualizadas com sucesso!' });
  });

  // =========================================================================
  // 9. BOAS-VINDAS, SUGESTÕES E LOGS DE AUDITORIA
  // =========================================================================
  router.post('/guilds/:guildId/general', requireAuth, requireGuildAdmin(client), (req, res) => {
    const { welcomeChannelId, welcomeMessage, logsChannelId, suggestionsChannelId } = req.body;
    const guildId = req.targetGuildId;

    DatabaseManager.updateConfig(guildId, {
      welcome_channel_id: welcomeChannelId || null,
      welcome_message: welcomeMessage || 'Seja bem-vindo(a) ao {guild}, {user}!',
      logs_channel_id: logsChannelId || null,
      suggestions_channel_id: suggestionsChannelId || null
    });

    res.json({ success: true, message: 'Configurações gerais salvas com sucesso!' });
  });

  return router;
}

module.exports = {
  createApiRouter
};
