const DatabaseManager = require('../database/manager.js');
const { createEmbed, COLORS } = require('./embedBuilder.js');

/**
 * Consulta o feed RSS gratuito do YouTube para obter o vídeo mais recente do canal
 */
async function fetchLatestYouTubeVideo(youtubeChannelId) {
  try {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${youtubeChannelId}`;
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) return null;
    const xml = await res.text();

    // Extração rápida via Regex (0 bibliotecas extras, ultra rápido e leve)
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
    if (!entryMatch) return null;

    const entryXml = entryMatch[1];
    const videoIdMatch = entryXml.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    const titleMatch = entryXml.match(/<title>(.*?)<\/title>/);
    const authorMatch = xml.match(/<author>[\s\S]*?<name>(.*?)<\/name>/);
    const publishedMatch = entryXml.match(/<published>(.*?)<\/published>/);

    if (!videoIdMatch || !titleMatch) return null;

    return {
      videoId: videoIdMatch[1],
      title: titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1'),
      author: authorMatch ? authorMatch[1] : 'Canal do YouTube',
      url: `https://www.youtube.com/watch?v=${videoIdMatch[1]}`,
      publishedAt: publishedMatch ? publishedMatch[1] : new Date().toISOString(),
      thumbnail: `https://i.ytimg.com/vi/${videoIdMatch[1]}/hqdefault.jpg`
    };
  } catch (err) {
    console.warn(`[YOUTUBE TRACKER] Erro ao buscar feed do canal ${youtubeChannelId}:`, err.message);
    return null;
  }
}

/**
 * Loop de verificação que roda a cada 3 minutos
 */
async function checkYouTubeNotifications(client) {
  try {
    const list = DatabaseManager.getYouTubeNotifications();
    if (!list || list.length === 0) return;

    for (const item of list) {
      const latest = await fetchLatestYouTubeVideo(item.youtube_channel_id);
      if (!latest) continue;

      // Primeira execução: salva o vídeo mais recente sem spammar
      if (!item.last_video_id) {
        DatabaseManager.updateYouTubeLastVideo(item.guild_id, item.youtube_channel_id, latest.videoId);
        continue;
      }

      // Se encontrou um vídeo novo!
      if (item.last_video_id !== latest.videoId) {
        DatabaseManager.updateYouTubeLastVideo(item.guild_id, item.youtube_channel_id, latest.videoId);

        const channel = await client.channels.fetch(item.channel_id).catch(() => null);
        if (!channel) continue;

        const embed = createEmbed({
          title: `🔴 Novo Vídeo no Canal: ${latest.author}`,
          description: `**[${latest.title}](${latest.url})**\n\nAssista agora mesmo no YouTube!`,
          color: '#FF0000',
          image: latest.thumbnail,
          footerText: 'Notificação Automática do YouTube'
        });

        const content = item.custom_message 
          ? `${item.custom_message}\n${latest.url}` 
          : `📢 **${latest.author}** acabou de postar um vídeo novo!\n${latest.url}`;

        await channel.send({ content, embeds: [embed] }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('[YOUTUBE TRACKER] Erro no loop:', error);
  }
}

module.exports = {
  fetchLatestYouTubeVideo,
  checkYouTubeNotifications
};
