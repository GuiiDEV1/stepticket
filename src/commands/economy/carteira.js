const { SlashCommandBuilder } = require('discord.js');
const DatabaseManager = require('../../database/manager.js');
const { createEmbed, COLORS } = require('../../utils/embedBuilder.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('carteira')
    .setDescription('Consulta o saldo da carteira e do banco')
    .addUserOption(opt =>
      opt
        .setName('usuario')
        .setDescription('Usuário para consultar o saldo')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    const guildId = interaction.guild.id;
    const eco = DatabaseManager.getEconomy(guildId, targetUser.id);
    const total = eco.wallet + eco.bank;

    const embed = createEmbed({
      title: `💰 Carteira Financeira • ${targetUser.username}`,
      color: COLORS.PRIMARY,
      thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: '💵 Dinheiro na Carteira', value: `\`🪙 ${eco.wallet.toLocaleString('pt-BR')} Coins\``, inline: true },
        { name: '🏦 Dinheiro no Banco', value: `\`🪙 ${eco.bank.toLocaleString('pt-BR')} Coins\``, inline: true },
        { name: '💎 Patrimônio Total', value: `\`🪙 ${total.toLocaleString('pt-BR')} Coins\``, inline: true }
      ],
      footerText: 'Use /depositar e /sacar para gerenciar seu saldo bancário'
    });

    return interaction.reply({ embeds: [embed] });
  }
};
