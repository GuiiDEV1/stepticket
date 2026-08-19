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

    // AutoMod Tab
    document.getElementById('am-invite').checked = Boolean(serverData.automod?.anti_invite);
    document.getElementById('am-links').checked = Boolean(serverData.automod?.anti_links);
    document.getElementById('am-spam').checked = Boolean(serverData.automod?.anti_spam);
    document.getElementById('am-mention').checked = Boolean(serverData.automod?.anti_mass_mention);

    // General / Welcome Tab
    populateSelect('welcome-channel', serverData.textChannels, serverData.config?.welcome_channel_id);
    document.getElementById('welcome-msg').value = serverData.config?.welcome_message || '';
    populateSelect('logs-channel', serverData.textChannels, serverData.config?.logs_channel_id);
    populateSelect('suggestions-channel', serverData.textChannels, serverData.config?.suggestions_channel_id);

  } catch (err) {
    console.error('Erro ao carregar dados do servidor:', err);
    showToast('Falha na comunicação com o servidor.', 'error');
  }
}

// =========================================================================
// SALVAR MÓDULOS
// =========================================================================

// 1. Tickets
async function saveTickets(e) {
  if (e) e.preventDefault();
  const body = {
    categoryId: document.getElementById('ticket-category').value,
    staffRoleId: document.getElementById('ticket-staff-role').value,
    logsChannelId: document.getElementById('ticket-logs-channel').value
  };

  const res = await fetch(`/api/guilds/${guildId}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (data.success) showToast(data.message);
  else showToast(data.error || 'Erro ao salvar', 'error');
}

async function sendTicketPanel() {
  const panelChannelId = document.getElementById('ticket-panel-channel').value;
  if (!panelChannelId) return showToast('Selecione um canal para enviar o painel.', 'error');

  const body = {
    categoryId: document.getElementById('ticket-category').value,
    staffRoleId: document.getElementById('ticket-staff-role').value,
    logsChannelId: document.getElementById('ticket-logs-channel').value,
    sendPanel: true,
    panelChannelId
  };

  const res = await fetch(`/api/guilds/${guildId}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (data.success) showToast('Painel de Tickets enviado com sucesso no canal!');
  else showToast(data.error || 'Erro ao enviar painel', 'error');
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

// 5. AutoMod
async function saveAutoMod(e) {
  if (e) e.preventDefault();
  const body = {
    anti_invite: document.getElementById('am-invite').checked,
    anti_links: document.getElementById('am-links').checked,
    anti_spam: document.getElementById('am-spam').checked,
    anti_mass_mention: document.getElementById('am-mention').checked
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

// Inicializa
loadServerData();
