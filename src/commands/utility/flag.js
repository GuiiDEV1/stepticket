const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { cleanAndValidateFFlags, fetchImtheoOffsets, fetchRobloxLiveFFlags, CURATED_KNOWN_FLAGS } = require('../../utils/fflagManager.js');
const { createEmbed, errorEmbed, warningEmbed, COLORS } = require('../../utils/embedBuilder.js');

// Cooldown de 10 segundos por usuário (Map: userId -> timestamp)
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('flag')
    .setDescription('Comandos de verificação, limpeza e offsets de FastFlags para Luqqzstrap / Bloxstrap')
    // Subcomando: Limpar
    .addSubcommand(sub =>
      sub
        .setName('limpar')
        .setDescription('Analisa, limpa e corrige um arquivo ClientAppSettings.json de FastFlags')
        .addAttachmentOption(opt =>
          opt
            .setName('arquivo')
            .setDescription('Envie o arquivo .json de FastFlags (ex: ClientAppSettings.json)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('texto')
            .setDescription('Ou cole o texto JSON das flags diretamente aqui')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('modo')
            .setDescription('Modo de limpeza')
            .setRequired(false)
            .addChoices(
              { name: '🛡️ Seguro (Corrige tipos, remove flags perigosas e inválidas)', value: 'safe' },
              { name: '⚡ Rigoroso (Mantém apenas flags ativas no catálogo do Roblox)', value: 'strict' }
            )
        )
    )
    // Subcomando: Offsets (imtheo.lol)
    .addSubcommand(sub =>
      sub
        .setName('offsets')
        .setDescription('Consulta os offsets de memória do Roblox mais recentes de offsets.imtheo.lol')
    )
    // Subcomando: Info
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription('Consulta informações detalhadas sobre uma FastFlag específica')
        .addStringOption(opt =>
          opt
            .setName('nome')
            .setDescription('Nome da FastFlag (ex: DFIntTaskSchedulerTargetFps)')
            .setRequired(true)
        )
    )
    // Subcomando: Checar
    .addSubcommand(sub =>
      sub
        .setName('checar')
        .setDescription('Diagnóstico rápido de um arquivo ou texto de FastFlags sem modificação')
        .addAttachmentOption(opt =>
          opt
            .setName('arquivo')
            .setDescription('Envie o arquivo .json para diagnóstico')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('texto')
            .setDescription('Ou cole o JSON aqui')
            .setRequired(false)
        )
    ),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    const now = Date.now();

    // 1. COOLDOWN DE 10 SEGUNDOS
    const userCooldown = cooldowns.get(userId);
    if (userCooldown && now - userCooldown < 10000) {
      const remainingSeconds = Math.ceil((10000 - (now - userCooldown)) / 1000);
      return interaction.reply({
        embeds: [warningEmbed('Aguarde um momento', `Você precisa aguardar **${remainingSeconds} segundo(s)** para usar o comando \`/flag\` novamente.`)],
        ephemeral: true
      });
    }

    cooldowns.set(userId, now);

    const subcommand = interaction.options.getSubcommand();

    // =========================================================================
    // SUBCOMANDO: OFFSETS (IMTHEO.LOL)
    // =========================================================================
    if (subcommand === 'offsets') {
      await interaction.deferReply();
      const offsetsData = await fetchImtheoOffsets(true);

      if (!offsetsData) {
        return interaction.editReply({
          embeds: [errorEmbed('Erro ao Buscar Offsets', 'Não foi possível conectar ao servidor de offsets (https://offsets.imtheo.lol/). Tente novamente em instantes.')]
        });
      }

      const robloxVersion = offsetsData['Roblox Version'] || 'Live Client';
      const totalOffsets = offsetsData['Total Offsets'] || (offsetsData.Offsets ? Object.keys(offsetsData.Offsets).length : '300+');
      const dumpedAt = offsetsData['Dumped At'] || 'Recentemente';
      const dumperVersion = offsetsData['Dumper Version'] || 'v1.0';

      const offsetsEmbed = createEmbed({
        title: '⚡ Roblox Memory Offsets (imtheo.lol)',
        description: `Informações de offsets de memória sincronizados para o **Luqqzstrap / Bootstrappers**.\n\n` +
          `**Versão do Roblox:** \`${robloxVersion}\`\n` +
          `**Total de Offsets:** \`${totalOffsets} offsets\`\n` +
          `**Dumper:** \`${dumperVersion}\`\n` +
          `**Data da Extração:** \`${dumpedAt}\`\n` +
          `**Fonte Oficial:** [offsets.imtheo.lol](https://offsets.imtheo.lol/)`,
        color: COLORS.INFO,
        footerText: 'Sincronizado em tempo real'
      });

      return interaction.editReply({ embeds: [offsetsEmbed] });
    }

    // =========================================================================
    // SUBCOMANDO: INFO (CONSULTAR FLAG ESPECÍFICA)
    // =========================================================================
    if (subcommand === 'info') {
      await interaction.deferReply();
      const flagName = interaction.options.getString('nome').trim();
      const live = await fetchRobloxLiveFFlags();

      const existsLive = live.flagsSet.has(flagName);
      const curated = CURATED_KNOWN_FLAGS[flagName];
      const liveVal = live.flagsMap ? live.flagsMap[flagName] : undefined;

      let typeName = 'Desconhecido';
      if (flagName.startsWith('FFlag') || flagName.startsWith('DFFlag') || flagName.startsWith('SFFlag')) typeName = 'Boolean (true/false)';
      else if (flagName.startsWith('FInt') || flagName.startsWith('DFInt') || flagName.startsWith('SFInt') || flagName.startsWith('FLog')) typeName = 'Integer (Número Inteiro)';
      else if (flagName.startsWith('FString') || flagName.startsWith('DFString')) typeName = 'String (Texto)';

      const infoEmbed = createEmbed({
        title: `🔍 Informações da FastFlag: \`${flagName}\``,
        color: existsLive ? COLORS.SUCCESS : (curated ? COLORS.PRIMARY : COLORS.WARNING),
        fields: [
          { name: '📊 Status no Roblox', value: existsLive ? '🟢 Ativa no Catálogo Oficial (Live)' : (curated ? '🔵 Suportada por Bootstrappers' : '🟡 Não encontrada no Live (Pode ser legada/custom)'), inline: false },
          { name: '🏷️ Tipo de Dado Esperado', value: `\`${typeName}\``, inline: true },
          { name: '⚙️ Valor Padrão no Roblox', value: liveVal !== undefined ? `\`${liveVal}\`` : '*Não definido pelo servidor*', inline: true },
          { name: '📝 Descrição / Finalidade', value: curated ? curated.desc : '*Sem descrição curada cadastrada.*', inline: false }
        ],
        footerText: `Total de flags ativas no catálogo: ${live.flagsSet.size}`
      });

      return interaction.editReply({ embeds: [infoEmbed] });
    }

    // =========================================================================
    // SUBCOMANDO: LIMPAR / CHECAR (PROCESSAMENTO DE ARQUIVO OU TEXTO)
    // =========================================================================
    if (subcommand === 'limpar' || subcommand === 'checar') {
      const fileAttachment = interaction.options.getAttachment('arquivo');
      const textInput = interaction.options.getString('texto');
      const mode = interaction.options.getString('modo') || 'safe';
      const isStrict = mode === 'strict';

      if (!fileAttachment && !textInput) {
        return interaction.reply({
          embeds: [errorEmbed('Nenhum Arquivo Fornecido', 'Você precisa enviar um arquivo `.json` (ex: `ClientAppSettings.json`) ou colar o texto JSON na opção `texto`.')],
          ephemeral: true
        });
      }

      await interaction.deferReply();

      let jsonContent = '';

      // Obter o conteúdo do JSON
      if (fileAttachment) {
        if (!fileAttachment.name.endsWith('.json') && !fileAttachment.name.endsWith('.txt')) {
          return interaction.editReply({
            embeds: [errorEmbed('Formato Inválido', 'Por favor envie um arquivo com extensão `.json` ou `.txt`.')]
          });
        }

        try {
          const res = await fetch(fileAttachment.url);
          jsonContent = await res.text();
        } catch (err) {
          return interaction.editReply({
            embeds: [errorEmbed('Erro no Download', 'Não foi possível baixar o arquivo enviado.')]
          });
        }
      } else if (textInput) {
        jsonContent = textInput;
      }

      // Parser seguro do JSON
      let parsedFlags = null;
      try {
        // Remove possíveis comentários e vírgulas extras no final
        const cleanRaw = jsonContent
          .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '')
          .replace(/,\s*}/g, '}');
        parsedFlags = JSON.parse(cleanRaw);
      } catch (err) {
        return interaction.editReply({
          embeds: [errorEmbed('JSON Inválido', `O conteúdo não é um JSON válido. Verifique se as chaves e valores possuem aspas corretas.\n**Erro:** \`${err.message}\``)]
        });
      }

      // Executa a limpeza e validação profunda
      const result = await cleanAndValidateFFlags(parsedFlags, { strict: isStrict });

      if (result.error) {
        return interaction.editReply({
          embeds: [errorEmbed('Falha na Análise', result.error)]
        });
      }

      const { stats, cleanedFlags, robloxLiveTotal } = result;

      // Montar resumo detalhado
      const resultEmbed = createEmbed({
        title: subcommand === 'limpar' ? '🧹 FastFlags Limpas e Otimizadas (Luqqzstrap)' : '🔍 Diagnóstico de FastFlags',
        description: `Analisei **${stats.totalInput}** FastFlags com base no catálogo oficial do Roblox e bases confiáveis.\n\n` +
          `**Modo:** \`${isStrict ? 'Rigoroso (Live Only)' : 'Seguro (Recomendado)'}\`\n` +
          `**Catálogo Atualizado:** \`${robloxLiveTotal} flags ativas no Roblox\``,
        color: stats.removedDangerous.length > 0 ? COLORS.WARNING : COLORS.SUCCESS,
        fields: [
          { name: '✅ Flags Válidas Mantidas', value: `\`${stats.validKept}\` flags`, inline: true },
          { name: '🔧 Tipos Corrigidos', value: `\`${stats.corrected.length}\` correções`, inline: true },
          { name: '🗑️ Inválidas / Removidas', value: `\`${stats.removedInvalid.length + stats.removedDeprecated.length}\` flags`, inline: true }
        ],
        footerText: 'Pronto para uso no Luqqzstrap e Bloxstrap'
      });

      if (stats.removedDangerous.length > 0) {
        resultEmbed.addFields({
          name: '🚨 Flags Perigosas Removidas (Risco de Crash/Ban)',
          value: stats.removedDangerous.map(d => `• \`${d.key}\`: ${d.reason}`).join('\n').slice(0, 1024),
          inline: false
        });
      }

      if (stats.corrected.length > 0) {
        resultEmbed.addFields({
          name: '🛠️ Exemplos de Correções Automáticas Realizadas',
          value: stats.corrected.slice(0, 5).map(c => `• \`${c.key}\`: ${c.change}`).join('\n') + (stats.corrected.length > 5 ? `\n*...e mais ${stats.corrected.length - 5} correções.*` : ''),
          inline: false
        });
      }

      if (stats.removedInvalid.length > 0) {
        resultEmbed.addFields({
          name: '⚠️ Flags com Prefixos Inválidos Excluídas',
          value: stats.removedInvalid.slice(0, 5).map(i => `• \`${i.key}\``).join('\n') + (stats.removedInvalid.length > 5 ? `\n*...e mais ${stats.removedInvalid.length - 5} flags.*` : ''),
          inline: false
        });
      }

      // Se for o comando de limpar, anexa o arquivo ClientAppSettings.json pronto
      if (subcommand === 'limpar') {
        const cleanedJsonString = JSON.stringify(cleanedFlags, null, 2);
        const attachment = new AttachmentBuilder(Buffer.from(cleanedJsonString, 'utf-8'), {
          name: 'ClientAppSettings.json'
        });

        return interaction.editReply({
          embeds: [resultEmbed],
          files: [attachment]
        });
      } else {
        return interaction.editReply({
          embeds: [resultEmbed]
        });
      }
    }
  }
};
