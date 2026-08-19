const { Events } = require('discord.js');
const { errorEmbed } = require('../../utils/embedBuilder.js');

// Mapeamento de apelidos (aliases) comuns para redirecionar automaticamente
const commandAliases = {
  'balance': 'carteira',
  'saldo': 'carteira',
  'banco': 'carteira',
  'deposit': 'depositar',
  'withdraw': 'sacar',
  'pay': 'pagar',
  'transfer': 'pagar',
  'transferir': 'pagar',
  'gamble': 'apostar',
  'cassino': 'apostar',
  'roleta': 'apostar',
  'shop': 'loja',
  'poll': 'enquete',
  'suggestion': 'sugestao',
  'levels': 'leaderboard',
  'top': 'leaderboard',
  'versao': 'roblox',
  'status': 'roblox',
  'flags': 'flag',
  'fflag': 'flag',
  'tickets': 'ticket'
};

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    const activeClient = client || interaction.client;

    // Tratar Slash Commands (Chat Input)
    if (interaction.isChatInputCommand()) {
      let commandName = interaction.commandName.toLowerCase();
      console.log(`[INTERACTION] /${commandName} acionado por ${interaction.user.tag} (${interaction.user.id}) no servidor ${interaction.guild?.name}`);

      // Se for um apelido conhecido, redireciona
      if (!activeClient.commands.has(commandName) && commandAliases[commandName]) {
        commandName = commandAliases[commandName];
      }

      const command = activeClient.commands ? activeClient.commands.get(commandName) : null;

      if (!command) {
        console.warn(`[AVISO] Comando /${commandName} não encontrado no mapa de comandos.`);
        return interaction.reply({
          embeds: [errorEmbed('Comando Não Encontrado', `O comando \`/${interaction.commandName}\` não existe ou foi atualizado.\nUse \`/help\` para ver a lista de todos os comandos ativos!`)],
          ephemeral: true
        }).catch(() => {});
      }

      try {
        await command.execute(interaction, activeClient);
      } catch (error) {
        console.error(`❌ Erro ao executar /${commandName}:`, error);

        const replyOptions = {
          embeds: [errorEmbed('Erro na Execução', 'Ocorreu um erro ao processar este comando.')],
          ephemeral: true
        };

        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(replyOptions).catch(() => {});
          } else {
            await interaction.reply(replyOptions).catch(() => {});
          }
        } catch (e) {}
      }
    }
  }
};
