const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Exibe informações detalhadas sobre um usuário ou membro')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuário para consultar').setRequired(false)),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    const createdTimestamp = Math.floor(targetUser.createdTimestamp / 1000);
    const joinedTimestamp = member ? Math.floor(member.joinedTimestamp / 1000) : null;

    const rolesList = member 
      ? member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.toString()).join(', ') || 'Nenhum'
      : 'Não está no servidor';

    const embed = createEmbed({
      title: `👤 Informações de ${targetUser.username}`,
      thumbnail: targetUser.displayAvatarURL({ dynamic: true, size: 256 }),
      color: member ? member.displayColor || COLORS.PRIMARY : COLORS.PRIMARY,
      fields: [
        { name: '🏷️ Tag / Nome', value: `\`${targetUser.tag}\``, inline: true },
        { name: '🆔 ID do Usuário', value: `\`${targetUser.id}\``, inline: true },
        { name: '🤖 É um Bot?', value: targetUser.bot ? 'Sim' : 'Não', inline: true },
        { name: '📅 Conta Criada', value: `<t:${createdTimestamp}:f> (<t:${createdTimestamp}:R>)`, inline: false },
        { name: '📥 Entrou no Servidor', value: joinedTimestamp ? `<t:${joinedTimestamp}:f> (<t:${joinedTimestamp}:R>)` : 'Não está no servidor', inline: false },
        { name: `🎭 Cargos (${member ? member.roles.cache.size - 1 : 0})`, value: rolesList.slice(0, 1024), inline: false }
      ]
    });

    return interaction.reply({ embeds: [embed] });
  }
};
