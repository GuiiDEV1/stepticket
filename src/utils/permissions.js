const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed } = require('./embedBuilder');

/**
 * Valida se o membro executor e o bot possuem as permissões necessárias
 * e se a hierarquia de cargos é respeitada.
 */
function checkPermissions({
  interaction,
  userPermissions = [],
  botPermissions = [],
  targetMember = null
}) {
  // Checar permissões do usuário executor
  for (const perm of userPermissions) {
    if (!interaction.member.permissions.has(perm)) {
      interaction.reply({
        embeds: [errorEmbed('Permissão Insuficiente', `Você precisa da permissão **${perm}** para executar este comando.`)],
        ephemeral: true
      }).catch(() => {});
      return false;
    }
  }

  // Checar permissões do Bot no servidor/canal
  const botMember = interaction.guild.members.me;
  for (const perm of botPermissions) {
    if (!botMember.permissions.has(perm)) {
      interaction.reply({
        embeds: [errorEmbed('Erro de Permissão do Bot', `Eu preciso da permissão **${perm}** para executar esta ação! Por favor, verifique meu cargo.`)],
        ephemeral: true
      }).catch(() => {});
      return false;
    }
  }

  // Checar hierarquia caso haja um membro alvo (ex: ban, kick, timeout, role)
  if (targetMember) {
    if (targetMember.id === interaction.client.user.id) {
      interaction.reply({
        embeds: [errorEmbed('Ação Inválida', 'Eu não posso executar essa ação de moderação em mim mesmo!')],
        ephemeral: true
      }).catch(() => {});
      return false;
    }

    if (targetMember.id === interaction.user.id) {
      interaction.reply({
        embeds: [errorEmbed('Ação Inválida', 'Você não pode executar essa ação em você mesmo!')],
        ephemeral: true
      }).catch(() => {});
      return false;
    }

    if (targetMember.id === interaction.guild.ownerId) {
      interaction.reply({
        embeds: [errorEmbed('Ação Bloqueada', 'Você não pode punir ou modificar o Dono do servidor!')],
        ephemeral: true
      }).catch(() => {});
      return false;
    }

    // Hierarquia do executor em relação ao alvo
    if (
      interaction.user.id !== interaction.guild.ownerId &&
      targetMember.roles.highest.position >= interaction.member.roles.highest.position
    ) {
      interaction.reply({
        embeds: [errorEmbed('Hierarquia Insuficiente', `Você não pode realizar esta ação pois o cargo de **${targetMember.user.tag}** é igual ou superior ao seu.`)],
        ephemeral: true
      }).catch(() => {});
      return false;
    }

    // Hierarquia do bot em relação ao alvo
    if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
      interaction.reply({
        embeds: [errorEmbed('Hierarquia do Bot', `Eu não consigo realizar esta ação pois o cargo de **${targetMember.user.tag}** é superior ou igual ao meu cargo mais alto.`)],
        ephemeral: true
      }).catch(() => {});
      return false;
    }
  }

  return true;
}

module.exports = {
  checkPermissions
};
