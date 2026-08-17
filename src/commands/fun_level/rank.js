const { SlashCommandBuilder } = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { generateRankCard } = require('../../utils/rankCard');
const { errorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Exibe o cartão de nível e progresso de XP gerado em imagem Canvas')
    .addUserOption(opt =>
      opt.setName('usuario').setDescription('Usuário para consultar o ranking').setRequired(false)
    ),

  async execute(interaction, client) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    const guildId = interaction.guild.id;

    const data = DatabaseManager.getUserLevel(guildId, targetUser.id);
    const rankPos = DatabaseManager.getUserRank(guildId, targetUser.id);
    const neededForNext = (data.level + 1) * 150;

    try {
      const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 512, forceStatic: true });
      const attachment = await generateRankCard({
        username: targetUser.username,
        avatarURL,
        level: data.level,
        currentXP: data.xp,
        neededXP: neededForNext,
        rank: rankPos
      });

      return interaction.editReply({ files: [attachment] });
    } catch (err) {
      console.error('Erro ao gerar imagem do rank:', err);
      return interaction.editReply({
        embeds: [errorEmbed('Erro no Canvas', 'Ocorreu uma falha ao renderizar a imagem do perfil.')]
      });
    }
  }
};
