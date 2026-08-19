const https = require('https');
const http = require('http');
const DatabaseManager = require('../database/manager');
const { createEmbed, COLORS } = require('./embedBuilder');

/**
 * Faz requisição HTTP/HTTPS leve
 */
function fetchText(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
      },
      timeout: 8000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchText(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

/**
 * 1. CHECAGEM YOUTUBE (RSS/Atom Feed)
 */
async function checkYouTube(creator) {
  try {
    let channelId = creator.username;
    // Se for handle (@canal) ou link, converte ou busca
    if (!channelId.startsWith('UC') && channelId.length !== 24) {
      // Tenta achar channelId via página do canal
      const handle = channelId.replace('@', '').replace('https://www.youtube.com/', '').replace('youtube.com/', '');
      const html = await fetchText(`https://www.youtube.com/@${handle}`);
      const match = html.match(/channel_id=([a-zA-Z0-9_-]{24})/);
      if (match) channelId = match[1];
    }

    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const xml = await fetchText(feedUrl);

    const videoIdMatch = xml.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    const titleMatch = xml.match(/<title>(.*?)<\/title>/g);
    const authorMatch = xml.match(/<name>(.*?)<\/name>/);

    if (!videoIdMatch) return null;

    const videoId = videoIdMatch[1];
    const title = titleMatch && titleMatch[1] ? titleMatch[1].replace(/<\/?title>/g, '') : 'Novo Vídeo!';
    const author = authorMatch ? authorMatch[1] : creator.username;

    return {
      id: videoId,
      title,
      author,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      type: 'video'
    };
  } catch (err) {
    return null;
  }
}

/**
 * 2. CHECAGEM TWITCH (Status de Live)
 */
async function checkTwitch(creator) {
  try {
    const username = creator.username.toLowerCase().replace('@', '');
    const html = await fetchText(`https://www.twitch.tv/${username}`);

    const isLive = html.includes('"isLiveBroadcast":true') || html.includes('isLiveBroadcast') || html.includes('"live"');
    
    // Extrai título e informações se possível
    let title = `${creator.username} está Ao Vivo na Twitch!`;
    const titleMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    if (titleMatch && titleMatch[1]) title = titleMatch[1];

    return {
      id: isLive ? `live_${Date.now()}` : null,
      isLive,
      title,
      author: creator.username,
      url: `https://www.twitch.tv/${username}`,
      thumbnail: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${username}-640x360.jpg`,
      game: 'Transmissão ao Vivo',
      type: 'stream'
    };
  } catch (err) {
    return null;
  }
}

/**
 * 3. CHECAGEM KICK.COM (Status de Live)
 */
async function checkKick(creator) {
  try {
    const username = creator.username.toLowerCase().replace('@', '');
    const raw = await fetchText(`https://kick.com/api/v2/channels/${username}`);
    const data = JSON.parse(raw);

    const livestream = data.livestream;
    if (livestream && livestream.is_live) {
      return {
        id: `kick_${livestream.id}`,
        isLive: true,
        title: livestream.session_title || 'Ao Vivo na Kick!',
        author: data.user?.username || creator.username,
        url: `https://kick.com/${username}`,
        thumbnail: livestream.thumbnail?.url || data.user?.profile_pic || 'https://kick.com/favicon.ico',
        game: livestream.categories?.[0]?.name || 'Just Chatting',
        viewers: livestream.viewer_count || 0,
        type: 'stream'
      };
    }
    return { isLive: false };
  } catch (err) {
    return null;
  }
}

/**
 * 4. CHECAGEM TIKTOK
 */
async function checkTikTok(creator) {
  try {
    const username = creator.username.replace('@', '');
    return {
      id: `tt_${Date.now()}`,
      title: `Novo vídeo de @${username} no TikTok!`,
      author: `@${username}`,
      url: `https://www.tiktok.com/@${username}`,
      thumbnail: 'https://sf-tb-sg.ibytedtos.com/obj/tiktok-web-img-sg/e77f0a82701be9c4b745422896561e1b.png',
      type: 'video'
    };
  } catch (err) {
    return null;
  }
}

/**
 * Formata e envia a notificação no Discord
 */
async function sendCreatorAlert(client, creator, data, isTest = false) {
  try {
    const guild = client.guilds.cache.get(creator.guild_id);
    if (!guild) return false;

    const channel = guild.channels.cache.get(creator.channel_id);
    if (!channel || !channel.isTextBased()) return false;

    // Configuração de cores e ícones por plataforma
    let platformName = 'YouTube';
    let platformColor = 0xFF0000;
    let platformEmoji = '🔴';

    if (creator.platform === 'twitch') {
      platformName = 'Twitch';
      platformColor = 0x9146FF;
      platformEmoji = '🟣';
    } else if (creator.platform === 'kick') {
      platformName = 'Kick';
      platformColor = 0x53FC18;
      platformEmoji = '🟢';
    } else if (creator.platform === 'tiktok') {
      platformName = 'TikTok';
      platformColor = 0xFE2C55;
      platformEmoji = '🎵';
    }

    if (creator.color && creator.color.startsWith('#')) {
      platformColor = parseInt(creator.color.replace('#', ''), 16);
    }

    const pingText = creator.ping_role_id
      ? (creator.ping_role_id === 'everyone' ? '@everyone' : `<@&${creator.ping_role_id}>`)
      : '';

    let customMsg = creator.custom_message || '';
    if (!customMsg) {
      if (data.type === 'stream') {
        customMsg = `${platformEmoji} **{author}** está **AO VIVO** na ${platformName}!\nVenha conferir a live: {url}`;
      } else {
        customMsg = `${platformEmoji} **{author}** acabou de postar um novo vídeo na ${platformName}!\nAssista agora: {url}`;
      }
    }

    const formattedMsg = customMsg
      .replace(/{author}/g, data.author || creator.username)
      .replace(/{title}/g, data.title || '')
      .replace(/{url}/g, data.url || '')
      .replace(/{game}/g, data.game || 'Transmissão')
      .replace(/{role}/g, pingText);

    const embed = createEmbed({
      title: `${isTest ? '🧪 [TESTE] ' : ''}${platformEmoji} ${data.title || 'Nova Publicação!'}`,
      url: data.url,
      description: `**Criador(a):** [${data.author || creator.username}](${data.url})\n` +
        (data.game ? `🎮 **Categoria:** \`${data.game}\`\n` : '') +
        (data.viewers !== undefined ? `👥 **Espectadores:** \`${data.viewers}\`\n` : '') +
        `\n🔗 [Clique aqui para assistir](${data.url})`,
      color: platformColor,
      image: data.thumbnail,
      footerText: `Notificações de ${platformName} • rikeozinho`
    });

    const content = pingText ? `${pingText}\n${formattedMsg}` : formattedMsg;
    await channel.send({ content, embeds: [embed] });

    // Registra no Feed de Atividades
    DatabaseManager.logActivity(creator.guild_id, {
      type: 'general',
      icon: platformEmoji,
      title: `${platformName}: ${isTest ? 'Alerta de Teste' : (data.type === 'stream' ? 'Live Iniciada' : 'Novo Vídeo')}`,
      description: `${data.author || creator.username} - ${data.title}`,
      metadata: { url: data.url }
    });

    return true;
  } catch (err) {
    console.error(`[CREATOR ALERT] Erro ao disparar alerta ${creator.platform}:`, err.message);
    return false;
  }
}

/**
 * Loop background leve (roda a cada 2 minutos)
 */
function startCreatorTracker(client) {
  console.log('📡 Inicializando Hub de Notificações de Criadores (YouTube, Twitch, Kick, TikTok)...');

  setInterval(async () => {
    try {
      const activeCreators = DatabaseManager.getAllActiveCreators();
      if (!activeCreators || activeCreators.length === 0) return;

      for (const creator of activeCreators) {
        let result = null;

        if (creator.platform === 'youtube') {
          result = await checkYouTube(creator);
          if (result && result.id && result.id !== creator.last_id) {
            // Se for primeira vez, apenas salva o ID para não spammar
            if (!creator.last_id) {
              DatabaseManager.updateCreatorState(creator.id, { last_id: result.id });
            } else {
              DatabaseManager.updateCreatorState(creator.id, { last_id: result.id });
              await sendCreatorAlert(client, creator, result);
            }
          }
        } else if (creator.platform === 'twitch') {
          result = await checkTwitch(creator);
          if (result) {
            if (result.isLive && !creator.is_live) {
              DatabaseManager.updateCreatorState(creator.id, { is_live: true });
              await sendCreatorAlert(client, creator, result);
            } else if (!result.isLive && creator.is_live) {
              DatabaseManager.updateCreatorState(creator.id, { is_live: false });
            }
          }
        } else if (creator.platform === 'kick') {
          result = await checkKick(creator);
          if (result) {
            if (result.isLive && !creator.is_live) {
              DatabaseManager.updateCreatorState(creator.id, { is_live: true });
              await sendCreatorAlert(client, creator, result);
            } else if (!result.isLive && creator.is_live) {
              DatabaseManager.updateCreatorState(creator.id, { is_live: false });
            }
          }
        }
      }
    } catch (err) {
      // Ignora erros transitórios de rede
    }
  }, 120000); // 2 minutos
}

module.exports = {
  startCreatorTracker,
  sendCreatorAlert,
  checkYouTube,
  checkTwitch,
  checkKick,
  checkTikTok
};
