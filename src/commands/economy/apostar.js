const { SlashCommandBuilder } = require('discord.js');
const DatabaseManager = require('../../database/manager.js');
const { createEmbed, errorEmbed, COLORS } = require('../../utils/embedBuilder.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apostar')
    .setDescription('Aposte suas moedas no minijogo de sorte (Cassino / Roleta)')
    .addIntegerOption(opt =>
      opt
        .setName('quantidade')
        .setDescription('Quantidade de moedas a apostar')
        .setRequired(true)
        .setMinValue(50)
        .setMaxValue(100000)
    ),

  async execute(interaction, client) {
    const betAmount = interaction.options.getInteger('quantidade');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    // 1. Débito Atômico Imediato (Previne Race Conditions de múltiplas apostas concorrentes)
    const deducted = DatabaseManager.removeWallet(guildId, userId, betAmount);
    if (!deducted) {
      return interaction.reply({
        embeds: [errorEmbed('Saldo Insuficiente', `Você precisa de pelo menos **🪙 ${betAmount.toLocaleString('pt-BR')} Coins** na carteira para apostar.`)],
        ephemeral: true
      });
    }

    // 2. Chance de vitória: 48% (Multiplicador 2x) | 7% (Jackpot 3x) | 45% (Derrota)
    const roll = Math.random() * 100;
    let won = false;
    let multiplier = 0;

    if (roll <= 7) {
      // JACKPOT 3X!
      won = true;
      multiplier = 3;
    } else if (roll <= 55) {
      // VITÓRIA 2X!
      won = true;
      multiplier = 2;
    } else {
      // DERROTA
      won = false;
    }

    if (won) {
      const totalPayout = betAmount * multiplier;
      const profit = betAmount * (multiplier - 1);
      DatabaseManager.addWallet(guildId, userId, totalPayout);
      const updated = DatabaseManager.getEconomy(guildId, userId);

      const embed = createEmbed({
        title: multiplier === 3 ? '🎰 💥 JACKPOT INCRÍVEL! 💥 🎰' : '🎰 🎉 VOCÊ VENCEU A APOSTA! 🎉',
        description: `Você apostou **🪙 ${betAmount.toLocaleString('pt-BR')}** e multiplicou seus ganhos por **${multiplier}x**!\n\n` +
          `**Lucro Obtido:** \`+🪙 ${profit.toLocaleString('pt-BR')} Coins\`\n` +
          `**Saldo Atual na Carteira:** \`🪙 ${updated.wallet.toLocaleString('pt-BR')} Coins\``,
        color: multiplier === 3 ? '#FFD700' : COLORS.SUCCESS,
        footerText: 'Jogue com responsabilidade'
      });

      return interaction.reply({ embeds: [embed] });
    } else {
      const updated = DatabaseManager.getEconomy(guildId, userId);

      const embed = createEmbed({
        title: '🎰 😢 Não foi dessa vez...',
        description: `Você apostou **🪙 ${betAmount.toLocaleString('pt-BR')} Coins** e a roleta parou no vermelho!\n\n` +
          `**Perda:** \`-🪙 ${betAmount.toLocaleString('pt-BR')} Coins\`\n` +
          `**Saldo Restante:** \`🪙 ${updated.wallet.toLocaleString('pt-BR')} Coins\``,
        color: COLORS.ERROR,
        footerText: 'Tente a sorte novamente quando quiser'
      });

      return interaction.reply({ embeds: [embed] });
    }
  }
};
