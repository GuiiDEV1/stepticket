const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { createEmbed, COLORS, errorEmbed, successEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('casar')
    .setDescription('💍 Peça alguém em casamento com uma aliança especial!')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('O membro que você deseja pedir em casamento')
        .setRequired(true)
    ),
  category: 'social',
  async execute(interaction, client) {
    const author = interaction.user;
    const target = interaction.options.getUser('usuario');

    if (target.id === author.id) {
      return interaction.reply({
        embeds: [errorEmbed('Amor Próprio Demais!', 'Você não pode se casar consigo mesmo(a)!')],
        ephemeral: true
      });
    }

    if (target.bot) {
      return interaction.reply({
        embeds: [errorEmbed('Robôs Não Amam!', 'Você não pode se casar com um bot do Discord!')],
        ephemeral: true
      });
    }

    // Checa se o autor já é casado
    const authorMarriage = DatabaseManager.getMarriage(author.id);
    if (authorMarriage) {
      return interaction.reply({
        embeds: [errorEmbed('Já Casado(a)!', `Você já está casado(a) com <@${authorMarriage.partner_id}>! Use \`/divorcio\` primeiro se deseja se separar.`)],
        ephemeral: true
      });
    }

    // Checa se o alvo já é casado
    const targetMarriage = DatabaseManager.getMarriage(target.id);
    if (targetMarriage) {
      return interaction.reply({
        embeds: [errorEmbed('Coração Ocupado!', `${target.tag} já está casado(a) com outra pessoa!`)],
        ephemeral: true
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`marry_yes_${author.id}_${target.id}`)
        .setLabel('Aceitar Pedido')
        .setStyle(ButtonStyle.Success)
        .setEmoji('💖'),
      new ButtonBuilder()
        .setCustomId(`marry_no_${author.id}_${target.id}`)
        .setLabel('Recusar')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('💔')
    );

    const proposalEmbed = createEmbed({
      title: '💍 Pedido de Casamento no Ar!',
      description: `${target}, você acaba de receber um pedido de casamento especial de ${author}!\n\n` +
        `*"Promete estar junto na vitória e na derrota, nas FastFlags e no Roblox, até que o ban nos separe?"*\n\n` +
        `Clique em um dos botões abaixo para responder:`,
      color: 0xFF69B4, // Hot Pink
      thumbnail: 'https://i.imgur.com/8Q9bZ8R.png',
      footerText: 'O pedido expira em 60 segundos'
    });

    const response = await interaction.reply({
      content: `${target}`,
      embeds: [proposalEmbed],
      components: [row]
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== target.id) {
        return i.reply({ content: 'Apenas a pessoa que recebeu o pedido pode responder!', ephemeral: true });
      }

      if (i.customId.startsWith('marry_yes_')) {
        DatabaseManager.createMarriage(author.id, target.id, interaction.guild.id, '💍 Aliança de Ouro 24k');

        // Log no Feed ao Vivo
        DatabaseManager.logActivity(interaction.guild.id, {
          type: 'general',
          icon: '💍',
          title: 'Novo Casamento!',
          description: `${author.tag} e ${target.tag} agora estão oficialmente casados!`,
          user_tag: author.tag,
          user_avatar: author.displayAvatarURL({ dynamic: true })
        });

        const successMarryEmbed = createEmbed({
          title: '🎉 Viva aos Noivos! Casamento Realizado! 💖',
          description: `🎊 Que momento lindo! ${author} e ${target} disseram **SIM** e agora estão oficialmente casados!\n\n` +
            `💍 **Aliança:** \`Aliança de Ouro 24k\`\n` +
            `📅 **Data da União:** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
            `💞 Use \`/casal\` a qualquer momento para ver o status e tempo do casal!`,
          color: COLORS.SUCCESS,
          thumbnail: target.displayAvatarURL({ dynamic: true })
        });

        await i.update({ content: `🎊 Parabéns ao novo casal: ${author} & ${target}!`, embeds: [successMarryEmbed], components: [] });
      } else {
        const rejectEmbed = createEmbed({
          title: '💔 Pedido Recusado...',
          description: `${target} recusou o pedido de casamento de ${author}. Quem sabe na próxima...`,
          color: COLORS.ERROR
        });
        await i.update({ content: null, embeds: [rejectEmbed], components: [] });
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        await interaction.editReply({
          content: null,
          embeds: [createEmbed({ title: '⏳ Pedido Expirado', description: `${target} não respondeu ao pedido de casamento a tempo.`, color: COLORS.WARNING })],
          components: []
        }).catch(() => {});
      }
    });
  }
};
