/**
 * Innerflect — Client-side End-to-End Encryption
 *
 * Threat model:
 *   - Server compromise: server stores only AES-GCM encrypted blobs. Without
 *     the user's derived key (never sent to server), ciphertext is useless.
 *   - Network sniffing: all transport is HTTPS. Plaintext never touches the wire.
 *   - Device compromise: key stored in localStorage. Same risk as the JWT token
 *     already stored there. Acceptable for this threat model.
 *
 * Key derivation:
 *   PBKDF2(password, "innerflect-v1:" + email, 300k iterations, SHA-256) → AES-256-GCM key
 *   Same password+email = same key on any device. Cross-device history access works
 *   as long as the user uses the same password.
 *
 * Encryption format: base64(iv) + ":" + base64(ciphertext)  — 12-byte random IV per message.
 */

const PBKDF2_ITERATIONS = 300_000
const KEY_ALGO = { name: 'AES-GCM', length: 256 }
const EK_STORAGE = 'innerflect_ek' // base64-exported CryptoKey in localStorage

// ── Key derivation ────────────────────────────────────────────────────────────

/**
 * Derive a deterministic AES-256-GCM key from password + email.
 * 300k PBKDF2 iterations ≈ ~200ms on modern hardware — only runs on login/register.
 */
export async function deriveEncryptionKey(password, email) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(`innerflect-v1:${email.toLowerCase().trim()}`),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_ALGO,
    true,
    ['encrypt', 'decrypt']
  )
}

// ── Key persistence ───────────────────────────────────────────────────────────

export async function persistKey(cryptoKey) {
  try {
    const raw = await crypto.subtle.exportKey('raw', cryptoKey)
    const b64 = btoa(String.fromCharCode(...new Uint8Array(raw)))
    localStorage.setItem(EK_STORAGE, b64)
  } catch { /* quota or private mode — key lives in memory only */ }
}

export async function loadPersistedKey() {
  try {
    const b64 = localStorage.getItem(EK_STORAGE)
    if (!b64) return null
    const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    return await crypto.subtle.importKey('raw', raw, KEY_ALGO, false, ['encrypt', 'decrypt'])
  } catch {
    return null
  }
}

export function clearPersistedKey() {
  localStorage.removeItem(EK_STORAGE)
}

// ── Encrypt / Decrypt ─────────────────────────────────────────────────────────

/**
 * Encrypt any value (string or JSON-serialisable) with AES-256-GCM.
 * Returns: base64(iv) + ":" + base64(ciphertext)
 */
export async function encryptData(cryptoKey, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plain = typeof data === 'string' ? data : JSON.stringify(data)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    new TextEncoder().encode(plain)
  )
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  return `${b64(iv)}:${b64(ciphertext)}`
}

/**
 * Decrypt a string produced by encryptData().
 * Returns the original string, or null on failure (wrong key / corrupted data).
 */
export async function decryptData(cryptoKey, packed) {
  try {
    const colonIdx = packed.indexOf(':')
    if (colonIdx === -1) return null
    const iv = Uint8Array.from(atob(packed.slice(0, colonIdx)), c => c.charCodeAt(0))
    const ct = Uint8Array.from(atob(packed.slice(colonIdx + 1)), c => c.charCodeAt(0))
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ct)
    return new TextDecoder().decode(plain)
  } catch {
    return null
  }
}

/**
 * Encrypt an array of chat messages before sending to the API.
 * Returns: { encrypted: true, payload: "iv:ct" }
 */
export async function encryptMessages(cryptoKey, messages) {
  if (!cryptoKey) return { encrypted: false, payload: messages }
  const payload = await encryptData(cryptoKey, messages)
  return { encrypted: true, payload }
}

/**
 * Decrypt messages returned from the API.
 * Handles both encrypted (encrypted: true) and legacy plaintext (encrypted: false).
 */
export async function decryptMessages(cryptoKey, stored) {
  if (!stored) return []
  // Legacy plaintext — graceful degradation
  if (!stored.encrypted) {
    return Array.isArray(stored.payload) ? stored.payload
         : Array.isArray(stored) ? stored
         : []
  }
  if (!cryptoKey) return []
  const plain = await decryptData(cryptoKey, stored.payload)
  if (!plain) return []
  try { return JSON.parse(plain) } catch { return [] }
}

/** True if the Web Crypto API is available (all modern browsers support this). */
export const CRYPTO_AVAILABLE = !!(
  typeof crypto !== 'undefined' &&
  crypto.subtle &&
  typeof crypto.subtle.importKey === 'function'
)
