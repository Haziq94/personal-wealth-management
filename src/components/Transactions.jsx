import { useState } from 'react'
import { formatMoney } from '../lib/finance'
import { makeId } from '../lib/storage'

const CATEGORY_LABELS = { needs: 'Needs', wants: 'Wants', savings: 'Savings' }

export default function Transactions({ entries, onAdd, onRemove }) {
  const [type, setType] = useState('expense')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('needs')
  const [recurring, setRecurring] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!name.trim() || !parsed || parsed <= 0) return
    onAdd({
      id: makeId(),
      name: name.trim(),
      amount: parsed,
      type,
      category: type === 'income' ? null : category,
      recurring
    })
    setName('')
    setAmount('')
    setRecurring(false)
  }

  const sorted = [...entries].reverse()

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="bg-surface border hairline p-4 space-y-3">
        <h3 className="font-display text-base">Log a transaction</h3>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-1.5 text-xs border ${
              type === 'income' ? 'border-emerald text-emerald bg-emerald/5' : 'hairline text-muted'
            }`}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-1.5 text-xs border ${
              type === 'expense' ? 'border-rust text-rust bg-rust/5' : 'hairline text-muted'
            }`}
          >
            Expense
          </button>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Name</label>
          <input
            className="w-full border-b hairline bg-transparent py-1.5 text-sm focus:outline-none focus:border-emerald"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'income' ? 'e.g. Salary' : 'e.g. Groceries'}
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Amount</label>
          <div className="flex items-center gap-2">
            <span className="num text-sm text-muted">$</span>
            <input
              type="number"
              inputMode="decimal"
              className="num flex-1 border-b hairline bg-transparent py-1.5 text-sm focus:outline-none focus:border-emerald"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        {type === 'expense' && (
          <div>
            <label className="block text-xs text-muted mb-1">Category</label>
            <div className="flex gap-2">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`flex-1 py-1.5 text-xs border ${
                    category === key ? 'border-emerald text-emerald bg-emerald/5' : 'hairline text-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
          Recurring {type === 'income' ? 'income' : 'commitment'}
        </label>
        <button type="submit" className="w-full bg-ink text-paper py-2 text-sm font-body">
          Add {type === 'income' ? 'income' : 'expense'}
        </button>
      </form>

      <div className="bg-surface border hairline">
        {sorted.length === 0 && <div className="p-4 text-sm text-muted">No transactions logged yet.</div>}
        {sorted.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between px-4 py-3 border-b hairline last:border-b-0">
            <div>
              <div className="text-sm">{entry.name}</div>
              <div className="text-xs text-muted">
                {entry.type === 'income' ? 'Income' : CATEGORY_LABELS[entry.category]}
                {entry.recurring ? ' · recurring' : ''}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`num text-sm ${entry.type === 'income' ? 'text-emerald' : 'text-ink'}`}>
                {entry.type === 'income' ? '+' : '-'}
                {formatMoney(entry.amount)}
              </span>
              <button onClick={() => onRemove(entry.id)} className="text-muted text-xs hover:text-rust">
                remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
