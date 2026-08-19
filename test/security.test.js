const assert = require('assert');
const path = require('path');
const { escapeHTML, isSafePublicUrl, generateSecureToken } = require('../src/utils/security');
const { signSession, verifySession, createSession } = require('../src/web/auth');
const DatabaseManager = require('../src/database/manager');
const { getTranscriptFilePath } = require('../src/utils/transcript');

console.log('🧪 Iniciando Bateria de Testes Automatizados de Segurança...\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Erro: ${err.message}`);
  }
}

// -------------------------------------------------------------
// 1. TESTES ANTI-SSRF
// -------------------------------------------------------------
console.log('🔒 1. Testes de Proteção Anti-SSRF:');

runTest('Bloquear Loopback IPv4 (127.0.0.1)', () => {
  assert.strictEqual(isSafePublicUrl('http://127.0.0.1/admin'), false);
  assert.strictEqual(isSafePublicUrl('http://127.0.0.2:8080'), false);
});

runTest('Bloquear Localhost e domínios locais', () => {
  assert.strictEqual(isSafePublicUrl('http://localhost:3000'), false);
  assert.strictEqual(isSafePublicUrl('http://test.localhost/'), false);
  assert.strictEqual(isSafePublicUrl('http://service.local/'), false);
  assert.strictEqual(isSafePublicUrl('http://backend.internal/'), false);
});

runTest('Bloquear AWS / Cloud Metadata (169.254.169.254)', () => {
  assert.strictEqual(isSafePublicUrl('http://169.254.169.254/latest/meta-data/'), false);
  assert.strictEqual(isSafePublicUrl('http://metadata.google.internal/computeMetadata/v1/'), false);
});

runTest('Bloquear Redes Privadas RFC 1918 (10.x, 192.168.x, 172.16-31.x)', () => {
  assert.strictEqual(isSafePublicUrl('http://10.0.0.1/'), false);
  assert.strictEqual(isSafePublicUrl('http://192.168.1.1/router'), false);
  assert.strictEqual(isSafePublicUrl('http://172.20.0.1:8080/'), false);
});

runTest('Bloquear Protocolos Perigosos (file, ftp, gopher)', () => {
  assert.strictEqual(isSafePublicUrl('file:///etc/passwd'), false);
  assert.strictEqual(isSafePublicUrl('ftp://ftp.example.com/'), false);
  assert.strictEqual(isSafePublicUrl('gopher://127.0.0.1/'), false);
});

runTest('Permitir URLs Públicas Válidas e Seguras', () => {
  assert.strictEqual(isSafePublicUrl('https://cdn.discordapp.com/attachments/123/abc.png'), true);
  assert.strictEqual(isSafePublicUrl('https://images.unsplash.com/photo-123456'), true);
  assert.strictEqual(isSafePublicUrl('https://i.imgur.com/image.png'), true);
});

// -------------------------------------------------------------
// 2. TESTES ANTI-XSS
// -------------------------------------------------------------
console.log('\n🛡️ 2. Testes de Sanitização Anti-XSS:');

runTest('Escapar tags de script', () => {
  const payload = '<script>alert("XSS")</script>';
  assert.strictEqual(escapeHTML(payload), '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
});

runTest('Escapar atributos de tags HTML', () => {
  const payload = '"><img src=x onerror=alert(1)>';
  assert.strictEqual(escapeHTML(payload), '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
});

runTest('Lidar com strings nulas ou indefinidas com segurança', () => {
  assert.strictEqual(escapeHTML(null), '');
  assert.strictEqual(escapeHTML(undefined), '');
});

// -------------------------------------------------------------
// 3. TESTES DE SESSÃO & ASSINATURA HMAC
// -------------------------------------------------------------
console.log('\n🔑 3. Testes de Autenticação e HMAC:');

runTest('Assinatura e Verificação de Sessão Legítima', () => {
  const testUser = { id: 'test_sec_user_123', username: 'SecUser', avatar: null };
  const testGuilds = [{ id: 'guild_sec_1', name: 'Sec Guild', permissions: '8', icon: null }];
  const { sessionId, signedCookie } = createSession(testUser, testGuilds);

  const session = verifySession(signedCookie);
  assert.notStrictEqual(session, null);
  assert.strictEqual(session.user.id, 'test_sec_user_123');

  // Limpeza
  DatabaseManager.deleteSession(sessionId);
});

runTest('Rejeitar Sessão Adulterada (Cookie Tampering)', () => {
  const forgedCookie = 'fake_session_id.abcdef1234567890abcdef1234567890';
  assert.strictEqual(verifySession(forgedCookie), null);
});

// -------------------------------------------------------------
// 4. TESTES DE IDOR / ISOLAMENTO MULTI-TENANT
// -------------------------------------------------------------
console.log('\n🏢 4. Testes de Isolamento Multi-Tenant (Anti-IDOR):');

runTest('Impedir que Servidor B altere ou delete Aviso do Servidor A', () => {
  const guildA = 'guild_alpha_111';
  const guildB = 'guild_bravo_222';

  // Cria aviso para Guild A
  const annA = DatabaseManager.createAnnouncement(guildA, {
    channel_id: 'chan_a',
    title: 'Aviso da Guild A',
    message: 'Mensagem confidencial A',
    interval_minutes: 60,
    enabled: true
  });

  // Tenta atualizar a partir de Guild B -> Deve retornar null
  const updatedByB = DatabaseManager.updateAnnouncement(guildB, annA.id, { title: 'Hackeado por B' });
  assert.strictEqual(updatedByB, null);

  // Tenta deletar a partir de Guild B -> Deve retornar false
  const deletedByB = DatabaseManager.deleteAnnouncement(guildB, annA.id);
  assert.strictEqual(deletedByB, false);

  // Deleta legitimamente pela Guild A -> Deve retornar true
  const deletedByA = DatabaseManager.deleteAnnouncement(guildA, annA.id);
  assert.strictEqual(deletedByA, true);
});

// -------------------------------------------------------------
// 5. TESTES DE TRANSCRIÇÃO & PATH TRAVERSAL
// -------------------------------------------------------------
console.log('\n📄 5. Testes de Segurança de Transcrições:');

runTest('Bloquear Path Traversal em IDs de Transcrição', () => {
  const result = getTranscriptFilePath('../../etc/passwd');
  assert.strictEqual(result, null);
});

runTest('Bloquear IDs com caracteres maliciosos', () => {
  assert.strictEqual(getTranscriptFilePath('<script>'), null);
  assert.strictEqual(getTranscriptFilePath('../../../data/database.json'), null);
});

// -------------------------------------------------------------
// 6. TESTES DE ECONOMIA ATÔMICA
// -------------------------------------------------------------
console.log('\n💰 6. Testes de Consistência da Economia:');

runTest('Bloquear Débito com Saldo Insuficiente', () => {
  const guildId = 'test_eco_guild';
  const userId = 'test_poor_user';

  // Garante que o saldo seja zerado
  const eco = DatabaseManager.getEconomy(guildId, userId);
  if (eco.wallet > 0) DatabaseManager.removeWallet(guildId, userId, eco.wallet);

  const deducted = DatabaseManager.removeWallet(guildId, userId, 500);
  assert.strictEqual(deducted, false);
});

runTest('Operação de Débito e Estorno Atômico', () => {
  const guildId = 'test_eco_guild';
  const userId = 'test_rich_user';

  DatabaseManager.addWallet(guildId, userId, 1000);
  const initialWallet = DatabaseManager.getEconomy(guildId, userId).wallet;

  const deducted = DatabaseManager.removeWallet(guildId, userId, 400);
  assert.strictEqual(deducted, true);
  assert.strictEqual(DatabaseManager.getEconomy(guildId, userId).wallet, initialWallet - 400);

  // Estorno
  DatabaseManager.addWallet(guildId, userId, 400);
  assert.strictEqual(DatabaseManager.getEconomy(guildId, userId).wallet, initialWallet);
});

// -------------------------------------------------------------
// RESULTADOS FINAIS
// -------------------------------------------------------------
console.log(`\n======================================================`);
console.log(`📊 RESULTADO DOS TESTES: ${passedTests}/${totalTests} Testes Passaram.`);
console.log(`======================================================\n`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
