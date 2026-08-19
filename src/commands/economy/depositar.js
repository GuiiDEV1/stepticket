const { SlashCommandBuilder } = require('discord.js');
const DatabaseManager = require('../../database/manager.js');
const { createEmbed, errorEmbed, COLORS } = require('../../utils/embedBuilder.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('depositar')
    .setDescription('Deposita moedas da sua carteira no banco para guardar com segurança')
    .addStringOption(opt =>
      opt
        .setName('quantidade')
        .setDescription('Valor numérico para depositar ou "tudo"')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const rawAmount = interaction.options.getString('quantidade').trim().toLowerCase();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const result = DatabaseManager.depositBank(guildId, userId, rawAmount);

    if (!result) {
      return interaction.reply({
        embeds: [errorEmbed('Valor Inválido ou Saldo Insuficiente', 'Verifique se digitou um número positivo ou se possui esse saldo na sua carteira.')],
        ephemeral: true
      });
    }

    const embed = createEmbed({
      title: '🏦 Depósito Realizado com Sucesso!',
      description: `Você depositou **🪙 ${result.amount.toLocaleString('pt-BR')} Coins** no banco.\n\n` +
        `**Saldo na Carteira:** \`🪙 ${result.wallet.toLocaleString('pt-BR')}\`\n` +
        `**Saldo no Banco:** \`🪙 ${result.bank.toLocaleString('pt-BR')}\``,
      color: COLORS.SUCCESS
    });

    return interaction.reply({ embeds: [embed] });
  }
};
