const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isButton() || !interaction.customId.startsWith('role_toggle_')) return;

    const roleId = interaction.customId.replace('role_toggle_', '');
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) {
      return interaction.reply({
        embeds: [errorEmbed('Cargo Não Encontrado', 'Este cargo não existe mais no servidor.')],
        ephemeral: true
      });
    }

    const botMember = interaction.guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
      return interaction.reply({
        embeds: [errorEmbed('Erro de Permissão', 'Meu cargo é inferior ao cargo solicitado. Peça a um administrador para ajustar a posição do meu cargo.')],
        ephemeral: true
      });
    }

    const member = interaction.member;

    try {
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role.id);
        return interaction.reply({
          embeds: [successEmbed('Cargo Removido', `O cargo **${role.name}** foi removido de você com sucesso.`)],
          ephemeral: true
        });
      } else {
        await member.roles.add(role.id);
        return interaction.reply({
          embeds: [successEmbed('Cargo Adicionado', `Você recebeu o cargo **${role.name}** com sucesso!`)],
          ephemeral: true
        });
      }
    } catch (err) {
      console.error('Erro ao alternar cargo:', err);
      return interaction.reply({
        embeds: [errorEmbed('Falha na Ação', 'Ocorreu um erro ao tentar adicionar/remover este cargo.')],
        ephemeral: true
      });
    }
  }
};
