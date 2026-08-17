const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { createEmbed, successEmbed, errorEmbed, COLORS } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Painel de configuração e inicialização dos módulos do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // Subcomando: Ticket
    .addSubcommand(sub =>
      sub
        .setName('ticket')
        .setDescription('Configura o sistema de tickets e envia o painel de atendimento')
        .addChannelOption(opt =>
          opt
            .setName('canal_painel')
            .setDescription('Canal onde a mensagem com o menu de tickets será enviada')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt
            .setName('categoria')
            .setDescription('Categoria onde os canais de ticket serão criados')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt
            .setName('canal_logs')
            .setDescription('Canal onde os logs e transcrições de tickets serão enviados')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addRoleOption(opt =>
          opt
            .setName('cargo_staff')
            .setDescription('Cargo da equipe que terá acesso para atender os tickets')
            .setRequired(false)
        )
    )
    // Subcomando: Logs de Auditoria
    .addSubcommand(sub =>
      sub
        .setName('logs')
        .setDescription('Configura o canal oficial de logs de auditoria e moderação')
        .addChannelOption(opt =>
          opt
            .setName('canal')
            .setDescription('Canal de texto para os registros do servidor')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    // Subcomando: Boas-Vindas
    .addSubcommand(sub =>
      sub
        .setName('welcome')
        .setDescription('Configura o canal e mensagem de boas-vindas para novos membros')
        .addChannelOption(opt =>
          opt
            .setName('canal')
            .setDescription('Canal de texto para receber os novos membros')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('mensagem')
            .setDescription('Mensagem (Variáveis: {user}, {username}, {server}, {members})')
            .setRequired(false)
        )
    )
    // Subcomando: AutoRole
    .addSubcommand(sub =>
      sub
        .setName('autorole')
        .setDescription('Define cargos automáticos para novos membros ou bots')
        .addRoleOption(opt =>
          opt
            .setName('cargo_membros')
            .setDescription('Cargo entregue automaticamente a novos membros humanos')
            .setRequired(false)
        )
        .addRoleOption(opt =>
          opt
            .setName('cargo_bots')
            .setDescription('Cargo entregue automaticamente a novos bots')
            .setRequired(false)
        )
    )
    // Subcomando: Sugestões
    .addSubcommand(sub =>
      sub
        .setName('sugestao')
        .setDescription('Configura o canal onde as sugestões da comunidade serão enviadas')
        .addChannelOption(opt =>
          opt
            .setName('canal')
            .setDescription('Canal de texto para sugestões')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    // Subcomando: Cargos por Botão
    .addSubcommand(sub =>
      sub
        .setName('cargos-botao')
        .setDescription('Cria um painel interativo com botões para os membros pegarem cargos')
        .addChannelOption(opt =>
          opt
            .setName('canal')
            .setDescription('Canal onde o painel de cargos será enviado')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('titulo')
            .setDescription('Título da Embed do painel')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('descricao')
            .setDescription('Descrição e instruções do painel')
            .setRequired(true)
        )
        .addRoleOption(opt =>
          opt.setName('cargo1').setDescription('Primeiro cargo').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('label1').setDescription('Nome no botão do 1º cargo').setRequired(true)
        )
        .addRoleOption(opt =>
          opt.setName('cargo2').setDescription('Segundo cargo (opcional)').setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('label2').setDescription('Nome no botão do 2º cargo').setRequired(false)
        )
        .addRoleOption(opt =>
          opt.setName('cargo3').setDescription('Terceiro cargo (opcional)').setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('label3').setDescription('Nome no botão do 3º cargo').setRequired(false)
        )
    ),

  async execute(interaction, client) {
    if (!checkPermissions({ interaction, userPermissions: [PermissionFlagsBits.Administrator] })) return;

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // 1. SETUP TICKET
    if (subcommand === 'ticket') {
      const panelChannel = interaction.options.getChannel('canal_painel');
      const category = interaction.options.getChannel('categoria');
      const logsChannel = interaction.options.getChannel('canal_logs');
      const staffRole = interaction.options.getRole('cargo_staff');

      DatabaseManager.updateConfig(guildId, {
        ticket_category_id: category.id,
        ticket_logs_id: logsChannel ? logsChannel.id : null,
        ticket_staff_role_id: staffRole ? staffRole.id : null
      });

      const ticketEmbed = createEmbed({
        title: '🎫 Central de Atendimento e Suporte',
        description: 'Precisa de ajuda, tem alguma dúvida, denúncia ou quer negociar uma compra/parceria?\n\nSelecione abaixo a categoria correspondente à sua necessidade para abrir um atendimento privado com a nossa equipe.',
        color: COLORS.TICKET,
        fields: [
          { name: '🛠️ Suporte Geral', value: 'Dúvidas e auxílio geral no servidor.', inline: true },
          { name: '🚨 Denúncias', value: 'Reporte infrações de membros com provas.', inline: true },
          { name: '🛒 Compras / Parcerias', value: 'Assuntos comerciais e propostas.', inline: true }
        ],
        footerText: 'Clique no menu abaixo para iniciar'
      });

      const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ticket_category_select')
          .setPlaceholder('Escolha a categoria do seu atendimento...')
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel('Suporte Geral')
              .setDescription('Ajuda com recursos e dúvidas do servidor')
              .setEmoji('🛠️')
              .setValue('suporte'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Denúncias')
              .setDescription('Reportar membros ou problemas de conduta')
              .setEmoji('🚨')
              .setValue('denuncia'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Compras & Parcerias')
              .setDescription('Assuntos comerciais e propostas')
              .setEmoji('🛒')
              .setValue('compras'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Outros Assuntos')
              .setDescription('Qualquer outro tipo de contato com a Staff')
              .setEmoji('💬')
              .setValue('geral')
          )
      );

      await panelChannel.send({ embeds: [ticketEmbed], components: [selectMenu] });

      return interaction.reply({
        embeds: [successEmbed('Sistema de Tickets Configurado!', `O painel foi enviado com sucesso em ${panelChannel}!\n**Categoria:** \`${category.name}\`\n**Logs:** ${logsChannel || 'Não configurado'}\n**Staff:** ${staffRole || 'Não configurado'}`)],
        ephemeral: true
      });
    }

    // 2. SETUP LOGS
    if (subcommand === 'logs') {
      const channel = interaction.options.getChannel('canal');
      DatabaseManager.updateConfig(guildId, { logs_channel_id: channel.id });

      return interaction.reply({
        embeds: [successEmbed('Logs de Auditoria Ativados', `Todos os registros de moderação, entradas, saídas e edições serão enviados em ${channel}!`)],
        ephemeral: true
      });
    }

    // 3. SETUP WELCOME
    if (subcommand === 'welcome') {
      const channel = interaction.options.getChannel('canal');
      const message = interaction.options.getString('mensagem');

      const updates = { welcome_channel_id: channel.id };
      if (message) updates.welcome_message = message;

      DatabaseManager.updateConfig(guildId, updates);

      return interaction.reply({
        embeds: [successEmbed('Boas-Vindas Configuradas', `As mensagens de entrada serão enviadas em ${channel}!`)],
        ephemeral: true
      });
    }

    // 4. SETUP AUTOROLE
    if (subcommand === 'autorole') {
      const memberRole = interaction.options.getRole('cargo_membros');
      const botRole = interaction.options.getRole('cargo_bots');

      const updates = {};
      if (memberRole) updates.autorole_id = memberRole.id;
      if (botRole) updates.bot_autorole_id = botRole.id;

      DatabaseManager.updateConfig(guildId, updates);

      return interaction.reply({
        embeds: [successEmbed('AutoRole Configurado', `**Cargo para Membros:** ${memberRole || 'Inalterado'}\n**Cargo para Bots:** ${botRole || 'Inalterado'}`)],
        ephemeral: true
      });
    }

    // 5. SETUP SUGESTÃO
    if (subcommand === 'sugestao') {
      const channel = interaction.options.getChannel('canal');
      DatabaseManager.updateConfig(guildId, { suggestions_channel_id: channel.id });

      return interaction.reply({
        embeds: [successEmbed('Canal de Sugestões Definido', `O canal ${channel} agora é o canal oficial de sugestões da comunidade!`)],
        ephemeral: true
      });
    }

    // 6. SETUP CARGOS-BOTAO (Reaction Roles)
    if (subcommand === 'cargos-botao') {
      const channel = interaction.options.getChannel('canal');
      const title = interaction.options.getString('titulo');
      const desc = interaction.options.getString('descricao');

      const roles = [
        { role: interaction.options.getRole('cargo1'), label: interaction.options.getString('label1') },
        { role: interaction.options.getRole('cargo2'), label: interaction.options.getString('label2') },
        { role: interaction.options.getRole('cargo3'), label: interaction.options.getString('label3') }
      ].filter(r => r.role && r.label);

      const panelEmbed = createEmbed({
        title: `🏷️ ${title}`,
        description: desc,
        color: COLORS.PRIMARY,
        footerText: 'Clique nos botões para pegar ou remover seus cargos'
      });

      const buttonsRow = new ActionRowBuilder();
      roles.forEach(item => {
        buttonsRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`role_toggle_${item.role.id}`)
            .setLabel(item.label)
            .setStyle(ButtonStyle.Primary)
        );
      });

      const sentMsg = await channel.send({ embeds: [panelEmbed], components: [buttonsRow] });

      roles.forEach(item => {
        DatabaseManager.addReactionRole({
          messageId: sentMsg.id,
          guildId,
          channelId: channel.id,
          roleId: item.role.id,
          label: item.label
        });
      });

      return interaction.reply({
        embeds: [successEmbed('Painel de Cargos Criado', `O painel foi enviado com sucesso em ${channel}!`)],
        ephemeral: true
      });
    }
  }
};
