// Lista direta de eventos com caminhos absolutos e extensões explícitas (.js)
const events = [
  require('../events/client/ready.js'),
  require('../events/client/interactionCreate.js'),
  require('../events/verification/verificationInteractions.js'),
  require('../events/giveaways/giveawayInteractions.js'),
  require('../events/guild/guildMemberAdd.js'),
  require('../events/guild/guildMemberRemove.js'),
  require('../events/guild/messageCreate.js'),
  require('../events/guild/messageDelete.js'),
  require('../events/guild/messageUpdate.js'),
  require('../events/polls/pollInteractions.js'),
  require('../events/roles/roleInteractions.js'),
  require('../events/suggestions/suggestionInteractions.js'),
  require('../events/tickets/ticketInteractions.js')
];

/**
 * Carrega todos os ouvintes de eventos
 * @param {import('discord.js').Client} client 
 */
function loadEvents(client) {
  let eventCount = 0;

  for (const event of events) {
    try {
      if (event && event.name && typeof event.execute === 'function') {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }
        eventCount++;
      }
    } catch (err) {
      console.error(`[ERRO] Falha ao registrar evento:`, err.message);
    }
  }

  console.log(`📡 ${eventCount} eventos registrados com sucesso.`);
}

module.exports = {
  loadEvents
};
