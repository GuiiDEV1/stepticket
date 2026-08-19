const {
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const DatabaseManager = require('../../database/manager.js');
const { generateCaptcha } = require('../../utils/captchaGenerator.js');
const { createEmbed, successEmbed, errorEmbed, COLORS } = require('../../utils/embedBuilder.js');

// Armazena códigos de captcha temporários dos usuários (Map: userId -> { code, expiresAt, attempts })
const activeCaptchas = new Map();

// Limpeza periódica de captchas expirados da memória a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of activeCaptchas.entries()) {
    if (now > data.expiresAt) {
      activeCaptchas.delete(userId);
    }
  }
}, 300000);

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (!interaction.guild) return;

    // =========================================================================
    // 1. CLIQUE NO BOTÃO "VERIFICAR-SE" DO PAINEL
    // =========================================================================
    if (interaction.isButton() && interaction.customId === 'btn_verify_start') {
      const config = DatabaseManager.getVerification(interaction.guild.id);

      if (!config || !config.enabled) {
        return interaction.reply({
          embeds: [errorEmbed('Sistema Desativado', 'O sistema de verificação não está configurado neste servidor.')],
          ephemeral: true
        });
      }

      const role = interaction.guild.roles.cache.get(config.role_id);
      if (!role) {
        return interaction.reply({
          embeds: [errorEmbed('Cargo Não Encontrado', 'O cargo de membro verificado não foi encontrado. Contate a Staff.')],
          ephemeral: true
        });
      }

      // Já possui o cargo?
      if (interaction.member.roles.cache.has(role.id)) {
        return interaction.reply({
          embeds: [successEmbed('Você já é verificado!', 'Sua conta já possui acesso completo ao servidor.')],
          ephemeral: true
        });
      }

      // Modo 1: Verificação Direta por Botão
      if (config.type === 'button') {
        try {
          await interaction.member.roles.add(role.id);
          return interaction.reply({
            embeds: [successEmbed('Verificação Concluída!', `Você foi verificado com sucesso e recebeu o cargo **${role.name}**! 🎉`)],
            ephemeral: true
          });
        } catch (err) {
          return interaction.reply({
            embeds: [errorEmbed('Erro de Permissão', 'O bot não possui permissão hierárquica suficiente para atribuir este cargo.')],
            ephemeral: true
          });
        }
      }

      // Modo 2: Verificação por Captcha Visual em Canvas
      await interaction.deferReply({ ephemeral: true });

      const captcha = await generateCaptcha();
      activeCaptchas.set(interaction.user.id, {
        code: captcha.code,
        expiresAt: Date.now() + 180000 // 3 minutos
      });

      const solveRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_verify_solve')
          .setLabel('Digitar Código do Captcha')
          .setEmoji('✍️')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('btn_verify_refresh')
          .setLabel('Gerar Outro')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Secondary)
      );

      const captchaEmbed = createEmbed({
        title: '🔐 Verificação de Segurança (Anti-Bot)',
        description: 'Digite exatamente o código de **6 caracteres** exibido na imagem abaixo para liberar seu acesso ao servidor.',
        color: COLORS.PRIMARY,
        image: 'attachment://captcha.png',
        footerText: 'O código expira em 3 minutos'
      });

      return interaction.editReply({
        embeds: [captchaEmbed],
        files: [captcha.attachment],
        components: [solveRow]
      });
    }

    // =========================================================================
    // 2. CLIQUE NO BOTÃO "GERAR OUTRO CAPTCHA"
    // =========================================================================
    if (interaction.isButton() && interaction.customId === 'btn_verify_refresh') {
      await interaction.deferUpdate();

      const captcha = await generateCaptcha();
      activeCaptchas.set(interaction.user.id, {
        code: captcha.code,
        expiresAt: Date.now() + 180000
      });

      const solveRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_verify_solve')
          .setLabel('Digitar Código do Captcha')
          .setEmoji('✍️')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('btn_verify_refresh')
          .setLabel('Gerar Outro')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Secondary)
      );

      const captchaEmbed = createEmbed({
        title: '🔐 Novo Captcha Gerado',
        description: 'Digite exatamente o código de **6 caracteres** exibido na nova imagem abaixo:',
        color: COLORS.PRIMARY,
        image: 'attachment://captcha.png',
        footerText: 'O código expira em 3 minutos'
      });

      return interaction.editReply({
        embeds: [captchaEmbed],
        files: [captcha.attachment],
        components: [solveRow]
      });
    }

    // =========================================================================
    // 3. ABRIR O MODAL PARA DIGITAR O CÓDIGO DO CAPTCHA
    // =========================================================================
    if (interaction.isButton() && interaction.customId === 'btn_verify_solve') {
      const stored = activeCaptchas.get(interaction.user.id);
      if (!stored || Date.now() > stored.expiresAt) {
        return interaction.reply({
          embeds: [errorEmbed('Captcha Expirado', 'Seu código expirou. Clique em "Verificar-se" novamente.')],
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId('modal_verify_captcha')
        .setTitle('Verificação de Segurança');

      const input = new TextInputBuilder()
        .setCustomId('captcha_input')
        .setLabel('Código do Captcha (6 caracteres)')
        .setPlaceholder('Exemplo: 4B9K2M')
        .setMinLength(6)
        .setMaxLength(6)
        .setRequired(true)
        .setStyle(TextInputStyle.Short);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    // =========================================================================
    // 4. SUBMIT DO MODAL DO CAPTCHA (COM LIMITE DE TENTATIVAS ANTI-BRUTE FORCE)
    // =========================================================================
    if (interaction.isModalSubmit() && interaction.customId === 'modal_verify_captcha') {
      const typed = interaction.fields.getTextInputValue('captcha_input').trim().toUpperCase();
      const stored = activeCaptchas.get(interaction.user.id);

      if (!stored || Date.now() > stored.expiresAt) {
        activeCaptchas.delete(interaction.user.id);
        return interaction.reply({
          embeds: [errorEmbed('Captcha Expirado', 'Seu código expirou. Gere um novo captcha no canal de verificação.')],
          ephemeral: true
        });
      }

      if (typed !== stored.code.toUpperCase()) {
        stored.attempts = (stored.attempts || 0) + 1;

        if (stored.attempts >= 3) {
          activeCaptchas.delete(interaction.user.id);
          return interaction.reply({
            embeds: [errorEmbed('Limite de Tentativas Excedido', 'Você errou o código 3 vezes seguidas. Por segurança, este captcha foi cancelado. Clique em **"Verificar-se"** para gerar um novo.')],
            ephemeral: true
          });
        }

        const remaining = 3 - stored.attempts;
        return interaction.reply({
          embeds: [errorEmbed('Código Incorreto', `O código digitado (\`${typed}\`) está incorreto. Você ainda tem **${remaining} tentativa(s)** antes do captcha ser cancelado.`)],
          ephemeral: true
        });
      }

      // Código Correto!
      activeCaptchas.delete(interaction.user.id);

      const config = DatabaseManager.getVerification(interaction.guild.id);
      if (!config) return;

      const role = interaction.guild.roles.cache.get(config.role_id);
      if (!role) {
        return interaction.reply({
          embeds: [errorEmbed('Erro', 'Cargo de verificação não encontrado no servidor.')],
          ephemeral: true
        });
      }

      try {
        await interaction.member.roles.add(role.id);

        const okEmbed = createEmbed({
          title: '✅ Verificação Concluída com Sucesso!',
          description: `Parabéns, <@${interaction.user.id}>! Você resolveu o Captcha corretamente e recebeu o cargo **${role.name}**.\n\nSeja muito bem-vindo(a) ao servidor! 🚀`,
          color: COLORS.SUCCESS
        });

        await interaction.reply({ embeds: [okEmbed], ephemeral: true });

        // Log no canal de logs
        const guildConfig = DatabaseManager.getConfig(interaction.guild.id);
        if (guildConfig && guildConfig.logs_channel_id) {
          const logChannel = interaction.guild.channels.cache.get(guildConfig.logs_channel_id);
          if (logChannel) {
            const logEmbed = createEmbed({
              title: '🛡️ Membro Verificado',
              description: `O usuário <@${interaction.user.id}> (\`${interaction.user.tag}\`) concluiu a verificação por Captcha com sucesso.`,
              color: COLORS.SUCCESS
            });
            logChannel.send({ embeds: [logEmbed] }).catch(() => {});
          }
        }
      } catch (err) {
        return interaction.reply({
          embeds: [errorEmbed('Erro de Permissão', 'O bot não possui permissão para entregar o cargo configurado.')],
          ephemeral: true
        });
      }
    }
  }
};
