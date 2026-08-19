const express = require('express');
const path = require('path');
const {
  CLIENT_ID,
  CLIENT_SECRET,
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

  // Middlewares essenciais
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, 'web', 'public')));

  // =========================================================================
  // ROTAS DE AUTENTICAÇÃO DISCORD OAUTH2
  // =========================================================================
  app.get('/auth/login', (req, res) => {
    const host = req.get('host');
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const redirectUri = `${protocol}://${host}/auth/callback`;

    const authUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&scope=identify+guilds&redirect_uri=${encodeURIComponent(redirectUri)}`;
    res.redirect(authUrl);
  });

  app.get('/auth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
      return res.redirect('/?error=no_code');
    }

    const host = req.get('host');
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const redirectUri = `${protocol}://${host}/auth/callback`;

    try {
      // Troca o código pelo access_token
      const tokenData = await exchangeCodeForToken(code, redirectUri);
      const user = await fetchUserProfile(tokenData.access_token);
      const guilds = await fetchUserGuilds(tokenData.access_token);

      // Cria a sessão assinada
      const { signedCookie } = createSession(user, guilds);

      res.setHeader('Set-Cookie', `rikeozinho_session=${signedCookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`);
      return res.redirect('/dashboard');
    } catch (err) {
      console.error('Erro na autenticação OAuth2:', err.message);
      return res.redirect('/?error=auth_failed');
    }
  });

  app.get('/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'rikeozinho_session=; Path=/; HttpOnly; Max-Age=0');
    return res.redirect('/');
  });

  app.get('/auth/me', (req, res) => {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return res.json({ authenticated: false });

    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => {
        const [k, ...v] = c.split('=');
        return [k, decodeURIComponent(v.join('='))];
      })
    );

    const session = verifySession(cookies.rikeozinho_session);
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

  // Visualizador Online de Transcrições de Tickets
  app.get('/transcript/:id', (req, res) => {
    const { getTranscriptFilePath } = require('./utils/transcript.js');
    const file = getTranscriptFilePath(req.params.id);

    if (!file) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Transcrição Não Encontrada - rikeozinho</title>
          <link rel="stylesheet" href="/style.css">
        </head>
        <body style="display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center;">
          <div class="card-panel" style="max-width: 480px; padding: 3rem;">
            <i class="fa-solid fa-file-circle-xmark" style="font-size: 3.5rem; color: var(--danger); margin-bottom: 1rem;"></i>
            <h2>Transcrição Não Encontrada</h2>
            <p style="color: var(--text-muted); margin-top: 8px;">Este relatório de atendimento não existe ou foi removido do servidor.</p>
            <a href="/dashboard" class="btn btn-primary" style="margin-top: 1.5rem; display: inline-block;">Voltar ao Dashboard</a>
          </div>
        </body>
        </html>
      `);
    }

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
