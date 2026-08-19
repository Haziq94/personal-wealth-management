import { getCommitments, formatMoney } from '../lib/finance'

const CATEGORY_LABELS = { needs: 'Needs', wants: 'Wants', savings: 'Savings' }

export default function Commitments({ entries }) {
  const { entries: recurring, total } = getCommitments(entries)

  return (
    <div className="space-y-4">
      <div className="bg-surface border hairline p-4">
        <div className="text-xs text-muted mb-1">Monthly recurring total</div>
        <div className="num text-2xl">{formatMoney(total)}</div>
        <p className="text-xs text-muted mt-1">Derived automatically from expenses flagged recurring.</p>
      </div>

      <div className="bg-surface border hairline">
        {recurring.length === 0 && (
          <div className="p-4 text-sm text-muted">No recurring commitments yet. Flag an expense as recurring in Spending.</div>
        )}
        {recurring.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between px-4 py-3 border-b hairline last:border-b-0">
            <div>
              <div className="text-sm">{entry.name}</div>
              <div className="text-xs text-muted">{CATEGORY_LABELS[entry.category]}</div>
            </div>
            <span className="num text-sm">{formatMoney(entry.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
