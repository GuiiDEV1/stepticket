const crypto = require('crypto');
const { PermissionsBitField } = require('discord.js');
const DatabaseManager = require('../database/manager.js');

const fs = require('fs');
const path = require('path');

// Segredo para assinatura de cookies de sessão (Carrega do .env ou de data/.session_secret persistente)
const SESSION_SECRET = process.env.SESSION_SECRET || (function() {
  const secretPath = path.join(process.cwd(), 'data', '.session_secret');
  try {
    if (fs.existsSync(secretPath)) {
      const savedSecret = fs.readFileSync(secretPath, 'utf8').trim();
      if (savedSecret.length >= 32) return savedSecret;
    }
    const generated = crypto.randomBytes(64).toString('hex');
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    fs.writeFileSync(secretPath, generated, 'utf8');
    return generated;
  } catch (e) {
    return crypto.randomBytes(64).toString('hex');
  }
})();
const CLIENT_ID = process.env.CLIENT_ID || '1538556104924070050';
const CLIENT_SECRET = process.env.CLIENT_SECRET || process.env.DISCORD_CLIENT_SECRET || '';

/**
 * Cria uma assinatura HMAC para o ID da sessão
 */
function signSession(sessionId) {
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(sessionId).digest('hex');
  return `${sessionId}.${hmac}`;
}

/**
 * Valida e recupera a sessão do banco persistente a partir do cookie assinado
 */
function verifySession(signedCookie) {
  if (!signedCookie || typeof signedCookie !== 'string') return null;
  const parts = signedCookie.split('.');
  if (parts.length !== 2) return null;

  const [sessionId, hmac] = parts;
  try {
    const expectedHmac = crypto.createHmac('sha256', SESSION_SECRET).update(sessionId).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
      return DatabaseManager.getSession(sessionId);
    }
  } catch (e) {}
  return null;
}

/**
 * Troca o código OAuth2 do Discord por um Access Token
 */
async function exchangeCodeForToken(code, redirectUri) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  });

  const response = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha na autenticação OAuth2: ${response.status} - ${errText}`);
  }

  return response.json();
}

/**
 * Busca dados do perfil do usuário autenticado no Discord
 */
async function fetchUserProfile(accessToken) {
  const response = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) throw new Error('Não foi possível obter o perfil do usuário.');
  return response.json();
}

/**
 * Busca a lista de servidores dos quais o usuário faz parte
 */
async function fetchUserGuilds(accessToken) {
  const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) throw new Error('Não foi possível obter a lista de servidores.');
  return response.json();
}

/**
 * Cria e salva uma nova sessão autenticada persistente no disco
 */
function createSession(user, guilds) {
  const sessionId = crypto.randomBytes(24).toString('hex');
  const sessionData = {
    sessionId,
    user,
    guilds: guilds || [],
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 dias
  };

  DatabaseManager.setSession(sessionId, sessionData);
  return {
    sessionId,
    signedCookie: signSession(sessionId),
    sessionData
  };
}

/**
 * Middleware para exigir autenticação
 */
function requireAuth(req, res, next) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(c => {
      const [k, ...v] = c.split('=');
      return [k, decodeURIComponent(v.join('='))];
    })
  );

  const rawCookie = cookies.rikeozinho_session || cookies.stepticket_session;
  const session = verifySession(rawCookie);
  if (!session) {
    return res.status(401).json({ error: 'Sessão expirada ou inválida' });
  }

  req.session = session;
  req.user = session.user;
  req.userGuilds = session.guilds;
  next();
}

/**
 * Middleware de segurança: Validação robusta de permissão de administrador no servidor
 */
function requireGuildAdmin(client) {
  return async (req, res, next) => {
    const guildId = req.params.guildId || req.body.guildId;
    if (!guildId) {
      return res.status(400).json({ error: 'ID do servidor não fornecido' });
    }

    // 1. Busca ou hidrata o servidor no Discord Client
    let botGuild = client.guilds.cache.get(guildId);
    if (!botGuild) {
      botGuild = await client.guilds.fetch(guildId).catch(() => null);
    }

    if (!botGuild) {
      return res.status(404).json({ error: 'O bot não está presente neste servidor.' });
    }

    // 2. Validação Real-Time no Servidor do Discord (Owner ou Permissão de Administrador)
    const isGuildOwner = botGuild.ownerId === req.user.id;
    let isDiscordAdmin = false;

    try {
      const member = await botGuild.members.fetch(req.user.id).catch(() => null);
      if (member) {
        isDiscordAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator) ||
          member.permissions.has(PermissionsBitField.Flags.ManageGuild);
      }
    } catch (e) {}

    // 3. Validação pelo Token OAuth2 (Sessão do Discord)
    const userGuild = (req.userGuilds || []).find(g => g.id === guildId);
    let isOAuthAdmin = false;
    if (userGuild) {
      const permissions = BigInt(userGuild.permissions || userGuild.permissions_new || '0');
      const isAdmin = (permissions & 0x8n) === 0x8n;
      const isManager = (permissions & 0x20n) === 0x20n;
      isOAuthAdmin = Boolean(userGuild.owner || isAdmin || isManager);
    }

    // Se qualquer uma das 3 verificações for válida, concede acesso
    if (!isGuildOwner && !isDiscordAdmin && !isOAuthAdmin) {
      return res.status(403).json({ error: 'Você precisa ser Administrador ou Dono deste servidor para acessá-lo.' });
    }

    // Garante carregamento de canais e cargos
    await botGuild.channels.fetch().catch(() => {});
    await botGuild.roles.fetch().catch(() => {});

    req.botGuild = botGuild;
    req.targetGuildId = guildId;
    next();
  };
}

module.exports = {
  CLIENT_ID,
  CLIENT_SECRET,
  exchangeCodeForToken,
  fetchUserProfile,
  fetchUserGuilds,
  createSession,
  verifySession,
  requireAuth,
  requireGuildAdmin
};
