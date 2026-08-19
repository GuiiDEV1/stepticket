const crypto = require('crypto');
const net = require('net');

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} str 
 * @returns {string}
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag]));
}

/**
 * Verifica se um endereço IP pertence a redes privadas, loopback ou link-local (SSRF Guard)
 * @param {string} ip 
 * @returns {boolean} true se for privado/perigoso, false se for público seguro
 */
function isPrivateOrLocalIP(ip) {
  if (!ip) return true;

  // IPv4 Loopback e Wildcard
  if (ip === '127.0.0.1' || ip === '0.0.0.0' || ip.startsWith('127.')) return true;

  // AWS/Cloud Instance Metadata (169.254.169.254) e Link-Local (169.254.0.0/16)
  if (ip.startsWith('169.254.')) return true;

  // Redes Privadas RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;

  const parts = ip.split('.').map(Number);
  if (parts.length === 4) {
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // Carrier-grade NAT
  }

  // IPv6 Loopback e Privados (::1, fe80::, fc00::, fd00::, ::ffff:*, 64:ff9b::*)
  if (
    ip === '::1' ||
    ip === '::' ||
    ip.startsWith('fe80:') ||
    ip.startsWith('fc') ||
    ip.startsWith('fd') ||
    ip.startsWith('::ffff:') ||
    ip.startsWith('64:ff9b::')
  ) {
    return true;
  }

  return false;
}

/**
 * Valida rigorosamente se uma URL é pública, segura e não aponta para serviços internos (Anti-SSRF)
 * @param {string} urlString 
 * @returns {boolean}
 */
function isSafePublicUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;

  try {
    const parsed = new URL(urlString.trim());

    // 1. Apenas protocolos HTTP e HTTPS são permitidos
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // 2. Bloqueia localhost e nomes de host locais/cloud metadata
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname === '0.0.0.0' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === 'metadata.google.internal' ||
      hostname === 'instance-data' ||
      hostname === '169.254.169.254'
    ) {
      return false;
    }

    // 3. Bloqueia notações numéricas inteiras, hexadecimais ou octais (ex: 2130706433 ou 0x7f000001)
    if (/^(0x[0-9a-f]+|[0-9]+)$/i.test(hostname)) {
      return false;
    }

    // 4. Se o hostname for um endereço IP direto (IPv4 ou IPv6 com ou sem colchetes), valida se não é privado
    const rawHost = hostname.replace(/^\[|\]$/g, '');
    if (net.isIP(rawHost)) {
      if (isPrivateOrLocalIP(rawHost)) return false;
    }

    // 5. Bloqueia credenciais embutidas na URL (ex: http://user:pass@host)
    if (parsed.username || parsed.password) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Remove caracteres invisíveis (zero-width) e normaliza texto Unicode contra evasão de filtros
 * @param {string} str 
 * @returns {string}
 */
function normalizeMessageContent(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[\u200B-\u200D\uFEFF\u00AD\u2060\u180E\u2000-\u200A]/g, '')
    .normalize('NFKD');
}

/**
 * Cria um middleware de Rate Limiting em memória leve e eficiente
 * @param {object} options 
 * @param {number} options.windowMs Janela de tempo em milissegundos
 * @param {number} options.max Quantidade máxima de requisições por janela
 * @param {string} options.message Mensagem de erro
 */
function createRateLimiter({ windowMs = 60000, max = 5, message = 'Muitas solicitações. Aguarde antes de tentar novamente.' } = {}) {
  const requests = new Map();

  // Limpeza automática da memória a cada 2 minutos
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of requests.entries()) {
      if (now > record.resetTime) {
        requests.delete(key);
      }
    }
  }, 120000);

  return (req, res, next) => {
    const key = (req.user ? req.user.id : req.ip) + ':' + req.baseUrl + req.path;
    const now = Date.now();

    const record = requests.get(key);
    if (!record || now > record.resetTime) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    record.count++;
    if (record.count > max) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({ error: message, retryAfterSeconds });
    }

    next();
  };
}

/**
 * Gera um token criptográfico de alta entropia
 * @param {number} bytes 
 * @returns {string}
 */
function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = {
  escapeHTML,
  isPrivateOrLocalIP,
  isSafePublicUrl,
  normalizeMessageContent,
  createRateLimiter,
  generateSecureToken
};
