import { Capacitor } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'

// Published by the android-debug-apk CI workflow from the same commit as the
// debug APK it built — so a freshly installed APK always matches this
// manifest already, and only later develop pushes trigger an actual update.
const MANIFEST_URL = 'https://github.com/Haziq94/personal-wealth-management/releases/download/develop-latest/manifest.json'

const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION || 'dev'

// Capacitor's native shell only runs whatever JS was baked into the APK at
// build time — this lets a plain JS/CSS change reach the installed app
// instantly, without a new APK. Anything touching native code (a new plugin,
// Android config) still needs a fresh sideloaded APK, since only the web
// bundle can be swapped this way.
async function checkForUpdate() {
  if (!Capacitor.isNativePlatform()) return
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' })
    if (!res.ok) return
    const manifest = await res.json()
    if (!manifest.version || !manifest.url || manifest.version === CURRENT_VERSION) return
    const version = await CapacitorUpdater.download({ version: manifest.version, url: manifest.url })
    await CapacitorUpdater.set(version)
  } catch {
    // Offline, or no release published yet — keep running the current bundle.
  }
}

// Marks the currently-running bundle healthy so the plugin doesn't roll it
// back on next launch, and kicks off a one-time update check at cold start.
export function initAutoUpdate() {
  if (!Capacitor.isNativePlatform()) return
  CapacitorUpdater.notifyAppReady().catch(() => {})
  checkForUpdate()
}
