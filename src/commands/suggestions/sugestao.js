const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { createEmbed, errorEmbed, successEmbed, warningEmbed, COLORS } = require('../../utils/embedBuilder');

// Cache em memória para Cooldown de sugestões por usuário (Map: userId -> timestamp)
const suggestionCooldowns = new Map();

// Limpeza automática a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [userId, lastUsed] of suggestionCooldowns.entries()) {
    if (now - lastUsed > 300000) {
      suggestionCooldowns.delete(userId);
    }
  }
}, 600000);

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
    // 1. Verificação de Cooldown Anti-Spam (180 segundos = 3 minutos)
    const now = Date.now();
    const lastUsed = suggestionCooldowns.get(interaction.user.id);
    const cooldownTime = 180 * 1000;

    if (lastUsed && now - lastUsed < cooldownTime) {
      const remainingSeconds = Math.ceil((cooldownTime - (now - lastUsed)) / 1000);
      return interaction.reply({
        embeds: [warningEmbed('Aguarde um Momento', `Você já enviou uma sugestão recentemente. Por favor, aguarde mais **${remainingSeconds}s** antes de enviar outra.`)],
        ephemeral: true
      });
    }

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

    // Registra timestamp do cooldown
    suggestionCooldowns.set(interaction.user.id, now);

    return interaction.reply({
      embeds: [successEmbed('Sugestão Enviada!', `Sua sugestão foi publicada com sucesso em ${suggestChannel}! Obrigado por contribuir.`)],
      ephemeral: true
    });
  }
};
