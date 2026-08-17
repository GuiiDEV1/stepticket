const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Adiciona ou remove cargos de um membro')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Adiciona um cargo a um membro')
        .addUserOption(opt => opt.setName('usuario').setDescription('Membro que receberá o cargo').setRequired(true))
        .addRoleOption(opt => opt.setName('cargo').setDescription('Cargo a ser adicionado').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove um cargo de um membro')
        .addUserOption(opt => opt.setName('usuario').setDescription('Membro que perderá o cargo').setRequired(true))
        .addRoleOption(opt => opt.setName('cargo').setDescription('Cargo a ser removido').setRequired(true))
    ),

  async execute(interaction, client) {
    if (!checkPermissions({
      interaction,
      userPermissions: [PermissionFlagsBits.ManageRoles],
      botPermissions: [PermissionFlagsBits.ManageRoles]
    })) return;

    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('usuario');
    const role = interaction.options.getRole('cargo');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      return interaction.reply({
        embeds: [errorEmbed('Não Encontrado', 'Este membro não está no servidor.')],
        ephemeral: true
      });
    }

    const botMember = interaction.guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
      return interaction.reply({
        embeds: [errorEmbed('Hierarquia do Bot', 'Eu não posso gerenciar este cargo pois ele está acima ou igual ao meu cargo mais alto.')],
        ephemeral: true
      });
    }

    if (
      interaction.user.id !== interaction.guild.ownerId &&
      role.position >= interaction.member.roles.highest.position
    ) {
      return interaction.reply({
        embeds: [errorEmbed('Hierarquia Insuficiente', 'Você não pode gerenciar um cargo que é superior ou igual ao seu.')],
        ephemeral: true
      });
    }

    try {
      if (subcommand === 'add') {
        if (targetMember.roles.cache.has(role.id)) {
          return interaction.reply({
            embeds: [errorEmbed('Ação Desnecessária', `${targetMember} já possui o cargo **${role.name}**.`)],
            ephemeral: true
          });
        }
        await targetMember.roles.add(role);
        return interaction.reply({
          embeds: [successEmbed('Cargo Adicionado', `O cargo **${role.name}** foi adicionado a ${targetMember} por ${interaction.user}.`)]
        });
      }

      if (subcommand === 'remove') {
        if (!targetMember.roles.cache.has(role.id)) {
          return interaction.reply({
            embeds: [errorEmbed('Ação Desnecessária', `${targetMember} não possui o cargo **${role.name}**.`)],
            ephemeral: true
          });
        }
        await targetMember.roles.remove(role);
        return interaction.reply({
          embeds: [successEmbed('Cargo Removido', `O cargo **${role.name}** foi removido de ${targetMember} por ${interaction.user}.`)]
        });
      }
    } catch (err) {
      console.error('Erro no comando role:', err);
      return interaction.reply({
        embeds: [errorEmbed('Erro', 'Ocorreu um erro ao atualizar os cargos do membro.')],
        ephemeral: true
      });
    }
  }
};
