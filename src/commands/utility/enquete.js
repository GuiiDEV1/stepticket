const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { createEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('enquete')
    .setDescription('Cria uma enquete interativa com botões de votação')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(opt => opt.setName('pergunta').setDescription('Pergunta da enquete').setRequired(true))
    .addStringOption(opt => opt.setName('opcao1').setDescription('Primeira opção').setRequired(true))
    .addStringOption(opt => opt.setName('opcao2').setDescription('Segunda opção').setRequired(true))
    .addStringOption(opt => opt.setName('opcao3').setDescription('Terceira opção (opcional)').setRequired(false))
    .addStringOption(opt => opt.setName('opcao4').setDescription('Quarta opção (opcional)').setRequired(false))
    .addStringOption(opt => opt.setName('opcao5').setDescription('Quinta opção (opcional)').setRequired(false)),

  async execute(interaction, client) {
    const question = interaction.options.getString('pergunta');
    const options = [
      interaction.options.getString('opcao1'),
      interaction.options.getString('opcao2'),
      interaction.options.getString('opcao3'),
      interaction.options.getString('opcao4'),
      interaction.options.getString('opcao5')
    ].filter(Boolean);

    let description = `**Pergunta:** ${question}\n\n`;
    options.forEach((opt, idx) => {
      description += `**${idx + 1}. ${opt}**\n⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 0% (0 votos)\n\n`;
    });
    description += `👥 **Total de Votos:** 0`;

    const pollEmbed = createEmbed({
      title: '📊 Enquete da Comunidade',
      description,
      color: COLORS.INFO,
      footerText: `Criada por ${interaction.user.tag}`
    });

    const buttonsRow = new ActionRowBuilder();
    options.forEach((opt, idx) => {
      buttonsRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`poll_vote_${idx}`)
          .setLabel(`Opção ${idx + 1}`)
          .setStyle(ButtonStyle.Primary)
      );
    });

    const sentMsg = await interaction.channel.send({ embeds: [pollEmbed], components: [buttonsRow] });

    DatabaseManager.createPoll({
      id: `POLL-${Date.now().toString(36)}`,
      messageId: sentMsg.id,
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      authorId: interaction.user.id,
      question,
      options
    });

    return interaction.reply({ content: '✅ Enquete criada com sucesso!', ephemeral: true });
  }
};
