const { ActivityType, Events } = require('discord.js');
const { registerCommands } = require('../../handlers/commandHandler.js');
const DatabaseManager = require('../../database/manager.js');
const { createEmbed, COLORS } = require('../../utils/embedBuilder.js');
const { checkRobloxUpdates } = require('../../utils/robloxTracker.js');
const { checkYouTubeNotifications } = require('../../utils/youtubeTracker.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`\n========================================`);
    console.log(`🤖 Bot Conectado com Sucesso como: ${client.user.tag}`);
    console.log(`🌐 Servidores: ${client.guilds.cache.size}`);
    console.log(`👥 Usuários: ${client.users.cache.size}`);
    console.log(`========================================\n`);

    // Definir presença inicial
    try {
      client.user.setPresence({
        activities: [{ name: '/help | Luqqzstrap & Tickets', type: ActivityType.Playing }],
        status: 'online'
      });
    } catch (err) {}

    // Alternância de status a cada 15 segundos
    const activities = [
      { name: '/help | Luqqzstrap & FastFlags', type: ActivityType.Playing },
      { name: `${client.guilds.cache.size} servidores!`, type: ActivityType.Watching },
      { name: 'Tickets e Economia', type: ActivityType.Listening }
    ];

    let currentActivity = 0;
    setInterval(() => {
      try {
        client.user.setActivity(activities[currentActivity]);
        currentActivity = (currentActivity + 1) % activities.length;
      } catch (err) {}
    }, 15000);

    // Registra Slash Commands na API em segundo plano
    registerCommands(client).catch(err => {
      console.error('Erro ao registrar comandos na API:', err);
    });

    // 1. Loop de Sorteios (Giveaways - a cada 15 segundos)
    setInterval(() => {
      checkGiveaways(client);
    }, 15000);

    // 2. Loop do Rastreador de Atualizações do Roblox (a cada 2 minutos)
    setInterval(() => {
      checkRobloxUpdates(client);
    }, 120000);
    // Executa uma checagem inicial após 10 segundos
    setTimeout(() => {
      checkRobloxUpdates(client);
    }, 10000);

    // 3. Loop de Notificações do YouTube (a cada 3 minutos)
    setInterval(() => {
      checkYouTubeNotifications(client);
    }, 180000);
    setTimeout(() => {
      checkYouTubeNotifications(client);
    }, 15000);
  }
};

/**
 * Verifica e finaliza sorteios que atingiram o horário limite
 */
async function checkGiveaways(client) {
  try {
    const activeGiveaways = DatabaseManager.getActiveGiveaways();
    const now = Date.now();

    for (const g of activeGiveaways) {
      if (g.ends_at <= now) {
        DatabaseManager.endGiveaway(g.message_id);

        const channel = await client.channels.fetch(g.channel_id).catch(() => null);
        if (!channel) continue;

        const message = await channel.messages.fetch(g.message_id).catch(() => null);
        if (!message) continue;

        const entries = g.entries || [];
        let winners = [];

        if (entries.length > 0) {
          const shuffled = [...entries].sort(() => 0.5 - Math.random());
          winners = shuffled.slice(0, Math.min(g.winners_count, entries.length));
        }

        const winnersMention = winners.length > 0 
          ? winners.map(id => `<@${id}>`).join(', ') 
          : 'Nenhum participante válido.';

        const endEmbed = createEmbed({
          title: '🎉 Sorteio Finalizado!',
          description: `**Prêmio:** ${g.prize}\n**Ganhador(es):** ${winnersMention}\n**Sorteado por:** <@${g.host_id}>`,
          color: COLORS.GIVEAWAY,
          footerText: 'Sorteio encerrado'
        });

        await message.edit({
          embeds: [endEmbed],
          components: []
        }).catch(() => {});

        if (winners.length > 0) {
          channel.send({
            content: `🎉 Parabéns ${winnersMention}! Você(s) ganhou(ram) **${g.prize}**!`
          }).catch(() => {});
        } else {
          channel.send({
            content: `😕 O sorteio de **${g.prize}** encerrou sem participantes suficientes.`
          }).catch(() => {});
        }
      }
    }
  } catch (error) {
    console.error('Erro no loop de sorteios:', error);
  }
}
