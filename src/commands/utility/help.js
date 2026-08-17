const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType
} = require('discord.js');
const { createEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Exibe a lista de comandos e guia de utilização do bot'),

  async execute(interaction, client) {
    const mainEmbed = createEmbed({
      title: '📚 Central de Ajuda - StepTicket Bot',
      description: 'Olá! Sou um bot completo para o seu servidor, equipado com sistema avançado de **Tickets, Moderação com Warns, Auto-Moderação, Sorteios, Sugestões, Cargos por Botão, Níveis/XP, Utilitários e Gerenciador de FastFlags (Luqqzstrap)**!\n\nSelecione uma categoria no menu abaixo para conferir os comandos disponíveis e como utilizá-los.',
      color: COLORS.PRIMARY,
      thumbnail: client.user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: '🎫 Tickets', value: 'Painel interativo, transcrições HTML, claim e fechamento.', inline: true },
        { name: '🛡️ Moderação', value: 'Ban, kick, timeout, clear, warn, lock, nuke, cargos.', inline: true },
        { name: '🤖 AutoMod', value: 'Anti-link, anti-invite, anti-spam e anti-mass-mention.', inline: true },
        { name: '🎉 Sorteios', value: 'Criação de sorteios com timer e botão interativo.', inline: true },
        { name: '💡 Sugestões', value: 'Votações com apoio/discordo e moderação staff.', inline: true },
        { name: '⭐ Níveis & XP', value: 'Sistema de ganho de XP no chat e rankings.', inline: true },
        { name: '⚡ FastFlags (Luqqzstrap)', value: 'Limpar, validar flags e consultar offsets imtheo.lol.', inline: true },
        { name: '🛠️ Utilitários', value: 'Ping, userinfo, serverinfo, avatar, calc, enquete.', inline: true },
        { name: '⚙️ Configuração', value: 'Comandos `/setup` para inicializar os módulos.', inline: true }
      ],
      footerText: 'Selecione uma categoria abaixo para ver os detalhes'
    });

    const categoryMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_select_menu')
        .setPlaceholder('Escolha uma categoria de comandos...')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('Início')
            .setDescription('Voltar à página principal de ajuda')
            .setEmoji('🏠')
            .setValue('help_home'),
          new StringSelectMenuOptionBuilder()
            .setLabel('FastFlags & Luqqzstrap')
            .setDescription('/flag limpar, offsets, info, checar')
            .setEmoji('⚡')
            .setValue('help_flags'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Tickets & Suporte')
            .setDescription('Comandos de atendimento e tickets')
            .setEmoji('🎫')
            .setValue('help_tickets'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Moderação & Punições')
            .setDescription('Ban, kick, timeout, clear, warn, nuke')
            .setEmoji('🛡️')
            .setValue('help_mod'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Auto-Moderação & Proteção')
            .setDescription('Anti-link, anti-invite, anti-spam')
            .setEmoji('🤖')
            .setValue('help_automod'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Sorteios (Giveaways)')
            .setDescription('Criação e gerenciamento de sorteios')
            .setEmoji('🎉')
            .setValue('help_giveaway'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Sugestões & Enquetes')
            .setDescription('Sistema de sugestões e enquetes')
            .setEmoji('💡')
            .setValue('help_community'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Níveis & Ranking (XP)')
            .setDescription('Rank e Leaderboard do servidor')
            .setEmoji('⭐')
            .setValue('help_level'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Utilitários & Informações')
            .setDescription('Userinfo, serverinfo, botinfo, calc')
            .setEmoji('🛠️')
            .setValue('help_utils'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Configuração (/setup)')
            .setDescription('Painéis e inicialização de módulos')
            .setEmoji('⚙️')
            .setValue('help_setup')
        )
    );

    await interaction.reply({
      embeds: [mainEmbed],
      components: [categoryMenu]
    });

    const response = await interaction.fetchReply();

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120000 // 2 minutos
    });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'Apenas quem executou o comando pode interagir com este menu.', ephemeral: true });
      }

      const val = i.values[0];
      let embedToEdit;

      if (val === 'help_home') {
        embedToEdit = mainEmbed;
      } else if (val === 'help_flags') {
        embedToEdit = createEmbed({
          title: '⚡ Módulo FastFlags & Luqqzstrap (/flag)',
          description: 'Gerenciador inteligente de FastFlags para Roblox e Luqqzstrap/Bloxstrap.\n\n' +
            '• `/flag limpar [arquivo] [texto] [modo]`: Analisa seu arquivo `ClientAppSettings.json`, remove flags perigosas/crash, corrige tipos (ex: `"true"` para `true`) e entrega o `.json` 100% limpo e otimizado para download.\n' +
            '• `/flag offsets`: Consulta os offsets de memória mais recentes diretamente do `offsets.imtheo.lol` (versão do Roblox, total de offsets).\n' +
            '• `/flag info <nome>`: Consulta o status de uma flag específica, tipo esperado e valor padrão no catálogo oficial do Roblox.\n' +
            '• `/flag checar [arquivo] [texto]`: Diagnóstico de flags sem gerar arquivo modificado.\n\n' +
            '⏱️ *Possui cooldown de segurança de 10 segundos por usuário.*',
          color: COLORS.INFO
        });
      } else if (val === 'help_tickets') {
        embedToEdit = createEmbed({
          title: '🎫 Módulo de Tickets (StepTicket)',
          description: 'Sistema completo para atendimento privado com transcrições automáticas em HTML.\n\n' +
            '• `/setup ticket`: Configura e envia o painel de abertura de tickets no canal.\n' +
            '• `/ticket fechar [motivo]`: Encerra o ticket, gera transcrição e envia nos logs e na DM.\n' +
            '• `/ticket reabrir`: Reabre um ticket que foi finalizado.\n' +
            '• `/ticket assumir`: Staff assume a responsabilidade exclusiva pelo atendimento.\n' +
            '• `/ticket adicionar <usuario>`: Adiciona um membro ao canal do ticket.\n' +
            '• `/ticket remover <usuario>`: Remove um membro do canal do ticket.\n' +
            '• `/ticket transcricao`: Gera o arquivo HTML com todas as mensagens e fotos.\n' +
            '• `/ticket deletar`: Exclui permanentemente o canal com contagem de 5s.',
          color: COLORS.TICKET
        });
      } else if (val === 'help_mod') {
        embedToEdit = createEmbed({
          title: '🛡️ Módulo de Moderação & Punições',
          description: 'Ferramentas completas para manter a ordem no servidor.\n\n' +
            '• `/ban <usuario> [motivo] [dias]`: Bane um membro do servidor.\n' +
            '• `/unban <id_usuario> [motivo]`: Desbane um usuário pelo ID.\n' +
            '• `/kick <usuario> [motivo]`: Expulsa um membro do servidor.\n' +
            '• `/timeout <usuario> <duracao> [motivo]`: Silencia temporariamente (ex: `10m`, `1h`, `1d`).\n' +
            '• `/untimeout <usuario>`: Remove o castigo/silenciamento.\n' +
            '• `/clear <quantidade> [usuario] [apenas_bots]`: Limpa de 1 a 100 mensagens.\n' +
            '• `/lock [motivo]`: Tranca o canal para membros normais.\n' +
            '• `/unlock`: Destranca o canal.\n' +
            '• `/slowmode <segundos>`: Define tempo de espera entre mensagens.\n' +
            '• `/nuke`: Recria e limpa o canal mantendo todas as permissões intactas.\n' +
            '• `/role add|remove <usuario> <cargo>`: Adiciona ou remove cargos.\n' +
            '• `/warn <usuario> <motivo>`: Aplica uma advertência formal persistente.\n' +
            '• `/warnings <usuario>`: Consulta o histórico de advertências.\n' +
            '• `/delwarn <id>`: Remove uma advertência por ID.\n' +
            '• `/clearwarns <usuario>`: Limpa todos os warns de um membro.',
          color: COLORS.MODERATION
        });
      } else if (val === 'help_automod') {
        embedToEdit = createEmbed({
          title: '🤖 Módulo de Auto-Moderação',
          description: 'Proteção em tempo real contra invasões e spam.\n\n' +
            '• `/automod config`: Ativa/desativa anti-invite, anti-link, anti-spam e anti-mass-mention.\n' +
            '• `/automod status`: Exibe o estado de cada proteção ativa no servidor.\n\n' +
            '*Observação: Membros com permissão de Administrador ou Gerenciar Mensagens são imunes automaticamente.*',
          color: COLORS.SUCCESS
        });
      } else if (val === 'help_giveaway') {
        embedToEdit = createEmbed({
          title: '🎉 Módulo de Sorteios (Giveaways)',
          description: 'Crie e gerencie sorteios profissionais para a sua comunidade.\n\n' +
            '• `/giveaway start <duracao> <ganhadores> <premio> [canal]`: Inicia sorteio com botão interativo 🎉 e timer.\n' +
            '• `/giveaway end <id_mensagem>`: Encerra o sorteio antecipadamente.\n' +
            '• `/giveaway reroll <id_mensagem>`: Sorteia novos vencedores para um sorteio finalizado.',
          color: COLORS.GIVEAWAY
        });
      } else if (val === 'help_community') {
        embedToEdit = createEmbed({
          title: '💡 Sugestões & Enquetes',
          description: 'Engaje sua comunidade com votações e enquetes dinâmicas.\n\n' +
            '• `/sugestao <conteudo>`: Publica uma sugestão no canal oficial com botões 👍/👎 e aprovação da Staff.\n' +
            '• `/setup sugestao <canal>`: Define o canal oficial de sugestões.\n' +
            '• `/enquete <pergunta> <op1> <op2> ...`: Cria votações com barra percentual em tempo real.',
          color: COLORS.INFO
        });
      } else if (val === 'help_level') {
        embedToEdit = createEmbed({
          title: '⭐ Módulo de Níveis & XP',
          description: 'Gamificação e recompensas de atividade no chat.\n\n' +
            '• `/rank [usuario]`: Exibe seu nível, total de XP, ranking e barra de progresso em imagem Canvas.\n' +
            '• `/leaderboard`: Mostra o Top 10 membros com mais XP no servidor.',
          color: COLORS.PRIMARY
        });
      } else if (val === 'help_utils') {
        embedToEdit = createEmbed({
          title: '🛠️ Módulo de Utilitários',
          description: 'Comandos gerais de informação e ferramentas.\n\n' +
            '• `/calc <expressao>`: Calculadora matemática rápida e segura.\n' +
            '• `/userinfo [usuario]`: Informações detalhadas sobre uma conta.\n' +
            '• `/serverinfo`: Estatísticas e dados do servidor.\n' +
            '• `/botinfo`: Uptime, consumo de memória RAM e latência do bot.\n' +
            '• `/avatar [usuario]`: Exibe a foto de perfil com link de download.\n' +
            '• `/banner [usuario]`: Exibe o banner do usuário em alta definição.\n' +
            '• `/ping`: Mostra a latência do bot e da conexão WebSocket.',
          color: COLORS.INFO
        });
      } else if (val === 'help_setup') {
        embedToEdit = createEmbed({
          title: '⚙️ Módulo de Configuração (/setup)',
          description: 'Painel administrativo para inicializar os sistemas do bot.\n\n' +
            '• `/setup ticket`: Configura e envia o painel de tickets.\n' +
            '• `/setup logs`: Define o canal de registros de auditoria.\n' +
            '• `/setup welcome`: Configura canal e mensagem de boas-vindas.\n' +
            '• `/setup autorole`: Configura cargo automático para membros e bots.\n' +
            '• `/setup sugestao`: Define canal oficial de sugestões.\n' +
            '• `/setup cargos-botao`: Cria painel interativo de Reaction Roles.',
          color: COLORS.WARNING
        });
      }

      await i.update({ embeds: [embedToEdit] });
    });

    collector.on('end', async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  }
};
