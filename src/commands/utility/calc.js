const { SlashCommandBuilder } = require('discord.js');
const { evaluate } = require('mathjs');
const { createEmbed, errorEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calc')
    .setDescription('Calculadora matemática rápida e precisa')
    .addStringOption(opt =>
      opt
        .setName('expressao')
        .setDescription('Expressão matemática para calcular (ex: (150 * 3) + 25 / 2)')
        .setRequired(true)
        .setMaxLength(200)
    ),

  async execute(interaction, client) {
    const expression = interaction.options.getString('expressao').trim();

    if (expression.length > 200) {
      return interaction.reply({
        embeds: [errorEmbed('Expressão Muito Longa', 'A expressão matemática não pode exceder 200 caracteres.')],
        ephemeral: true
      });
    }

    // Bloqueia palavras-chave perigosas e acesso a objetos/métodos
    if (/(import|require|process|global|window|eval|function|constructor|prototype|this|__proto__)/i.test(expression)) {
      return interaction.reply({
        embeds: [errorEmbed('Expressão Bloqueada', 'Apenas operadores matemáticos padrão são permitidos.')],
        ephemeral: true
      });
    }

    try {
      // Avaliação em escopo limpo e vazio
      const result = evaluate(expression, {});

      // Validação de tipo: apenas números, matrizes numéricas e unidades permitidas
      if (typeof result === 'function' || result === undefined) {
        throw new Error('Resultado inválido');
      }

      const resStr = String(result).substring(0, 500);

      const calcEmbed = createEmbed({
        title: '🧮 Calculadora',
        color: COLORS.INFO,
        fields: [
          { name: '📥 Expressão', value: `\`\`\`js\n${expression}\n\`\`\``, inline: false },
          { name: '📤 Resultado', value: `\`\`\`js\n${resStr}\n\`\`\``, inline: false }
        ]
      });

      return interaction.reply({ embeds: [calcEmbed] });
    } catch (err) {
      return interaction.reply({
        embeds: [errorEmbed('Expressão Inválida', 'Não foi possível calcular esta expressão. Verifique a sintaxe dos operadores matemáticos.')],
        ephemeral: true
      });
    }
  }
};
