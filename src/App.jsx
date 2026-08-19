import { useEffect, useRef, useState } from 'react'
import { loadState, saveState, exportState, importState } from './lib/storage'
import NavBar from './components/NavBar'
import Dashboard from './components/Dashboard'
import Spending from './components/Spending'
import Commitments from './components/Commitments'
import SavingsGoals from './components/SavingsGoals'

const TITLES = {
  dashboard: 'Dashboard',
  spending: 'Spending',
  commitments: 'Commitments',
  savings: 'Savings & Investing'
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

  function handleIncomeChange(income) {
    setState((s) => ({ ...s, income }))
  }

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

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-surface border-b hairline sticky top-0 z-10">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div>
            <button
              onClick={() => setEditingName(true)}
              className="text-xs text-muted tracking-wide uppercase hover:text-ink"
            >
              Ledger · {state.name || 'set your name'}
            </button>
            <h1 className="font-display text-xl">{TITLES[tab]}</h1>
          </div>
          <div className="flex gap-3 text-xs text-muted">
            <button onClick={() => exportState(state)} className="hover:text-ink">
              Export
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="hover:text-ink">
              Import
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
          </div>
        </div>
        {editingName && (
          <div className="px-4 pb-3 flex items-center gap-2">
            <input
              autoFocus
              className="flex-1 border-b hairline bg-transparent py-1 text-sm focus:outline-none focus:border-emerald"
              value={state.name}
              placeholder="Your name"
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
            />
            <button onClick={() => setEditingName(false)} className="text-xs text-emerald">
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
            income={state.income}
            entries={state.entries}
            goals={state.goals}
            onIncomeChange={handleIncomeChange}
          />
        )}
        {tab === 'spending' && <Spending entries={state.entries} onAdd={handleAddEntry} onRemove={handleRemoveEntry} />}
        {tab === 'commitments' && <Commitments entries={state.entries} />}
        {tab === 'savings' && (
          <SavingsGoals goals={state.goals} onAdd={handleAddGoal} onRemove={handleRemoveGoal} onUpdateSaved={handleUpdateSaved} />
        )}
      </main>

      <NavBar active={tab} onChange={setTab} />
    </div>
  )
}
