const fs = require('fs');
const path = require('path');

// Diretório de dados persistente
const dataDir = path.join(process.cwd(), 'data');
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (err) {
  console.warn('Aviso ao criar pasta data:', err.message);
}

const dbFilePath = path.join(dataDir, 'database.json');

// Estrutura inicial do banco em memória
const defaultSchema = {
  guild_config: {},
  tickets: {},
  warns: [],
  giveaways: {},
  levels: {},
  reaction_roles: [],
  suggestions: {},
  polls: {},
  // Novos módulos
  roblox_tracker: {
    last_version: null,
    last_upload_guid: null,
    last_checked_at: 0,
    channels: [] // { guild_id, channel_id, ping_role_id }
  },
  verification: {}, // { [guild_id]: { channel_id, role_id, type: 'captcha'|'button', enabled: 1 } }
  economy: {}, // { [`${guild_id}_${user_id}`]: { guild_id, user_id, wallet, bank, last_daily, last_work } }
  economy_shop: [], // [ { id, guild_id, role_id, name, price, description } ]
  youtube_notifications: [] // [ { guild_id, channel_id, youtube_channel_id, last_video_id, custom_message } ]
};

let store = { ...defaultSchema };

// Carregar dados salvos do disco
try {
  if (fs.existsSync(dbFilePath)) {
    const rawData = fs.readFileSync(dbFilePath, 'utf8');
    store = { ...defaultSchema, ...JSON.parse(rawData) };
  } else {
    fs.writeFileSync(dbFilePath, JSON.stringify(defaultSchema, null, 2), 'utf8');
  }
} catch (err) {
  console.warn('Iniciando banco de dados com schema padrão...');
  store = { ...defaultSchema };
}

// Salva os dados no disco de forma atômica e segura
function saveToDisk() {
  try {
    const tempPath = `${dbFilePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), 'utf8');
    fs.renameSync(tempPath, dbFilePath);
  } catch (err) {
    try {
      fs.writeFileSync(dbFilePath, JSON.stringify(store, null, 2), 'utf8');
    } catch (e) {
      console.error('Erro ao salvar banco de dados no disco:', e.message);
    }
  }
}

console.log('✅ Banco de dados persistente (Zero-Crash Pure JS) carregado com sucesso!');

module.exports = {
  store,
  saveToDisk
};
