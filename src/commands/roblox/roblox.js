const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { fetchRobloxLiveVersions } = require('../../utils/robloxTracker.js');
const DatabaseManager = require('../../database/manager.js');
const { createEmbed, successEmbed, errorEmbed, warningEmbed, COLORS } = require('../../utils/embedBuilder.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roblox')
    .setDescription('Comandos e status oficiais da plataforma Roblox')
    .addSubcommand(sub =>
      sub
        .setName('versao')
        .setDescription('Consulta a versão e hash de deploy mais recentes do Roblox (Live)')
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Exibe o status do monitoramento e canal de alertas configurado')
    )
    .addSubcommand(sub =>
      sub
        .setName('testar')
        .setDescription('Envia uma mensagem de teste no canal configurado para simular o alerta de atualização')
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const tracker = DatabaseManager.getRobloxTracker();
    const serverConfig = tracker.channels ? tracker.channels.find(c => c.guild_id === guildId) : null;

    // =========================================================================
    // SUBCOMANDO: TESTAR ALERTA
    // =========================================================================
    if (subcommand === 'testar') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          embeds: [errorEmbed('Sem Permissão', 'Apenas administradores podem testar o envio de alertas.')],
          ephemeral: true
        });
      }

      if (!serverConfig) {
        return interaction.reply({
          embeds: [warningEmbed('Canal Não Configurado', 'Você ainda não configurou um canal de alertas neste servidor!\nUse o comando: `/setup roblox-tracker <canal> [cargo_ping]`.')],
          ephemeral: true
        });
      }

      const targetChannel = interaction.guild.channels.cache.get(serverConfig.channel_id);
      if (!targetChannel) {
        return interaction.reply({
          embeds: [errorEmbed('Canal Inválido', 'O canal configurado não foi encontrado. Configure novamente com `/setup roblox-tracker`.')],
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const versions = await fetchRobloxLiveVersions();
      const currentUpload = versions?.player?.clientVersionUpload || 'version-ce0bcd0fbd484804';
      const currentVersion = versions?.player?.version || '0.735.0.7351131';

      const alertEmbed = createEmbed({
        title: '🧪 [TESTE] Nova Atualização do Roblox Lançada!',
        description: `Esta é uma **mensagem de teste** para validar o sistema de notificações automáticas!\n\n` +
          `**Nova Versão:** \`${currentVersion}\`\n` +
          `**Hash de Deploy:** \`${currentUpload}\`\n` +
          `**Versão Anterior:** \`0.734.0.0\` (\`version-exemplo12345\`)\n\n` +
          `⚠️ **Aviso para usuários de Luqqzstrap / Bloxstrap:**\n` +
          `Seus offsets de memória e FastFlags podem ter sido modificados. Use \`/flag checar\` e \`/flag offsets\` para validar suas configurações!`,
        color: COLORS.SUCCESS,
        thumbnail: 'https://i.imgur.com/8Q9bZ8R.png',
        fields: [
          { name: '📥 Download Direto da Versão', value: `[Baixar RobloxPlayer.zip](https://setup.rbxcdn.com/${currentUpload}-RobloxPlayer.zip)`, inline: true },
          { name: '⚡ Studio Deploy', value: `\`${versions?.studio?.clientVersionUpload || 'version-studio-exemplo'}\``, inline: true }
        ],
        footerText: 'Mensagem de teste de alerta Roblox'
      });

      const content = serverConfig.ping_role_id ? `<@&${serverConfig.ping_role_id}>` : undefined;

      try {
        await targetChannel.send({ content, embeds: [alertEmbed] });
        return interaction.editReply({
          embeds: [successEmbed('Teste Enviado com Sucesso!', `O alerta de teste foi postado no canal <#${targetChannel.id}>!`)]
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [errorEmbed('Falha no Envio', `O bot não conseguiu enviar mensagem no canal <#${targetChannel.id}>. Verifique as permissões de "Enviar Mensagens" e "Inserir Links".`)]
        });
      }
    }

    // =========================================================================
    // SUBCOMANDOS: VERSAO E STATUS
    // =========================================================================
    await interaction.deferReply();
    const versions = await fetchRobloxLiveVersions();

    if (!versions || !versions.player) {
      return interaction.editReply({
        embeds: [errorEmbed('Erro ao Consultar', 'Não foi possível obter dados da API da Roblox no momento.')]
      });
    }

    const player = versions.player;
    const studio = versions.studio;

    if (subcommand === 'status') {
      const channelMention = serverConfig ? `<#${serverConfig.channel_id}>` : '❌ *Nenhum canal configurado (Use `/setup roblox-tracker`)*';
      const pingMention = serverConfig?.ping_role_id ? `<@&${serverConfig.ping_role_id}>` : '*Sem menção de cargo*';
      const lastCheck = tracker.last_checked_at ? `<t:${Math.floor(tracker.last_checked_at / 1000)}:R>` : 'Recentemente';

      const statusEmbed = createEmbed({
        title: '📊 Status do Rastreador Roblox (Live Tracker)',
        description: 'O bot verifica as APIs da Roblox a cada **2 minutos** em segundo plano e posta no canal configurado sempre que sair uma atualização.',
        color: COLORS.INFO,
        thumbnail: 'https://i.imgur.com/8Q9bZ8R.png',
        fields: [
          { name: '🟢 Status do Rastreador', value: '`Ativo & Monitorando (24/7)`', inline: true },
          { name: '⏱️ Última Checagem', value: lastCheck, inline: true },
          { name: '📡 Canal de Alertas deste Servidor', value: channelMention, inline: false },
          { name: '🔔 Cargo de Menção (Ping)', value: pingMention, inline: false },
          { name: '📦 Versão Monitorada Atual', value: `\`v${player.version}\` (\`${player.clientVersionUpload}\`)`, inline: false }
        ],
        footerText: 'Dica: Use /roblox testar para simular um alerta no canal'
      });

      return interaction.editReply({ embeds: [statusEmbed] });
    }

    if (subcommand === 'versao') {
      const embed = createEmbed({
        title: '🌐 Versões Ativas da Roblox (Canal LIVE)',
        description: 'Informações de deploy oficiais sincronizadas diretamente dos servidores da Roblox.',
        color: COLORS.PRIMARY,
        thumbnail: 'https://i.imgur.com/8Q9bZ8R.png',
        fields: [
          {
            name: '🎮 Roblox Player (Cliente de Jogo)',
            value: `• **Versão:** \`${player.version}\`\n• **Deploy Hash:** \`${player.clientVersionUpload}\`\n• [📥 Download Direto](https://setup.rbxcdn.com/${player.clientVersionUpload}-RobloxPlayer.zip)`,
            inline: false
          },
          {
            name: '🛠️ Roblox Studio',
            value: `• **Versão:** \`${studio.version}\`\n• **Deploy Hash:** \`${studio.clientVersionUpload}\`\n• [📥 Download Direto](https://setup.rbxcdn.com/${studio.clientVersionUpload}-RobloxStudio.zip)`,
            inline: false
          },
          {
            name: '⚡ Bootstrappers (Luqqzstrap / Bloxstrap)',
            value: `Use \`/flag offsets\` para checar os offsets compatíveis com a versão atual (\`${player.version}\`).`,
            inline: false
          }
        ],
        footerText: 'Sincronizado em tempo real'
      });

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
