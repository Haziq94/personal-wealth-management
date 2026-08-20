import { useState } from 'react'
import { Repeat, House, CalendarClock, Trash2, Plus } from 'lucide-react'
import { getCommitments, formatMoney } from '../lib/finance'
import AddTransactionModal from './AddTransactionModal'

export default function Commitments({ currency, entries, accounts, categories, onAdd, onRemove, onAddCategory }) {
  const [showAdd, setShowAdd] = useState(false)
  const { entries: recurring, total } = getCommitments(entries)

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-surface border hairline p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
          <Repeat size={13} />
          Monthly recurring total
        </div>
        <div className="num text-2xl">{formatMoney(total, currency)}</div>
        <p className="text-xs text-muted mt-1">
          Derived automatically from expenses flagged recurring — this is what the Dashboard treats as Commitment.
        </p>
      </div>

      <div className="bg-surface border hairline">
        {recurring.length === 0 && (
          <div className="p-6 text-sm text-muted flex flex-col items-center gap-2 text-center">
            <CalendarClock size={28} strokeWidth={1.5} />
            No recurring commitments yet. Tap + to add one.
          </div>
        )}
        {recurring.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between gap-2 px-4 py-3 border-b hairline last:border-b-0">
            <div className="flex items-center gap-3 min-w-0">
              <House size={18} className="text-muted shrink-0" strokeWidth={1.75} />
              <div className="min-w-0">
                <div className="text-sm truncate">{entry.name}</div>
                {entry.category && <div className="text-xs text-muted">{entry.category}</div>}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="num text-sm">{formatMoney(entry.amount, currency)}</span>
              <button
                onClick={() => onRemove(entry.id)}
                className="text-muted p-2 -m-2 hover:text-rust"
                aria-label={`Remove ${entry.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowAdd(true)}
        className="fixed right-4 bottom-24 w-14 h-14 rounded-full bg-ink text-paper flex items-center justify-center z-20"
        aria-label="Add commitment"
      >
        <Plus size={24} />
      </button>

      {showAdd && (
        <AddTransactionModal
          currency={currency}
          categories={categories}
          accounts={accounts}
          onAdd={onAdd}
          onAddCategory={onAddCategory}
          onClose={() => setShowAdd(false)}
          initialType="expense"
          initialRecurring
        />
      )}
    </div>
  )
}
