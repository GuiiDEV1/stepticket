const DatabaseManager = require('../database/manager.js');
const { createEmbed, COLORS } = require('./embedBuilder.js');

const ROBLOX_LOGO_URL = 'https://images.rbxcdn.com/2b3564e9f3a216e2c023801b1057e389.png';

/**
 * Consulta a versão ao vivo do Roblox Player e Studio diretamente na API da Roblox
 */
async function fetchRobloxLiveVersions() {
  try {
    const [playerRes, studioRes] = await Promise.all([
      fetch('https://clientsettingscdn.roblox.com/v2/client-version/WindowsPlayer', {
        headers: { 'User-Agent': 'Roblox/WinInet' },
        signal: AbortSignal.timeout(7000)
      }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('https://clientsettingscdn.roblox.com/v2/client-version/WindowsStudio', {
        headers: { 'User-Agent': 'Roblox/WinInet' },
        signal: AbortSignal.timeout(7000)
      }).then(r => r.ok ? r.json() : null).catch(() => null)
    ]);

    // Se falhou ao buscar o Player ou retornou payload inválido, aborta com segurança
    if (!playerRes || !playerRes.clientVersionUpload || !playerRes.version || playerRes.version === '0.0.0') {
      return null;
    }

    return {
      player: playerRes,
      studio: studioRes || { version: playerRes.version, clientVersionUpload: 'Desconhecido' }
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
    const live = await fetchRobloxLiveVersions();

    // Se a API da Roblox oscilou, caiu ou deu timeout, NÃO faz nada e NÃO alerta falso
    if (!live || !live.player || !live.player.clientVersionUpload) return;

    const currentUpload = live.player.clientVersionUpload;
    const currentVersion = live.player.version;

    // Validação estrita: Ignora respostas inválidas
    if (
      !currentUpload ||
      currentUpload === 'Desconhecido' ||
      !currentUpload.startsWith('version-') ||
      !currentVersion ||
      currentVersion === '0.0.0'
    ) {
      return;
    }

    const tracker = DatabaseManager.getRobloxTracker();

    // Primeira execução ou estado corrompido: sincroniza silenciosamente sem disparar alertas
    if (
      !tracker.last_upload_guid ||
      tracker.last_upload_guid === 'Desconhecido' ||
      !tracker.last_upload_guid.startsWith('version-') ||
      tracker.last_version === '0.0.0'
    ) {
      DatabaseManager.updateRobloxTracker({
        last_version: currentVersion,
        last_upload_guid: currentUpload,
        last_checked_at: Date.now()
      });
      return;
    }

    // Se detectou uma mudança real de versão de deploy da Roblox
    if (tracker.last_upload_guid !== currentUpload) {
      console.log(`\n🚨 [ROBLOX TRACKER] NOVA VERSÃO DETECTADA: ${currentUpload} (v${currentVersion})`);

      const oldUpload = tracker.last_upload_guid;
      const oldVersion = tracker.last_version || 'Desconhecida';

      // Atualiza o banco com a nova versão oficial
      DatabaseManager.updateRobloxTracker({
        last_version: currentVersion,
        last_upload_guid: currentUpload,
        last_checked_at: Date.now()
      });

      // Notifica todos os canais configurados nos servidores
      if (tracker.channels && Array.isArray(tracker.channels)) {
        for (const config of tracker.channels) {
          try {
            const channel = await client.channels.fetch(config.channel_id).catch(() => null);
            if (!channel) continue;

            const botAvatar = client.user ? client.user.displayAvatarURL({ dynamic: true }) : ROBLOX_LOGO_URL;

            const alertEmbed = createEmbed({
              title: '🚀 Nova Atualização do Roblox Lançada!',
              description: `A Roblox acaba de lançar um novo deploy oficial no canal **LIVE**!\n\n` +
                `**Nova Versão:** \`${currentVersion}\`\n` +
                `**Hash de Deploy:** \`${currentUpload}\`\n` +
                `**Versão Anterior:** \`${oldVersion}\` (\`${oldUpload}\`)\n\n` +
                `⚠️ **Aviso para usuários de FastFlags:**\n` +
                `Seus offsets de memória e FastFlags podem ter sido modificados. Use \`/flag checar\` e \`/flag offsets\` para validar suas configurações!`,
              color: COLORS.SUCCESS,
              thumbnail: botAvatar,
              fields: [
                { name: '📥 Download Direto da Versão', value: `[Baixar RobloxPlayer.zip](https://setup.rbxcdn.com/${currentUpload}-RobloxPlayer.zip)`, inline: true },
                { name: '⚡ Studio Deploy', value: `\`${live.studio?.clientVersionUpload || 'N/A'}\``, inline: true }
              ],
              footerText: 'Rastreador Automático de Versões Roblox • Noozy'
            });

            const content = config.ping_role_id ? `<@&${config.ping_role_id}>` : undefined;
            await channel.send({ content, embeds: [alertEmbed] }).catch(() => {});
          } catch (err) {
            console.warn(`[ROBLOX TRACKER] Falha ao enviar alerta para canal ${config.channel_id}:`, err.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('[ROBLOX TRACKER] Erro no loop:', error);
  }
}

module.exports = {
  fetchRobloxLiveVersions,
  checkRobloxUpdates,
  ROBLOX_LOGO_URL
};
