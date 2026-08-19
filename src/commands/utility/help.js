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
      title: '📚 Central de Ajuda • rikeozinho',
      description: 'Olá! Eu sou o **rikeozinho**, seu bot multifuncional completo para o Discord! Estou equipado com **Tickets, Gerenciador de FastFlags, Rastreador de Atualizações do Roblox, Verificação por Captcha, Economia Completa, Moderação, Sorteios, Notificador de YouTube e Utilitários**!\n\nSelecione uma categoria no menu abaixo para conferir todos os comandos.',
      color: COLORS.PRIMARY,
      thumbnail: client.user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: '⚡ FastFlags & Otimização', value: 'Limpar e checar flags, offsets de memória.', inline: true },
        { name: '🌐 Roblox & Versões', value: 'Rastreador de deploy e versões LIVE da Roblox.', inline: true },
        { name: '🔐 Verificação Anti-Bot', value: 'Painel com Captcha visual em imagem Canvas.', inline: true },
        { name: '💰 Economia & Minijogos', value: 'Daily, work, carteira, cassino e loja de cargos.', inline: true },
        { name: '🎫 Tickets & Suporte', value: 'Atendimento privado com transcrições HTML.', inline: true },
        { name: '🛡️ Moderação & Punições', value: 'Ban, kick, timeout, clear, warn, lock, nuke.', inline: true },
        { name: '🤖 AutoMod em Tempo Real', value: 'Anti-link, anti-invite, anti-spam automático.', inline: true },
        { name: '🎉 Sorteios & Comunidade', value: 'Giveaways com botões, enquetes e sugestões.', inline: true },
        { name: '⚙️ Configuração (/setup)', value: 'Painéis administrativos e inicialização.', inline: true }
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
            .setLabel('FastFlags & Otimização')
            .setDescription('/flag limpar, checar, offsets, info')
            .setEmoji('⚡')
            .setValue('help_flags'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Roblox & Atualizações')
            .setDescription('/roblox versao, status e alertas automáticos')
            .setEmoji('🌐')
            .setValue('help_roblox'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Economia & Minijogos')
            .setDescription('/daily, /work, /carteira, /apostar, /loja')
            .setEmoji('💰')
            .setValue('help_economy'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Verificação & Segurança')
            .setDescription('Captcha visual Canvas e Anti-Bot')
            .setEmoji('🔐')
            .setValue('help_verify'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Tickets & Suporte')
            .setDescription('Atendimento e transcrições HTML')
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
            .setLabel('Sorteios & Comunidade')
            .setDescription('Giveaways, sugestões e enquetes')
            .setEmoji('🎉')
            .setValue('help_community'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Níveis & Ranking (XP)')
            .setDescription('Rank em Canvas e Leaderboard')
            .setEmoji('⭐')
            .setValue('help_level'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Configuração (/setup)')
            .setDescription('Painéis, YouTube, Loja e Alertas')
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
          title: '⚡ Módulo FastFlags & Otimização (/flag)',
          description: 'Gerenciador de FastFlags para Roblox e ClientAppSettings.json.\n\n' +
            '• `/flag limpar [arquivo] [texto] [modo]`: Limpa e entrega o arquivo `ClientAppSettings.json` 100% otimizado.\n' +
            '• `/flag checar [arquivo] [texto]`: Analisa as flags e envia 2 arquivos .json separados (`flags_validas.json` e `flags_invalidas.json`).\n' +
            '• `/flag offsets`: Consulta os offsets de memória mais recentes diretamente do `offsets.imtheo.lol`.\n' +
            '• `/flag info <nome>`: Consulta o status e tipo esperado de uma flag específica.',
          color: COLORS.INFO
        });
      } else if (val === 'help_roblox') {
        embedToEdit = createEmbed({
          title: '🌐 Módulo Roblox Tracker & Deploys',
          description: 'Acompanhe em tempo real todas as versões oficiais da Roblox.\n\n' +
            '• `/roblox versao`: Mostra a versão ativa no canal LIVE, hash de upload e links de download direto.\n' +
            '• `/roblox status`: Status dos serviços da Roblox e canal monitorado.\n' +
            '• `/roblox testar`: Simula o envio de um alerta de atualização no canal configurado.\n' +
            '• `/setup roblox-tracker <canal> [cargo_ping]`: Configura notificações automáticas no canal assim que a Roblox lançar um novo deploy!',
          color: COLORS.PRIMARY
        });
      } else if (val === 'help_economy') {
        embedToEdit = createEmbed({
          title: '💰 Módulo de Economia & Minijogos',
          description: 'Sistema completo de moedas virtuais, trabalho e apostas no chat.\n\n' +
            '• `/daily`: Resgata seu bônus diário (500 a 1.500 Coins).\n' +
            '• `/work`: Trabalha a cada 1 hora para receber seu salário.\n' +
            '• `/carteira [usuario]`: Exibe seu saldo na carteira, no banco e patrimônio total.\n' +
            '• `/depositar <quantidade|tudo>`: Guarda moedas no banco com segurança.\n' +
            '• `/sacar <quantidade|tudo>`: Retira moedas do banco para a carteira.\n' +
            '• `/pagar <usuario> <quantidade>`: Transfere Coins para outro membro.\n' +
            '• `/apostar <quantidade>`: Minijogo de roleta/cassino com multiplicadores (2x e jackpot 3x).\n' +
            '• `/loja ver`: Exibe os cargos disponíveis para compra com Coins.\n' +
            '• `/loja comprar <id_item>`: Compra um cargo da loja automaticamente.',
          color: COLORS.SUCCESS
        });
      } else if (val === 'help_verify') {
        embedToEdit = createEmbed({
          title: '🔐 Módulo de Verificação de Segurança (Anti-Bot)',
          description: 'Proteja seu servidor contra bots e invasões com verificação interativa.\n\n' +
            '• `/setup verify <canal> <cargo_membro> [tipo]`: Envia o painel oficial de verificação.\n' +
            '  - **Tipo Captcha:** Gera dinamicamente uma imagem distorcida de 6 caracteres via Canvas.\n' +
            '  - **Tipo Botão:** Verificação rápida com 1 clique.\n\n' +
            '*Ao concluir, o membro recebe o cargo configurado e o log é registrado automaticamente.*',
          color: COLORS.WARNING
        });
      } else if (val === 'help_tickets') {
        embedToEdit = createEmbed({
          title: '🎫 Módulo de Tickets & Atendimento',
          description: 'Sistema completo para suporte privado com transcrições automáticas em HTML.\n\n' +
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
            '• `/nuke` : Recria e limpa o canal mantendo todas as permissões intactas.\n' +
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
      } else if (val === 'help_community') {
        embedToEdit = createEmbed({
          title: '🎉 Sorteios, Sugestões & Enquetes',
          description: 'Recursos dinâmicos para a sua comunidade.\n\n' +
            '• `/giveaway start <duracao> <ganhadores> <premio>`: Inicia sorteio com botão interativo 🎉 e timer.\n' +
            '• `/giveaway end <id>` / `/giveaway reroll <id>`: Gerencia sorteios.\n' +
            '• `/sugestao <conteudo>`: Envia sugestão com botões 👍/👎 e modal para a Staff.\n' +
            '• `/enquete <pergunta> <opcoes...>`: Enquete com barra gráfica de porcentagem.',
          color: COLORS.GIVEAWAY
        });
      } else if (val === 'help_level') {
        embedToEdit = createEmbed({
          title: '⭐ Módulo de Níveis & XP',
          description: 'Gamificação e recompensas de atividade no chat.\n\n' +
            '• `/rank [usuario]`: Exibe seu nível, total de XP, ranking e barra de progresso em imagem Canvas.\n' +
            '• `/leaderboard`: Mostra o Top 10 membros com mais XP no servidor.',
          color: COLORS.PRIMARY
        });
      } else if (val === 'help_setup') {
        embedToEdit = createEmbed({
          title: '⚙️ Módulo de Configuração (/setup)',
          description: 'Comandos administrativos para configurar o servidor.\n\n' +
            '• `/setup ticket`: Painel interativo de atendimento.\n' +
            '• `/setup verify`: Painel de verificação Anti-Bot (Captcha ou Botão).\n' +
            '• `/setup roblox-tracker`: Alertas automáticos de novas versões do Roblox.\n' +
            '• `/setup youtube`: Notificações automáticas de vídeos novos no YouTube.\n' +
            '• `/setup loja add|remove`: Gerencia os cargos à venda na economia.\n' +
            '• `/setup logs` / `/setup welcome` / `/setup sugestao`: Canais oficiais.',
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
