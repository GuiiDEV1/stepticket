const DatabaseManager = require('../../database/manager');
const { successEmbed, infoEmbed, errorEmbed, createEmbed, COLORS } = require('../../utils/embedBuilder');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isButton() || interaction.customId !== 'giveaway_enter') return;

    const result = DatabaseManager.toggleGiveawayEntry(interaction.message.id, interaction.user.id);

    if (!result.success) {
      return interaction.reply({
        embeds: [errorEmbed('Sorteio Encerrado', 'Este sorteio já foi finalizado e não aceita mais inscrições.')],
        ephemeral: true
      });
    }

    const giveaway = DatabaseManager.getGiveawayByMessage(interaction.message.id);
    if (giveaway) {
      // Atualiza o botão com a nova contagem de inscritos
      const updatedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('giveaway_enter')
          .setLabel(`Participar (${result.count})`)
          .setStyle(ButtonStyle.Success)
          .setEmoji('🎉')
      );

      await interaction.message.edit({ components: [updatedRow] }).catch(() => {});
    }

    if (result.entered) {
      return interaction.reply({
        embeds: [successEmbed('Inscrição Confirmada!', 'Você está participando deste sorteio! Boa sorte! 🎉')],
        ephemeral: true
      });
    } else {
      return interaction.reply({
        embeds: [infoEmbed('Inscrição Removida', 'Você saiu do sorteio e não está mais concorrendo.')],
        ephemeral: true
      });
    }
  }
};
