import { useEffect, useRef, useState } from 'react'
import { Lock, Fingerprint, Delete, X } from 'lucide-react'
import { generateSalt, hashPin, verifyPin, isBiometricAvailable, registerBiometric, verifyBiometric } from '../lib/security'

const PIN_LENGTH = 4

function Dots({ length, filled }) {
  return (
    <div className="flex items-center justify-center gap-3 my-6">
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={`w-3.5 h-3.5 rounded-full border transition-colors ${
            i < filled ? 'bg-emerald border-emerald' : 'border-muted'
          }`}
        />
      ))}
    </div>
  )
}

function Keypad({ onDigit, onBackspace }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back']
  return (
    <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto w-full">
      {keys.map((k, i) =>
        k === '' ? (
          <div key={i} />
        ) : k === 'back' ? (
          <button
            key={i}
            type="button"
            onClick={onBackspace}
            className="h-14 flex items-center justify-center text-ink active:bg-paper"
          >
            <Delete size={20} strokeWidth={1.75} />
          </button>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onDigit(k)}
            className="h-14 rounded-full border hairline flex items-center justify-center font-display text-xl active:bg-paper"
          >
            {k}
          </button>
        )
      )}
    </div>
  )
}

// mode: 'setup' registers a new PIN (and optionally biometrics); 'unlock' verifies
// the existing one. forceSetup lets Settings reuse this for "change PIN" even
// though a PIN already exists.
export default function LockScreen({ security, name, mode: modeProp, onSetupComplete, onUnlock, onCancel }) {
  const mode = modeProp ?? (security?.pinHash ? 'unlock' : 'setup')
  const [stage, setStage] = useState('enter') // setup: enter -> confirm -> biometric
  const [pin, setPin] = useState('')
  const [firstPin, setFirstPin] = useState('')
  const [pendingPin, setPendingPin] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const attemptedBiometric = useRef(false)

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable)
  }, [])

  useEffect(() => {
    if (mode === 'unlock' && security?.biometricEnabled && biometricAvailable && !attemptedBiometric.current) {
      attemptedBiometric.current = true
      tryBiometric()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricAvailable])

  async function tryBiometric() {
    try {
      const ok = await verifyBiometric(security.credentialId)
      if (ok) onUnlock()
    } catch {
      // cancelled or failed — user falls back to the PIN pad
    }
  }

  async function enableBiometric() {
    setBusy(true)
    try {
      const credentialId = await registerBiometric(name)
      onSetupComplete({ ...pendingPin, biometricEnabled: true, credentialId })
    } catch {
      setError('Could not set up biometric unlock. You can try again later in Settings.')
      onSetupComplete({ ...pendingPin, biometricEnabled: false, credentialId: null })
    } finally {
      setBusy(false)
    }
  }

  function skipBiometric() {
    onSetupComplete({ ...pendingPin, biometricEnabled: false, credentialId: null })
  }

  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return
    const t = setTimeout(() => submit(pin), 120)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  function handleDigit(d) {
    setError('')
    setPin((p) => (p.length < PIN_LENGTH ? p + d : p))
  }

  function handleBackspace() {
    setError('')
    setPin((p) => p.slice(0, -1))
  }

  async function submit(enteredPin) {
    if (mode === 'setup') {
      if (stage === 'enter') {
        setFirstPin(enteredPin)
        setPin('')
        setStage('confirm')
        return
      }
      if (enteredPin !== firstPin) {
        setError('PINs did not match. Try again.')
        setPin('')
        setFirstPin('')
        setStage('enter')
        return
      }
      const salt = generateSalt()
      const pinHash = await hashPin(enteredPin, salt)
      if (biometricAvailable) {
        setPendingPin({ pinHash, salt })
        setPin('')
        setStage('biometric')
      } else {
        onSetupComplete({ pinHash, salt, biometricEnabled: false, credentialId: null })
      }
      return
    }

    const ok = await verifyPin(enteredPin, security.salt, security.pinHash)
    if (ok) {
      onUnlock()
    } else {
      setError('Incorrect PIN.')
      setPin('')
    }
  }

  const title =
    mode === 'setup'
      ? stage === 'enter'
        ? 'Set a PIN to protect your data'
        : stage === 'confirm'
          ? 'Confirm your PIN'
          : 'One more thing'
      : `Welcome back${name ? `, ${name}` : ''}`

  return (
    <div
      className={`flex flex-col items-center justify-center px-6 bg-paper relative ${
        onCancel ? 'min-h-[70vh]' : 'min-h-screen'
      }`}
      style={onCancel ? undefined : { paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {onCancel && (
        <button type="button" onClick={onCancel} className="absolute top-0 right-0 p-2 text-muted">
          <X size={20} />
        </button>
      )}
      <Lock size={28} className="text-emerald mb-3" strokeWidth={1.75} />
      <h1 className="font-display text-lg text-center">{title}</h1>
      {mode === 'setup' && stage === 'enter' && (
        <p className="text-xs text-muted text-center mt-1 max-w-xs">
          This keeps your wealth data private if someone else picks up your phone.
        </p>
      )}

      {stage !== 'biometric' && (
        <>
          <Dots length={PIN_LENGTH} filled={pin.length} />
          {error && <p className="text-xs text-rust mb-2">{error}</p>}
          <Keypad onDigit={handleDigit} onBackspace={handleBackspace} />
        </>
      )}

      {stage === 'biometric' && (
        <div className="flex flex-col items-center gap-3 mt-4 w-full max-w-xs">
          <Fingerprint size={40} className="text-emerald" strokeWidth={1.5} />
          <p className="text-xs text-muted text-center">Also unlock with your fingerprint or face?</p>
          {error && <p className="text-xs text-rust text-center">{error}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={enableBiometric}
            className="w-full border hairline py-2.5 min-h-[44px] text-sm text-emerald hover:border-emerald disabled:opacity-50"
          >
            Enable biometric unlock
          </button>
          <button type="button" onClick={skipBiometric} className="text-xs text-muted py-2">
            Skip for now
          </button>
        </div>
      )}

      {mode === 'unlock' && stage !== 'biometric' && security?.biometricEnabled && biometricAvailable && (
        <button type="button" onClick={tryBiometric} className="mt-6 flex items-center gap-1.5 text-sm text-emerald">
          <Fingerprint size={18} strokeWidth={1.75} />
          Use biometric unlock
        </button>
      )}
    </div>
  )
}
