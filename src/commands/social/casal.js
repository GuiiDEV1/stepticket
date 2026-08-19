const { SlashCommandBuilder } = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { createEmbed, COLORS, infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('casal')
    .setDescription('💞 Veja o perfil e tempo de casamento de um casal!')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Usuário para consultar o casamento (deixe em branco para ver o seu)')
        .setRequired(false)
    ),
  category: 'social',
  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    const marriage = DatabaseManager.getMarriage(targetUser.id);

    if (!marriage) {
      return interaction.reply({
        embeds: [infoEmbed('Solteiro(a) Livre e Desimpedido(a)', `${targetUser} ainda não se casou com ninguém! Use \`/casar @usuario\` para fazer um pedido.`)],
        ephemeral: true
      });
    }

    const partner = await client.users.fetch(marriage.partner_id).catch(() => null);
    const partnerTag = partner ? partner.tag : `<@${marriage.partner_id}>`;
    const partnerAvatar = partner ? partner.displayAvatarURL({ dynamic: true }) : null;

    const diffDays = Math.max(1, Math.floor((Date.now() - marriage.married_at) / (1000 * 60 * 60 * 24)));

    const embed = createEmbed({
      title: `💞 Certidão de Casamento • ${targetUser.username} & ${partner ? partner.username : 'Parceiro(a)'}`,
      description: `Aqui estão as informações oficiais da união matrimonial no servidor:`,
      color: 0xFF69B4,
      thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: '💍 Cônjuges', value: `${targetUser} ❤️ ${partner ? partner : `<@${marriage.partner_id}>`}`, inline: false },
        { name: '💎 Aliança', value: `${marriage.ring_type || '💍 Aliança de Ouro 24k'}`, inline: true },
        { name: '⏳ Tempo Juntos', value: `**${diffDays}** dia(s) de amor`, inline: true },
        { name: '📅 Casados Desde', value: `<t:${Math.floor(marriage.married_at / 1000)}:D> (<t:${Math.floor(marriage.married_at / 1000)}:R>)`, inline: false },
        { name: '✨ Nível de Afinidade', value: `💖 **${marriage.affinity || 10} Pontos** de Sintonia`, inline: true }
      ],
      footerText: 'Amor eterno no Discord • Noozy'
    });

    return interaction.reply({ embeds: [embed] });
  }
};
