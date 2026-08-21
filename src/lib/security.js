import { Capacitor } from '@capacitor/core'
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth'

// Inside the Capacitor Android app, content runs in an embedded WebView, not a
// real browser tab — WebView doesn't reliably support WebAuthn's platform
// authenticator, so biometric unlock there goes through a native plugin
// (real Android BiometricPrompt) instead. The GitHub Pages PWA keeps using
// WebAuthn, since that already works fine in a real mobile browser.
const isNative = () => Capacitor.isNativePlatform()

function nativeAuthOptions(name) {
  return {
    reason: 'Unlock your wealth data',
    androidTitle: "Haziq's Wealth",
    androidSubtitle: name ? `Welcome back, ${name}` : undefined,
    allowDeviceCredential: true
  }
}

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
  if (isNative()) return true
  return typeof window !== 'undefined' && !!window.PublicKeyCredential
}

export async function isBiometricAvailable() {
  if (isNative()) {
    try {
      const result = await BiometricAuth.checkBiometry()
      return !!result.isAvailable
    } catch {
      return false
    }
  }
  if (!isBiometricSupported()) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

// Biometric unlock is entirely local: there's no server to attest to. On the
// web this means a WebAuthn platform authenticator (fingerprint/face) whose
// private key never leaves secure hardware, so it can't be spoofed by editing
// localStorage. Native Android biometric auth has no equivalent stored
// credential — authenticate() just re-checks with the OS every time — so
// 'native' is stored as a sentinel in place of a WebAuthn credentialId, purely
// so security.credentialId keeps one shape regardless of platform.
export async function registerBiometric(name = 'Haziq') {
  if (isNative()) {
    try {
      await BiometricAuth.authenticate(nativeAuthOptions(name))
    } catch {
      throw new Error('Biometric registration was cancelled.')
    }
    return 'native'
  }

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
  if (isNative()) {
    await BiometricAuth.authenticate(nativeAuthOptions())
    return true
  }

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
