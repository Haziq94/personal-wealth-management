import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Download, X, Share } from 'lucide-react'

const DISMISS_KEY = 'wealth-install-dismissed'

// Already running as an installed app? Then there's nothing to add. Covers both
// an installed PWA (display-mode: standalone) and the native shell.
function isInstalled() {
  if (Capacitor.isNativePlatform()) return true
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iOS Safari's own flag
  )
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

// Nudges the browser build onto the home screen, which is the whole point on a
// phone: an installed PWA isn't a sideloaded app, so a banking app's
// "remove untrusted apps" scan has nothing to find.
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isInstalled() || dismissed) return

    // Chrome/Edge on Android hand us the real install event — capture it so a
    // button can trigger the native prompt on demand.
    function onBeforeInstall(e) {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // iOS never fires that event; there's only manual Add to Home Screen. Show
    // the guidance banner there anyway so the option is discoverable.
    if (isIOS()) setShow(true)

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [dismissed])

  function dismiss() {
    setShow(false)
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Fine — it just means the banner may reappear next visit.
    }
  }

  async function install() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    dismiss()
  }

  if (!show) return null

  return (
    <div className="bg-surface border hairline p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-base flex items-center gap-1.5">
          <Download size={18} className="text-emerald" strokeWidth={1.75} />
          Add to your home screen
        </h3>
        <button onClick={dismiss} className="p-1 -m-1 text-muted hover:text-ink" aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>

      {deferredPrompt ? (
        <>
          <p className="text-xs text-muted leading-relaxed">
            Install this as an app on your phone — it opens full-screen, works offline, and isn't a sideloaded app, so
            it won't clash with banking apps that block those.
          </p>
          <button
            onClick={install}
            className="w-full flex items-center justify-center gap-1.5 border hairline py-2.5 min-h-[44px] text-sm text-emerald hover:border-emerald"
          >
            <Download size={16} />
            Install app
          </button>
        </>
      ) : (
        <p className="text-xs text-muted leading-relaxed">
          Add this to your home screen for a full-screen app that works offline. Tap the{' '}
          <Share size={12} className="inline align-text-bottom" /> Share button below, then{' '}
          <span className="text-ink">Add to Home Screen</span>.
        </p>
      )}
    </div>
  )
}
