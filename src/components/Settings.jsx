import { useEffect, useRef, useState } from 'react'
import {
  UserRound,
  Download,
  Upload,
  Smartphone,
  FileSpreadsheet,
  Check,
  Coins,
  ChevronDown,
  ShieldCheck,
  Fingerprint,
  BellRing,
  Tags,
  Plus,
  Trash2,
  RefreshCw,
  X
} from 'lucide-react'
import { CURRENCIES } from '../lib/finance'
import { isBiometricAvailable, registerBiometric } from '../lib/security'
import { getOtaStatus } from '../lib/otaUpdate'
import { checkForUpdate } from '../lib/appUpdate'
import {
  isCaptureSupported,
  isCapturePermissionGranted,
  isCaptureEnabled,
  setCaptureEnabled,
  openCaptureSettings
} from '../lib/notificationCapture'
import LockScreen from './LockScreen'
import BackupModal from './BackupModal'
import { Capacitor } from '@capacitor/core'

export default function Settings({
  state,
  onNameChange,
  onCurrencyChange,
  onExport,
  onImport,
  buildBackup,
  onRestoreText,
  onImportBajetlah,
  onResetAll,
  importError,
  onSecurityChange,
  onPinReset,
  onAddCategory,
  onRemoveCategory
}) {
  const [name, setName] = useState(state.name)
  const [saved, setSaved] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [changingPin, setChangingPin] = useState(false)
  const [biometricError, setBiometricError] = useState('')
  const [captureGranted, setCaptureGranted] = useState(false)
  const [captureOn, setCaptureOn] = useState(false)
  const [backupModal, setBackupModal] = useState(null)
  const [bajetlahBusy, setBajetlahBusy] = useState(false)
  const [bajetlahResult, setBajetlahResult] = useState(null)
  const [bajetlahError, setBajetlahError] = useState('')
  const bajetlahInputRef = useRef(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  // idle | checking | current | updating | unsupported
  const [updateState, setUpdateState] = useState('idle')
  // Capacitor's WebView has no download manager attached, so file saves there
  // fail silently — those installs get the copy/paste route instead.
  const savesAsText = Capacitor.isNativePlatform()
  const [newCategoryName, setNewCategoryName] = useState('')
  const fileInputRef = useRef(null)
  const security = state.security ?? {}
  const otaStatus = getOtaStatus()

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable)
  }, [])

  // Notification access is granted outside the app, so this re-reads on every
  // return to the foreground rather than trusting what it saw at mount.
  useEffect(() => {
    if (!isCaptureSupported()) return
    function refresh() {
      isCapturePermissionGranted().then(setCaptureGranted)
      isCaptureEnabled().then(setCaptureOn)
    }
    refresh()
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])

  async function handleCaptureToggle(enable) {
    await setCaptureEnabled(enable)
    setCaptureOn(enable)
    if (enable && !captureGranted) openCaptureSettings()
  }

  function handleNameBlur() {
    onNameChange(name)
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }

  async function handleCheckUpdate() {
    setUpdateState('checking')
    try {
      setUpdateState(await checkForUpdate())
    } catch {
      setUpdateState('current')
    }
  }

  function handlePinResetComplete(patch) {
    onPinReset(patch)
    setChangingPin(false)
  }

  // Inside the native WebView there's no download manager, so a file save just
  // silently does nothing. Backups move as text there instead.
  function handleExport() {
    if (savesAsText || !onExport()) setBackupModal({ mode: 'export', backup: buildBackup() })
  }

  function handleImportClick() {
    if (savesAsText) setBackupModal({ mode: 'import', backup: null })
    else fileInputRef.current?.click()
  }

  function handleRestoreText(text) {
    onRestoreText(text)
    setBackupModal(null)
  }

  async function handleBajetlahFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBajetlahBusy(true)
    setBajetlahError('')
    setBajetlahResult(null)
    try {
      setBajetlahResult(await onImportBajetlah(file))
    } catch (err) {
      setBajetlahError(err.message || 'Could not read that file.')
    } finally {
      setBajetlahBusy(false)
      e.target.value = ''
    }
  }

  function handleAddCategoryLocal(e) {
    e.preventDefault()
    const trimmed = newCategoryName.trim()
    if (!trimmed || state.categories.includes(trimmed)) return
    onAddCategory(trimmed)
    setNewCategoryName('')
  }

  async function handleBiometricToggle(enable) {
    setBiometricError('')
    if (!enable) {
      onSecurityChange({ biometricEnabled: false, credentialId: null })
      return
    }
    try {
      const credentialId = await registerBiometric(state.name)
      onSecurityChange({ biometricEnabled: true, credentialId })
    } catch {
      setBiometricError('Could not set up biometric unlock on this device.')
    }
  }

  if (changingPin) {
    return (
      <LockScreen
        security={security}
        name={state.name}
        mode="setup"
        onSetupComplete={handlePinResetComplete}
        onCancel={() => setChangingPin(false)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-xs font-medium text-muted tracking-wide uppercase px-0.5">Profile</h2>
      <div className="bg-surface border hairline p-4 space-y-2">
        <h3 className="font-display text-base flex items-center gap-1.5">
          <UserRound size={18} className="text-emerald" strokeWidth={1.75} />
          Profile
        </h3>
        <label className="block text-xs text-muted mb-1">Your name</label>
        <div className="flex items-center gap-2">
          <input
            className="flex-1 border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
            value={name}
            placeholder="Your name"
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
          {saved && <Check size={16} className="text-emerald shrink-0" />}
        </div>
        <p className="text-xs text-muted">Used for greetings and guidance messages around the app.</p>
      </div>

      <div className="bg-surface border hairline p-4 space-y-2">
        <h3 className="font-display text-base flex items-center gap-1.5">
          <Coins size={18} className="text-emerald" strokeWidth={1.75} />
          Home currency
        </h3>
        <label className="block text-xs text-muted mb-1">All totals are calculated in</label>
        <div className="relative">
          <select
            value={state.currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="w-full appearance-none border-b hairline bg-transparent py-2 pr-6 text-base focus:outline-none focus:border-emerald"
          >
            {Object.entries(CURRENCIES).map(([code, { symbol, name: currencyName }]) => (
              <option key={code} value={code}>
                {code} — {currencyName} ({symbol})
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-0 top-2.5 text-muted pointer-events-none" />
        </div>
        <p className="text-xs text-muted">
          Used for Dashboard, allocation and guidance totals. When logging a transaction in another currency, enter
          the exchange rate at the time and it's converted to this currency automatically.
        </p>
      </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-medium text-muted tracking-wide uppercase px-0.5">Categories</h2>

      <div className="bg-surface border hairline p-4 space-y-3">
        <h3 className="font-display text-base flex items-center gap-1.5">
          <Tags size={18} className="text-emerald" strokeWidth={1.75} />
          Transaction categories
        </h3>
        <p className="text-xs text-muted">
          Tag transactions with these — separate from the Dashboard's Commitment/Daily Budget/Savings budget groups.
        </p>
        {state.categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {state.categories.map((c) => (
              <span key={c} className="flex items-center gap-1.5 border hairline pl-2.5 pr-1.5 py-1 text-sm">
                {c}
                <button onClick={() => onRemoveCategory(c)} className="text-muted p-0.5 hover:text-rust" aria-label={`Remove ${c}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <form onSubmit={handleAddCategoryLocal} className="flex items-end gap-2">
          <input
            className="flex-1 border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="e.g. Subscriptions"
          />
          <button type="submit" className="p-2.5 border hairline text-emerald" aria-label="Add category">
            <Plus size={16} />
          </button>
        </form>
      </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-medium text-muted tracking-wide uppercase px-0.5">Security</h2>
      <div className="bg-surface border hairline p-4 space-y-3">
        <h3 className="font-display text-base flex items-center gap-1.5">
          <ShieldCheck size={18} className="text-emerald" strokeWidth={1.75} />
          App lock
        </h3>
        <label className="flex items-center gap-2 text-sm py-1 min-h-[32px]">
          <input
            type="checkbox"
            className="w-4 h-4"
            checked={!!security.enabled}
            disabled={!security.pinHash}
            onChange={(e) => onSecurityChange({ enabled: e.target.checked })}
          />
          Require PIN to open the app
        </label>
        {biometricAvailable && security.pinHash && (
          <label className="flex items-center gap-2 text-sm py-1 min-h-[32px]">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={!!security.biometricEnabled}
              onChange={(e) => handleBiometricToggle(e.target.checked)}
            />
            <Fingerprint size={14} className="text-muted" />
            Also allow fingerprint / face unlock
          </label>
        )}
        {biometricError && <p className="text-xs text-rust">{biometricError}</p>}
        <button
          onClick={() => setChangingPin(true)}
          className="w-full border hairline py-2.5 min-h-[44px] text-sm text-ink hover:border-emerald hover:text-emerald"
        >
          {security.pinHash ? 'Change PIN' : 'Set up PIN'}
        </button>
        <p className="text-xs text-muted">
          Re-opening within a minute won't ask again, so checking another app mid-entry costs nothing. Longer than
          that and it locks.
        </p>
        <p className="text-xs text-muted">Your PIN is stored only on this device, hashed — never in your backup file.</p>
      </div>

      {isCaptureSupported() && (
        <div className="bg-surface border hairline p-4 space-y-3">
          <h3 className="font-display text-base flex items-center gap-1.5">
            <BellRing size={18} className="text-emerald" strokeWidth={1.75} />
            Read spending from notifications
          </h3>
          <p className="text-xs text-muted leading-relaxed">
            Turns bank and e-wallet alerts into draft transactions you confirm on the Transactions page. Nothing is
            added to your ledger on its own.
          </p>
          <label className="flex items-center gap-2 text-sm py-1 min-h-[32px]">
            <input type="checkbox" className="w-4 h-4" checked={captureOn} onChange={(e) => handleCaptureToggle(e.target.checked)} />
            Capture spending alerts
          </label>
          {captureOn && !captureGranted && (
            <>
              <p className="text-xs text-rust">
                Android also needs notification access granted before anything can be read.
              </p>
              <button
                onClick={openCaptureSettings}
                className="w-full border hairline py-2.5 min-h-[44px] text-sm text-ink hover:border-emerald hover:text-emerald"
              >
                Open notification access settings
              </button>
            </>
          )}
          <p className="text-xs text-muted leading-relaxed">
            Android grants this as access to all notifications — there's no way to limit it to banking apps. So
            anything that doesn't mention an amount of money is discarded immediately and never stored, and messages
            carrying a TAC or OTP are always skipped.
          </p>
        </div>
      )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-medium text-muted tracking-wide uppercase px-0.5">Data</h2>
      <div className="bg-surface border hairline p-4 space-y-3">
        <h3 className="font-display text-base flex items-center gap-1.5">
          <RefreshCw size={18} className="text-emerald" strokeWidth={1.75} />
          App version
        </h3>
        <p className="text-xs text-muted leading-relaxed">
          You're on build <span className="num text-ink">{import.meta.env.VITE_APP_VERSION || 'dev'}</span>. New
          versions normally install on their own within a minute of opening the app — tap to check right now.
        </p>
        <button
          onClick={handleCheckUpdate}
          disabled={updateState === 'checking' || updateState === 'updating'}
          className="w-full flex items-center justify-center gap-1.5 border hairline py-2.5 min-h-[44px] text-sm text-ink hover:border-emerald hover:text-emerald disabled:text-muted"
        >
          <RefreshCw size={16} className={updateState === 'checking' || updateState === 'updating' ? 'animate-spin' : ''} />
          {updateState === 'checking' ? 'Checking…' : updateState === 'updating' ? 'Updating…' : 'Check for updates'}
        </button>
        {updateState === 'current' && (
          <p className="text-xs text-emerald">You're on the latest version.</p>
        )}
        {updateState === 'updating' && (
          <p className="text-xs text-emerald">New version found — updating and reloading…</p>
        )}
        {updateState === 'unsupported' && (
          <p className="text-xs text-muted">This install updates automatically; there's nothing to check here.</p>
        )}
      </div>

      <div className="bg-surface border hairline p-4 space-y-3">
        <h3 className="font-display text-base flex items-center gap-1.5">
          <Smartphone size={18} className="text-emerald" strokeWidth={1.75} />
          Backup &amp; restore
        </h3>
        <p className="text-xs text-muted leading-relaxed">
          Everything is stored only on this device. Export a backup before switching phones, then import it on the new
          one.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-1.5 border hairline py-2.5 min-h-[44px] text-sm text-ink hover:border-emerald hover:text-emerald"
          >
            <Download size={16} />
            Export
          </button>
          <button
            onClick={handleImportClick}
            className="flex-1 flex items-center justify-center gap-1.5 border hairline py-2.5 min-h-[44px] text-sm text-ink hover:border-emerald hover:text-emerald"
          >
            <Upload size={16} />
            Import
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={onImport} />
        </div>
        {importError && <p className="text-xs text-rust">{importError}</p>}
        {savesAsText && (
          <p className="text-xs text-muted leading-relaxed">
            The app can't save files directly, so backups here are copied and pasted as text.
          </p>
        )}
      </div>

      <div className="bg-surface border hairline p-4 space-y-3">
        <h3 className="font-display text-base flex items-center gap-1.5">
          <FileSpreadsheet size={18} className="text-emerald" strokeWidth={1.75} />
          Import from Bajetlah
        </h3>
        <p className="text-xs text-muted leading-relaxed">
          Bring in your accounts, transactions and commitments from a Bajetlah <span className="num">.xlsx</span>{' '}
          export. The file is read here on your device and never uploaded anywhere. Re-importing the same file updates
          what's already there instead of duplicating it.
        </p>
        <button
          onClick={() => bajetlahInputRef.current?.click()}
          disabled={bajetlahBusy}
          className="w-full flex items-center justify-center gap-1.5 border hairline py-2.5 min-h-[44px] text-sm text-ink hover:border-emerald hover:text-emerald disabled:text-muted"
        >
          <Upload size={16} />
          {bajetlahBusy ? 'Importing…' : 'Choose Bajetlah file'}
        </button>
        {/*
          No `accept` filter: Android and some Chrome builds grey out a genuine
          .xlsx whose reported MIME type doesn't match the filter, leaving the
          file visible but unselectable. Better to let any file be picked and
          reject a wrong one after reading it (see readBajetlahFile), which gives
          a clear message instead of a file that can't be tapped.
        */}
        <input ref={bajetlahInputRef} type="file" className="hidden" onChange={handleBajetlahFile} />
        {bajetlahResult && (
          <p className="text-xs text-emerald leading-relaxed">
            Imported {bajetlahResult.accounts} account{bajetlahResult.accounts === 1 ? '' : 's'},{' '}
            {bajetlahResult.entries} transaction{bajetlahResult.entries === 1 ? '' : 's'} and{' '}
            {bajetlahResult.commitments} commitment{bajetlahResult.commitments === 1 ? '' : 's'}. Asset balances build
            from the imported transactions — set any that look off by adding an opening transaction.
          </p>
        )}
        {bajetlahError && <p className="text-xs text-rust leading-relaxed">{bajetlahError}</p>}
      </div>

      <div className="bg-surface border hairline p-4 space-y-3">
        <h3 className="font-display text-base flex items-center gap-1.5">
          <Trash2 size={18} className="text-rust" strokeWidth={1.75} />
          Reset app
        </h3>
        <p className="text-xs text-muted leading-relaxed">
          Erases everything stored on this device — accounts, transactions, commitments, receipt photos, your PIN and
          all settings — and starts fresh. This can't be undone, so export a backup first if there's anything you want
          to keep.
        </p>
        {!confirmingReset ? (
          <button
            onClick={() => setConfirmingReset(true)}
            className="w-full flex items-center justify-center gap-1.5 border border-rust/40 py-2.5 min-h-[44px] text-sm text-rust hover:border-rust"
          >
            <Trash2 size={16} />
            Reset app &amp; clear all data
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-rust font-medium">This erases everything on this device. Are you sure?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingReset(false)}
                className="flex-1 border hairline py-2.5 min-h-[44px] text-sm text-ink hover:border-emerald"
              >
                Cancel
              </button>
              <button
                onClick={onResetAll}
                className="flex-1 flex items-center justify-center gap-1.5 bg-rust text-paper py-2.5 min-h-[44px] text-sm"
              >
                <Trash2 size={16} />
                Erase everything
              </button>
            </div>
          </div>
        )}
      </div>
      </section>


      {backupModal && (
        <BackupModal
          mode={backupModal.mode}
          backup={backupModal.backup}
          onRestore={handleRestoreText}
          onClose={() => setBackupModal(null)}
        />
      )}

      <p className="text-center text-[11px] text-muted num pb-1">Build {import.meta.env.VITE_APP_VERSION || 'dev'}</p>
      {otaStatus && (
        <p className="text-center text-[11px] text-muted pb-2">
          Last update check ({otaStatus.step}) at{' '}
          {new Date(otaStatus.checkedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}:{' '}
          {otaStatus.message}
        </p>
      )}
    </div>
  )
}
