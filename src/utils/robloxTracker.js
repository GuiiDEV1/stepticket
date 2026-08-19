const DatabaseManager = require('../database/manager.js');
const { createEmbed, COLORS } = require('./embedBuilder.js');

/**
 * Consulta a versão ao vivo do Roblox Player e Studio
 */
async function fetchRobloxLiveVersions() {
  try {
    const [playerRes, studioRes] = await Promise.all([
      fetch('https://clientsettingscdn.roblox.com/v2/client-version/WindowsPlayer', {
        headers: { 'User-Agent': 'Roblox/WinInet' },
        signal: AbortSignal.timeout(6000)
      }).then(r => r.json()).catch(() => null),
      fetch('https://clientsettingscdn.roblox.com/v2/client-version/WindowsStudio', {
        headers: { 'User-Agent': 'Roblox/WinInet' },
        signal: AbortSignal.timeout(6000)
      }).then(r => r.json()).catch(() => null)
    ]);

    return {
      player: playerRes || { version: '0.0.0', clientVersionUpload: 'Desconhecido' },
      studio: studioRes || { version: '0.0.0', clientVersionUpload: 'Desconhecido' }
    };
  } catch (err) {
    console.error('[ROBLOX TRACKER] Erro ao buscar versões:', err.message);
    return null;
  }
}

/**
 * Loop de monitoramento que roda a cada 2 minutos para avisar os servidores
 */
async function checkRobloxUpdates(client) {
  try {
    const tracker = DatabaseManager.getRobloxTracker();
    const live = await fetchRobloxLiveVersions();

    if (!live || !live.player || !live.player.clientVersionUpload) return;

    const currentUpload = live.player.clientVersionUpload;
    const currentVersion = live.player.version;

    // Primeira execução: apenas salva o estado atual
    if (!tracker.last_upload_guid) {
      DatabaseManager.updateRobloxTracker({
        last_version: currentVersion,
        last_upload_guid: currentUpload,
        last_checked_at: Date.now()
      });
      return;
    }

    // Se detectou uma nova versão de deploy da Roblox!
    if (tracker.last_upload_guid !== currentUpload) {
      console.log(`\n🚨 [ROBLOX TRACKER] NOVA VERSÃO DETECTADA: ${currentUpload} (v${currentVersion})`);

      const oldUpload = tracker.last_upload_guid;
      const oldVersion = tracker.last_version || 'Desconhecida';

      // Atualiza o banco
      DatabaseManager.updateRobloxTracker({
        last_version: currentVersion,
        last_upload_guid: currentUpload,
        last_checked_at: Date.now()
      });

      // Notifica todos os canais configurados nos servidores
      for (const config of tracker.channels) {
        try {
          const channel = await client.channels.fetch(config.channel_id).catch(() => null);
          if (!channel) continue;

          const alertEmbed = createEmbed({
            title: '🚀 Nova Atualização do Roblox Lançada!',
            description: `A Roblox acaba de lançar um novo deploy oficial no canal **LIVE**!\n\n` +
              `**Nova Versão:** \`${currentVersion}\`\n` +
              `**Hash de Deploy:** \`${currentUpload}\`\n` +
              `**Versão Anterior:** \`${oldVersion}\` (\`${oldUpload}\`)\n\n` +
              `⚠️ **Aviso para usuários de Luqqzstrap / Bloxstrap:**\n` +
              `Seus offsets de memória e FastFlags podem ter sido modificados. Use \`/flag checar\` e \`/flag offsets\` para validar suas configurações!`,
            color: COLORS.SUCCESS,
            thumbnail: 'https://i.imgur.com/8Q9bZ8R.png',
            fields: [
              { name: '📥 Download Direto da Versão', value: `[Baixar RobloxPlayer.zip](https://setup.rbxcdn.com/${currentUpload}-RobloxPlayer.zip)`, inline: true },
              { name: '⚡ Studio Deploy', value: `\`${live.studio.clientVersionUpload}\``, inline: true }
            ],
            footerText: 'Rastreador Automático de Versões Roblox'
          });

          const content = config.ping_role_id ? `<@&${config.ping_role_id}>` : undefined;
          await channel.send({ content, embeds: [alertEmbed] }).catch(() => {});
        } catch (err) {
          console.warn(`[ROBLOX TRACKER] Falha ao enviar alerta para canal ${config.channel_id}:`, err.message);
        }
      }
    }
  } catch (error) {
    console.error('[ROBLOX TRACKER] Erro no loop:', error);
  }
}

module.exports = {
  fetchRobloxLiveVersions,
  checkRobloxUpdates
};
