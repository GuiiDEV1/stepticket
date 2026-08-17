const { REST, Routes, Collection } = require('discord.js');

// Lista direta de todos os comandos do bot com extensões explícitas (.js)
const commandsList = [
  // Admin & Config
  require('../commands/admin/setup.js'),
  require('../commands/automod/automod.js'),

  // Leveling / Fun
  require('../commands/fun_level/rank.js'),
  require('../commands/fun_level/leaderboard.js'),

  // Giveaways
  require('../commands/giveaways/giveaway.js'),

  // Moderation
  require('../commands/moderation/ban.js'),
  require('../commands/moderation/unban.js'),
  require('../commands/moderation/kick.js'),
  require('../commands/moderation/timeout.js'),
  require('../commands/moderation/untimeout.js'),
  require('../commands/moderation/clear.js'),
  require('../commands/moderation/lock.js'),
  require('../commands/moderation/unlock.js'),
  require('../commands/moderation/slowmode.js'),
  require('../commands/moderation/nuke.js'),
  require('../commands/moderation/role.js'),
  require('../commands/moderation/warn.js'),
  require('../commands/moderation/warnings.js'),
  require('../commands/moderation/delwarn.js'),
  require('../commands/moderation/clearwarns.js'),

  // Suggestions
  require('../commands/suggestions/sugestao.js'),

  // Tickets
  require('../commands/tickets/ticket.js'),

  // Utility & Luqqzstrap / FastFlags
  require('../commands/utility/flag.js'),
  require('../commands/utility/avatar.js'),
  require('../commands/utility/banner.js'),
  require('../commands/utility/botinfo.js'),
  require('../commands/utility/calc.js'),
  require('../commands/utility/enquete.js'),
  require('../commands/utility/help.js'),
  require('../commands/utility/ping.js'),
  require('../commands/utility/serverinfo.js'),
  require('../commands/utility/userinfo.js')
];

/**
 * Carrega todos os comandos imediatamente na memória do Client
 * @param {import('discord.js').Client} client 
 */
function loadCommands(client) {
  client.commands = new Collection();
  for (const command of commandsList) {
    try {
      if (command && 'data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
      }
    } catch (err) {
      console.error(`[ERRO] Falha ao carregar comando na memória:`, err.message);
    }
  }
  console.log(`🤖 ${client.commands.size} comandos carregados na memória com sucesso.`);
}

/**
 * Registra os Slash Commands na API do Discord
 * @param {import('discord.js').Client} client 
 */
async function registerCommands(client) {
  const commandsArray = commandsList.map(c => c.data.toJSON());
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID || (client.user ? client.user.id : null);
  const guildId = process.env.GUILD_ID;

  if (!token) return;
  if (!clientId) {
    console.warn('⚠️ CLIENT_ID não disponível para registro de comandos.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('🔄 Registrando Slash Commands na API do Discord...');

    if (guildId) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commandsArray }
      );
      console.log(`✅ Slash Commands registrados no Servidor (Guild ID: ${guildId})!`);
    } else {
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commandsArray }
      );
      console.log('✅ Slash Commands registrados GLOBALMENTE com sucesso!');
    }
  } catch (error) {
    console.error('❌ Erro ao registrar Slash Commands na API:', error.message || error);
  }
}

module.exports = {
  loadCommands,
  registerCommands
};
