import { Repeat, House, ShoppingBag, Landmark, CalendarClock } from 'lucide-react'
import { getCommitments, formatMoney } from '../lib/finance'

const CATEGORY_LABELS = { needs: 'Needs', wants: 'Wants', savings: 'Savings' }
const CATEGORY_ICONS = { needs: House, wants: ShoppingBag, savings: Landmark }

export default function Commitments({ currency, entries }) {
  const { entries: recurring, total } = getCommitments(entries)

  return (
    <div className="space-y-4">
      <div className="bg-surface border hairline p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
          <Repeat size={13} />
          Monthly recurring total
        </div>
        <div className="num text-2xl">{formatMoney(total, currency)}</div>
        <p className="text-xs text-muted mt-1">Derived automatically from expenses flagged recurring.</p>
      </div>

      <div className="bg-surface border hairline">
        {recurring.length === 0 && (
          <div className="p-6 text-sm text-muted flex flex-col items-center gap-2 text-center">
            <CalendarClock size={28} strokeWidth={1.5} />
            No recurring commitments yet. Flag an expense as recurring in Transactions.
          </div>
        )}
        {recurring.map((entry) => {
          const Icon = CATEGORY_ICONS[entry.category]
          return (
            <div key={entry.id} className="flex items-center justify-between px-4 py-3 border-b hairline last:border-b-0">
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-muted shrink-0" strokeWidth={1.75} />
                <div>
                  <div className="text-sm">{entry.name}</div>
                  <div className="text-xs text-muted">{CATEGORY_LABELS[entry.category]}</div>
                </div>
              </div>
              <span className="num text-sm">{formatMoney(entry.amount, currency)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
