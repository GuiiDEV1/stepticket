const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { createEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Exibe estatísticas e detalhes completos sobre este servidor'),

  async execute(interaction, client) {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner().catch(() => null);

    const totalMembers = guild.memberCount;
    const channels = guild.channels.cache;
    const textChannels = channels.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size;
    const categoryChannels = channels.filter(c => c.type === ChannelType.GuildCategory).size;

    const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);

    const embed = createEmbed({
      title: `🏰 Informações de ${guild.name}`,
      thumbnail: guild.iconURL({ dynamic: true, size: 256 }),
      color: COLORS.PRIMARY,
      fields: [
        { name: '👑 Dono(a)', value: owner ? `${owner.user} (\`${owner.id}\`)` : 'Indisponível', inline: true },
        { name: '🆔 ID do Servidor', value: `\`${guild.id}\``, inline: true },
        { name: '📅 Criado em', value: `<t:${createdTimestamp}:d> (<t:${createdTimestamp}:R>)`, inline: true },
        { name: '👥 Membros', value: `**Total:** ${totalMembers}`, inline: true },
        { name: '💬 Canais', value: `📁 Categorias: **${categoryChannels}**\n💬 Texto: **${textChannels}**\n🔊 Voz: **${voiceChannels}**`, inline: true },
        { name: '🚀 Nível de Impulso', value: `Nível: **${guild.premiumTier}** (${guild.premiumSubscriptionCount || 0} boosts)`, inline: true },
        { name: '😀 Emojis e Cargos', value: `😀 Emojis: **${guild.emojis.cache.size}**\n🎭 Cargos: **${guild.roles.cache.size}**`, inline: true }
      ]
    });

    if (guild.bannerURL()) {
      embed.setImage(guild.bannerURL({ size: 1024 }));
    }

    return interaction.reply({ embeds: [embed] });
  }
};
