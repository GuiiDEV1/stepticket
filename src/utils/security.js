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

  // IPv6 Loopback e Privados (::1, fe80::, fc00::, fd00::)
  if (ip === '::1' || ip === '::' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) {
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

    // 2. Bloqueia localhost e nomes de host locais
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname === '0.0.0.0' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === 'metadata.google.internal' ||
      hostname === 'instance-data'
    ) {
      return false;
    }

    // 3. Se o hostname for um endereço IP direto, valida se não é privado
    if (net.isIP(hostname)) {
      if (isPrivateOrLocalIP(hostname)) return false;
    }

    // 4. Bloqueia credenciais embutidas na URL (ex: http://user:pass@host)
    if (parsed.username || parsed.password) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
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
  generateSecureToken
};
