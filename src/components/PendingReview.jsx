import { useState } from 'react'
import { BellRing, Check, X, ChevronDown } from 'lucide-react'
import { formatMoney, formatDateTime } from '../lib/finance'

// Parsed notifications land here rather than in the ledger. A misread alert
// should cost a tap to dismiss, never a silent wrong entry — so nothing is
// counted anywhere until it's confirmed from this list.
export default function PendingReview({ pending, currency, accounts, categories, onConfirm, onDiscard }) {
  const [drafts, setDrafts] = useState({})

  if (pending.length === 0) return null

  function fieldOf(item, field) {
    return drafts[item.id]?.[field] ?? item[field] ?? ''
  }

  function edit(id, field, value) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [field]: value } }))
  }

  function confirm(item) {
    onConfirm(item.id, {
      name: String(fieldOf(item, 'name')).trim() || 'Unnamed transaction',
      accountId: fieldOf(item, 'accountId') || null,
      category: fieldOf(item, 'category') || null
    })
    setDrafts((d) => {
      const { [item.id]: _removed, ...rest } = d
      return rest
    })
  }

  return (
    <div className="bg-surface border hairline">
      <div className="flex items-center gap-1.5 text-xs text-muted px-4 pt-3 pb-2">
        <BellRing size={13} className="text-emerald" />
        From your notifications — {pending.length} to review
      </div>
      {pending.map((item) => (
        <div key={item.id} className="px-4 py-3 border-t hairline space-y-2">
          <div className="flex items-start justify-between gap-2">
            <input
              className="flex-1 min-w-0 border-b hairline bg-transparent py-1 text-sm focus:outline-none focus:border-emerald"
              value={fieldOf(item, 'name')}
              placeholder="Merchant"
              onChange={(e) => edit(item.id, 'name', e.target.value)}
            />
            <span className={`num text-sm shrink-0 ${item.type === 'income' ? 'text-emerald' : 'text-ink'}`}>
              {item.type === 'income' ? '+' : '-'}
              {formatMoney(item.amount, item.currency || currency)}
            </span>
          </div>

          <div className="text-xs text-muted num">
            {formatDateTime(item.date)}
            {item.last4 && ` · •••• ${item.last4}`}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={fieldOf(item, 'accountId')}
                onChange={(e) => edit(item.id, 'accountId', e.target.value)}
                className="w-full appearance-none border-b hairline bg-transparent py-1.5 pr-5 text-xs focus:outline-none focus:border-emerald"
              >
                <option value="">No account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-0 top-2 text-muted pointer-events-none" />
            </div>
            <div className="relative flex-1">
              <select
                value={fieldOf(item, 'category')}
                onChange={(e) => edit(item.id, 'category', e.target.value)}
                className="w-full appearance-none border-b hairline bg-transparent py-1.5 pr-5 text-xs focus:outline-none focus:border-emerald"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-0 top-2 text-muted pointer-events-none" />
            </div>
          </div>

          {item.currency && item.currency !== currency && (
            <p className="text-[11px] text-rust leading-relaxed">
              This alert is in {item.currency}, not your home currency — it'll be recorded as-is, with no conversion.
            </p>
          )}

          {item.raw && <p className="text-[11px] text-muted leading-relaxed">{item.raw}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => confirm(item)}
              className="flex-1 flex items-center justify-center gap-1.5 border hairline py-2 min-h-[40px] text-sm text-emerald hover:border-emerald"
            >
              <Check size={15} />
              Add
            </button>
            <button
              onClick={() => onDiscard(item.id)}
              className="flex-1 flex items-center justify-center gap-1.5 border hairline py-2 min-h-[40px] text-sm text-muted hover:border-rust hover:text-rust"
            >
              <X size={15} />
              Discard
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
