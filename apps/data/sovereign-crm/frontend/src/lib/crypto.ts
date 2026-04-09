'use client'

// Client-side AES-256-GCM encryption for photo/audio captures
// Key derived from user's auth token via HKDF

export async function deriveKey(token: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(token), 'HKDF', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: encoder.encode('sovereign-crm-e2e'), info: encoder.encode('capture-encryption') },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptData(data: string, token: string): Promise<string> {
  const key = await deriveKey(token)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoder = new TextEncoder()
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  )
  // Format: e2e:{base64_iv}:{base64_ciphertext}
  const ivB64 = btoa(String.fromCharCode(...iv))
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  return `e2e:${ivB64}:${ctB64}`
}

export async function decryptData(encrypted: string, token: string): Promise<string> {
  if (!encrypted.startsWith('e2e:')) return encrypted
  const parts = encrypted.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted format')
  const key = await deriveKey(token)
  const iv = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0))
  const ct = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0))
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(decrypted)
}
