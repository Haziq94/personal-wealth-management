import { useState } from 'react'
import { formatMoney, formatPct } from '../lib/finance'
import { makeId } from '../lib/storage'

export default function SavingsGoals({ goals, onAdd, onRemove, onUpdateSaved }) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const parsedTarget = parseFloat(target)
    if (!name.trim() || !parsedTarget || parsedTarget <= 0) return
    onAdd({ id: makeId(), name: name.trim(), target: parsedTarget, saved: 0 })
    setName('')
    setTarget('')
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="bg-surface border hairline p-4 space-y-3">
        <h3 className="font-display text-base">New savings goal</h3>
        <div>
          <label className="block text-xs text-muted mb-1">Name</label>
          <input
            className="w-full border-b hairline bg-transparent py-1.5 text-sm focus:outline-none focus:border-emerald"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Emergency fund"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Target amount</label>
          <div className="flex items-center gap-2">
            <span className="num text-sm text-muted">$</span>
            <input
              type="number"
              inputMode="decimal"
              className="num flex-1 border-b hairline bg-transparent py-1.5 text-sm focus:outline-none focus:border-emerald"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        <button type="submit" className="w-full bg-ink text-paper py-2 text-sm font-body">
          Add goal
        </button>
      </form>

      <div className="space-y-3">
        {goals.length === 0 && <div className="p-4 text-sm text-muted bg-surface border hairline">No savings goals yet.</div>}
        {goals.map((goal) => {
          const pct = goal.target > 0 ? Math.min(goal.saved / goal.target, 1) : 0
          return (
            <div key={goal.id} className="bg-surface border hairline p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-body text-sm">{goal.name}</span>
                <button onClick={() => onRemove(goal.id)} className="text-muted text-xs hover:text-rust">
                  remove
                </button>
              </div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="num text-sm">
                  {formatMoney(goal.saved)} <span className="text-muted">/ {formatMoney(goal.target)}</span>
                </span>
                <span className="num text-xs text-muted">{formatPct(pct)}</span>
              </div>
              <div className="h-2 bg-paper border hairline overflow-hidden mb-3">
                <div className="h-full bg-emerald transition-all" style={{ width: `${pct * 100}%` }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Saved so far</span>
                <input
                  type="number"
                  inputMode="decimal"
                  className="num flex-1 border-b hairline bg-transparent py-1 text-sm text-right focus:outline-none focus:border-emerald"
                  value={goal.saved || ''}
                  placeholder="0.00"
                  onChange={(e) => onUpdateSaved(goal.id, parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-ink/5 border hairline p-4 text-xs text-muted leading-relaxed">
        Rule of thumb: build 3–6 months of essential expenses as an emergency fund before investing any surplus.
      </div>
    </div>
  )
}
