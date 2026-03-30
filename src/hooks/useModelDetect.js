/**
 * Auto-detects the best WebLLM model for the current device.
 *
 * Key insight: some models require the 'shader-f16' WebGPU feature
 * (16-bit float shader ops). NOT all GPUs support this — older/integrated
 * GPUs may not. We detect this and pick only compatible models.
 *
 * Detection uses:
 *  - WebGPU adapter features  (shader-f16 support)
 *  - WebGPU adapter limits    (maxBufferSize → GPU memory tier)
 *  - navigator.deviceMemory   (RAM hint, Chrome/Edge only)
 *  - Previously cached models (prefer what's already downloaded)
 */

// requiresF16: true  → model needs 'shader-f16' WebGPU feature
// requiresF16: false → works on ANY WebGPU device
export const MODELS = [
  {
    id: 'SmolLM2-135M-Instruct-q0f16-MLC',
    label: 'SmolLM2 135M',
    size: '~270 MB',
    sizeMB: 270,
    desc: 'Tiny — instant on modern GPUs. Great for a quick chat.',
    badge: '⚡ Quickest',
    minRam: 0,
    gpuTier: 0,
    requiresF16: true,
  },
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    label: 'SmolLM2 360M',
    size: '~360 MB',
    sizeMB: 360,
    desc: 'Very fast on modern GPUs. Good for quick chats.',
    badge: '⚡ Instant',
    minRam: 1,
    gpuTier: 0,
    requiresF16: true,
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 1B',
    size: '~700 MB',
    sizeMB: 700,
    desc: 'Fast and capable. Works on any WebGPU device.',
    badge: '🚀 Fast',
    minRam: 2,
    gpuTier: 1,
    requiresF16: false,
  },
  {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    label: 'Gemma 2 2B',
    size: '~1.3 GB',
    sizeMB: 1300,
    desc: "Google's Gemma — strong empathy and reasoning for its size.",
    badge: '💎 Balanced',
    minRam: 4,
    gpuTier: 2,
    requiresF16: true,
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    label: 'Phi-3.5-mini',
    size: '~2.3 GB',
    sizeMB: 2300,
    desc: 'Best therapy quality. Works on any WebGPU device with 4GB+ GPU.',
    badge: '⭐ Best',
    minRam: 6,
    gpuTier: 3,
    requiresF16: false,
  },
]

export const DEFAULT_MODEL_ID = MODELS[4].id // Phi-3.5-mini
export const STORAGE_KEY = 'innerflect_model_id'

// Migration: rename old viddeoxx_ keys to innerflect_ (one-time, preserves user preference)
;(function migrateStorageKeys() {
  const OLD_MODEL_KEY = 'viddeoxx_model_id'
  const OLD_VISIT_KEY = 'viddeoxx_first_visit_done'
  const OLD_FP_KEY    = 'vx_fp'
  const OLD_USAGE_KEY = 'Innerflect_usage'
  if (localStorage.getItem(OLD_MODEL_KEY) && !localStorage.getItem('innerflect_model_id')) {
    localStorage.setItem('innerflect_model_id', localStorage.getItem(OLD_MODEL_KEY))
    localStorage.removeItem(OLD_MODEL_KEY)
  }
  if (localStorage.getItem(OLD_VISIT_KEY) && !localStorage.getItem('innerflect_first_visit_done')) {
    localStorage.setItem('innerflect_first_visit_done', localStorage.getItem(OLD_VISIT_KEY))
    localStorage.removeItem(OLD_VISIT_KEY)
  }
  if (localStorage.getItem(OLD_FP_KEY) && !localStorage.getItem('innerflect_fp')) {
    localStorage.setItem('innerflect_fp', localStorage.getItem(OLD_FP_KEY))
    localStorage.removeItem(OLD_FP_KEY)
  }
  if (localStorage.getItem(OLD_USAGE_KEY) && !localStorage.getItem('innerflect_usage')) {
    localStorage.setItem('innerflect_usage', localStorage.getItem(OLD_USAGE_KEY))
    localStorage.removeItem(OLD_USAGE_KEY)
  }
})()

// Quick (progressive-load) models:
//   F16 devices  → SmolLM2-135M q0f16  (360MB VRAM, loads in seconds)
//   Compat devices → SmolLM2-360M q4f32 (580MB VRAM, no shader-f16 needed)
export const QUICK_MODEL_F16   = 'SmolLM2-135M-Instruct-q0f16-MLC'
export const QUICK_MODEL_COMPAT = 'SmolLM2-360M-Instruct-q4f32_1-MLC'

/** Returns the right quick model ID for this device */
export function getQuickModelId(supportsF16) {
  return supportsF16 ? QUICK_MODEL_F16 : QUICK_MODEL_COMPAT
}

/** Filter MODELS to only those compatible with this device */
export function getCompatibleModels(supportsF16) {
  return MODELS.filter(m => !m.requiresF16 || supportsF16)
}

/**
 * Detects WebGPU capabilities: GPU memory tier + shader-f16 support.
 * Returns { tier: 0-3, supportsF16: boolean }
 */
async function detectGpuFeatures() {
  if (!navigator.gpu) return { tier: 0, supportsF16: false }
  try {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) return { tier: 0, supportsF16: false }
    const supportsF16 = adapter.features.has('shader-f16')
    const maxBuf = adapter.limits.maxBufferSize || 0
    const GB = 1024 * 1024 * 1024
    // Tiers based on real VRAM requirements:
    //   tier 3 → Phi-3.5-mini (~3.7GB VRAM): need 4GB+ buffer
    //   tier 2 → Gemma 2B    (~1.9GB VRAM):  need 2GB+ buffer
    //   tier 1 → Llama 1B    (~880MB VRAM):  need 1GB+ buffer
    //   tier 0 → SmolLM2     (~360-580MB):    any WebGPU device
    let tier = 0
    if (maxBuf >= 4 * GB) tier = 3
    else if (maxBuf >= 2 * GB) tier = 2
    else if (maxBuf >= 1 * GB) tier = 1
    return { tier, supportsF16 }
  } catch {
    return { tier: 0, supportsF16: false }
  }
}

/**
 * Check which models are already cached in the browser (all variants).
 */
async function getCachedModels(webllm) {
  const cached = new Set()
  if (!webllm?.hasModelInCache) return cached
  // Check main models + compat quick model
  const allIds = [...MODELS.map(m => m.id), QUICK_MODEL_COMPAT]
  await Promise.all(
    allIds.map(async (id) => {
      try { if (await webllm.hasModelInCache(id)) cached.add(id) } catch { /* ignore */ }
    })
  )
  return cached
}

/**
 * Pick the best model for this device.
 *
 * Priority:
 *  1. User's explicit saved choice (localStorage) — always respected
 *  2. Best already-cached model that fits device
 *  3. Best model device can run (filtered by f16 support + VRAM tier)
 *
 * Returns { modelId, reason, autoSelected, supportsF16 }
 */
export async function detectBestModel(webllm) {
  // 1. User's explicit saved choice
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && MODELS.find(m => m.id === saved)) {
    const { supportsF16 } = await detectGpuFeatures()
    return { modelId: saved, reason: 'Your saved preference', autoSelected: false, supportsF16 }
  }

  const [ram, gpuFeatures, cachedSet] = await Promise.all([
    Promise.resolve(navigator.deviceMemory || 4),
    detectGpuFeatures(),
    webllm ? getCachedModels(webllm) : Promise.resolve(new Set()),
  ])
  const { tier: gpuTier, supportsF16 } = gpuFeatures

  // Filter to only compatible models for this device
  const compatible = getCompatibleModels(supportsF16)

  // 2. Best cached model that fits device
  if (cachedSet.size > 0) {
    const bestCached = [...compatible]
      .reverse()
      .find(m => cachedSet.has(m.id) && ram >= m.minRam && gpuTier >= m.gpuTier)
    if (bestCached) {
      return {
        modelId: bestCached.id,
        reason: `Already on your device · ${bestCached.size}`,
        autoSelected: true,
        fromCache: true,
        supportsF16,
      }
    }
  }

  // 3. Best model this device can run
  const best = [...compatible]
    .reverse()
    .find(m => ram >= m.minRam && gpuTier >= m.gpuTier)
    || compatible[0]
    || MODELS[2] // Llama 1B — universal fallback (no f16 needed)

  const reasons = []
  if (navigator.deviceMemory) reasons.push(`~${ram}GB RAM`)
  reasons.push(gpuTier >= 2 ? 'capable GPU' : gpuTier === 1 ? 'integrated GPU' : 'limited GPU')
  if (!supportsF16) reasons.push('compat mode')

  return {
    modelId: best.id,
    reason: `Auto-selected (${reasons.join(', ')})`,
    autoSelected: true,
    fromCache: false,
    supportsF16,
  }
}

// Keys for session state
export const FIRST_VISIT_KEY = 'innerflect_first_visit_done'

/**
 * Returns true if we should do progressive loading.
 * Only on first-ever visit when the best model isn't already cached.
 */
export async function shouldProgressiveLoad(webllm, bestModelId, supportsF16) {
  const quickId = getQuickModelId(supportsF16)
  if (bestModelId === quickId) return false
  if (localStorage.getItem(STORAGE_KEY)) return false
  if (localStorage.getItem(FIRST_VISIT_KEY)) return false
  try {
    if (await webllm.hasModelInCache(bestModelId)) return false
  } catch {
    return true // default to progressive on cache check failure
  }
  return true
}

/** Call after user sends their first message — marks "not first visit" */
export function markFirstVisitDone() {
  localStorage.setItem(FIRST_VISIT_KEY, '1')
}
