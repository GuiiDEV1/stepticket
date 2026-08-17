const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Exibe a foto de perfil de um usuário com link para download')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuário para ver o avatar').setRequired(false)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('usuario') || interaction.user;
    const avatarUrl = user.displayAvatarURL({ dynamic: true, size: 2048 });

    const embed = createEmbed({
      title: `🖼️ Avatar de ${user.username}`,
      image: avatarUrl,
      color: COLORS.PRIMARY,
      footerText: `Solicitado por ${interaction.user.tag}`
    });

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Abrir no Navegador')
        .setStyle(ButtonStyle.Link)
        .setURL(avatarUrl)
    );

    return interaction.reply({ embeds: [embed], components: [button] });
  }
};
