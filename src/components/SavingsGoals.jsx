import { useState } from 'react'
import { Target, LifeBuoy, Trash2, Wallet, PiggyBank, Info } from 'lucide-react'
import { formatMoney, formatPct, currencySymbol } from '../lib/finance'
import { makeId } from '../lib/storage'

function goalIcon(name) {
  return name.toLowerCase().includes('emergency') ? LifeBuoy : Target
}

export default function SavingsGoals({ currency, goals, onAdd, onRemove, onUpdateSaved }) {
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
        <h3 className="font-display text-base flex items-center gap-1.5">
          <PiggyBank size={18} className="text-emerald" strokeWidth={1.75} />
          New savings goal
        </h3>
        <div>
          <label className="flex items-center gap-1 text-xs text-muted mb-1">
            <Target size={12} />
            Name
          </label>
          <input
            className="w-full border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Emergency fund"
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-xs text-muted mb-1">
            <Wallet size={12} />
            Target amount
          </label>
          <div className="flex items-center gap-2">
            <span className="num text-base text-muted">{currencySymbol(currency)}</span>
            <input
              type="number"
              inputMode="decimal"
              className="num flex-1 border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-1.5 bg-ink text-paper py-3 min-h-[48px] text-sm font-body"
        >
          <Target size={16} />
          Add goal
        </button>
      </form>

      <div className="space-y-3">
        {goals.length === 0 && (
          <div className="p-6 text-sm text-muted bg-surface border hairline flex flex-col items-center gap-2 text-center">
            <PiggyBank size={28} strokeWidth={1.5} />
            No savings goals yet.
          </div>
        )}
        {goals.map((goal) => {
          const pct = goal.target > 0 ? Math.min(goal.saved / goal.target, 1) : 0
          const Icon = goalIcon(goal.name)
          return (
            <div key={goal.id} className="bg-surface border hairline p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-body text-sm flex items-center gap-1.5">
                  <Icon size={16} className="text-emerald" strokeWidth={1.75} />
                  {goal.name}
                </span>
                <button
                  onClick={() => onRemove(goal.id)}
                  className="text-muted p-2 -m-2 hover:text-rust"
                  aria-label={`Remove ${goal.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="num text-sm">
                  {formatMoney(goal.saved, currency)} <span className="text-muted">/ {formatMoney(goal.target, currency)}</span>
                </span>
                <span className="num text-xs text-muted">{formatPct(pct)}</span>
              </div>
              <div className="h-2 bg-paper border hairline overflow-hidden mb-3">
                <div className="h-full bg-emerald transition-all" style={{ width: `${pct * 100}%` }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted shrink-0">Saved so far</span>
                <input
                  type="number"
                  inputMode="decimal"
                  className="num flex-1 border-b hairline bg-transparent py-2 text-base text-right focus:outline-none focus:border-emerald"
                  value={goal.saved || ''}
                  placeholder="0.00"
                  onChange={(e) => onUpdateSaved(goal.id, parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-ink/5 border hairline p-4 text-xs text-muted leading-relaxed flex gap-2">
        <Info size={14} className="shrink-0 mt-0.5" />
        Rule of thumb: build 3–6 months of essential expenses as an emergency fund before investing any surplus.
      </div>
    </div>
  )
}
