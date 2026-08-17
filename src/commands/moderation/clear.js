const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, errorEmbed, successEmbed, COLORS } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');
const DatabaseManager = require('../../database/manager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Limpa mensagens do canal com filtros opcionais')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(opt =>
      opt.setName('quantidade').setDescription('Quantidade de mensagens a apagar (1 a 100)').setMinValue(1).setMaxValue(100).setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName('usuario').setDescription('Apagar apenas mensagens deste usuário específico').setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('apenas_bots').setDescription('Apagar apenas mensagens enviadas por bots').setRequired(false)
    ),

  async execute(interaction, client) {
    if (!checkPermissions({
      interaction,
      userPermissions: [PermissionFlagsBits.ManageMessages],
      botPermissions: [PermissionFlagsBits.ManageMessages]
    })) return;

    const amount = interaction.options.getInteger('quantidade');
    const targetUser = interaction.options.getUser('usuario');
    const onlyBots = interaction.options.getBoolean('apenas_bots');

    await interaction.deferReply({ ephemeral: true });

    try {
      const messages = await interaction.channel.messages.fetch({ limit: amount });
      let filtered = messages;

      if (targetUser) {
        filtered = filtered.filter(m => m.author.id === targetUser.id);
      }

      if (onlyBots) {
        filtered = filtered.filter(m => m.author.bot);
      }

      const deleted = await interaction.channel.bulkDelete(filtered, true);

      const clearEmbed = createEmbed({
        title: '🧹 Limpeza de Mensagens',
        description: `Foram apagadas **${deleted.size}** mensagens com sucesso em ${interaction.channel}!`,
        color: COLORS.SUCCESS,
        footerText: `Comando executado por ${interaction.user.tag}`
      });

      const config = DatabaseManager.getConfig(interaction.guild.id);
      if (config.logs_channel_id) {
        const logChan = interaction.guild.channels.cache.get(config.logs_channel_id);
        if (logChan) logChan.send({ embeds: [clearEmbed] }).catch(() => {});
      }

      return interaction.editReply({ embeds: [clearEmbed] });
    } catch (err) {
      console.error('Erro no clear:', err);
      return interaction.editReply({
        embeds: [errorEmbed('Erro na Limpeza', 'Não foi possível apagar as mensagens. Lembre-se que o Discord não permite apagar mensagens com mais de 14 dias em massa.')]
      });
    }
  }
};
