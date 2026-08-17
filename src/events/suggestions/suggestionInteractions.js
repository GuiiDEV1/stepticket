const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { createEmbed, errorEmbed, successEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // 1. VOTAÇÃO DE SUGESTÃO (UPVOTE / DOWNVOTE)
    if (interaction.isButton() && (interaction.customId === 'suggest_up' || interaction.customId === 'suggest_down')) {
      const type = interaction.customId === 'suggest_up' ? 'up' : 'down';
      const result = DatabaseManager.voteSuggestion(interaction.message.id, interaction.user.id, type);

      if (!result) {
        return interaction.reply({
          embeds: [errorEmbed('Sugestão Finalizada', 'Esta sugestão já foi avaliada pela Staff e as votações estão encerradas.')],
          ephemeral: true
        });
      }

      // Atualiza botões com contagem de votos
      const oldComponents = interaction.message.components;
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('suggest_up')
          .setLabel(`Apoio (${result.upvotes})`)
          .setStyle(ButtonStyle.Success)
          .setEmoji('👍'),
        new ButtonBuilder()
          .setCustomId('suggest_down')
          .setLabel(`Discordo (${result.downvotes})`)
          .setStyle(ButtonStyle.Danger)
          .setEmoji('👎')
      );

      const components = [row1];
      if (oldComponents[1]) {
        components.push(oldComponents[1]); // Mantém linha dos botões da staff
      }

      await interaction.message.edit({ components }).catch(() => {});

      return interaction.reply({
        embeds: [successEmbed('Voto Computado', `Seu voto foi registrado com sucesso na sugestão!`)],
        ephemeral: true
      });
    }

    // 2. BOTÕES DE MODERAÇÃO DA STAFF (APROVAR / REJEITAR)
    if (interaction.isButton() && (interaction.customId === 'suggest_accept' || interaction.customId === 'suggest_reject')) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          embeds: [errorEmbed('Permissão Negada', 'Apenas membros da equipe de moderação podem aprovar ou rejeitar sugestões.')],
          ephemeral: true
        });
      }

      const action = interaction.customId === 'suggest_accept' ? 'Aceitar' : 'Rejeitar';
      const modalId = interaction.customId === 'suggest_accept' ? 'modal_suggest_accept' : 'modal_suggest_reject';

      const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle(`${action} Sugestão`);

      const reasonInput = new TextInputBuilder()
        .setCustomId('staff_reason')
        .setLabel('Justificativa da Equipe')
        .setPlaceholder('Explique o motivo da decisão...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500);

      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      await interaction.showModal(modal);
      return;
    }

    // 3. PROCESSAMENTO DO MODAL DE APROVAÇÃO / REJEIÇÃO
    if (interaction.isModalSubmit() && (interaction.customId === 'modal_suggest_accept' || interaction.customId === 'modal_suggest_reject')) {
      const isApproved = interaction.customId === 'modal_suggest_accept';
      const reason = interaction.fields.getTextInputValue('staff_reason');
      const suggestion = DatabaseManager.getSuggestionByMessage(interaction.message.id);

      if (!suggestion) {
        return interaction.reply({
          embeds: [errorEmbed('Erro', 'Sugestão não encontrada no banco de dados.')],
          ephemeral: true
        });
      }

      DatabaseManager.updateSuggestionStatus(
        interaction.message.id,
        isApproved ? 'approved' : 'rejected',
        interaction.user.id,
        reason
      );

      const oldEmbed = interaction.message.embeds[0];
      const updatedEmbed = createEmbed({
        title: isApproved ? '💡 Sugestão Aprovada' : '💡 Sugestão Recusada',
        description: suggestion.suggestion_text,
        color: isApproved ? COLORS.SUCCESS : COLORS.ERROR,
        fields: [
          { name: '👤 Autor', value: `<@${suggestion.author_id}>`, inline: true },
          { name: '👮 Moderador', value: `${interaction.user}`, inline: true },
          { name: '📝 Motivo da Decisão', value: reason, inline: false },
          { name: '📊 Votos Finais', value: `👍 **${suggestion.upvotes.length}** | 👎 **${suggestion.downvotes.length}**`, inline: false }
        ],
        footerText: `Status atualizado em`
      });

      // Desativa todos os botões
      await interaction.message.edit({
        embeds: [updatedEmbed],
        components: []
      }).catch(() => {});

      await interaction.reply({
        embeds: [successEmbed('Sucesso', `A sugestão foi marcada como **${isApproved ? 'Aprovada' : 'Recusada'}**!`)],
        ephemeral: true
      });
      return;
    }
  }
};
