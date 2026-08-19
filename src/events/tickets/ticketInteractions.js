const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { createEmbed, successEmbed, errorEmbed, infoEmbed, warningEmbed, COLORS } = require('../../utils/embedBuilder');
const { generateTranscript } = require('../../utils/transcript');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // 1. SELECT MENU / BOTÕES DE CRIAÇÃO DE TICKET
    if (interaction.isStringSelectMenu() && (interaction.customId === 'ticket_category_select' || interaction.customId === 'ticket_create_select')) {
      const category = interaction.values[0];
      await handleTicketCreate(interaction, category);
      return;
    }

    if (interaction.isButton() && (interaction.customId.startsWith('ticket_open_') || interaction.customId.startsWith('ticket_btn_cat_'))) {
      const category = interaction.customId.replace('ticket_open_', '').replace('ticket_btn_cat_', '');
      await handleTicketCreate(interaction, category);
      return;
    }

    // 2. BOTÃO: FECHAR TICKET
    if (interaction.isButton() && interaction.customId === 'ticket_btn_close') {
      const ticket = DatabaseManager.getTicketByChannel(interaction.channel.id);
      if (!ticket) {
        return interaction.reply({
          embeds: [errorEmbed('Erro', 'Este canal não é um ticket ativo registrado no banco de dados.')],
          ephemeral: true
        });
      }

      // Abre modal de motivo para fechar
      const modal = new ModalBuilder()
        .setCustomId('ticket_modal_close')
        .setTitle('Encerrar Atendimento');

      const reasonInput = new TextInputBuilder()
        .setCustomId('close_reason')
        .setLabel('Motivo do Fechamento')
        .setPlaceholder('Ex: Dúvida resolvida pelo suporte.')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(500);

      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      await interaction.showModal(modal);
      return;
    }

    // 3. MODAL SUBMIT: CONFIRMAÇÃO DE FECHAMENTO COM MOTIVO
    if (interaction.isModalSubmit() && interaction.customId === 'ticket_modal_close') {
      await interaction.deferReply();
      const reason = interaction.fields.getTextInputValue('close_reason') || 'Nenhum motivo especificado.';
      const ticket = DatabaseManager.getTicketByChannel(interaction.channel.id);

      if (!ticket) {
        return interaction.editReply({
          embeds: [errorEmbed('Erro', 'Ticket não encontrado no banco de dados.')]
        });
      }

      DatabaseManager.updateTicket(interaction.channel.id, {
        status: 'closed',
        closed_by: interaction.user.id,
        close_reason: reason,
        closed_at: Date.now()
      });

      // Remove permissão de envio do criador do ticket
      await interaction.channel.permissionOverwrites.edit(ticket.user_id, {
        SendMessages: false,
        ViewChannel: true
      }).catch(() => {});

      // Gera a transcrição em HTML e salva para visualização online
      const transcriptAttachment = await generateTranscript(interaction.channel);
      const webTranscriptUrl = `http://localhost:3000${transcriptAttachment.webPath}`;

      // Envia nos logs se configurado
      const config = DatabaseManager.getConfig(interaction.guild.id);
      if (config.ticket_logs_id) {
        const logChannel = await interaction.guild.channels.fetch(config.ticket_logs_id).catch(() => null);
        if (logChannel) {
          const logEmbed = createEmbed({
            title: '📜 Ticket Encerrado',
            description: `**Ticket:** #${interaction.channel.name}\n**Criador:** <@${ticket.user_id}>\n**Encerrado por:** ${interaction.user}\n**Motivo:** ${reason}\n\n🌐 **[Visualizar Transcrição Online no Navegador](${webTranscriptUrl})**`,
            color: COLORS.WARNING,
            footerText: `ID do Usuário: ${ticket.user_id}`
          });
          await logChannel.send({ embeds: [logEmbed], files: [transcriptAttachment] }).catch(() => {});
        }
      }

      // Tenta enviar na DM do criador do ticket
      const ticketOwner = await client.users.fetch(ticket.user_id).catch(() => null);
      if (ticketOwner) {
        const dmEmbed = createEmbed({
          title: `Atendimento Finalizado - ${interaction.guild.name}`,
          description: `Seu ticket foi encerrado com sucesso.\n**Fechado por:** ${interaction.user.tag}\n**Motivo:** ${reason}\n\n🌐 **[Visualizar Histórico Online no Navegador](${webTranscriptUrl})**`,
          color: COLORS.TICKET
        });
        await ticketOwner.send({ embeds: [dmEmbed], files: [transcriptAttachment] }).catch(() => {});
      }

      const closedEmbed = createEmbed({
        title: '🔒 Atendimento Encerrado',
        description: `Este ticket foi encerrado por ${interaction.user}.\n**Motivo:** ${reason}\n\n🌐 **[Abrir Transcrição Online no Navegador](${webTranscriptUrl})**\n\nUtilize os botões abaixo para reabrir, baixar o arquivo HTML ou deletar o canal.`,
        color: COLORS.ERROR
      });

      const controlRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_btn_reopen')
          .setLabel('Reabrir')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🔓'),
        new ButtonBuilder()
          .setCustomId('ticket_btn_transcript')
          .setLabel('Baixar HTML')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📥'),
        new ButtonBuilder()
          .setCustomId('ticket_btn_delete')
          .setLabel('Deletar')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️')
      );

      await interaction.editReply({
        embeds: [closedEmbed],
        components: [controlRow]
      });
      return;
    }

    // 4. BOTÃO: REABRIR TICKET
    if (interaction.isButton() && interaction.customId === 'ticket_btn_reopen') {
      const ticket = DatabaseManager.getTicketByChannel(interaction.channel.id);
      if (!ticket) {
        return interaction.reply({ embeds: [errorEmbed('Erro', 'Ticket não encontrado.')], ephemeral: true });
      }

      DatabaseManager.updateTicket(interaction.channel.id, { status: 'open' });

      // Restaura permissão do criador
      await interaction.channel.permissionOverwrites.edit(ticket.user_id, {
        SendMessages: true,
        ViewChannel: true,
        AttachFiles: true
      }).catch(() => {});

      const reopenEmbed = successEmbed(
        'Ticket Reaberto',
        `O atendimento foi reaberto por ${interaction.user}. O membro já pode interagir novamente!`
      );

      await interaction.reply({ embeds: [reopenEmbed] });
      return;
    }

    // 5. BOTÃO: ASSUMIR ATENDIMENTO (CLAIM)
    if (interaction.isButton() && interaction.customId === 'ticket_btn_claim') {
      const ticket = DatabaseManager.getTicketByChannel(interaction.channel.id);
      if (!ticket) {
        return interaction.reply({ embeds: [errorEmbed('Erro', 'Ticket não encontrado.')], ephemeral: true });
      }

      if (ticket.claimed_by) {
        return interaction.reply({
          embeds: [warningEmbed('Já Reivindicado', `Este ticket já foi assumido por <@${ticket.claimed_by}>.`)],
          ephemeral: true
        });
      }

      DatabaseManager.updateTicket(interaction.channel.id, { claimed_by: interaction.user.id });

      const claimEmbed = createEmbed({
        title: '🙋 Atendimento Assumido',
        description: `${interaction.user} assumiu a responsabilidade por este atendimento.`,
        color: COLORS.SUCCESS
      });

      await interaction.reply({ embeds: [claimEmbed] });
      return;
    }

    // 6. BOTÃO: GERAR TRANSCRIÇÃO MANUAL
    if (interaction.isButton() && interaction.customId === 'ticket_btn_transcript') {
      await interaction.deferReply({ ephemeral: true });
      const attachment = await generateTranscript(interaction.channel);
      await interaction.editReply({
        content: 'Aqui está a transcrição completa deste ticket:',
        files: [attachment]
      });
      return;
    }

    // 7. BOTÃO: DELETAR TICKET COM CONTAGEM REGRESSIVA
    if (interaction.isButton() && interaction.customId === 'ticket_btn_delete') {
      const deleteEmbed = warningEmbed(
        'Deletando Canal',
        'Este canal de atendimento será excluído permanentemente em **5 segundos**...'
      );

      await interaction.reply({ embeds: [deleteEmbed] });

      setTimeout(async () => {
        await interaction.channel.delete().catch(() => {});
      }, 5000);
      return;
    }
  }
};

/**
 * Função central para criação de canal de ticket
 */
async function handleTicketCreate(interaction, category) {
  const guild = interaction.guild;
  const user = interaction.user;

  // Verifica se o usuário já possui um ticket aberto no servidor
  const existingTicket = DatabaseManager.getUserOpenTicket(guild.id, user.id);
  if (existingTicket) {
    const existingChannel = guild.channels.cache.get(existingTicket.channel_id);
    if (existingChannel) {
      return interaction.reply({
        embeds: [warningEmbed('Ticket já Existente', `Você já possui um ticket aberto em ${existingChannel}!`)],
        ephemeral: true
      });
    }
  }

  await interaction.deferReply({ ephemeral: true });

  const config = DatabaseManager.getConfig(guild.id);
  const foundCustomCat = (config.ticket_categories || []).find(c => c.id.toLowerCase() === category.toLowerCase());
  const categoryNames = {
    suporte: 'Suporte Geral',
    denuncia: 'Denúncias',
    duvida: 'Dúvidas',
    flags: 'FastFlags & Otimização',
    compras: 'Compras & VIP',
    geral: 'Atendimento Geral'
  };

  const selectedCategoryName = foundCustomCat 
    ? `${foundCustomCat.emoji ? foundCustomCat.emoji + ' ' : ''}${foundCustomCat.label}` 
    : (categoryNames[category.toLowerCase()] || category);

  // Montar permissões do canal
  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ReadMessageHistory
      ]
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    }
  ];

  // Se houver cargo de staff configurado, dá permissão
  if (config.ticket_staff_role_id) {
    const staffRole = guild.roles.cache.get(config.ticket_staff_role_id);
    if (staffRole) {
      permissionOverwrites.push({
        id: staffRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ReadMessageHistory
        ]
      });
    }
  }

  const channelName = `ticket-${user.username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15).toLowerCase() || 'suporte'}`;

  try {
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: config.ticket_category_id || null,
      permissionOverwrites
    });

    const ticketId = `TICKET-${Date.now().toString(36).toUpperCase()}`;

    DatabaseManager.createTicket({
      ticketId,
      guildId: guild.id,
      channelId: ticketChannel.id,
      userId: user.id,
      category: selectedCategoryName
    });

    // Mensagem de boas-vindas dentro do canal do ticket
    const ticketEmbed = createEmbed({
      title: `🎫 Atendimento - ${selectedCategoryName}`,
      description: `Olá ${user}, seja bem-vindo ao seu ticket de suporte!\n\nDescreva detalhadamente o seu problema, dúvida ou solicitação. A nossa equipe de atendimento entrará em contato em breve.\n\n**Protocolo:** \`${ticketId}\`\n**Categoria:** ${selectedCategoryName}`,
      color: COLORS.TICKET,
      footerText: 'Clique nos botões abaixo para gerenciar este ticket'
    });

    const ticketButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_btn_close')
        .setLabel('Fechar Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒'),
      new ButtonBuilder()
        .setCustomId('ticket_btn_claim')
        .setLabel('Assumir Atendimento')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🙋'),
      new ButtonBuilder()
        .setCustomId('ticket_btn_transcript')
        .setLabel('Transcrição')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📜')
    );

    const staffMention = config.ticket_staff_role_id ? `<@&${config.ticket_staff_role_id}>` : '';
    await ticketChannel.send({
      content: `${user} ${staffMention}`,
      embeds: [ticketEmbed],
      components: [ticketButtons]
    });

    await interaction.editReply({
      embeds: [successEmbed('Ticket Criado!', `Seu atendimento foi aberto com sucesso em ${ticketChannel}!`)],
      ephemeral: true
    });
  } catch (error) {
    console.error('Erro ao criar canal de ticket:', error);
    await interaction.editReply({
      embeds: [errorEmbed('Erro ao Criar Ticket', 'Não foi possível criar o canal do ticket. Verifique as permissões do bot!')],
      ephemeral: true
    });
  }
}
