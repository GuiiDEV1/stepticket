const { Events } = require('discord.js');
const { errorEmbed } = require('../../utils/embedBuilder.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // Tratar Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands ? client.commands.get(interaction.commandName) : null;

      if (!command) {
        return interaction.reply({
          embeds: [errorEmbed('Comando Não Encontrado', 'Este comando não está disponível no momento.')],
          ephemeral: true
        }).catch(() => {});
      }

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`❌ Erro ao executar /${interaction.commandName}:`, error);

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
