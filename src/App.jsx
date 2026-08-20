import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Repeat,
  Landmark,
  Settings as SettingsIcon,
  BarChart3,
  ShieldCheck
} from 'lucide-react'
import { loadState, saveState, exportState, importState } from './lib/storage'
import NavBar from './components/NavBar'
import Dashboard from './components/Dashboard'
import Analytics from './components/Analytics'
import Transactions from './components/Transactions'
import Commitments from './components/Commitments'
import Savings from './components/Savings'
import Tax from './components/Tax'
import Settings from './components/Settings'
import LockScreen from './components/LockScreen'

const TITLES = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard },
  analytics: { label: 'Analytics', icon: BarChart3 },
  transactions: { label: 'Transactions', icon: ArrowLeftRight },
  commitments: { label: 'Commitments', icon: Repeat },
  savings: { label: 'Savings & Investing', icon: Landmark },
  tax: { label: 'Tax', icon: ShieldCheck },
  settings: { label: 'Settings', icon: SettingsIcon }
}

export default function App() {
  const [state, setState] = useState(loadState)
  const [tab, setTab] = useState('dashboard')
  const [importError, setImportError] = useState('')
  // Force setup when there's no PIN yet, and lock every open when a PIN exists and is enabled.
  const [locked, setLocked] = useState(() => !state.security?.pinHash || !!state.security?.enabled)

  const appTitle = state.name ? `${state.name}'s Wealth` : 'My Wealth'

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    document.title = appTitle
  }, [appTitle])

  useEffect(() => {
    function onVisibilityChange() {
      // Re-lock the instant the app is minimized/backgrounded, not just on a
      // fresh launch — a phone can be picked up by someone else within seconds.
      if (document.visibilityState === 'hidden' && state.security?.enabled) {
        setLocked(true)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [state.security?.enabled])

  function handleNameChange(name) {
    setState((s) => ({ ...s, name }))
  }

  function handleCurrencyChange(currency) {
    setState((s) => ({ ...s, currency }))
  }

  function handleAddEntry(entry) {
    setState((s) => ({ ...s, entries: [...s.entries, entry] }))
  }

  function handleRemoveEntry(id) {
    setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }))
  }

  function handleAddAccount(account) {
    setState((s) => ({ ...s, accounts: [...s.accounts, account] }))
  }

  function handleRemoveAccount(id) {
    setState((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== id) }))
  }

  function handleAddCategory(name) {
    setState((s) => (s.categories.includes(name) ? s : { ...s, categories: [...s.categories, name] }))
  }

  function handleRemoveCategory(name) {
    setState((s) => ({ ...s, categories: s.categories.filter((c) => c !== name) }))
  }

  function handleAddAccountType(type) {
    setState((s) => (s.accountTypes.includes(type) ? s : { ...s, accountTypes: [...s.accountTypes, type] }))
  }

  function handleAddPayslip(payslip) {
    setState((s) => ({ ...s, payslips: [...s.payslips, payslip] }))
  }

  function handleRemovePayslip(id) {
    setState((s) => ({ ...s, payslips: s.payslips.filter((p) => p.id !== id) }))
  }

  function handleRemoveAccountType(type) {
    setState((s) => ({ ...s, accountTypes: s.accountTypes.filter((t) => t !== type) }))
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imported = await importState(file)
      // security is device-local — a restored backup never touches this phone's lock setup.
      setState((s) => ({ ...imported, security: s.security }))
      setImportError('')
    } catch (err) {
      setImportError(err.message)
    } finally {
      e.target.value = ''
    }
  }

  function handleSecuritySetupComplete(patch) {
    setState((s) => ({ ...s, security: { ...s.security, ...patch, enabled: true } }))
    setLocked(false)
  }

  function handleSecurityChange(patch) {
    setState((s) => ({ ...s, security: { ...s.security, ...patch } }))
  }

  const TabIcon = TITLES[tab].icon

  if (locked) {
    return (
      <LockScreen
        security={state.security}
        name={state.name}
        onSetupComplete={handleSecuritySetupComplete}
        onUnlock={() => setLocked(false)}
      />
    )
  }

  return (
    <div className="min-h-screen pb-24">
      <header
        className="bg-surface border-b hairline sticky top-0 z-10"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 pt-4 pb-3">
          <div className="text-xs text-muted tracking-wide uppercase">{appTitle}</div>
          <h1 className="font-display text-xl flex items-center gap-2 mt-0.5">
            <TabIcon size={20} className="text-emerald shrink-0" strokeWidth={1.75} />
            {TITLES[tab].label}
          </h1>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto">
        {tab === 'dashboard' && (
          <Dashboard
            name={state.name}
            currency={state.currency}
            entries={state.entries}
            accounts={state.accounts}
            onGoToTransactions={() => setTab('transactions')}
          />
        )}
        {tab === 'analytics' && <Analytics currency={state.currency} entries={state.entries} />}
        {tab === 'transactions' && (
          <Transactions
            currency={state.currency}
            entries={state.entries}
            accounts={state.accounts}
            categories={state.categories}
            onAdd={handleAddEntry}
            onRemove={handleRemoveEntry}
            onAddCategory={handleAddCategory}
            onAddAccount={handleAddAccount}
          />
        )}
        {tab === 'commitments' && (
          <Commitments
            currency={state.currency}
            entries={state.entries}
            accounts={state.accounts}
            categories={state.categories}
            onAdd={handleAddEntry}
            onRemove={handleRemoveEntry}
            onAddCategory={handleAddCategory}
          />
        )}
        {tab === 'savings' && (
          <Savings
            currency={state.currency}
            entries={state.entries}
            accounts={state.accounts}
            accountTypes={state.accountTypes}
            onAddAccount={handleAddAccount}
            onRemoveAccount={handleRemoveAccount}
            onAddAccountType={handleAddAccountType}
          />
        )}
        {tab === 'tax' && (
          <Tax
            currency={state.currency}
            entries={state.entries}
            payslips={state.payslips}
            onAddPayslip={handleAddPayslip}
            onRemovePayslip={handleRemovePayslip}
          />
        )}
        {tab === 'settings' && (
          <Settings
            state={state}
            onNameChange={handleNameChange}
            onCurrencyChange={handleCurrencyChange}
            onExport={() => exportState(state)}
            onImport={handleImportFile}
            importError={importError}
            onSecurityChange={handleSecurityChange}
            onPinReset={handleSecuritySetupComplete}
            onAddAccount={handleAddAccount}
            onRemoveAccount={handleRemoveAccount}
            onAddCategory={handleAddCategory}
            onRemoveCategory={handleRemoveCategory}
            onAddAccountType={handleAddAccountType}
            onRemoveAccountType={handleRemoveAccountType}
          />
        )}
      </main>

      <NavBar active={tab} onChange={setTab} />
    </div>
  )
}
