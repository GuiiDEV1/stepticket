const { SlashCommandBuilder } = require('discord.js');
const { fetchRobloxLiveVersions } = require('../../utils/robloxTracker.js');
const { createEmbed, errorEmbed, COLORS } = require('../../utils/embedBuilder.js');

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
        .setDescription('Exibe o status dos serviços e deploys da Roblox')
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply();

    const versions = await fetchRobloxLiveVersions();
    if (!versions || !versions.player) {
      return interaction.editReply({
        embeds: [errorEmbed('Erro ao Consultar', 'Não foi possível obter dados da API da Roblox no momento.')]
      });
    }

    const player = versions.player;
    const studio = versions.studio;

    if (subcommand === 'versao' || subcommand === 'status') {
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
