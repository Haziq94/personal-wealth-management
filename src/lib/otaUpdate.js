import { Capacitor } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'

// Published by the android-debug-apk CI workflow from the same commit as the
// debug APK it built — so a freshly installed APK always matches this
// manifest already, and only later develop pushes trigger an actual update.
//
// This has to be raw.githubusercontent.com specifically, not a GitHub Release
// asset URL: release assets don't send Access-Control-Allow-Origin, so a
// WebView fetch() to one is silently blocked by CORS. raw.githubusercontent.com
// does send permissive CORS headers. The actual dist.zip download further
// down stays on a Release asset — that goes through the native plugin's own
// downloader, not a WebView fetch(), so CORS doesn't apply to it.
const MANIFEST_URL = 'https://raw.githubusercontent.com/Haziq94/personal-wealth-management/develop/ota/manifest.json'

const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION || 'dev'
const STATUS_KEY = 'wealth-ota-status'

// Silent failure is exactly what made this hard to debug the first time
// (a swallowed CORS error looked identical to "nothing to update"). Every
// check now records what actually happened so it can be read back from
// Settings without needing a device attached to a debugger.
function saveStatus(step, message, extra = {}) {
  try {
    localStorage.setItem(
      STATUS_KEY,
      JSON.stringify({ step, message, checkedAt: new Date().toISOString(), currentVersion: CURRENT_VERSION, ...extra })
    )
  } catch {
    // localStorage unavailable — nothing more to do.
  }
}

export function getOtaStatus() {
  try {
    return JSON.parse(localStorage.getItem(STATUS_KEY) || 'null')
  } catch {
    return null
  }
}

// Capacitor's native shell only runs whatever JS was baked into the APK at
// build time — this lets a plain JS/CSS change reach the installed app
// instantly, without a new APK. Anything touching native code (a new plugin,
// Android config) still needs a fresh sideloaded APK, since only the web
// bundle can be swapped this way.
async function checkForUpdate() {
  if (!Capacitor.isNativePlatform()) return
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' })
    if (!res.ok) {
      saveStatus('fetch-failed', `Manifest request returned HTTP ${res.status}`)
      return
    }
    const manifest = await res.json()
    if (!manifest.version || !manifest.url) {
      saveStatus('bad-manifest', 'Manifest response was missing version/url')
      return
    }
    if (manifest.version === CURRENT_VERSION) {
      saveStatus('up-to-date', `Already on ${CURRENT_VERSION}`)
      return
    }
    saveStatus('downloading', `Downloading ${manifest.version} (from ${CURRENT_VERSION})`)
    const version = await CapacitorUpdater.download({ version: manifest.version, url: manifest.url })
    saveStatus('applying', `Downloaded ${manifest.version}, applying now`)
    await CapacitorUpdater.set(version)
    // set() reloads the app on success — code below normally doesn't run.
  } catch (err) {
    saveStatus('error', String(err?.message || err))
  }
}

// Marks the currently-running bundle healthy so the plugin doesn't roll it
// back on next launch, and kicks off a one-time update check at cold start.
export function initAutoUpdate() {
  if (!Capacitor.isNativePlatform()) return
  CapacitorUpdater.notifyAppReady().catch(() => {})
  checkForUpdate()
}
