const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { createEmbed, errorEmbed, successEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sugestao')
    .setDescription('Envia uma sugestão para melhorar o servidor')
    .addStringOption(opt =>
      opt
        .setName('conteudo')
        .setDescription('Descreva detalhadamente a sua ideia ou sugestão')
        .setRequired(true)
        .setMaxLength(1000)
    ),

  async execute(interaction, client) {
    const config = DatabaseManager.getConfig(interaction.guild.id);

    if (!config.suggestions_channel_id) {
      return interaction.reply({
        embeds: [errorEmbed('Canal Não Configurado', 'O canal de sugestões ainda não foi definido pelos administradores (use `/setup sugestao`).')],
        ephemeral: true
      });
    }

    const suggestChannel = interaction.guild.channels.cache.get(config.suggestions_channel_id);
    if (!suggestChannel) {
      return interaction.reply({
        embeds: [errorEmbed('Canal Inválido', 'O canal configurado para sugestões não foi encontrado.')],
        ephemeral: true
      });
    }

    const text = interaction.options.getString('conteudo');

    const suggestionEmbed = createEmbed({
      title: '💡 Nova Sugestão da Comunidade',
      description: text,
      thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      color: COLORS.INFO,
      fields: [
        { name: '👤 Enviado por', value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: true },
        { name: '📊 Status', value: '⏳ Aguardando Análise', inline: true }
      ],
      footerText: 'Vote clicando nos botões abaixo!'
    });

    const voteRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('suggest_up')
        .setLabel('Apoio (0)')
        .setStyle(ButtonStyle.Success)
        .setEmoji('👍'),
      new ButtonBuilder()
        .setCustomId('suggest_down')
        .setLabel('Discordo (0)')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('👎')
    );

    const staffRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('suggest_accept')
        .setLabel('Aprovar')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId('suggest_reject')
        .setLabel('Recusar')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌')
    );

    const sentMsg = await suggestChannel.send({
      embeds: [suggestionEmbed],
      components: [voteRow, staffRow]
    });

    DatabaseManager.createSuggestion({
      messageId: sentMsg.id,
      guildId: interaction.guild.id,
      channelId: suggestChannel.id,
      authorId: interaction.user.id,
      text
    });

    return interaction.reply({
      embeds: [successEmbed('Sugestão Enviada!', `Sua sugestão foi publicada com sucesso em ${suggestChannel}! Obrigado por contribuir.`)],
      ephemeral: true
    });
  }
};
