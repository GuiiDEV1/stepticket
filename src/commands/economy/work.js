const { SlashCommandBuilder } = require('discord.js');
const DatabaseManager = require('../../database/manager.js');
const { createEmbed, warningEmbed, COLORS } = require('../../utils/embedBuilder.js');
const ms = require('ms');

const WORK_JOBS = [
  { job: 'Desenvolveu uma nova função para o Luqqzstrap', min: 250, max: 550 },
  { job: 'Ajudou um membro no suporte de Tickets', min: 200, max: 450 },
  { job: 'Otimizou as FastFlags de um servidor inteiro', min: 300, max: 600 },
  { job: 'Criou um script para Roblox e vendeu com sucesso', min: 350, max: 700 },
  { job: 'Trabalhou como moderador no chat do servidor', min: 180, max: 400 },
  { job: 'Encontrou um novo offset de memória para o Roblox', min: 400, max: 800 },
  { job: 'Fez um design de logo incrível no Canvas', min: 220, max: 480 }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Trabalha para receber seu salário em Coins'),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const eco = DatabaseManager.getEconomy(guildId, userId);
    const now = Date.now();
    const cooldown = 60 * 60 * 1000; // 1 hora

    if (now - eco.last_work < cooldown) {
      const remainingMs = cooldown - (now - eco.last_work);
      const remainingTime = ms(remainingMs, { long: true });
      return interaction.reply({
        embeds: [warningEmbed('Descanso Necessário', `Você acabou de trabalhar! Descanse um pouco e volte em **${remainingTime}**.`)],
        ephemeral: true
      });
    }

    const randomJob = WORK_JOBS[Math.floor(Math.random() * WORK_JOBS.length)];
    const earnings = Math.floor(Math.random() * (randomJob.max - randomJob.min + 1)) + randomJob.min;

    DatabaseManager.addWallet(guildId, userId, earnings);
    DatabaseManager.setLastWork(guildId, userId, now);

    const updatedEco = DatabaseManager.getEconomy(guildId, userId);

    const embed = createEmbed({
      title: '💼 Dia de Trabalho Concluído!',
      description: `Você **${randomJob.job}** e recebeu um salário de **🪙 ${earnings.toLocaleString('pt-BR')} Coins**!\n\n` +
        `**Saldo Atual na Carteira:** \`🪙 ${updatedEco.wallet.toLocaleString('pt-BR')} Coins\``,
      color: COLORS.SUCCESS,
      footerText: 'Você pode trabalhar novamente daqui a 1 hora'
    });

    return interaction.reply({ embeds: [embed] });
  }
};
