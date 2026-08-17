const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const ms = require('ms');
const DatabaseManager = require('../../database/manager');
const { createEmbed, errorEmbed, successEmbed, COLORS } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Sistema de criação e gerenciamento de sorteios')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Inicia um novo sorteio no servidor')
        .addStringOption(opt =>
          opt.setName('duracao').setDescription('Tempo de duração (ex: 10m, 1h, 1d, 3d)').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('ganhadores').setDescription('Número de vencedores do sorteio').setMinValue(1).setMaxValue(10).setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('premio').setDescription('O que será sorteado').setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName('canal').setDescription('Canal onde o sorteio será postado').addChannelTypes(ChannelType.GuildText).setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('end')
        .setDescription('Encerra um sorteio em andamento imediatamente')
        .addStringOption(opt =>
          opt.setName('id_mensagem').setDescription('ID da mensagem do sorteio').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('reroll')
        .setDescription('Sorteia novamente um novo vencedor para um sorteio já finalizado')
        .addStringOption(opt =>
          opt.setName('id_mensagem').setDescription('ID da mensagem do sorteio').setRequired(true)
        )
    ),

  async execute(interaction, client) {
    if (!checkPermissions({ interaction, userPermissions: [PermissionFlagsBits.ManageGuild] })) return;

    const subcommand = interaction.options.getSubcommand();

    // 1. START GIVEAWAY
    if (subcommand === 'start') {
      const durationStr = interaction.options.getString('duracao');
      const durationMs = ms(durationStr);

      if (!durationMs || durationMs < 10000 || durationMs > 30 * 24 * 60 * 60 * 1000) {
        return interaction.reply({
          embeds: [errorEmbed('Duração Inválida', 'Por favor, forneça um tempo válido entre 10s e 30d (ex: `10m`, `2h`, `1d`).')],
          ephemeral: true
        });
      }

      const winnersCount = interaction.options.getInteger('ganhadores');
      const prize = interaction.options.getString('premio');
      const channel = interaction.options.getChannel('canal') || interaction.channel;

      const endsAt = Date.now() + durationMs;
      const endTimestamp = Math.floor(endsAt / 1000);

      const giveawayEmbed = createEmbed({
        title: '🎉 NOVO SORTEIO!',
        description: `**Prêmio:** 🎁 **${prize}**\n\n**Ganhadores:** \`${winnersCount}\`\n**Sorteado por:** ${interaction.user}\n**Termina em:** <t:${endTimestamp}:R> (<t:${endTimestamp}:f>)`,
        color: COLORS.GIVEAWAY,
        footerText: `Termina em`
      });

      const enterButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('giveaway_enter')
          .setLabel('Participar (0)')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🎉')
      );

      const sentMsg = await channel.send({ embeds: [giveawayEmbed], components: [enterButton] });

      DatabaseManager.createGiveaway({
        id: `GW-${Date.now().toString(36)}`,
        messageId: sentMsg.id,
        channelId: channel.id,
        guildId: interaction.guild.id,
        prize,
        winnersCount,
        hostId: interaction.user.id,
        endsAt
      });

      return interaction.reply({
        embeds: [successEmbed('Sorteio Iniciado!', `O sorteio de **${prize}** foi postado com sucesso em ${channel}!`)],
        ephemeral: true
      });
    }

    // 2. END GIVEAWAY
    if (subcommand === 'end') {
      const messageId = interaction.options.getString('id_mensagem');
      const giveaway = DatabaseManager.getGiveawayByMessage(messageId);

      if (!giveaway) {
        return interaction.reply({
          embeds: [errorEmbed('Não Encontrado', 'Nenhum sorteio registrado foi encontrado com este ID de mensagem.')],
          ephemeral: true
        });
      }

      if (giveaway.ended) {
        return interaction.reply({
          embeds: [errorEmbed('Já Encerrado', 'Este sorteio já foi finalizado anteriormente.')],
          ephemeral: true
        });
      }

      DatabaseManager.endGiveaway(messageId);

      const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
      if (channel) {
        const msg = await channel.messages.fetch(messageId).catch(() => null);
        if (msg) {
          const entries = giveaway.entries || [];
          let winners = [];
          if (entries.length > 0) {
            const shuffled = [...entries].sort(() => 0.5 - Math.random());
            winners = shuffled.slice(0, Math.min(giveaway.winners_count, entries.length));
          }

          const winnersMention = winners.length > 0 ? winners.map(id => `<@${id}>`).join(', ') : 'Nenhum participante válido.';

          const endEmbed = createEmbed({
            title: '🎉 Sorteio Finalizado!',
            description: `**Prêmio:** ${giveaway.prize}\n**Ganhador(es):** ${winnersMention}\n**Sorteado por:** <@${giveaway.host_id}>`,
            color: COLORS.GIVEAWAY,
            footerText: 'Encerrado antecipadamente pela Staff'
          });

          await msg.edit({ embeds: [endEmbed], components: [] }).catch(() => {});
          if (winners.length > 0) {
            channel.send(`🎉 Parabéns ${winnersMention}! Você(s) ganhou(ram) **${giveaway.prize}**!`);
          }
        }
      }

      return interaction.reply({
        embeds: [successEmbed('Sorteio Encerrado', 'O sorteio foi finalizado com sucesso!')],
        ephemeral: true
      });
    }

    // 3. REROLL GIVEAWAY
    if (subcommand === 'reroll') {
      const messageId = interaction.options.getString('id_mensagem');
      const giveaway = DatabaseManager.getGiveawayByMessage(messageId);

      if (!giveaway) {
        return interaction.reply({
          embeds: [errorEmbed('Não Encontrado', 'Nenhum sorteio registrado foi encontrado com este ID de mensagem.')],
          ephemeral: true
        });
      }

      const entries = giveaway.entries || [];
      if (entries.length === 0) {
        return interaction.reply({
          embeds: [errorEmbed('Sem Participantes', 'Não há participantes registrados neste sorteio para realizar o reroll.')],
          ephemeral: true
        });
      }

      const newWinner = entries[Math.floor(Math.random() * entries.length)];
      const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);

      if (channel) {
        channel.send(`🎉 **Novo Sorteio (Reroll)!** Parabéns <@${newWinner}>! Você é o novo vencedor de **${giveaway.prize}**!`);
      }

      return interaction.reply({
        embeds: [successEmbed('Reroll Concluído', `Novo ganhador sorteado: <@${newWinner}>!`)],
        ephemeral: true
      });
    }
  }
};
