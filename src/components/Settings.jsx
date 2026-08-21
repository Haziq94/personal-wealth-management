import { useEffect, useRef, useState } from 'react'
import {
  UserRound,
  Download,
  Upload,
  Smartphone,
  Check,
  Coins,
  ChevronDown,
  ShieldCheck,
  Fingerprint,
  Wallet2,
  Tags,
  Plus,
  X
} from 'lucide-react'
import { CURRENCIES, formatMoney, getAccountBalances, accountBalanceView } from '../lib/finance'
import { isBiometricAvailable, registerBiometric } from '../lib/security'
import { makeId } from '../lib/storage'
import { getOtaStatus } from '../lib/otaUpdate'
import LockScreen from './LockScreen'

const NEW_TYPE = '__new__'

export default function Settings({
  state,
  onNameChange,
  onCurrencyChange,
  onExport,
  onImport,
  importError,
  onSecurityChange,
  onPinReset,
  onAddAccount,
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
  const [newCategoryName, setNewCategoryName] = useState('')
  const fileInputRef = useRef(null)
  const security = state.security ?? {}
  const accountBalances = getAccountBalances(state.entries, state.accounts)
  const otaStatus = getOtaStatus()

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable)
  }, [])

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
    onAddAccount({
      id: makeId(),
      name: trimmed,
      // For a credit card the field asks what's currently owed, which is a
      // negative running balance internally.
      openingBalance: newAccountKind === 'credit' ? -Math.abs(entered) : entered,
      type: newAccountType || null,
      isSavings: newAccountKind === 'savings',
      isCredit: newAccountKind === 'credit'
    })
    setNewAccountName('')
    setNewAccountBalance('')
    setNewAccountType('')
    setNewAccountKind('cash')
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
                  {(a.type || a.isSavings || a.isCredit) && (
                    <div className="text-xs text-muted">
                      {[a.type, a.isSavings && 'Savings', a.isCredit && 'Credit card'].filter(Boolean).join(' · ')}
                    </div>
                  )}
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
                {newAccountKind === 'credit' ? 'Owed now' : 'Balance'}
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
          </select>
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
        <p className="text-xs text-muted">Your PIN is stored only on this device, hashed — never in your backup file.</p>
      </div>
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
            onClick={onExport}
            className="flex-1 flex items-center justify-center gap-1.5 border hairline py-2.5 min-h-[44px] text-sm text-ink hover:border-emerald hover:text-emerald"
          >
            <Download size={16} />
            Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 border hairline py-2.5 min-h-[44px] text-sm text-ink hover:border-emerald hover:text-emerald"
          >
            <Upload size={16} />
            Import
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={onImport} />
        </div>
        {importError && <p className="text-xs text-rust">{importError}</p>}
      </div>
      </section>

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
