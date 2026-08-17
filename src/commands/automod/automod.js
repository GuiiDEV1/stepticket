const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const DatabaseManager = require('../../database/manager');
const { createEmbed, successEmbed, COLORS } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configuração da proteção e auto-moderação do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('config')
        .setDescription('Ativa ou desativa os módulos de proteção automática')
        .addBooleanOption(opt =>
          opt.setName('anti_invite').setDescription('Bloquear convites de outros servidores de Discord').setRequired(false)
        )
        .addBooleanOption(opt =>
          opt.setName('antilink').setDescription('Bloquear links externos no chat').setRequired(false)
        )
        .addBooleanOption(opt =>
          opt.setName('antispam').setDescription('Bloquear flood/spam com timeout automático').setRequired(false)
        )
        .addBooleanOption(opt =>
          opt.setName('anti_mass_mention').setDescription('Bloquear menções em massa (@everyone, @here, etc)').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Exibe o status atual de todos os filtros de AutoMod')
    ),

  async execute(interaction, client) {
    if (!checkPermissions({ interaction, userPermissions: [PermissionFlagsBits.Administrator] })) return;

    const guildId = interaction.guild.id;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'config') {
      const antiInvite = interaction.options.getBoolean('anti_invite');
      const antiLink = interaction.options.getBoolean('antilink');
      const antiSpam = interaction.options.getBoolean('antispam');
      const antiMassMention = interaction.options.getBoolean('anti_mass_mention');

      const updates = {};
      if (antiInvite !== null) updates.automod_antiinvite = antiInvite ? 1 : 0;
      if (antiLink !== null) updates.automod_antilink = antiLink ? 1 : 0;
      if (antiSpam !== null) updates.automod_antispam = antiSpam ? 1 : 0;
      if (antiMassMention !== null) updates.automod_antimassmention = antiMassMention ? 1 : 0;

      DatabaseManager.updateConfig(guildId, updates);

      const config = DatabaseManager.getConfig(guildId);
      const statusEmbed = createEmbed({
        title: '🛡️ Configuração do AutoMod Atualizada',
        color: COLORS.SUCCESS,
        fields: [
          { name: '🔗 Anti-Invite (Convites)', value: config.automod_antiinvite ? '✅ Ativado' : '❌ Desativado', inline: true },
          { name: '🌐 Anti-Link Geral', value: config.automod_antilink ? '✅ Ativado' : '❌ Desativado', inline: true },
          { name: '⚡ Anti-Spam / Flood', value: config.automod_antispam ? '✅ Ativado' : '❌ Desativado', inline: true },
          { name: '📢 Anti-Mass Mention', value: config.automod_antimassmention ? '✅ Ativado' : '❌ Desativado', inline: true }
        ]
      });

      return interaction.reply({ embeds: [statusEmbed], ephemeral: true });
    }

    if (subcommand === 'status') {
      const config = DatabaseManager.getConfig(guildId);
      const statusEmbed = createEmbed({
        title: '🛡️ Status do Sistema de AutoMod',
        description: 'Veja abaixo o status de cada módulo de segurança ativa no servidor:',
        color: COLORS.INFO,
        fields: [
          { name: '🔗 Anti-Invite (Convites)', value: config.automod_antiinvite ? '🟢 Ativado' : '🔴 Desativado', inline: true },
          { name: '🌐 Anti-Link Geral', value: config.automod_antilink ? '🟢 Ativado' : '🔴 Desativado', inline: true },
          { name: '⚡ Anti-Spam / Flood', value: config.automod_antispam ? '🟢 Ativado' : '🔴 Desativado', inline: true },
          { name: '📢 Anti-Mass Mention', value: config.automod_antimassmention ? '🟢 Ativado' : '🔴 Desativado', inline: true }
        ]
      });

      return interaction.reply({ embeds: [statusEmbed], ephemeral: true });
    }
  }
};
