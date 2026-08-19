const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const DatabaseManager = require('../../database/manager.js');
const { createEmbed, successEmbed, errorEmbed, COLORS } = require('../../utils/embedBuilder.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Painel de configuração e inicialização de módulos do bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // Subcomando: Ticket
    .addSubcommand(sub =>
      sub
        .setName('ticket')
        .setDescription('Configura e envia o painel interativo de abertura de tickets')
        .addChannelOption(opt =>
          opt
            .setName('canal')
            .setDescription('Canal onde o painel de tickets será enviado')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addRoleOption(opt =>
          opt
            .setName('cargo_staff')
            .setDescription('Cargo da equipe de atendimento (Staff)')
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt
            .setName('categoria')
            .setDescription('Categoria onde os canais de tickets serão criados')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt
            .setName('logs')
            .setDescription('Canal onde os relatórios e transcrições HTML serão salvos')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )

    // Subcomando: Verificação (Captcha ou Botão)
    .addSubcommand(sub =>
      sub
        .setName('verify')
        .setDescription('Configura o sistema de verificação de segurança (Anti-Bot / Captcha)')
        .addChannelOption(opt =>
          opt
            .setName('canal')
            .setDescription('Canal onde o painel de verificação será enviado')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addRoleOption(opt =>
          opt
            .setName('cargo_membro')
            .setDescription('Cargo que o membro receberá após se verificar')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('tipo')
            .setDescription('Método de verificação')
            .setRequired(false)
            .addChoices(
              { name: '🧩 Captcha Visual em Imagem (Mais Seguro)', value: 'captcha' },
              { name: '🔘 Botão Direto (Mais Rápido)', value: 'button' }
            )
        )
    )

    // Subcomando: Roblox Tracker
    .addSubcommand(sub =>
      sub
        .setName('roblox-tracker')
        .setDescription('Configura canal de notificações automáticas de novas atualizações do Roblox')
        .addChannelOption(opt =>
          opt
            .setName('canal')
            .setDescription('Canal que receberá os alertas de novas versões da Roblox')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addRoleOption(opt =>
          opt
            .setName('cargo_ping')
            .setDescription('Cargo que será mencionado no alerta (opcional)')
            .setRequired(false)
        )
    )

    // Subcomando: YouTube Notifier
    .addSubcommand(sub =>
      sub
        .setName('youtube')
        .setDescription('Configura notificações automáticas quando um canal do YouTube postar vídeo novo')
        .addChannelOption(opt =>
          opt
            .setName('canal_discord')
            .setDescription('Canal do Discord onde o vídeo será anunciado')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('id_canal_youtube')
            .setDescription('ID do Canal do YouTube (Ex: UCxxxxxxxxxxxxxx)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('mensagem')
            .setDescription('Mensagem customizada opcional para o anúncio')
            .setRequired(false)
        )
    )

    // Subcomando: Loja Add/Remove
    .addSubcommandGroup(group =>
      group
        .setName('loja')
        .setDescription('Configuração de itens e cargos à venda na economia')
        .addSubcommand(sub =>
          sub
            .setName('add')
            .setDescription('Adiciona um cargo à venda na loja')
            .addRoleOption(opt =>
              opt
                .setName('cargo')
                .setDescription('Cargo que será vendido')
                .setRequired(true)
            )
            .addIntegerOption(opt =>
              opt
                .setName('preco')
                .setDescription('Preço do cargo em Coins')
                .setRequired(true)
                .setMinValue(1)
            )
            .addStringOption(opt =>
              opt
                .setName('descricao')
                .setDescription('Descrição do cargo na loja')
                .setRequired(false)
            )
        )
        .addSubcommand(sub =>
          sub
            .setName('remove')
            .setDescription('Remove um cargo da loja')
            .addIntegerOption(opt =>
              opt
                .setName('id_item')
                .setDescription('ID do item na loja')
                .setRequired(true)
            )
        )
    )

    // Subcomando: Logs
    .addSubcommand(sub =>
      sub
        .setName('logs')
        .setDescription('Define o canal oficial de logs de auditoria do servidor')
        .addChannelOption(opt =>
          opt
            .setName('canal')
            .setDescription('Canal de texto para os registros de moderação')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )

    // Subcomando: Welcome
    .addSubcommand(sub =>
      sub
        .setName('welcome')
        .setDescription('Configura o sistema de mensagens de boas-vindas para novos membros')
        .addChannelOption(opt =>
          opt
            .setName('canal')
            .setDescription('Canal onde as mensagens de boas-vindas serão enviadas')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('mensagem')
            .setDescription('Use {user} para marcar o membro e {guild} para o nome do servidor')
            .setRequired(false)
        )
    )

    // Subcomando: Sugestões
    .addSubcommand(sub =>
      sub
        .setName('sugestao')
        .setDescription('Define o canal oficial onde as sugestões dos membros serão publicadas')
        .addChannelOption(opt =>
          opt
            .setName('canal')
            .setDescription('Canal de sugestões')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),

  async execute(interaction, client) {
    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // =========================================================================
    // GRUPO: LOJA
    // =========================================================================
    if (group === 'loja') {
      if (subcommand === 'add') {
        const role = interaction.options.getRole('cargo');
        const price = interaction.options.getInteger('preco');
        const desc = interaction.options.getString('descricao') || `Cargo exclusivo ${role.name}`;

        const item = DatabaseManager.addShopItem({
          guildId,
          roleId: role.id,
          name: role.name,
          price,
          description: desc
        });

        return interaction.reply({
          embeds: [successEmbed('Cargo Adicionado à Loja!', `O cargo <@&${role.id}> foi adicionado à loja por **🪙 ${price.toLocaleString('pt-BR')} Coins**!\n**ID do Item:** \`${item.id}\``)],
          ephemeral: true
        });
      }

      if (subcommand === 'remove') {
        const itemId = interaction.options.getInteger('id_item');
        const removed = DatabaseManager.removeShopItem(itemId, guildId);

        if (!removed) {
          return interaction.reply({
            embeds: [errorEmbed('Item Não Encontrado', `Nenhum item com o ID \`${itemId}\` foi encontrado na loja.`)],
            ephemeral: true
          });
        }

        return interaction.reply({
          embeds: [successEmbed('Item Removido', `O item \`#${itemId}\` foi removido da loja com sucesso.`)],
          ephemeral: true
        });
      }
    }

    // =========================================================================
    // SUBCOMANDO: TICKET
    // =========================================================================
    if (subcommand === 'ticket') {
      const channel = interaction.options.getChannel('canal');
      const staffRole = interaction.options.getRole('cargo_staff');
      const category = interaction.options.getChannel('categoria');
      const logs = interaction.options.getChannel('logs');

      DatabaseManager.updateConfig(guildId, {
        ticket_category_id: category.id,
        ticket_staff_role_id: staffRole.id,
        ticket_logs_id: logs ? logs.id : null
      });

      const panelEmbed = createEmbed({
        title: `🎫 Central de Atendimento • ${interaction.guild.name}`,
        description: 'Precisa de suporte, tirar dúvidas, fazer compras ou denunciar algo?\n\n' +
          'Selecione uma das opções no menu abaixo para abrir um **ticket de atendimento privado** com a nossa equipe.\n\n' +
          '📌 **Categorias de Atendimento:**\n' +
          '• 🛠️ **Suporte Geral & Dúvidas:** Ajuda com o servidor ou ferramentas.\n' +
          '• ⚡ **Luqqzstrap & FastFlags:** Suporte técnico para o bootstrapper.\n' +
          '• 🚨 **Denúncias:** Reporte de conduta inadequada de membros.\n' +
          '• 🛒 **Compras & Parcerias:** Informações comerciais.',
        color: COLORS.TICKET,
        thumbnail: interaction.guild.iconURL({ dynamic: true })
      });

      const selectMenu = new ActionRowBuilder().addComponents(
        new (require('discord.js')).StringSelectMenuBuilder()
          .setCustomId('ticket_create_select')
          .setPlaceholder('Selecione o motivo do atendimento...')
          .addOptions([
            { label: 'Suporte Geral', description: 'Dúvidas e ajuda geral', emoji: '🛠️', value: 'suporte' },
            { label: 'Luqqzstrap & Flags', description: 'Ajuda com FastFlags e bootstrapper', emoji: '⚡', value: 'luqqzstrap' },
            { label: 'Denúncia', description: 'Denunciar usuários ou infrações', emoji: '🚨', value: 'denuncia' },
            { label: 'Compras & Parcerias', description: 'Assuntos comerciais e VIP', emoji: '🛒', value: 'compras' }
          ])
      );

      await channel.send({ embeds: [panelEmbed], components: [selectMenu] });

      return interaction.reply({
        embeds: [successEmbed('Painel de Tickets Configurado!', `O painel de tickets foi enviado com sucesso no canal <#${channel.id}>!`)],
        ephemeral: true
      });
    }

    // =========================================================================
    // SUBCOMANDO: VERIFY (CAPTCHA OU BOTÃO)
    // =========================================================================
    if (subcommand === 'verify') {
      const channel = interaction.options.getChannel('canal');
      const role = interaction.options.getRole('cargo_membro');
      const type = interaction.options.getString('tipo') || 'captcha';

      DatabaseManager.setVerification(guildId, {
        channel_id: channel.id,
        role_id: role.id,
        type,
        enabled: 1
      });

      const verifyEmbed = createEmbed({
        title: `🔐 Verificação de Segurança • ${interaction.guild.name}`,
        description: `Bem-vindo(a) ao **${interaction.guild.name}**!\n\n` +
          `Para ter acesso a todos os canais e interagir na comunidade, clique no botão abaixo para concluir sua verificação de segurança.\n\n` +
          `🛡️ *Esse procedimento protege o servidor contra contas fakes, invasões e bots de spam.*`,
        color: COLORS.PRIMARY,
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        footerText: 'Clique no botão para se verificar'
      });

      const verifyRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_verify_start')
          .setLabel('Verificar-se')
          .setEmoji('🔐')
          .setStyle(ButtonStyle.Success)
      );

      await channel.send({ embeds: [verifyEmbed], components: [verifyRow] });

      return interaction.reply({
        embeds: [successEmbed('Sistema de Verificação Ativado!', `O painel de verificação foi enviado em <#${channel.id}> com o cargo <@&${role.id}> configurado!\n**Método:** \`${type === 'captcha' ? 'Captcha Visual em Canvas' : 'Botão Direto'}\``)],
        ephemeral: true
      });
    }

    // =========================================================================
    // SUBCOMANDO: ROBLOX TRACKER
    // =========================================================================
    if (subcommand === 'roblox-tracker') {
      const channel = interaction.options.getChannel('canal');
      const pingRole = interaction.options.getRole('cargo_ping');

      DatabaseManager.addRobloxTrackerChannel(guildId, channel.id, pingRole ? pingRole.id : null);

      return interaction.reply({
        embeds: [successEmbed('Rastreador Roblox Ativado!', `Este servidor receberá notificações automáticas em <#${channel.id}> sempre que a Roblox lançar uma nova versão oficial no canal LIVE!` + (pingRole ? `\n**Mencionar:** <@&${pingRole.id}>` : ''))],
        ephemeral: true
      });
    }

    // =========================================================================
    // SUBCOMANDO: YOUTUBE
    // =========================================================================
    if (subcommand === 'youtube') {
      const channel = interaction.options.getChannel('canal_discord');
      const ytId = interaction.options.getString('id_canal_youtube').trim();
      const msg = interaction.options.getString('mensagem');

      DatabaseManager.addYouTubeNotification({
        guildId,
        channelId: channel.id,
        youtubeChannelId: ytId,
        customMessage: msg
      });

      return interaction.reply({
        embeds: [successEmbed('Notificador de YouTube Ativado!', `O canal <#${channel.id}> será notificado automaticamente sempre que o canal do YouTube (\`${ytId}\`) postar um vídeo novo!`)],
        ephemeral: true
      });
    }

    // =========================================================================
    // SUBCOMANDO: LOGS
    // =========================================================================
    if (subcommand === 'logs') {
      const channel = interaction.options.getChannel('canal');
      DatabaseManager.updateConfig(guildId, { logs_channel_id: channel.id });

      return interaction.reply({
        embeds: [successEmbed('Logs Configurados!', `O canal <#${channel.id}> foi definido como o canal de logs oficial.`)],
        ephemeral: true
      });
    }

    // =========================================================================
    // SUBCOMANDO: WELCOME
    // =========================================================================
    if (subcommand === 'welcome') {
      const channel = interaction.options.getChannel('canal');
      const msg = interaction.options.getString('mensagem') || 'Seja bem-vindo(a) ao {guild}, {user}!';

      DatabaseManager.updateConfig(guildId, {
        welcome_channel_id: channel.id,
        welcome_message: msg
      });

      return interaction.reply({
        embeds: [successEmbed('Boas-Vindas Configuradas!', `As mensagens de boas-vindas serão enviadas em <#${channel.id}>.`)],
        ephemeral: true
      });
    }

    // =========================================================================
    // SUBCOMANDO: SUGESTÃO
    // =========================================================================
    if (subcommand === 'sugestao') {
      const channel = interaction.options.getChannel('canal');
      DatabaseManager.updateConfig(guildId, { suggestions_channel_id: channel.id });

      return interaction.reply({
        embeds: [successEmbed('Canal de Sugestões Configurado!', `O canal <#${channel.id}> foi definido para receber as sugestões enviadas com \`/sugestao\`.`)],
        ephemeral: true
      });
    }
  }
};
