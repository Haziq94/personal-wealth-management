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
  Wallet2,
  CreditCard,
  BellRing,
  Tags,
  Plus,
  X
} from 'lucide-react'
import { CURRENCIES, formatMoney, getAccountBalances, accountBalanceView } from '../lib/finance'
import { isBiometricAvailable, registerBiometric } from '../lib/security'
import { makeId } from '../lib/storage'
import { getOtaStatus } from '../lib/otaUpdate'
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

const NEW_TYPE = '__new__'

export default function Settings({
  state,
  onNameChange,
  onCurrencyChange,
  onExport,
  onImport,
  buildBackup,
  onRestoreText,
  onImportBajetlah,
  importError,
  onSecurityChange,
  onPinReset,
  onAddAccount,
  onUpdateAccount,
  onRemoveAccount,
  onAddCategory,
  onRemoveCategory,
  onAddAccountType,
  onRemoveAccountType
}) {
  const [name, setName] = useState(state.name)
  const [saved, setSaved] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [changingPin, setChangingPin] = useState(false)
  const [biometricError, setBiometricError] = useState('')
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountBalance, setNewAccountBalance] = useState('')
  const [newAccountType, setNewAccountType] = useState('')
  const [addingAccountType, setAddingAccountType] = useState(false)
  const [newTypeInput, setNewTypeInput] = useState('')
  const [newAccountKind, setNewAccountKind] = useState('cash')
  const [newAccountLast4, setNewAccountLast4] = useState('')
  const [newAccountExcluded, setNewAccountExcluded] = useState(false)
  const [last4Drafts, setLast4Drafts] = useState({})
  const [captureGranted, setCaptureGranted] = useState(false)
  const [captureOn, setCaptureOn] = useState(false)
  const [backupModal, setBackupModal] = useState(null)
  const [bajetlahBusy, setBajetlahBusy] = useState(false)
  const [bajetlahResult, setBajetlahResult] = useState(null)
  const [bajetlahError, setBajetlahError] = useState('')
  const bajetlahInputRef = useRef(null)
  // Capacitor's WebView has no download manager attached, so file saves there
  // fail silently — those installs get the copy/paste route instead.
  const savesAsText = Capacitor.isNativePlatform()
  const [newCategoryName, setNewCategoryName] = useState('')
  const fileInputRef = useRef(null)
  const security = state.security ?? {}
  const accountBalances = getAccountBalances(state.entries, state.accounts)
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

  function handlePinResetComplete(patch) {
    onPinReset(patch)
    setChangingPin(false)
  }

  function handleAddAccount(e) {
    e.preventDefault()
    const trimmed = newAccountName.trim()
    if (!trimmed) return
    const entered = parseFloat(newAccountBalance) || 0
    const owed = isLiabilityKind(newAccountKind)
    onAddAccount({
      id: makeId(),
      name: trimmed,
      // For any debt the field asks what's currently owed, which is a negative
      // running balance internally.
      openingBalance: owed ? -Math.abs(entered) : entered,
      // Loan/BNPL get a sensible default label so the account reads clearly;
      // an explicit type still wins.
      type: newAccountType || (newAccountKind === 'loan' ? 'Loan' : newAccountKind === 'bnpl' ? 'BNPL' : null),
      isSavings: newAccountKind === 'savings',
      isCredit: newAccountKind === 'credit',
      isLiability: newAccountKind === 'loan' || newAccountKind === 'bnpl',
      excludeFromFunds: newAccountExcluded,
      last4: newAccountKind === 'credit' && /^\d{4}$/.test(newAccountLast4) ? newAccountLast4 : null
    })
    setNewAccountName('')
    setNewAccountBalance('')
    setNewAccountType('')
    setNewAccountKind('cash')
    setNewAccountLast4('')
    setNewAccountExcluded(false)
  }

  // Credit card, loan and BNPL are all debts entered as an amount owed.
  function isLiabilityKind(kind) {
    return kind === 'credit' || kind === 'loan' || kind === 'bnpl'
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

  // Kept to 4 digits on purpose — enough to match a card against a bank alert,
  // while never storing anything that could stand in for the real number.
  function sanitizeLast4(value) {
    return value.replace(/\D/g, '').slice(0, 4)
  }

  // Only a complete 4-digit value is worth storing, but half-typed input still
  // has to stay on screen — hence a local draft alongside the saved value.
  function last4Value(account) {
    return last4Drafts[account.id] !== undefined ? last4Drafts[account.id] : account.last4 || ''
  }

  function handleLast4Change(id, raw) {
    const digits = sanitizeLast4(raw)
    setLast4Drafts((drafts) => ({ ...drafts, [id]: digits }))
    onUpdateAccount(id, { last4: digits.length === 4 ? digits : null })
  }

  function handleAccountTypeSelect(value) {
    if (value === NEW_TYPE) {
      setAddingAccountType(true)
      return
    }
    setNewAccountType(value)
  }

  function confirmNewAccountType() {
    const trimmed = newTypeInput.trim()
    if (!trimmed) return
    onAddAccountType(trimmed)
    setNewAccountType(trimmed)
    setNewTypeInput('')
    setAddingAccountType(false)
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
        <h2 className="text-xs font-medium text-muted tracking-wide uppercase px-0.5">Money setup</h2>
      <div className="bg-surface border hairline p-4 space-y-3">
        <h3 className="font-display text-base flex items-center gap-1.5">
          <Wallet2 size={18} className="text-emerald" strokeWidth={1.75} />
          Accounts
        </h3>
        <p className="text-xs text-muted">
          Track balances across your bank accounts, cash and e-wallets. Savings/investment accounts also show up on
          the Savings &amp; Investing page. Credit cards work the other way round — spending on one adds to what you
          owe instead of drawing down a balance.
        </p>
        {accountBalances.length > 0 && (
          <div className="border hairline divide-y hairline">
            {accountBalances.map((a) => {
              const view = accountBalanceView(a)
              return (
              <div key={a.id} className="flex items-center justify-between px-3 py-2">
                <div className="min-w-0">
                  <span className="text-sm">{a.name}</span>
                  <div className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
                    {(a.type || a.isSavings || a.isCredit || a.isLiability || a.excludeFromFunds) && (
                      <span>
                        {[a.type, a.isSavings && 'Savings', a.isCredit && !a.type && 'Credit card', a.excludeFromFunds && 'Not in net worth']
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
                    {a.isCredit && (
                      <span className="flex items-center gap-1">
                        <CreditCard size={11} />
                        ••••
                        <input
                          className="num w-9 border-b hairline bg-transparent text-xs py-0.5 focus:outline-none focus:border-emerald"
                          inputMode="numeric"
                          maxLength={4}
                          value={last4Value(a)}
                          placeholder="1234"
                          aria-label={`Last 4 card digits for ${a.name}`}
                          onChange={(e) => handleLast4Change(a.id, e.target.value)}
                        />
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`num text-sm ${view.tone}`}>
                    {formatMoney(view.amount, state.currency)}
                    {view.label && <span className="text-muted"> {view.label}</span>}
                  </span>
                  <button onClick={() => onRemoveAccount(a.id)} className="text-muted p-1 -m-1 hover:text-rust" aria-label={`Remove ${a.name}`}>
                    <X size={14} />
                  </button>
                </div>
              </div>
              )
            })}
          </div>
        )}
        <form onSubmit={handleAddAccount} className="space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs text-muted mb-1">Account name</label>
              <input
                className="w-full border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="e.g. Maybank"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs text-muted mb-1">
                {isLiabilityKind(newAccountKind) ? 'Owed now' : 'Balance'}
              </label>
              <input
                type="number"
                inputMode="decimal"
                className="num w-full border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
                value={newAccountBalance}
                onChange={(e) => setNewAccountBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <select
            value={newAccountKind}
            onChange={(e) => setNewAccountKind(e.target.value)}
            className="w-full appearance-none border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
          >
            <option value="cash">Cash / bank account — money you hold</option>
            <option value="savings">Savings / investment account — money you hold</option>
            <option value="credit">Credit card — money you owe</option>
            <option value="loan">Loan — money you owe</option>
            <option value="bnpl">Buy now, pay later — money you owe</option>
          </select>
          {newAccountKind === 'credit' && (
            <div>
              <label className="block text-xs text-muted mb-1">Card ends in (optional)</label>
              <input
                className="num w-20 border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
                inputMode="numeric"
                maxLength={4}
                value={newAccountLast4}
                onChange={(e) => setNewAccountLast4(sanitizeLast4(e.target.value))}
                placeholder="1234"
              />
            </div>
          )}
          {!addingAccountType ? (
            <select
              value={newAccountType}
              onChange={(e) => handleAccountTypeSelect(e.target.value)}
              className="w-full appearance-none border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
            >
              <option value="">No type</option>
              {state.accountTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value={NEW_TYPE}>+ Add custom type</option>
            </select>
          ) : (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                className="flex-1 border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
                value={newTypeInput}
                onChange={(e) => setNewTypeInput(e.target.value)}
                placeholder="e.g. Gold Reserve, Unit Trust, ASNB"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    confirmNewAccountType()
                  }
                }}
              />
              <button type="button" onClick={confirmNewAccountType} className="p-2 text-emerald" aria-label="Add type">
                <Check size={18} />
              </button>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm py-1 min-h-[32px]">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={newAccountExcluded}
              onChange={(e) => setNewAccountExcluded(e.target.checked)}
            />
            Leave out of net worth
          </label>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1.5 border hairline py-2.5 min-h-[44px] text-sm text-emerald hover:border-emerald"
          >
            <Plus size={16} />
            Add account
          </button>
        </form>
      </div>

      <div className="bg-surface border hairline p-4 space-y-3">
        <h3 className="font-display text-base flex items-center gap-1.5">
          <Tags size={18} className="text-emerald" strokeWidth={1.75} />
          Account types
        </h3>
        <p className="text-xs text-muted">
          Optional labels for accounts — Bank Account, Gold Reserve, Unit Trust, ASNB, whatever you actually use.
          Nothing preset; add only what applies.
        </p>
        {state.accountTypes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {state.accountTypes.map((t) => (
              <span key={t} className="flex items-center gap-1.5 border hairline pl-2.5 pr-1.5 py-1 text-sm">
                {t}
                <button onClick={() => onRemoveAccountType(t)} className="text-muted p-0.5 hover:text-rust" aria-label={`Remove ${t}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

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
