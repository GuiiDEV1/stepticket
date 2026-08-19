const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { createEmbed, COLORS, errorEmbed, warningEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('divorcio')
    .setDescription('💔 Termine seu casamento atual no servidor.'),
  category: 'social',
  async execute(interaction, client) {
    const author = interaction.user;
    const marriage = DatabaseManager.getMarriage(author.id);

    if (!marriage) {
      return interaction.reply({
        embeds: [errorEmbed('Você Não é Casado(a)!', 'Você não possui nenhum casamento ativo para se divorciar.')],
        ephemeral: true
      });
    }

    const partner = await client.users.fetch(marriage.partner_id).catch(() => null);
    const partnerName = partner ? partner.tag : `<@${marriage.partner_id}>`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`divorce_confirm_${author.id}`)
        .setLabel('Confirmar Divórcio')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('💔'),
      new ButtonBuilder()
        .setCustomId(`divorce_cancel_${author.id}`)
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🛡️')
    );

    const promptEmbed = createEmbed({
      title: '💔 Pedido de Divórcio',
      description: `Você tem certeza que deseja se separar de **${partnerName}**?\n\nEsta ação é irreversível e apagará todos os pontos de afinidade e tempo juntos.`,
      color: COLORS.WARNING
    });

    const response = await interaction.reply({
      embeds: [promptEmbed],
      components: [row],
      ephemeral: true
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== author.id) return;

      if (i.customId.startsWith('divorce_confirm_')) {
        DatabaseManager.deleteMarriage(author.id);

        // Log de Atividade
        DatabaseManager.logActivity(interaction.guild.id, {
          type: 'general',
          icon: '💔',
          title: 'Divórcio Realizado',
          description: `${author.tag} e ${partnerName} agora estão oficialmente divorciados.`,
          user_tag: author.tag,
          user_avatar: author.displayAvatarURL({ dynamic: true })
        });

        const doneEmbed = createEmbed({
          title: '💔 Divórcio Concluído',
          description: `Você agora está oficialmente solteiro(a) e livre. Seu casamento com **${partnerName}** foi desfeito.`,
          color: COLORS.ERROR
        });

        await i.update({ embeds: [doneEmbed], components: [] });
      } else {
        await i.update({
          embeds: [createEmbed({ title: '🛡️ Divórcio Cancelado', description: 'Você decidiu continuar casado(a)!', color: COLORS.SUCCESS })],
          components: []
        });
      }
    });
  }
};
