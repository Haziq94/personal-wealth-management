// On-demand service-worker update, so an installed PWA can be pushed to the
// newest build with a tap instead of waiting out the background check.

// The registration captured at startup (see main.jsx), so a check doesn't have
// to wait on getRegistration() every time.
let registrationRef = null

export function setSwRegistration(reg) {
  registrationRef = reg
}

async function getRegistration() {
  if (registrationRef) return registrationRef
  if ('serviceWorker' in navigator) {
    registrationRef = (await navigator.serviceWorker.getRegistration()) || null
  }
  return registrationRef
}

// Forces a service-worker update check. Resolves to one of:
//   'unsupported' — no service worker here (e.g. the native build)
//   'updating'    — a newer version was found; it activates itself and the page
//                   reloads via the controllerchange handler in main.jsx
//   'current'     — already on the newest version
export async function checkForUpdate() {
  const reg = await getRegistration()
  if (!reg) return 'unsupported'
  // Re-fetches sw.js bypassing the HTTP cache; if the deployed worker changed,
  // a new one begins installing.
  await reg.update()
  // With registerType:'autoUpdate' the new worker skips waiting and claims
  // clients on its own, so simply detecting one is enough — the reload follows.
  if (reg.installing || reg.waiting) {
    // Harmless if the generated worker doesn't listen for it; it already calls
    // skipWaiting() on install, but this covers a worker stuck waiting.
    reg.waiting?.postMessage?.({ type: 'SKIP_WAITING' })
    return 'updating'
  }
  return 'current'
}
