import { useEffect, useRef, useState } from 'react'
import { LayoutDashboard, ArrowLeftRight, Repeat, PiggyBank, Download, Upload, UserRound, Check } from 'lucide-react'
import { loadState, saveState, exportState, importState } from './lib/storage'
import NavBar from './components/NavBar'
import Dashboard from './components/Dashboard'
import Transactions from './components/Transactions'
import Commitments from './components/Commitments'
import SavingsGoals from './components/SavingsGoals'

const TITLES = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard },
  transactions: { label: 'Transactions', icon: ArrowLeftRight },
  commitments: { label: 'Commitments', icon: Repeat },
  savings: { label: 'Savings & Investing', icon: PiggyBank }
}

export default function App() {
  const [state, setState] = useState(loadState)
  const [tab, setTab] = useState('dashboard')
  const [importError, setImportError] = useState('')
  const [editingName, setEditingName] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    saveState(state)
  }, [state])

  function handleNameChange(name) {
    setState((s) => ({ ...s, name }))
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
      setState(imported)
      setImportError('')
    } catch (err) {
      setImportError(err.message)
    } finally {
      e.target.value = ''
    }
  }

  const TabIcon = TITLES[tab].icon

  return (
    <div className="min-h-screen pb-24">
      <header
        className="bg-surface border-b hairline sticky top-0 z-10"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <button
              onClick={() => setEditingName(true)}
              className="flex items-center gap-1 text-xs text-muted tracking-wide uppercase hover:text-ink -ml-0.5"
            >
              <UserRound size={13} />
              {state.name || 'set your name'}
            </button>
            <h1 className="font-display text-xl flex items-center gap-2 mt-0.5">
              <TabIcon size={20} className="text-emerald shrink-0" strokeWidth={1.75} />
              {TITLES[tab].label}
            </h1>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => exportState(state)}
              className="flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] text-muted hover:text-ink"
              aria-label="Export backup"
            >
              <Download size={18} strokeWidth={1.75} />
              Export
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] text-muted hover:text-ink"
              aria-label="Import backup"
            >
              <Upload size={18} strokeWidth={1.75} />
              Import
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
          </div>
        </div>
        {editingName && (
          <div className="px-4 pb-3 flex items-center gap-2">
            <UserRound size={16} className="text-muted shrink-0" />
            <input
              autoFocus
              className="flex-1 border-b hairline bg-transparent py-1 text-sm focus:outline-none focus:border-emerald"
              value={state.name}
              placeholder="Your name"
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
            />
            <button onClick={() => setEditingName(false)} className="flex items-center gap-1 text-xs text-emerald p-1">
              <Check size={16} />
              Done
            </button>
          </div>
        )}
        {importError && <div className="px-4 pb-2 text-xs text-rust">{importError}</div>}
      </header>

      <main className="p-4 max-w-md mx-auto">
        {tab === 'dashboard' && (
          <Dashboard
            name={state.name}
            entries={state.entries}
            goals={state.goals}
            onGoToTransactions={() => setTab('transactions')}
          />
        )}
        {tab === 'transactions' && <Transactions entries={state.entries} onAdd={handleAddEntry} onRemove={handleRemoveEntry} />}
        {tab === 'commitments' && <Commitments entries={state.entries} />}
        {tab === 'savings' && (
          <SavingsGoals goals={state.goals} onAdd={handleAddGoal} onRemove={handleRemoveGoal} onUpdateSaved={handleUpdateSaved} />
        )}
      </main>

      <NavBar active={tab} onChange={setTab} />
    </div>
  )
}
