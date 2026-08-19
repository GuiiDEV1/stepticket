const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { createEmbed, errorEmbed, successEmbed, warningEmbed, COLORS } = require('../../utils/embedBuilder');
const { generateTranscript } = require('../../utils/transcript');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Comandos de gerenciamento de atendimento')
    .addSubcommand(sub =>
      sub
        .setName('fechar')
        .setDescription('Encerra o atendimento atual')
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo do fechamento').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('reabrir').setDescription('Reabre o atendimento atual')
    )
    .addSubcommand(sub =>
      sub.setName('assumir').setDescription('Assume a responsabilidade pelo atendimento')
    )
    .addSubcommand(sub =>
      sub
        .setName('adicionar')
        .setDescription('Adiciona um membro ao canal do ticket')
        .addUserOption(opt => opt.setName('usuario').setDescription('Membro a ser adicionado').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remover')
        .setDescription('Remove um membro do canal do ticket')
        .addUserOption(opt => opt.setName('usuario').setDescription('Membro a ser removido').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('transcricao').setDescription('Gera o arquivo HTML com o histórico completo das mensagens')
    )
    .addSubcommand(sub =>
      sub.setName('deletar').setDescription('Exclui permanentemente o canal do ticket')
    ),

  async execute(interaction, client) {
    const ticket = DatabaseManager.getTicketByChannel(interaction.channel.id);

    if (!ticket) {
      return interaction.reply({
        embeds: [errorEmbed('Comando Inválido', 'Este comando só pode ser executado dentro de um canal de ticket ativo.')],
        ephemeral: true
      });
    }

    const config = DatabaseManager.getConfig(interaction.guild.id);
    const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
      interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
      interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) ||
      (config.ticket_staff_role_id && interaction.member.roles.cache.has(config.ticket_staff_role_id));
    const isOwner = interaction.user.id === ticket.user_id;

    const subcommand = interaction.options.getSubcommand();

    // 1. FECHAR (Staff ou Dono do Ticket)
    if (subcommand === 'fechar') {
      if (!isStaff && !isOwner) {
        return interaction.reply({
          embeds: [errorEmbed('Sem Permissão', 'Apenas a equipe de suporte ou o autor do atendimento podem encerrar este ticket.')],
          ephemeral: true
        });
      }

      const reason = interaction.options.getString('motivo') || 'Fechamento via comando /ticket fechar';
      await interaction.deferReply();

      DatabaseManager.updateTicket(interaction.channel.id, {
        status: 'closed',
        closed_by: interaction.user.id,
        close_reason: reason,
        closed_at: Date.now()
      });

      await interaction.channel.permissionOverwrites.edit(ticket.user_id, {
        SendMessages: false,
        ViewChannel: true
      }).catch(() => {});

      const attachment = await generateTranscript(interaction.channel);

      if (config.ticket_logs_id) {
        const logChannel = interaction.guild.channels.cache.get(config.ticket_logs_id);
        if (logChannel) {
          const logEmbed = createEmbed({
            title: '📜 Ticket Encerrado',
            description: `**Ticket:** #${interaction.channel.name}\n**Criador:** <@${ticket.user_id}>\n**Encerrado por:** ${interaction.user}\n**Motivo:** ${reason}`,
            color: COLORS.WARNING
          });
          await logChannel.send({ embeds: [logEmbed], files: [attachment] }).catch(() => {});
        }
      }

      const closedEmbed = createEmbed({
        title: '🔒 Ticket Encerrado',
        description: `Este atendimento foi encerrado por ${interaction.user}.\n**Motivo:** ${reason}`,
        color: COLORS.ERROR
      });

      return interaction.editReply({ embeds: [closedEmbed] });
    }

    // 2. REABRIR (Staff ou Dono do Ticket)
    if (subcommand === 'reabrir') {
      if (!isStaff && !isOwner) {
        return interaction.reply({
          embeds: [errorEmbed('Sem Permissão', 'Apenas a equipe de suporte ou o autor original podem reabrir este ticket.')],
          ephemeral: true
        });
      }

      DatabaseManager.updateTicket(interaction.channel.id, { status: 'open' });
      await interaction.channel.permissionOverwrites.edit(ticket.user_id, {
        SendMessages: true,
        ViewChannel: true,
        AttachFiles: true
      }).catch(() => {});

      return interaction.reply({
        embeds: [successEmbed('Ticket Reaberto', `Atendimento reaberto por ${interaction.user}.`)]
      });
    }

    // 3. ASSUMIR (Restrito à Staff)
    if (subcommand === 'assumir') {
      if (!isStaff) {
        return interaction.reply({
          embeds: [errorEmbed('Acesso Restrito', 'Apenas membros da equipe de suporte podem assumir atendimentos.')],
          ephemeral: true
        });
      }

      if (ticket.claimed_by) {
        return interaction.reply({
          embeds: [warningEmbed('Já Reivindicado', `Este ticket já foi assumido por <@${ticket.claimed_by}>.`)],
          ephemeral: true
        });
      }

      DatabaseManager.updateTicket(interaction.channel.id, { claimed_by: interaction.user.id });
      return interaction.reply({
        embeds: [successEmbed('Atendimento Assumido', `${interaction.user} agora é o atendente responsável por este ticket.`)]
      });
    }

    // 4. ADICIONAR MEMBRO (Staff ou Dono do Ticket)
    if (subcommand === 'adicionar') {
      if (!isStaff && !isOwner) {
        return interaction.reply({
          embeds: [errorEmbed('Sem Permissão', 'Apenas a equipe ou o autor do ticket podem adicionar membros ao atendimento.')],
          ephemeral: true
        });
      }

      const user = interaction.options.getUser('usuario');
      await interaction.channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true,
        SendMessages: true,
        AttachFiles: true,
        ReadMessageHistory: true
      });

      return interaction.reply({
        embeds: [successEmbed('Membro Adicionado', `${user} foi adicionado ao ticket por ${interaction.user}.`)]
      });
    }

    // 5. REMOVER MEMBRO (Restrito à Staff)
    if (subcommand === 'remover') {
      if (!isStaff) {
        return interaction.reply({
          embeds: [errorEmbed('Acesso Restrito', 'Apenas a moderação pode remover membros do canal de ticket.')],
          ephemeral: true
        });
      }

      const user = interaction.options.getUser('usuario');
      if (user.id === ticket.user_id) {
        return interaction.reply({
          embeds: [errorEmbed('Ação Bloqueada', 'Você não pode remover o dono/criador do ticket.')],
          ephemeral: true
        });
      }

      await interaction.channel.permissionOverwrites.delete(user.id).catch(() => {});

      return interaction.reply({
        embeds: [successEmbed('Membro Removido', `${user} foi removido do ticket por ${interaction.user}.`)]
      });
    }

    // 6. TRANSCRIÇÃO (Qualquer participante do ticket pode solicitar)
    if (subcommand === 'transcricao') {
      await interaction.deferReply();
      const attachment = await generateTranscript(interaction.channel);
      return interaction.editReply({
        content: 'Aqui está o arquivo com o histórico de mensagens deste atendimento:',
        files: [attachment]
      });
    }

    // 7. DELETAR (Restrito à Staff com ManageChannels / Admin)
    if (subcommand === 'deletar') {
      if (!isStaff) {
        return interaction.reply({
          embeds: [errorEmbed('Permissão Negada', 'Apenas moderadores com permissão de gerenciar canais podem excluir tickets permanentemente.')],
          ephemeral: true
        });
      }

      await interaction.reply({
        embeds: [warningEmbed('Deletando Canal', 'Este ticket será excluído permanentemente em **5 segundos** por solicitação da Staff...')]
      });

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 5000);
    }
  }
};
