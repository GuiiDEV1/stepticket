const DatabaseManager = require('../../database/manager');
const { createEmbed, errorEmbed, successEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isButton() || !interaction.customId.startsWith('poll_vote_')) return;

    const optionIndex = parseInt(interaction.customId.replace('poll_vote_', ''), 10);
    const result = DatabaseManager.votePoll(interaction.message.id, interaction.user.id, optionIndex);

    if (!result) {
      return interaction.reply({
        embeds: [errorEmbed('Enquete Não Encontrada', 'Esta enquete não está mais ativa no banco de dados.')],
        ephemeral: true
      });
    }

    const { options, votes } = result;
    const totalVotes = Object.keys(votes).length;

    // Calcular contagens por opção
    const optionCounts = options.map((_, idx) => {
      return Object.values(votes).filter(v => v === idx).length;
    });

    // Formatar descrição da enquete com barra de porcentagem
    const poll = DatabaseManager.getPollByMessage(interaction.message.id);
    let description = `**Pergunta:** ${poll.question}\n\n`;

    options.forEach((opt, idx) => {
      const count = optionCounts[idx];
      const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      const filledBlocks = Math.round(percent / 10);
      const emptyBlocks = 10 - filledBlocks;
      const bar = '🟩'.repeat(filledBlocks) + '⬜'.repeat(emptyBlocks);

      description += `**${idx + 1}. ${opt}**\n${bar} ${percent}% (${count} votos)\n\n`;
    });

    description += `👥 **Total de Votos:** ${totalVotes}`;

    const updatedEmbed = createEmbed({
      title: '📊 Enquete da Comunidade',
      description,
      color: COLORS.INFO,
      footerText: `Criado por ID: ${poll.author_id}`
    });

    await interaction.message.edit({ embeds: [updatedEmbed] }).catch(() => {});

    return interaction.reply({
      embeds: [successEmbed('Voto Registrado!', `Você votou na opção **${options[optionIndex]}**!`)],
      ephemeral: true
    });
  }
};
