function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function bufferToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function base64ToBuffer(base64) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer
}

export function generateSalt() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)))
}

export async function hashPin(pin, salt) {
  const enc = new TextEncoder().encode(`${salt}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', enc)
  return bytesToHex(new Uint8Array(digest))
}

export async function verifyPin(pin, salt, hash) {
  return (await hashPin(pin, salt)) === hash
}

export function isBiometricSupported() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential
}

export async function isBiometricAvailable() {
  if (!isBiometricSupported()) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

// Biometric unlock is entirely local: there's no server to attest to, so the
// challenge is just a random nonce and success means the platform authenticator
// (fingerprint/face) verified the user — the private key never leaves secure
// hardware, so this can't be spoofed by editing localStorage.
export async function registerBiometric(name = 'Haziq') {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "Haziq's Wealth" },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name,
        displayName: name
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 }
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60000,
      attestation: 'none'
    }
  })
  if (!cred) throw new Error('Biometric registration was cancelled.')
  return bufferToBase64(cred.rawId)
}

export async function verifyBiometric(credentialId) {
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ id: base64ToBuffer(credentialId), type: 'public-key' }],
      userVerification: 'required',
      timeout: 60000
    }
  })
  return !!assertion
}
