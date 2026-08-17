const { SlashCommandBuilder } = require('discord.js');
const { evaluate } = require('mathjs');
const { createEmbed, errorEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calc')
    .setDescription('Calculadora matemática rápida e precisa')
    .addStringOption(opt =>
      opt.setName('expressao').setDescription('Expressão matemática para calcular (ex: (150 * 3) + 25 / 2)').setRequired(true)
    ),

  async execute(interaction, client) {
    const expression = interaction.options.getString('expressao');

    try {
      const result = evaluate(expression);

      const calcEmbed = createEmbed({
        title: '🧮 Calculadora',
        color: COLORS.INFO,
        fields: [
          { name: '📥 Expressão', value: `\`\`\`js\n${expression}\n\`\`\``, inline: false },
          { name: '📤 Resultado', value: `\`\`\`js\n${result}\n\`\`\``, inline: false }
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
