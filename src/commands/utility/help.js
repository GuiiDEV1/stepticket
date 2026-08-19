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
      title: '📚 Central de Ajuda • Noozy',
      description: 'Olá! Eu sou o **Noozy**, seu bot multifuncional completo para o Discord! Estou equipado com **Tickets, FastFlags, Rastreador de Roblox, Captcha, Economia, Moderação, Sorteios e Painel Web Oficial (`noozy.app`)**!\n\nSelecione uma categoria no menu abaixo para conferir todos os comandos.',
      color: COLORS.PRIMARY,
      thumbnail: client.user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: '⚡ Roblox & FastFlags', value: '`/flag`, `/roblox`, offsets e deploy tracker.', inline: true },
        { name: '🛡️ Segurança, Mod & AutoMod', value: 'Punições, logs, anti-spam e captcha.', inline: true },
        { name: '🎫 Tickets & Atendimento', value: 'Suporte privado e transcrições HTML.', inline: true },
        { name: '💰 Economia, Loja & Jogos', value: 'Daily, work, apostas, banco e loja.', inline: true },
        { name: '🎉 Comunidade, Níveis & Social', value: 'Sorteios, sugestões, rank XP e casamentos.', inline: true },
        { name: '🌐 Painel Web Dashboard', value: 'Acesse [noozy.app](https://noozy.app) para gerenciar.', inline: true }
      ],
      footerText: 'Selecione uma categoria abaixo para ver os detalhes'
    });

    const categoryMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_select_menu')
        .setPlaceholder('Escolha uma categoria...')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('Início')
            .setDescription('Voltar à página principal de ajuda')
            .setEmoji('🏠')
            .setValue('help_home'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Roblox & FastFlags')
            .setDescription('Otimizador de ClientAppSettings e versões LIVE')
            .setEmoji('⚡')
            .setValue('help_roblox_flags'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Segurança, Mod & AutoMod')
            .setDescription('Punições, warns, captcha visual e filtros anti-spam')
            .setEmoji('🛡️')
            .setValue('help_security_mod'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Tickets & Suporte')
            .setDescription('Atendimento com transcrições HTML automáticas')
            .setEmoji('🎫')
            .setValue('help_tickets'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Economia, Loja & Cassino')
            .setDescription('Moedas, trabalho, roleta e loja de cargos')
            .setEmoji('💰')
            .setValue('help_economy'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Comunidade, Níveis & Social')
            .setDescription('Sorteios, enquetes, rank XP em Canvas e casamentos')
            .setEmoji('🎉')
            .setValue('help_community_social')
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
      } else if (val === 'help_roblox_flags') {
        embedToEdit = createEmbed({
          title: '⚡ Módulo Roblox & FastFlags',
          description: 'Ferramentas avançadas para otimização de Roblox e monitoramento de atualizações.\n\n' +
            '**FastFlags (`/flag`):**\n' +
            '• `/flag limpar [arquivo] [texto] [modo]`: Limpa e entrega o `ClientAppSettings.json` otimizado.\n' +
            '• `/flag checar [arquivo] [texto]`: Analisa e separa flags válidas e inválidas.\n' +
            '• `/flag offsets`: Consulta os offsets de memória mais recentes do `offsets.imtheo.lol`.\n' +
            '• `/flag info <nome>`: Consulta o status e tipo esperado de uma flag específica.\n\n' +
            '**Roblox Tracker (`/roblox`):**\n' +
            '• `/roblox versao`: Mostra a versão ativa no canal LIVE e links de download.\n' +
            '• `/roblox status`: Status dos serviços da Roblox e canal monitorado.\n' +
            '• `/roblox testar`: Simula o envio de um alerta de nova versão.\n' +
            '• `/setup roblox-tracker <canal> [cargo]`: Alertas automáticos de novos deploys.',
          color: COLORS.INFO
        });
      } else if (val === 'help_security_mod') {
        embedToEdit = createEmbed({
          title: '🛡️ Módulo de Segurança, Moderação & AutoMod',
          description: 'Tudo o que sua equipe de staff precisa para proteger o servidor.\n\n' +
            '**Moderação Punições:**\n' +
            '• `/ban`, `/unban`, `/kick`: Bane, desbane ou expulsa membros.\n' +
            '• `/timeout <usuario> <duracao>`, `/untimeout`: Silencia temporariamente.\n' +
            '• `/clear <quantidade>`: Limpa até 100 mensagens do chat.\n' +
            '• `/lock`, `/unlock`, `/slowmode`: Gerenciamento e bloqueio de canais.\n' +
            '• `/nuke`: Recria o canal limpo preservando todas as permissões.\n' +
            '• `/warn`, `/warnings`, `/delwarn`, `/clearwarns`: Sistema formal de advertências.\n' +
            '• `/role add|remove`: Adiciona ou remove cargos.\n\n' +
            '**AutoMod & Verificação:**\n' +
            '• `/automod config` / `/automod status`: Proteção anti-invite, anti-link e anti-spam.\n' +
            '• `/setup verify`: Painel de verificação com Captcha visual Canvas.',
          color: COLORS.MODERATION
        });
      } else if (val === 'help_tickets') {
        embedToEdit = createEmbed({
          title: '🎫 Módulo de Tickets & Atendimento',
          description: 'Sistema completo para suporte privado com transcrições automáticas em HTML.\n\n' +
            '• `/setup ticket`: Configura e envia o painel de abertura de tickets.\n' +
            '• `/ticket fechar [motivo]`: Encerra o ticket e gera transcrição segura em HTML.\n' +
            '• `/ticket reabrir`: Reabre um ticket que foi finalizado.\n' +
            '• `/ticket assumir`: Staff assume a responsabilidade exclusiva pelo atendimento.\n' +
            '• `/ticket adicionar <usuario>` / `/ticket remover <usuario>`: Gerencia membros no ticket.\n' +
            '• `/ticket transcricao`: Gera arquivo HTML com histórico de chat e fotos.\n' +
            '• `/ticket deletar`: Exclui permanentemente o canal com contagem de 5s.',
          color: COLORS.TICKET
        });
      } else if (val === 'help_economy') {
        embedToEdit = createEmbed({
          title: '💰 Módulo de Economia, Loja & Jogos',
          description: 'Sistema completo de moedas virtuais, trabalho e apostas seguras.\n\n' +
            '• `/daily`: Resgata seu bônus diário de moedas (500 a 1.500 Coins).\n' +
            '• `/work`: Trabalha a cada 1 hora para receber salário.\n' +
            '• `/carteira [usuario]`: Exibe seu saldo na carteira, no banco e patrimônio.\n' +
            '• `/depositar <quantidade|tudo>` / `/sacar <quantidade|tudo>`: Gestão bancária.\n' +
            '• `/pagar <usuario> <quantidade>`: Transfere Coins para outro membro.\n' +
            '• `/apostar <quantidade>`: Roleta/cassino (Multiplicador 2x e Jackpot 3x com débito atômico).\n' +
            '• `/loja ver` / `/loja comprar <id>`: Visualiza e compra cargos configurados.\n' +
            '• `/setup loja add|remove`: Administração da loja de cargos.',
          color: COLORS.SUCCESS
        });
      } else if (val === 'help_community_social') {
        embedToEdit = createEmbed({
          title: '🎉 Módulo de Comunidade, Níveis & Social',
          description: 'Recursos dinâmicos para engajar seus membros.\n\n' +
            '**Sorteios & Engajamento:**\n' +
            '• `/giveaway start <duracao> <ganhadores> <premio>`: Sorteio interativo 🎉.\n' +
            '• `/sugestao <conteudo>`: Envia sugestão com botões 👍/👎 e modal Staff.\n' +
            '• `/enquete <pergunta> <opcoes...>`: Enquetes com barras gráficas de porcentagem.\n\n' +
            '**Níveis & XP:**\n' +
            '• `/rank [usuario]`: Exibe nível e progresso em imagem Canvas personalizada.\n' +
            '• `/leaderboard`: Mostra o Top 10 membros com mais XP no servidor.\n\n' +
            '**Social & Casamento:**\n' +
            '• `/casar <usuario>`: Pedido formal de casamento com botões interativos 💖/💔.\n' +
            '• `/casal [usuario]`: Perfil oficial do casal, aliança, afinidade e dias juntos.\n' +
            '• `/divorcio`: Finaliza o casamento atual com confirmação.',
          color: COLORS.GIVEAWAY
        });
      }

      await i.update({ embeds: [embedToEdit] });
    });

    collector.on('end', async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  }
};
