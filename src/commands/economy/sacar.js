const { SlashCommandBuilder } = require('discord.js');
const DatabaseManager = require('../../database/manager.js');
const { createEmbed, errorEmbed, COLORS } = require('../../utils/embedBuilder.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sacar')
    .setDescription('Saca moedas do seu banco para a sua carteira')
    .addStringOption(opt =>
      opt
        .setName('quantidade')
        .setDescription('Valor numérico para sacar ou "tudo"')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const rawAmount = interaction.options.getString('quantidade').trim().toLowerCase();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const result = DatabaseManager.withdrawBank(guildId, userId, rawAmount);

    if (!result) {
      return interaction.reply({
        embeds: [errorEmbed('Valor Inválido ou Saldo Insuficiente', 'Verifique se digitou um número positivo ou se possui esse saldo no banco.')],
        ephemeral: true
      });
    }

    const embed = createEmbed({
      title: '💵 Saque Realizado com Sucesso!',
      description: `Você sacou **🪙 ${result.amount.toLocaleString('pt-BR')} Coins** do seu banco.\n\n` +
        `**Saldo na Carteira:** \`🪙 ${result.wallet.toLocaleString('pt-BR')}\`\n` +
        `**Saldo no Banco:** \`🪙 ${result.bank.toLocaleString('pt-BR')}\``,
      color: COLORS.SUCCESS
    });

    return interaction.reply({ embeds: [embed] });
  }
};
