const express = require('express');
const path = require('path');
const crypto = require('crypto');
const DatabaseManager = require('./database/manager.js');
const {
  CLIENT_ID,
  exchangeCodeForToken,
  fetchUserProfile,
  fetchUserGuilds,
  createSession,
  verifySession
} = require('./web/auth.js');
const { createApiRouter } = require('./web/routes/api.js');

function startServer(client) {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // 1. CABEÇALHOS DE SEGURANÇA GLOBAIS (OWASP HARDENING)
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // 2. MIDDLEWARES ESSENCIAIS (COM CONTROLE DE TAMANHO DE PAYLOAD)
  app.use(express.json({ limit: '500kb' }));
  app.use(express.urlencoded({ extended: true, limit: '500kb' }));
  app.use(express.static(path.join(__dirname, 'web', 'public')));

  // =========================================================================
  // ROTAS DE AUTENTICAÇÃO DISCORD OAUTH2 (COM PROTEÇÃO ANTI-CSRF VIA STATE)
  // =========================================================================
  app.get('/auth/login', (req, res) => {
    // Se o usuário já possui sessão válida persistente, vai direto para o dashboard
    const cookieHeader = req.headers.cookie;
    if (cookieHeader && !req.query.force) {
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => {
          const [k, ...v] = c.split('=');
          return [k, decodeURIComponent(v.join('='))];
        })
      );
      const session = verifySession(cookies.noozy_session || cookies.rikeozinho_session || cookies.stepticket_session);
      if (session) {
        return res.redirect('/dashboard');
      }
    }

    const host = req.get('host');
    const isHttps = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https';
    const protocol = isHttps ? 'https' : 'http';
    const redirectUri = `${protocol}://${host}/auth/callback`;

    // Gera um token de estado OAuth2 criptograficamente seguro para prevenir ataques de CSRF
    const oauthState = crypto.randomBytes(24).toString('hex');
    const secureCookieFlag = isHttps ? '; Secure' : '';
    res.setHeader('Set-Cookie', `noozy_oauth_state=${oauthState}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secureCookieFlag}`);

    const authUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&scope=identify+guilds&state=${oauthState}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    res.redirect(authUrl);
  });

  app.get('/auth/callback', async (req, res) => {
    const { code, state } = req.query;
    if (!code) {
      return res.redirect('/?error=no_code');
    }

    // Validação estrita do State Token (Anti-CSRF)
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').filter(Boolean).map(c => {
        const [k, ...v] = c.split('=');
        return [k, decodeURIComponent(v.join('='))];
      })
    );

    const storedState = cookies.noozy_oauth_state || cookies.rikeozinho_oauth_state;
    if (!state || !storedState || state !== storedState) {
      console.warn('[SEGURANÇA] Tentativa de login rejeitada: State Token OAuth2 inválido ou ausente.');
      return res.redirect('/?error=invalid_state');
    }

    const host = req.get('host');
    const isHttps = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https';
    const protocol = isHttps ? 'https' : 'http';
    const redirectUri = `${protocol}://${host}/auth/callback`;

    try {
      // Troca o código pelo access_token
      const tokenData = await exchangeCodeForToken(code, redirectUri);
      const user = await fetchUserProfile(tokenData.access_token);
      const guilds = await fetchUserGuilds(tokenData.access_token);

      // Cria a sessão assinada
      const { signedCookie } = createSession(user, guilds);

      const secureCookieFlag = isHttps ? '; Secure' : '';
      // Limpa o cookie de state e define a sessão autenticada
      res.setHeader('Set-Cookie', [
        `noozy_session=${signedCookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${secureCookieFlag}`,
        `noozy_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
      ]);
      return res.redirect('/dashboard');
    } catch (err) {
      console.error('Erro na autenticação OAuth2:', err.message);
      return res.redirect('/?error=auth_failed');
    }
  });

  app.get('/auth/logout', (req, res) => {
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').filter(Boolean).map(c => {
          const [k, ...v] = c.split('=');
          return [k, decodeURIComponent(v.join('='))];
        })
      );
      const signedCookie = cookies.noozy_session || cookies.rikeozinho_session || cookies.stepticket_session;
      if (signedCookie) {
        const [sessionId] = signedCookie.split('.');
        if (sessionId) {
          DatabaseManager.deleteSession(sessionId);
        }
      }
    }

    res.setHeader('Set-Cookie', 'noozy_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    return res.redirect('/');
  });

  app.get('/auth/me', (req, res) => {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return res.json({ authenticated: false });

    const cookies = Object.fromEntries(
      cookieHeader.split('; ').filter(Boolean).map(c => {
        const [k, ...v] = c.split('=');
        return [k, decodeURIComponent(v.join('='))];
      })
    );

    const session = verifySession(cookies.noozy_session || cookies.rikeozinho_session);
    if (!session) return res.json({ authenticated: false });

    return res.json({
      authenticated: true,
      user: {
        id: session.user.id,
        username: session.user.username,
        global_name: session.user.global_name || session.user.username,
        avatar: session.user.avatar
          ? `https://cdn.discordapp.com/avatars/${session.user.id}/${session.user.avatar}.png?size=256`
          : 'https://cdn.discordapp.com/embed/avatars/0.png'
      }
    });
  });

  // =========================================================================
  // ROTAS DA REST API
  // =========================================================================
  app.use('/api', createApiRouter(client));

  // =========================================================================
  // ROTAS DE PÁGINAS HTML (FRONTEND)
  // =========================================================================
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'public', 'index.html'));
  });

  app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'public', 'dashboard.html'));
  });

  app.get('/dashboard/:guildId', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'public', 'manage.html'));
  });

  // Visualizador Seguro de Transcrições de Tickets (com isolamento de CSP)
  app.get('/transcript/:id', (req, res) => {
    const { getTranscriptFilePath } = require('./utils/transcript.js');
    const file = getTranscriptFilePath(req.params.id);

    if (!file) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Transcrição Não Encontrada - Noozy</title>
          <link rel="stylesheet" href="/style.css">
        </head>
        <body style="display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center;">
          <div class="card-panel" style="max-width: 480px; padding: 3rem;">
            <i class="fa-solid fa-file-circle-xmark" style="font-size: 3.5rem; color: var(--danger); margin-bottom: 1rem;"></i>
            <h2>Transcrição Não Encontrada</h2>
            <p style="color: var(--text-muted); margin-top: 8px;">Este relatório de atendimento não existe ou o identificador é inválido.</p>
            <a href="/dashboard" class="btn btn-primary" style="margin-top: 1.5rem; display: inline-block;">Voltar ao Dashboard</a>
          </div>
        </body>
        </html>
      `);
    }

    // Configuração de isolamento de contexto (Content Security Policy restritivo)
    res.setHeader('Content-Security-Policy', "default-src 'self' https://cdn.discordapp.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'; object-src 'none';");
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (file.type === 'html') {
      return res.type('html').sendFile(file.path);
    } else {
      return res.type('text').sendFile(file.path);
    }
  });

  // Healthcheck / Ping
  app.get('/ping', (req, res) => {
    res.status(200).send('pong');
  });

  // Inicialização do servidor
  try {
    const server = app.listen(PORT, () => {
      console.log(`🌐 Painel Web & API Dashboard rodando com sucesso em http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[AVISO] Porta ${PORT} em uso. O servidor web continuará funcionando.`);
      } else {
        console.error('Erro no servidor web:', err.message);
      }
    });

    return server;
  } catch (err) {
    console.warn('Servidor web não pôde ser iniciado:', err.message);
  }
}

module.exports = {
  startServer
};
