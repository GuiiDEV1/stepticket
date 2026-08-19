const express = require('express');

function startServer(client) {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.get('/', (req, res) => {
    res.status(200).json({
      status: 'online',
      message: 'StepTicket Bot está operando normalmente!',
      bot: client.user ? client.user.tag : 'Iniciando...',
      ping: `${client.ws.ping}ms`,
      uptime: `${Math.floor(process.uptime())}s`,
      guilds: client.guilds.cache.size,
      users: client.users.cache.size
    });
  });

  app.get('/ping', (req, res) => {
    res.status(200).send('pong');
  });

  try {
    const server = app.listen(PORT, () => {
      console.log(`🌐 Servidor Keep-Alive rodando com sucesso na porta ${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[AVISO] Porta ${PORT} em uso. Servidor Keep-Alive continuará em segundo plano.`);
      } else {
        console.error('Erro no servidor web Keep-Alive:', err.message);
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
