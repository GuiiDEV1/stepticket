const { SlashCommandBuilder } = require('discord.js');
const DatabaseManager = require('../../database/manager.js');
const { createEmbed, warningEmbed, COLORS } = require('../../utils/embedBuilder.js');
const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Resgata sua recompensa diária de moedas (Coins)'),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const eco = DatabaseManager.getEconomy(guildId, userId);
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000; // 24 horas

    if (now - eco.last_daily < cooldown) {
      const remainingMs = cooldown - (now - eco.last_daily);
      const remainingTime = ms(remainingMs, { long: true });
      return interaction.reply({
        embeds: [warningEmbed('Já Resgatado Hoje', `Você já resgatou seu bônus diário! Volte em **${remainingTime}**.`)],
        ephemeral: true
      });
    }

    // Bônus aleatório entre 500 e 1500 coins
    const reward = Math.floor(Math.random() * 1001) + 500;
    DatabaseManager.addWallet(guildId, userId, reward);
    DatabaseManager.setLastDaily(guildId, userId, now);

    const updatedEco = DatabaseManager.getEconomy(guildId, userId);

    const embed = createEmbed({
      title: '🎁 Bônus Diário Resgatado!',
      description: `Parabéns, <@${userId}>! Você recebeu **🪙 ${reward.toLocaleString('pt-BR')} Coins** no seu bônus diário!\n\n` +
        `**Saldo na Carteira:** \`🪙 ${updatedEco.wallet.toLocaleString('pt-BR')} Coins\``,
      color: COLORS.SUCCESS,
      footerText: 'Volte amanhã para resgatar mais'
    });

    return interaction.reply({ embeds: [embed] });
  }
};
