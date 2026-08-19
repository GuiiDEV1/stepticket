/**
 * Gerenciador de FastFlags do Roblox e Integração com Offsets (Luqqzstrap / Bloxstrap)
 */

let fflagCache = {
  flagsSet: new Set(),
  flagsMap: {}, // flagName -> value/type
  robloxVersion: 'Desconhecida',
  lastFetched: 0
};

let offsetsCache = {
  data: null,
  lastFetched: 0
};

const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

// Whitelist de flags populares e seguras usadas em Bootstrappers (Luqqzstrap/Bloxstrap)
const CURATED_KNOWN_FLAGS = {
  // FPS Unlock & Desempenho
  "DFIntTaskSchedulerTargetFps": { type: "int", desc: "Define o limite de FPS do jogo (ex: 240, 9999)" },
  "FFlagTaskSchedulerTargetFps": { type: "int", desc: "Limite de FPS legado" },
  "FFlagFastGPULightCulling3": { type: "bool", desc: "Otimização de GPU para iluminação" },
  "DFIntCSGLevelOfDetailSwitchingDistance": { type: "int", desc: "Distância de renderização de modelos CSG" },
  "DFIntCSGLevelOfDetailSwitchingDistanceLOD1": { type: "int", desc: "LOD1 para CSG" },
  "DFIntCSGLevelOfDetailSwitchingDistanceLOD2": { type: "int", desc: "LOD2 para CSG" },
  "FIntRenderShadowIntensity": { type: "int", desc: "Intensidade das sombras (0 para desativar)" },
  "FFlagDisablePostFx": { type: "bool", desc: "Desativa pós-processamento para mais FPS" },
  "FFlagDebugGraphicsDisableDirect3D11": { type: "bool", desc: "Renderizador Gráfico" },
  "FFlagDebugGraphicsPreferD3D11": { type: "bool", desc: "Forçar DirectX 11" },
  "FFlagDebugGraphicsPreferVulkan": { type: "bool", desc: "Forçar Vulkan" },
  "FFlagDebugGraphicsPreferOpenGL": { type: "bool", desc: "Forçar OpenGL" },
  "FFlagDebugGraphicsPreferD3D11FL10": { type: "bool", desc: "DirectX 11 Feature Level 10" },
  
  // Gráficos e Texturas
  "DFFlagTextureQualityOverrideEnabled": { type: "bool", desc: "Sobrescrever qualidade de textura" },
  "DFIntTextureQualityOverride": { type: "int", desc: "Nível de qualidade de textura (0 a 3)" },
  "FFlagFixGraphicsQuality": { type: "bool", desc: "Correção de qualidade gráfica" },
  "FIntFRMMinGrassDistance": { type: "int", desc: "Distância mínima da grama" },
  "FIntFRMMaxGrassDistance": { type: "int", desc: "Distância máxima da grama" },
  "FFlagDebugDisableOptimizedBytecode": { type: "bool", desc: "Otimizações de Bytecode" },
  
  // Interface e Menus
  "FFlagEnableInGameMenuControls": { type: "bool", desc: "Menu de controles moderno no jogo" },
  "FFlagEnableInGameMenuModernChrome": { type: "bool", desc: "Menu superior moderno (Chrome UI)" },
  "FFlagChromeBetaFeature": { type: "bool", desc: "Recursos beta do menu Chrome" },
  "FFlagDisableNewIGMinDUA": { type: "bool", desc: "Menu clássico do Roblox" }
};

// Flags perigosas conhecidas que causam crash ou desconexão (Error 268 / Hyperion)
const DANGEROUS_FLAGS = [
  "FFlagDebugDisableBytecodeVerification",
  "FFlagDebugDisableSecurityChecks",
  "FFlagDebugForceCrash",
  "DFIntMaxMessageBufferLengthExceeded",
  "FFlagDebugDisableLuauSecurity"
];

/**
 * Busca a lista ao vivo de FastFlags do Roblox diretamente dos servidores de produção
 */
async function fetchRobloxLiveFFlags(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && fflagCache.flagsSet.size > 0 && (now - fflagCache.lastFetched < CACHE_TTL)) {
    return fflagCache;
  }

  try {
    const res = await fetch('https://clientsettingscdn.roblox.com/v2/settings/application/PCDesktopClient', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Luqqzstrap/1.0' },
      signal: AbortSignal.timeout(8000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.applicationSettings) {
        const flagsMap = data.applicationSettings;
        const flagsSet = new Set(Object.keys(flagsMap));
        
        // Adiciona também as flags conhecidas curadas
        Object.keys(CURATED_KNOWN_FLAGS).forEach(f => flagsSet.add(f));

        fflagCache = {
          flagsSet,
          flagsMap,
          robloxVersion: 'Live (PCDesktopClient)',
          lastFetched: now
        };
        console.log(`[FFLAG] Carregadas ${flagsSet.size} FastFlags ativas do Roblox.`);
      }
    }
  } catch (err) {
    console.warn('[FFLAG] Aviso ao atualizar flags ao vivo do Roblox:', err.message);
    if (fflagCache.flagsSet.size === 0) {
      // Fallback para curated flags
      Object.keys(CURATED_KNOWN_FLAGS).forEach(f => fflagCache.flagsSet.add(f));
    }
  }

  return fflagCache;
}

/**
 * Busca os offsets ao vivo de offsets.imtheo.lol
 */
async function fetchImtheoOffsets(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && offsetsCache.data && (now - offsetsCache.lastFetched < CACHE_TTL)) {
    return offsetsCache.data;
  }

  try {
    const res = await fetch('https://offsets.imtheo.lol/offsets.json', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Luqqzstrap/1.0' },
      signal: AbortSignal.timeout(8000)
    });

    if (res.ok) {
      const data = await res.json();
      offsetsCache = {
        data,
        lastFetched: now
      };
      return data;
    }
  } catch (err) {
    console.warn('[OFFSETS] Erro ao buscar offsets.imtheo.lol:', err.message);
  }

  return offsetsCache.data;
}

/**
 * Valida o tipo esperado de uma flag com base no prefixo Roblox
 */
function inferExpectedType(flagName) {
  if (flagName.startsWith('FFlag') || flagName.startsWith('DFFlag') || flagName.startsWith('SFFlag')) {
    return 'bool';
  }
  if (flagName.startsWith('FInt') || flagName.startsWith('DFInt') || flagName.startsWith('SFInt') || flagName.startsWith('FLog') || flagName.startsWith('DFLog')) {
    return 'int';
  }
  if (flagName.startsWith('FString') || flagName.startsWith('DFString') || flagName.startsWith('SFString')) {
    return 'string';
  }
  return 'unknown';
}

/**
 * Limpa, valida e separa um objeto de FastFlags em válidas e inválidas
 * @param {Object} inputFlags Objeto parsed do ClientAppSettings.json
 * @param {Object} options
 * @param {boolean} [options.strict=false] Se true, considera inválidas flags não ativas na lista ao vivo
 */
async function cleanAndValidateFFlags(inputFlags, { strict = false } = {}) {
  const live = await fetchRobloxLiveFFlags();
  
  const flags_validas = {};
  const flags_invalidas = {};

  const stats = {
    totalInput: 0,
    validKept: 0,
    invalidCount: 0,
    corrected: [],
    removedDeprecated: [],
    removedDangerous: [],
    removedInvalid: []
  };

  if (!inputFlags || typeof inputFlags !== 'object') {
    return { error: 'O conteúdo fornecido não é um objeto JSON válido.' };
  }

  const entries = Object.entries(inputFlags);
  stats.totalInput = entries.length;

  for (let [rawKey, rawVal] of entries) {
    const key = rawKey.trim();

    // 1. Checa se é flag perigosa
    if (DANGEROUS_FLAGS.includes(key)) {
      flags_invalidas[key] = rawVal;
      stats.removedDangerous.push({ key, reason: 'Flag perigosa conhecida por causar crash ou ban' });
      continue;
    }

    // 2. Checa o tipo esperado pelo prefixo
    const expectedType = inferExpectedType(key);
    if (expectedType === 'unknown') {
      flags_invalidas[key] = rawVal;
      stats.removedInvalid.push({ key, reason: 'Prefixo de FastFlag não reconhecido (use FFlag, DFFlag, FInt, DFInt, FString)' });
      continue;
    }

    // 3. Checa existência no catálogo do Roblox Live ou curated
    const existsLive = live.flagsSet.has(key) || Boolean(CURATED_KNOWN_FLAGS[key]);
    if (!existsLive) {
      flags_invalidas[key] = rawVal;
      stats.removedDeprecated.push({ key, reason: 'Flag não encontrada ou descontinuada no catálogo oficial do Roblox' });
      continue;
    }

    // 4. Normalização e Correção de Tipos
    let finalVal = rawVal;
    let wasCorrected = false;
    let changeDesc = '';

    if (expectedType === 'bool') {
      if (typeof rawVal === 'string') {
        const lower = rawVal.toLowerCase().trim();
        if (lower === 'true' || lower === '1') {
          finalVal = true;
          wasCorrected = true;
          changeDesc = `Convertido de string "${rawVal}" para boolean true`;
        } else if (lower === 'false' || lower === '0') {
          finalVal = false;
          wasCorrected = true;
          changeDesc = `Convertido de string "${rawVal}" para boolean false`;
        } else {
          flags_invalidas[key] = rawVal;
          stats.removedInvalid.push({ key, reason: `Valor booleano inválido: "${rawVal}"` });
          continue;
        }
      } else if (typeof rawVal === 'number') {
        finalVal = rawVal !== 0;
        wasCorrected = true;
        changeDesc = `Convertido de número ${rawVal} para boolean ${finalVal}`;
      } else if (typeof rawVal !== 'boolean') {
        flags_invalidas[key] = rawVal;
        stats.removedInvalid.push({ key, reason: `Tipo incorreto para flag booleana (${typeof rawVal})` });
        continue;
      }
    } else if (expectedType === 'int') {
      if (typeof rawVal === 'string') {
        const parsed = parseInt(rawVal.trim(), 10);
        if (!isNaN(parsed)) {
          finalVal = parsed;
          wasCorrected = true;
          changeDesc = `Convertido de string "${rawVal}" para número inteiro ${parsed}`;
        } else {
          flags_invalidas[key] = rawVal;
          stats.removedInvalid.push({ key, reason: `Valor inteiro não-numérico: "${rawVal}"` });
          continue;
        }
      } else if (typeof rawVal === 'boolean') {
        finalVal = rawVal ? 1 : 0;
        wasCorrected = true;
        changeDesc = `Convertido de boolean para inteiro ${finalVal}`;
      } else if (typeof rawVal !== 'number' || isNaN(rawVal)) {
        flags_invalidas[key] = rawVal;
        stats.removedInvalid.push({ key, reason: `Tipo incorreto para flag numérica (${typeof rawVal})` });
        continue;
      }
    } else if (expectedType === 'string') {
      if (typeof rawVal !== 'string') {
        finalVal = String(rawVal);
        wasCorrected = true;
        changeDesc = `Convertido para string "${finalVal}"`;
      }
    }

    // Flag 100% válida e funcionando
    flags_validas[key] = finalVal;
    stats.validKept++;

    if (wasCorrected) {
      stats.corrected.push({ key, change: changeDesc });
    }
  }

  stats.invalidCount = Object.keys(flags_invalidas).length;

  return {
    flags_validas,
    flags_invalidas,
    cleanedFlags: flags_validas,
    stats,
    robloxLiveTotal: live.flagsSet.size,
    lastUpdated: live.lastFetched
  };
}

module.exports = {
  fetchRobloxLiveFFlags,
  fetchImtheoOffsets,
  cleanAndValidateFFlags,
  CURATED_KNOWN_FLAGS,
  DANGEROUS_FLAGS
};
