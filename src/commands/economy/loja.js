const { SlashCommandBuilder } = require('discord.js');
const DatabaseManager = require('../../database/manager.js');
const { createEmbed, errorEmbed, COLORS } = require('../../utils/embedBuilder.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loja')
    .setDescription('Catálogo de cargos e itens disponíveis para compra no servidor')
    .addSubcommand(sub =>
      sub
        .setName('ver')
        .setDescription('Exibe todos os itens e cargos à venda no servidor')
    )
    .addSubcommand(sub =>
      sub
        .setName('comprar')
        .setDescription('Compra um cargo da loja usando seus Coins')
        .addIntegerOption(opt =>
          opt
            .setName('id_item')
            .setDescription('ID do item exibido na loja')
            .setRequired(true)
        )
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    // ======================= SUBCOMANDO VER =======================
    if (subcommand === 'ver') {
      const items = DatabaseManager.getShopItems(guildId);

      if (!items || items.length === 0) {
        return interaction.reply({
          embeds: [createEmbed({
            title: '🛍️ Loja do Servidor',
            description: 'A loja ainda não possui itens cadastrados.\n\n*Administradores podem adicionar cargos à venda usando `/setup loja add`.*',
            color: COLORS.PRIMARY
          })],
          ephemeral: true
        });
      }

      const embed = createEmbed({
        title: `🛍️ Loja Oficial • ${interaction.guild.name}`,
        description: 'Use seus Coins acumulados para comprar cargos exclusivos!\nPara comprar, use `/loja comprar <id_item>`.\n\n' +
          items.map(i => `**[ID: \`${i.id}\`]** <@&${i.role_id}>\n💵 **Preço:** \`🪙 ${i.price.toLocaleString('pt-BR')} Coins\`\n📝 *${i.description || 'Cargo exclusivo do servidor.'}*\n`).join('\n'),
        color: COLORS.SUCCESS,
        footerText: 'Ganhe coins com /daily e /work'
      });

      return interaction.reply({ embeds: [embed] });
    }

    // ======================= SUBCOMANDO COMPRAR =======================
    if (subcommand === 'comprar') {
      const itemId = interaction.options.getInteger('id_item');
      const item = DatabaseManager.getShopItem(itemId, guildId);

      if (!item) {
        return interaction.reply({
          embeds: [errorEmbed('Item Não Encontrado', `Nenhum item com o ID \`${itemId}\` foi encontrado na loja. Use \`/loja ver\` para listar os disponíveis.`)],
          ephemeral: true
        });
      }

      const role = interaction.guild.roles.cache.get(item.role_id);
      if (!role) {
        return interaction.reply({
          embeds: [errorEmbed('Cargo Inexistente', 'O cargo associado a este item foi deletado do servidor. Contate a Staff.')],
          ephemeral: true
        });
      }

      if (interaction.member.roles.cache.has(role.id)) {
        return interaction.reply({
          embeds: [errorEmbed('Você já possui este cargo', `Você já tem o cargo **${role.name}** na sua conta!`)],
          ephemeral: true
        });
      }

      const eco = DatabaseManager.getEconomy(guildId, userId);
      if (eco.wallet < item.price) {
        return interaction.reply({
          embeds: [errorEmbed('Saldo Insuficiente', `Você precisa de **🪙 ${item.price.toLocaleString('pt-BR')} Coins** na sua carteira para comprar este cargo.\n**Seu Saldo Atual:** \`🪙 ${eco.wallet.toLocaleString('pt-BR')}\``)],
          ephemeral: true
        });
      }

      try {
        await interaction.member.roles.add(role.id);
        DatabaseManager.removeWallet(guildId, userId, item.price);
        const updated = DatabaseManager.getEconomy(guildId, userId);

        const embed = createEmbed({
          title: '🎉 Compra Realizada com Sucesso!',
          description: `Parabéns! Você comprou o cargo **${role.name}** por **🪙 ${item.price.toLocaleString('pt-BR')} Coins**!\n\n` +
            `**Saldo Restante:** \`🪙 ${updated.wallet.toLocaleString('pt-BR')} Coins\``,
          color: COLORS.SUCCESS
        });

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        return interaction.reply({
          embeds: [errorEmbed('Erro de Permissão', 'O bot não conseguiu entregar o cargo. Verifique se o cargo do bot está acima na hierarquia do servidor.')],
          ephemeral: true
        });
      }
    }
  }
};
