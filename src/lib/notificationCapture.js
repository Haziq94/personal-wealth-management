import { Capacitor, registerPlugin } from '@capacitor/core'

// Android-only, and implemented in this app's own Android project rather than a
// dependency — see android/app/src/main/java/com/haziq/wealth/.
const NotificationCapture = registerPlugin('NotificationCapture')

export function isCaptureSupported() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

// The system permission (granted by hand in Android settings) and the app's own
// switch are separate on purpose: capture only runs when both are on, so the
// switch can turn it off without the user having to revoke anything.
export async function isCapturePermissionGranted() {
  if (!isCaptureSupported()) return false
  try {
    const { granted } = await NotificationCapture.isPermissionGranted()
    return !!granted
  } catch {
    return false
  }
}

export async function openCaptureSettings() {
  if (!isCaptureSupported()) return
  try {
    await NotificationCapture.openSettings()
  } catch {
    // Nothing useful to do if the settings screen won't open.
  }
}

export async function isCaptureEnabled() {
  if (!isCaptureSupported()) return false
  try {
    const { enabled } = await NotificationCapture.isEnabled()
    return !!enabled
  } catch {
    return false
  }
}

export async function setCaptureEnabled(enabled) {
  if (!isCaptureSupported()) return
  try {
    await NotificationCapture.setEnabled({ enabled })
  } catch {
    // Left as-is; the Settings toggle re-reads real state on next open.
  }
}

/** Everything captured while the app wasn't running. Clears the native queue. */
export async function takePendingNotifications() {
  if (!isCaptureSupported()) return []
  try {
    const { notifications } = await NotificationCapture.takePending()
    return Array.isArray(notifications) ? notifications : []
  } catch {
    return []
  }
}

/** Live delivery while the app is open. Returns an unsubscribe function. */
export function onNotificationCaptured(handler) {
  if (!isCaptureSupported()) return () => {}
  const listener = NotificationCapture.addListener('notification', handler)
  return () => {
    Promise.resolve(listener)
      .then((l) => l.remove())
      .catch(() => {})
  }
}
