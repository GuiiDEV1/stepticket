const DatabaseManager = require('../database/manager');
const { createEmbed, COLORS } = require('./embedBuilder');

let schedulerInterval = null;

/**
 * Inicializa o loop de checagem e disparo de mensagens agendadas
 * @param {import('discord.js').Client} client 
 */
function startScheduler(client) {
  if (schedulerInterval) clearInterval(schedulerInterval);

  console.log('⏰ Inicializando Scheduler de Avisos Automáticos...');

  schedulerInterval = setInterval(async () => {
    try {
      const activeAnnouncements = DatabaseManager.getAllActiveAnnouncements();
      const now = Date.now();

      for (const ann of activeAnnouncements) {
        const intervalMs = (parseInt(ann.interval_minutes) || 60) * 60 * 1000;
        
        // Verifica se já passou o tempo necessário desde o último disparo
        if (now - (ann.last_sent_at || 0) >= intervalMs) {
          const guild = client.guilds.cache.get(ann.guild_id);
          if (!guild) continue;

          const channel = guild.channels.cache.get(ann.channel_id);
          if (!channel || !channel.isTextBased()) continue;

          // Monta o aviso
          let color = COLORS.PRIMARY;
          if (ann.color) {
            const cleanHex = ann.color.replace('#', '');
            const parsed = parseInt(cleanHex, 16);
            if (!isNaN(parsed)) color = parsed;
          }

          const embed = createEmbed({
            title: ann.title || `📢 Comunicado • ${guild.name}`,
            description: ann.message,
            color: color,
            footerText: 'Aviso Automático • rikeozinho',
            thumbnail: guild.iconURL({ dynamic: true })
          });

          await channel.send({ embeds: [embed] }).catch(err => {
            console.warn(`[SCHEDULER] Falha ao enviar aviso na guilda ${ann.guild_id}:`, err.message);
          });

          // Atualiza último disparo no banco
          DatabaseManager.updateAnnouncement(ann.id, { last_sent_at: now });

          // Registra no feed de atividades
          DatabaseManager.logActivity(ann.guild_id, {
            type: 'general',
            icon: '⏰',
            title: 'Aviso Agendado Enviado',
            description: `Mensagem enviada com sucesso no canal #${channel.name}.`
          });
        }
      }
    } catch (err) {
      console.error('[SCHEDULER] Erro no loop de avisos agendados:', err);
    }
  }, 30 * 1000); // Roda a cada 30 segundos
}

module.exports = {
  startScheduler
};
