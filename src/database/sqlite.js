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
  polls: {}
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
