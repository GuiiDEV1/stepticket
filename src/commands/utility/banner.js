const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, errorEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription('Exibe o banner de perfil de um usuário')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuário para ver o banner').setRequired(false)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('usuario') || interaction.user;
    // O Discord requer fetch com force: true para obter o banner do usuário
    const fetchedUser = await client.users.fetch(user.id, { force: true }).catch(() => null);

    if (!fetchedUser || !fetchedUser.bannerURL()) {
      return interaction.reply({
        embeds: [errorEmbed('Sem Banner', `O usuário **${user.tag}** não possui um banner personalizado definido.`)],
        ephemeral: true
      });
    }

    const bannerUrl = fetchedUser.bannerURL({ dynamic: true, size: 2048 });

    const embed = createEmbed({
      title: `🎨 Banner de ${user.username}`,
      image: bannerUrl,
      color: COLORS.PRIMARY,
      footerText: `Solicitado por ${interaction.user.tag}`
    });

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Abrir no Navegador')
        .setStyle(ButtonStyle.Link)
        .setURL(bannerUrl)
    );

    return interaction.reply({ embeds: [embed], components: [button] });
  }
};
