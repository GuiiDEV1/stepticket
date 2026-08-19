const { Events } = require('discord.js');
const { errorEmbed } = require('../../utils/embedBuilder.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    const activeClient = client || interaction.client;

    // Tratar apenas Slash Commands (Chat Input)
    if (interaction.isChatInputCommand()) {
      const commandName = interaction.commandName;
      const command = activeClient.commands ? activeClient.commands.get(commandName) : null;

      if (!command) {
        console.warn(`[AVISO] Comando /${commandName} não encontrado na memória do bot.`);
        return interaction.reply({
          embeds: [errorEmbed('Comando Não Encontrado', `O comando \`/${commandName}\` não está registrado ou foi atualizado recentemente.\nPor favor, aguarde alguns segundos para o Discord sincronizar.`)],
          ephemeral: true
        }).catch(() => {});
      }

      try {
        await command.execute(interaction, activeClient);
      } catch (error) {
        console.error(`❌ Erro ao executar /${commandName}:`, error);

        const replyOptions = {
          embeds: [errorEmbed('Erro na Execução', 'Ocorreu um erro inesperado ao executar este comando.')],
          ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(replyOptions).catch(() => {});
        } else {
          await interaction.reply(replyOptions).catch(() => {});
        }
      }
    }
  }
};
