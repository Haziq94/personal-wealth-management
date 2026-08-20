import { useEffect, useState } from 'react'
import { LayoutDashboard, ArrowLeftRight, Repeat, Landmark, Settings as SettingsIcon } from 'lucide-react'
import { loadState, saveState, exportState, importState } from './lib/storage'
import NavBar from './components/NavBar'
import Dashboard from './components/Dashboard'
import Transactions from './components/Transactions'
import Commitments from './components/Commitments'
import SavingsGoals from './components/SavingsGoals'
import Settings from './components/Settings'
import LockScreen from './components/LockScreen'

const TITLES = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard },
  transactions: { label: 'Transactions', icon: ArrowLeftRight },
  commitments: { label: 'Commitments', icon: Repeat },
  savings: { label: 'Savings & Investing', icon: Landmark },
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

  function handleAddGoal(goal) {
    setState((s) => ({ ...s, goals: [...s.goals, goal] }))
  }

  function handleRemoveGoal(id) {
    setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }))
  }

  function handleUpdateSaved(id, saved) {
    setState((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, saved } : g)) }))
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
            goals={state.goals}
            onGoToTransactions={() => setTab('transactions')}
          />
        )}
        {tab === 'transactions' && (
          <Transactions currency={state.currency} entries={state.entries} onAdd={handleAddEntry} onRemove={handleRemoveEntry} />
        )}
        {tab === 'commitments' && <Commitments currency={state.currency} entries={state.entries} />}
        {tab === 'savings' && (
          <SavingsGoals
            currency={state.currency}
            goals={state.goals}
            onAdd={handleAddGoal}
            onRemove={handleRemoveGoal}
            onUpdateSaved={handleUpdateSaved}
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
          />
        )}
      </main>

      <NavBar active={tab} onChange={setTab} />
    </div>
  )
}
