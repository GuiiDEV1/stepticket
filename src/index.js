const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client, GatewayIntentBits, Partials, Options } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler.js');
const { loadEvents } = require('./handlers/eventHandler.js');
const { startServer } = require('./server.js');

// Criação do Client Ultra-Otimizado para Baixo Consumo de RAM (<45MB)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User
  ],
  // Limitação agressiva de cache para não estourar os 100MB da Discloud
  makeCache: Options.cacheWithLimits({
    MessageManager: 20,          // Mantém no máximo 20 mensagens por canal no cache
    PresenceManager: 0,         // Desativa cache de presenças (economiza ~25MB)
    ReactionManager: 0,         // Desativa cache de reações
    ReactionUserManager: 0,
    ThreadManager: 0,
    ThreadMemberManager: 0,
    StageInstanceManager: 0,
    VoiceStateManager: 0,
    AutoModerationRuleManager: 0
  }),
  sweepers: {
    ...Options.DefaultSweeperSettings,
    messages: {
      interval: 180, // Limpa mensagens do cache a cada 3 minutos
      lifetime: 60
    }
  }
});

// Tratamento global de erros para evitar que o bot caia
process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERRO NÃO TRATADO - unhandledRejection]:', reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error('[EXCEÇÃO NÃO TRATADA - uncaughtException]:', err);
});

// Inicialização
async function main() {
  console.log('🚀 Inicializando rikeozinho (Modo Low-Memory)...');

  // 1. Carregar Comandos na memória
  loadCommands(client);

  // 2. Carregar Eventos na memória
  loadEvents(client);

  // 3. Iniciar servidor HTTP Keep-Alive
  startServer(client);

  // 4. Fazer login no Discord
  const token = process.env.DISCORD_TOKEN;
  if (!token || token === 'seu_token_aqui') {
    console.error('❌ ERRO: O DISCORD_TOKEN não foi configurado no arquivo .env!');
    return;
  }

  console.log('🔑 Conectando ao Discord...');
  await client.login(token).catch(err => {
    console.error('❌ Falha ao conectar ao Discord:', err.message);
  });
}

main();

module.exports = client;
