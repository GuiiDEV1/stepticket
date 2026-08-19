const { SlashCommandBuilder } = require('discord.js');
const DatabaseManager = require('../../database/manager.js');
const { createEmbed, errorEmbed, COLORS } = require('../../utils/embedBuilder.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pagar')
    .setDescription('Transfere moedas da sua carteira para outro membro')
    .addUserOption(opt =>
      opt
        .setName('usuario')
        .setDescription('Membro que receberá a transferência')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName('quantidade')
        .setDescription('Quantidade de moedas a transferir')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('usuario');
    const amount = interaction.options.getInteger('quantidade');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (targetUser.id === userId) {
      return interaction.reply({
        embeds: [errorEmbed('Transferência Inválida', 'Você não pode transferir dinheiro para você mesmo!')],
        ephemeral: true
      });
    }

    if (targetUser.bot) {
      return interaction.reply({
        embeds: [errorEmbed('Transferência Inválida', 'Você não pode transferir dinheiro para bots.')],
        ephemeral: true
      });
    }

    const success = DatabaseManager.transferMoney(guildId, userId, targetUser.id, amount);

    if (!success) {
      return interaction.reply({
        embeds: [errorEmbed('Saldo Insuficiente', `Você não possui **🪙 ${amount.toLocaleString('pt-BR')} Coins** na sua carteira.`)],
        ephemeral: true
      });
    }

    const senderEco = DatabaseManager.getEconomy(guildId, userId);

    const embed = createEmbed({
      title: '💸 Transferência Realizada com Sucesso!',
      description: `Você enviou **🪙 ${amount.toLocaleString('pt-BR')} Coins** para <@${targetUser.id}>!\n\n` +
        `**Seu Saldo Restante:** \`🪙 ${senderEco.wallet.toLocaleString('pt-BR')} Coins\``,
      color: COLORS.SUCCESS
    });

    return interaction.reply({ content: `<@${targetUser.id}>`, embeds: [embed] });
  }
};
