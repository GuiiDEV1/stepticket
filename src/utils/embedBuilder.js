const { EmbedBuilder } = require('discord.js');

const COLORS = {
  PRIMARY: 0x5865F2,
  SUCCESS: 0x2ECC71,
  ERROR: 0xED4245,
  WARNING: 0xFEE75C,
  TICKET: 0x00B0F4,
  GIVEAWAY: 0xEB459E,
  MODERATION: 0xE67E22,
  INFO: 0x3498DB
};

/**
 * Cria uma Embed padrão estilizada
 * @param {Object} options
 * @param {string} [options.title]
 * @param {string} [options.description]
 * @param {number|string} [options.color]
 * @param {Array<{name: string, value: string, inline?: boolean}>} [options.fields]
 * @param {string} [options.thumbnail]
 * @param {string} [options.image]
 * @param {string} [options.footerText]
 * @param {string} [options.footerIcon]
 * @param {boolean} [options.timestamp=true]
 * @returns {EmbedBuilder}
 */
function createEmbed({
  title,
  description,
  color = COLORS.PRIMARY,
  fields,
  thumbnail,
  image,
  footerText,
  footerIcon,
  timestamp = true
} = {}) {
  const embed = new EmbedBuilder();

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (color) embed.setColor(typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : color);
  if (fields && Array.isArray(fields) && fields.length > 0) embed.addFields(fields);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);

  if (footerText) {
    embed.setFooter({
      text: footerText,
      iconURL: footerIcon
    });
  }

  if (timestamp) {
    embed.setTimestamp();
  }

  return embed;
}

function successEmbed(title, description) {
  return createEmbed({
    title: `✅ ${title}`,
    description,
    color: COLORS.SUCCESS
  });
}

function errorEmbed(title, description) {
  return createEmbed({
    title: `❌ ${title}`,
    description,
    color: COLORS.ERROR
  });
}

function warningEmbed(title, description) {
  return createEmbed({
    title: `⚠️ ${title}`,
    description,
    color: COLORS.WARNING
  });
}

function infoEmbed(title, description) {
  return createEmbed({
    title: `ℹ️ ${title}`,
    description,
    color: COLORS.INFO
  });
}

module.exports = {
  COLORS,
  createEmbed,
  successEmbed,
  errorEmbed,
  warningEmbed,
  infoEmbed
};
