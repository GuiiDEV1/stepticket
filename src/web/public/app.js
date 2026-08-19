// Recupera o ID numérico do servidor a partir da URL (/dashboard/123456789)
const match = window.location.pathname.match(/\/dashboard\/([0-9]+)/);
const guildId = match ? match[1] : '';

let serverData = null;

// =========================================================================
// TOAST NOTIFICATIONS
// =========================================================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}" style="color: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// =========================================================================
// TAB SWITCHING
// =========================================================================
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
}

// =========================================================================
// POPULATE DROPDOWNS
// =========================================================================
function populateSelect(selectId, items, selectedValue, allowNone = true, noneLabel = 'Nenhum / Desativado') {
  const select = document.getElementById(selectId);
  if (!select) return;

  let html = allowNone ? `<option value="">-- ${noneLabel} --</option>` : '';
  (items || []).forEach(item => {
    const isSelected = item.id === selectedValue ? 'selected' : '';
    html += `<option value="${item.id}" ${isSelected}># ${item.name}</option>`;
  });
  select.innerHTML = html;
}

function populateRoleSelect(selectId, roles, selectedValue, allowNone = true) {
  const select = document.getElementById(selectId);
  if (!select) return;

  let html = allowNone ? `<option value="">-- Nenhum Cargo Selecionado --</option>` : '';
  (roles || []).forEach(role => {
    const isSelected = role.id === selectedValue ? 'selected' : '';
    html += `<option value="${role.id}" ${isSelected}>@ ${role.name}</option>`;
  });
  select.innerHTML = html;
}

// =========================================================================
// CARREGAR DADOS DO SERVIDOR
// =========================================================================
async function loadServerData() {
  if (!guildId) {
    window.location.href = '/dashboard';
    return;
  }

  try {
    // 1. Dados do Usuário
    const userRes = await fetch('/api/user');
    if (userRes.status === 401) {
      window.location.href = '/auth/login';
      return;
    }
    const userData = await userRes.json();
    if (userData.user) {
      document.getElementById('user-avatar').src = userData.user.avatar;
      document.getElementById('user-name').innerText = userData.user.global_name;
    }

    // 2. Dados do Servidor
    const res = await fetch(`/api/guilds/${guildId}/data`);
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/auth/login';
        return;
      }
      const err = await res.json().catch(() => ({ error: 'Servidor indisponível ou permissão insuficiente' }));
      showToast(err.error || 'Falha ao acessar o servidor', 'error');
      setTimeout(() => { window.location.href = '/dashboard'; }, 3000);
      return;
    }

    serverData = await res.json();

    // Header
    if (serverData.guild) {
      document.getElementById('guild-icon-header').src = serverData.guild.icon;
      document.getElementById('guild-name-header').innerText = serverData.guild.name;
    }

    // Overview Tab
    document.getElementById('ov-members').innerText = (serverData.guild?.memberCount || 0).toLocaleString('pt-BR');
    document.getElementById('ov-channels').innerText = (serverData.textChannels || []).length;
    document.getElementById('ov-roles').innerText = (serverData.roles || []).length;

    // Tickets Tab
    populateSelect('ticket-category', serverData.categories, serverData.config?.ticket_category_id, true, 'Sem Categoria');
    populateRoleSelect('ticket-staff-role', serverData.roles, serverData.config?.ticket_staff_role_id);
    populateSelect('ticket-logs-channel', serverData.textChannels, serverData.config?.ticket_logs_id);
    populateSelect('ticket-panel-channel', serverData.textChannels, '', false);

    // Campos Customizados de Ticket
    document.getElementById('ticket-title').value = serverData.config?.ticket_title || '🎫 Central de Atendimento';
    document.getElementById('ticket-desc').value = serverData.config?.ticket_description || 'Precisa de suporte, tirar dúvidas, fazer compras ou denunciar algo?\n\nSelecione uma das opções abaixo para abrir um ticket privado.';
    document.getElementById('ticket-color').value = serverData.config?.ticket_color || '#5865F2';
    document.getElementById('ticket-color-picker').value = serverData.config?.ticket_color || '#5865F2';
    document.getElementById('ticket-style').value = serverData.config?.ticket_style || 'select';
    document.getElementById('ticket-banner').value = serverData.config?.ticket_banner || '';

    currentTicketCategories = Array.isArray(serverData.config?.ticket_categories) && serverData.config.ticket_categories.length > 0
      ? JSON.parse(JSON.stringify(serverData.config.ticket_categories))
      : [
          { id: 'suporte', label: 'Suporte Geral', emoji: '🛠️', desc: 'Dúvidas e ajuda geral' },
          { id: 'flags', label: 'FastFlags & Otimização', emoji: '⚡', desc: 'Ajuda com configurações e Roblox' },
          { id: 'denuncia', label: 'Denúncias', emoji: '🚨', desc: 'Reportar usuários ou infrações' },
          { id: 'compras', label: 'Compras & VIP', emoji: '🛒', desc: 'Assuntos comerciais e VIP' }
        ];

    renderTicketCategories();

    // Verification Tab
    document.getElementById('verify-enabled').checked = Boolean(serverData.verification?.enabled);
    document.getElementById('verify-type').value = serverData.verification?.type || 'captcha';
    populateRoleSelect('verify-role', serverData.roles, serverData.verification?.role_id);
    populateSelect('verify-channel', serverData.textChannels, serverData.verification?.channel_id);

    // Roblox Tracker Tab
    populateSelect('roblox-channel', serverData.textChannels, serverData.robloxConfig?.channel_id);
    populateRoleSelect('roblox-ping-role', serverData.roles, serverData.robloxConfig?.ping_role_id);

    // Loja Tab
    populateRoleSelect('shop-role', serverData.roles, '', false);
    renderShopItems();

    // AutoMod & Security Tab
    document.getElementById('am-invite').checked = Boolean(serverData.automod?.anti_invite);
    document.getElementById('am-links').checked = Boolean(serverData.automod?.anti_links);
    document.getElementById('am-spam').checked = Boolean(serverData.automod?.anti_spam);
    document.getElementById('am-mention').checked = Boolean(serverData.automod?.anti_mass_mention);

    // Anti-Alt Shield
    document.getElementById('sec-anti-alt').checked = Boolean(serverData.config?.security_anti_alt_enabled);
    document.getElementById('sec-min-age').value = serverData.config?.security_min_account_age || '7';
    document.getElementById('sec-action').value = serverData.config?.security_alt_action || 'kick';
    populateRoleSelect('sec-quarantine-role', serverData.roles, serverData.config?.security_quarantine_role_id);

    // General / Welcome Tab
    populateSelect('welcome-channel', serverData.textChannels, serverData.config?.welcome_channel_id);
    document.getElementById('welcome-msg').value = serverData.config?.welcome_message || '';
    populateSelect('logs-channel', serverData.textChannels, serverData.config?.logs_channel_id);
    populateSelect('suggestions-channel', serverData.textChannels, serverData.config?.suggestions_channel_id);

    // Announcements Tab
    populateSelect('ann-channel', serverData.textChannels, '', false);
    renderAnnouncements();

    // Activity Feed Tab
    renderActivityFeed();

    // Inicializa Gráficos na aba Visão Geral
    initCharts();

  } catch (err) {
    console.error('Erro ao carregar dados do servidor:', err);
    showToast('Falha na comunicação com o servidor.', 'error');
  }
}

// =========================================================================
// GRÁFICOS CHART.JS (ESTATÍSTICAS & ANALYTICS)
// =========================================================================
let activityChart = null;
let economyChart = null;

async function initCharts() {
  try {
    const res = await fetch(`/api/guilds/${guildId}/analytics`);
    if (!res.ok) return;
    const data = await res.json();

    // 1. Gráfico de Atendimento & Moderação (Área / Linhas Neon)
    const ctx1 = document.getElementById('chart-activity');
    if (ctx1) {
      if (activityChart) activityChart.destroy();
      activityChart = new Chart(ctx1, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [
            {
              label: 'Tickets Abertos',
              data: data.tickets,
              borderColor: '#5865F2',
              backgroundColor: 'rgba(88, 101, 242, 0.15)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Ações de Moderação',
              data: data.moderation,
              borderColor: '#ED4245',
              backgroundColor: 'rgba(237, 66, 69, 0.15)',
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#B5BAC1', font: { family: 'Inter' } } }
          },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#949BA4' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#949BA4', stepSize: 1 } }
          }
        }
      });
    }

    // 2. Gráfico da Economia (Barras)
    const ctx2 = document.getElementById('chart-economy');
    if (ctx2) {
      if (economyChart) economyChart.destroy();
      economyChart = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: data.labels,
          datasets: [
            {
              label: 'Coins Movimentados',
              data: data.economy,
              backgroundColor: 'rgba(254, 231, 92, 0.65)',
              borderColor: '#FEE75C',
              borderWidth: 1,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#B5BAC1', font: { family: 'Inter' } } }
          },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#949BA4' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#949BA4' } }
          }
        }
      });
    }
  } catch (err) {
    console.warn('Erro ao carregar gráficos:', err);
  }
}

// =========================================================================
// GERENCIADOR DE CATEGORIAS DINÂMICAS & PREVIEW DE TICKETS
// =========================================================================
function renderTicketCategories() {
  const container = document.getElementById('ticket-categories-container');
  if (!container) return;

  if (currentTicketCategories.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 8px;">Nenhuma categoria adicionada. Clique em "Nova Opção" acima.</div>';
    updateTicketPreview();
    return;
  }

  container.innerHTML = currentTicketCategories.map((cat, index) => `
    <div style="display: grid; grid-template-columns: 70px 180px 1fr 40px; gap: 8px; align-items: center; background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color);">
      <input type="text" class="form-control" value="${cat.emoji || ''}" placeholder="Emoji" style="padding: 6px 8px; text-align: center;" oninput="currentTicketCategories[${index}].emoji = this.value; updateTicketPreview();">
      <input type="text" class="form-control" value="${cat.label || ''}" placeholder="Nome (ex: Compras)" style="padding: 6px 10px;" oninput="currentTicketCategories[${index}].label = this.value; updateTicketPreview();">
      <input type="text" class="form-control" value="${cat.desc || ''}" placeholder="Descrição opcional" style="padding: 6px 10px;" oninput="currentTicketCategories[${index}].desc = this.value; updateTicketPreview();">
      <button type="button" class="btn btn-danger" style="padding: 6px 8px; font-size: 0.75rem;" onclick="removeTicketCategory(${index})"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join('');

  updateTicketPreview();
}

function addTicketCategoryRow() {
  const newId = 'cat_' + Date.now().toString(36);
  currentTicketCategories.push({
    id: newId,
    label: 'Nova Opção',
    emoji: '📌',
    desc: 'Descrição do atendimento'
  });
  renderTicketCategories();
}

function removeTicketCategory(index) {
  currentTicketCategories.splice(index, 1);
  renderTicketCategories();
}

function updateTicketPreview() {
  const title = document.getElementById('ticket-title')?.value || '🎫 Central de Atendimento';
  const desc = document.getElementById('ticket-desc')?.value || 'Selecione uma das opções abaixo para abrir um ticket privado.';
  const color = document.getElementById('ticket-color')?.value || '#5865F2';
  const banner = document.getElementById('ticket-banner')?.value || '';
  const style = document.getElementById('ticket-style')?.value || 'select';

  const previewBox = document.getElementById('discord-preview-box');
  if (previewBox) {
    previewBox.style.borderLeftColor = color;
  }

  const titleEl = document.getElementById('preview-title');
  if (titleEl) titleEl.innerText = title;

  const descEl = document.getElementById('preview-desc');
  if (descEl) descEl.innerText = desc;

  const imgEl = document.getElementById('preview-image');
  if (imgEl) {
    if (banner && banner.startsWith('http')) {
      imgEl.src = banner;
      imgEl.style.display = 'block';
    } else {
      imgEl.style.display = 'none';
    }
  }

  const compEl = document.getElementById('preview-components');
  if (compEl) {
    if (style === 'buttons') {
      compEl.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
          ${currentTicketCategories.map(c => `
            <div style="background: #5865F2; color: #FFFFFF; font-size: 0.85rem; font-weight: 500; padding: 6px 14px; border-radius: 4px; display: inline-flex; align-items: center; gap: 6px; cursor: default;">
              <span>${c.emoji || ''}</span>
              <span>${c.label || 'Opção'}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      compEl.innerHTML = `
        <div style="background: #1E1F22; color: #949BA4; border: 1px solid #383A40; border-radius: 4px; padding: 8px 12px; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <span>Selecione o motivo do atendimento...</span>
          <i class="fa-solid fa-chevron-down" style="font-size: 0.75rem;"></i>
        </div>
      `;
    }
  }
}

// =========================================================================
// SALVAR MÓDULOS
// =========================================================================

// 1. Tickets (Salvar e Enviar Painel)
async function saveTickets(e, sendPanel = false) {
  if (e) e.preventDefault();
  const panelChannelId = document.getElementById('ticket-panel-channel').value;
  if (sendPanel && !panelChannelId) {
    return showToast('Selecione um canal para enviar o painel.', 'error');
  }

  const body = {
    categoryId: document.getElementById('ticket-category').value,
    staffRoleId: document.getElementById('ticket-staff-role').value,
    logsChannelId: document.getElementById('ticket-logs-channel').value,
    ticketTitle: document.getElementById('ticket-title').value,
    ticketDescription: document.getElementById('ticket-desc').value,
    ticketColor: document.getElementById('ticket-color').value,
    ticketBanner: document.getElementById('ticket-banner').value,
    ticketStyle: document.getElementById('ticket-style').value,
    ticketCategories: currentTicketCategories,
    sendPanel,
    panelChannelId: sendPanel ? panelChannelId : undefined
  };

  const res = await fetch(`/api/guilds/${guildId}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (data.success) {
    showToast(sendPanel ? 'Painel customizado enviado com sucesso no canal!' : data.message);
  } else {
    showToast(data.error || 'Erro ao salvar', 'error');
  }
}

function sendTicketPanel() {
  saveTickets(null, true);
}

// 2. Verificação
async function saveVerification(e, sendPanel = false) {
  if (e) e.preventDefault();
  const body = {
    enabled: document.getElementById('verify-enabled').checked,
    type: document.getElementById('verify-type').value,
    roleId: document.getElementById('verify-role').value,
    channelId: document.getElementById('verify-channel').value,
    sendPanel
  };

  const res = await fetch(`/api/guilds/${guildId}/verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (data.success) showToast(sendPanel ? 'Painel de verificação enviado!' : data.message);
  else showToast(data.error || 'Erro ao salvar', 'error');
}

function sendVerifyPanel() {
  saveVerification(null, true);
}

// 3. Roblox Tracker
async function saveRoblox(e, testAlert = false) {
  if (e) e.preventDefault();
  const body = {
    channelId: document.getElementById('roblox-channel').value,
    pingRoleId: document.getElementById('roblox-ping-role').value,
    testAlert
  };

  const res = await fetch(`/api/guilds/${guildId}/roblox`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (data.success) showToast(testAlert ? 'Alerta de teste enviado no canal!' : data.message);
  else showToast(data.error || 'Erro ao salvar', 'error');
}

function testRobloxAlert() {
  saveRoblox(null, true);
}

// 4. Loja
function renderShopItems() {
  const tbody = document.getElementById('shop-items-table');
  if (!serverData || !serverData.shopItems || serverData.shopItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Nenhum cargo à venda.</td></tr>';
    return;
  }

  tbody.innerHTML = serverData.shopItems.map(item => `
    <tr>
      <td><code>#${item.id}</code></td>
      <td><strong>@ ${item.name}</strong></td>
      <td>🪙 ${item.price.toLocaleString('pt-BR')}</td>
      <td style="color: var(--text-muted);">${item.description || '-'}</td>
      <td>
        <button class="btn btn-danger" style="padding: 4px 10px; font-size: 0.8rem;" onclick="removeShopItem(${item.id})">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

async function addShopItem(e) {
  e.preventDefault();
  const roleId = document.getElementById('shop-role').value;
  const price = document.getElementById('shop-price').value;
  const description = document.getElementById('shop-desc').value;

  const res = await fetch(`/api/guilds/${guildId}/shop/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roleId, price, description })
  });

  const data = await res.json();
  if (data.success) {
    showToast(data.message);
    if (!serverData.shopItems) serverData.shopItems = [];
    serverData.shopItems.push(data.item);
    renderShopItems();
    document.getElementById('shop-price').value = '';
    document.getElementById('shop-desc').value = '';
  } else {
    showToast(data.error || 'Erro ao adicionar item', 'error');
  }
}

async function removeShopItem(itemId) {
  const res = await fetch(`/api/guilds/${guildId}/shop/remove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId })
  });

  const data = await res.json();
  if (data.success) {
    showToast(data.message);
    serverData.shopItems = serverData.shopItems.filter(i => i.id !== itemId);
    renderShopItems();
  } else {
    showToast(data.error || 'Erro ao remover item', 'error');
  }
}

// 5. AutoMod & Segurança
async function saveAutoMod(e) {
  if (e) e.preventDefault();
  const body = {
    anti_invite: document.getElementById('am-invite').checked,
    anti_links: document.getElementById('am-links').checked,
    anti_spam: document.getElementById('am-spam').checked,
    anti_mass_mention: document.getElementById('am-mention').checked,
    anti_alt_enabled: document.getElementById('sec-anti-alt').checked,
    min_account_age: document.getElementById('sec-min-age').value,
    alt_action: document.getElementById('sec-action').value,
    quarantine_role_id: document.getElementById('sec-quarantine-role').value
  };

  const res = await fetch(`/api/guilds/${guildId}/automod`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (data.success) showToast(data.message);
  else showToast(data.error || 'Erro ao salvar', 'error');
}

// 6. Geral / Boas-Vindas
async function saveGeneral(e) {
  if (e) e.preventDefault();
  const body = {
    welcomeChannelId: document.getElementById('welcome-channel').value,
    welcomeMessage: document.getElementById('welcome-msg').value,
    logsChannelId: document.getElementById('logs-channel').value,
    suggestionsChannelId: document.getElementById('suggestions-channel').value
  };

  const res = await fetch(`/api/guilds/${guildId}/general`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (data.success) showToast(data.message);
  else showToast(data.error || 'Erro ao salvar', 'error');
}

// =========================================================================
// 7. AVISOS AUTOMÁTICOS AGENDADOS
// =========================================================================
function renderAnnouncements() {
  const container = document.getElementById('announcements-list');
  if (!container) return;

  const list = serverData.announcements || [];
  if (list.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); padding: 1.5rem; text-align: center; background: rgba(255,255,255,0.02); border-radius: 8px;">Nenhum aviso programado. Crie um acima para começar!</div>';
    return;
  }

  container.innerHTML = list.map(a => {
    const channel = (serverData.textChannels || []).find(c => c.id === a.channel_id);
    const channelName = channel ? `#${channel.name}` : `#${a.channel_id}`;
    
    let intervalText = `${a.interval_minutes} min`;
    if (a.interval_minutes === 60) intervalText = '1 hora';
    else if (a.interval_minutes === 120) intervalText = '2 horas';
    else if (a.interval_minutes === 360) intervalText = '6 horas';
    else if (a.interval_minutes === 720) intervalText = '12 horas';
    else if (a.interval_minutes === 1440) intervalText = '24 horas';

    return `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-left: 4px solid ${a.color || '#5865F2'}; padding: 1rem 1.25rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div style="flex: 1; min-width: 240px;">
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 600; color: #FFFFFF; font-size: 0.95rem;">${a.title || 'Aviso Automático'}</span>
            <span style="background: rgba(88, 101, 242, 0.15); color: var(--primary); font-size: 0.75rem; padding: 2px 8px; border-radius: 4px;">${channelName}</span>
            <span style="background: rgba(254, 231, 92, 0.15); color: var(--warning); font-size: 0.75rem; padding: 2px 8px; border-radius: 4px;">⏰ A cada ${intervalText}</span>
          </div>
          <div style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.3;">${a.message.slice(0, 120)}${a.message.length > 120 ? '...' : ''}</div>
        </div>

        <div style="display: flex; gap: 8px; align-items: center;">
          <label style="margin: 0; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <input type="checkbox" ${a.enabled ? 'checked' : ''} onchange="toggleAnnouncement('${a.id}', this.checked)" style="cursor: pointer;">
            <span>${a.enabled ? 'Ativo' : 'Pausado'}</span>
          </label>
          <button type="button" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="testAnnouncement('${a.id}')" title="Testar Envio Agora">
            <i class="fa-solid fa-paper-plane"></i> Testar
          </button>
          <button type="button" class="btn btn-danger" style="padding: 6px 10px; font-size: 0.8rem;" onclick="deleteAnnouncement('${a.id}')" title="Excluir">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function createAnnouncement(e) {
  e.preventDefault();
  const channelId = document.getElementById('ann-channel').value;
  const intervalMinutes = document.getElementById('ann-interval').value;
  const title = document.getElementById('ann-title').value;
  const message = document.getElementById('ann-message').value;
  const color = document.getElementById('ann-color').value;

  const res = await fetch(`/api/guilds/${guildId}/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelId, intervalMinutes, title, message, color })
  });

  const data = await res.json();
  if (data.success) {
    showToast(data.message);
    if (!serverData.announcements) serverData.announcements = [];
    serverData.announcements.push(data.item);
    renderAnnouncements();
    document.getElementById('ann-title').value = '';
    document.getElementById('ann-message').value = '';
  } else {
    showToast(data.error || 'Erro ao criar aviso', 'error');
  }
}

async function toggleAnnouncement(id, enabled) {
  const res = await fetch(`/api/guilds/${guildId}/announcements/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled })
  });

  const data = await res.json();
  if (data.success) {
    showToast(`Aviso ${enabled ? 'ativado' : 'pausado'}!`);
    const item = (serverData.announcements || []).find(a => a.id === id);
    if (item) item.enabled = enabled;
    renderAnnouncements();
  }
}

async function testAnnouncement(id) {
  const res = await fetch(`/api/guilds/${guildId}/announcements/${id}/test`, {
    method: 'POST'
  });

  const data = await res.json();
  if (data.success) showToast(data.message);
  else showToast(data.error || 'Erro ao testar aviso', 'error');
}

async function deleteAnnouncement(id) {
  const res = await fetch(`/api/guilds/${guildId}/announcements/${id}`, {
    method: 'DELETE'
  });

  const data = await res.json();
  if (data.success) {
    showToast(data.message);
    serverData.announcements = (serverData.announcements || []).filter(a => a.id !== id);
    renderAnnouncements();
  }
}

// =========================================================================
// 8. FEED DE ATIVIDADES AO VIVO
// =========================================================================
let currentActivityFilter = 'all';

function renderActivityFeed(filter = currentActivityFilter) {
  currentActivityFilter = filter;
  const container = document.getElementById('activity-timeline');
  if (!container) return;

  const logs = serverData.activities || [];
  const filtered = filter === 'all' ? logs : logs.filter(l => l.type === filter);

  if (filtered.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 2rem;">Nenhuma atividade registrada nesta categoria ainda.</div>';
    return;
  }

  container.innerHTML = filtered.map(log => {
    const timeAgo = formatTimeAgo(log.timestamp);
    let badgeColor = 'var(--primary)';
    if (log.type === 'ticket') badgeColor = '#5865F2';
    else if (log.type === 'member') badgeColor = '#23A55A';
    else if (log.type === 'automod') badgeColor = '#ED4245';
    else if (log.type === 'mod') badgeColor = '#FEE75C';

    const avatar = log.user_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';

    return `
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; gap: 14px;">
        <img src="${avatar}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" alt="Avatar">
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
            <span style="font-size: 0.95rem; font-weight: 600; color: #FFFFFF;">${log.icon} ${log.title}</span>
            <span style="font-size: 0.75rem; color: ${badgeColor}; background: rgba(255,255,255,0.05); padding: 1px 6px; border-radius: 4px; text-transform: uppercase;">${log.type}</span>
          </div>
          <div style="font-size: 0.85rem; color: #DBDEE1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${log.description}</div>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; flex-shrink: 0;">${timeAgo}</div>
      </div>
    `;
  }).join('');
}

function filterActivityFeed(type) {
  const buttons = document.querySelectorAll('#feed-filters button');
  buttons.forEach(b => {
    b.style.background = 'var(--bg-card)';
    b.style.color = 'var(--text-muted)';
  });
  const activeBtn = document.getElementById(`filter-${type}`);
  if (activeBtn) {
    activeBtn.style.background = 'var(--primary)';
    activeBtn.style.color = '#FFFFFF';
  }
  renderActivityFeed(type);
}

function formatTimeAgo(timestamp) {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 60) return 'Agora mesmo';
  if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Há ${Math.floor(diff / 3600)} horas`;
  return `Há ${Math.floor(diff / 86400)} dias`;
}

// Auto-refresh feed a cada 8 segundos
setInterval(async () => {
  if (!guildId) return;
  const feedTab = document.getElementById('tab-feed');
  if (feedTab && feedTab.classList.contains('active')) {
    try {
      const res = await fetch(`/api/guilds/${guildId}/activities?limit=50`);
      if (res.ok) {
        serverData.activities = await res.json();
        renderActivityFeed();
      }
    } catch (e) {}
  }
}, 8000);

// Inicializa
loadServerData();
