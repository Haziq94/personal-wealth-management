import { getAllocation, getInvestmentGuidance, totalSpent, formatMoney } from '../lib/finance'
import AllocationBar from './AllocationBar'

const TONE_STYLES = {
  warning: 'border-rust bg-rust/5 text-rust',
  caution: 'border-ink/20 bg-ink/5 text-ink',
  good: 'border-emerald bg-emerald/5 text-emerald'
}

export default function Dashboard({ income, entries, goals, onIncomeChange }) {
  const spent = totalSpent(entries)
  const remaining = income - spent
  const allocation = getAllocation(entries, income)
  const guidance = getInvestmentGuidance(entries, goals, income)

  return (
    <div className="space-y-4">
      <div className="bg-surface border hairline p-4">
        <label className="block text-xs text-muted mb-1">Monthly income</label>
        <div className="flex items-center gap-2">
          <span className="num text-lg text-muted">$</span>
          <input
            type="number"
            inputMode="decimal"
            className="num text-lg bg-transparent border-b hairline focus:outline-none focus:border-emerald flex-1 py-1"
            value={income || ''}
            placeholder="0.00"
            onChange={(e) => onIncomeChange(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-ink/10 border hairline">
        <div className="bg-surface p-3">
          <div className="text-xs text-muted mb-1">Income</div>
          <div className="num text-sm">{formatMoney(income)}</div>
        </div>
        <div className="bg-surface p-3">
          <div className="text-xs text-muted mb-1">Spent</div>
          <div className="num text-sm">{formatMoney(spent)}</div>
        </div>
        <div className="bg-surface p-3">
          <div className="text-xs text-muted mb-1">Remaining</div>
          <div className={`num text-sm ${remaining < 0 ? 'text-rust' : 'text-emerald'}`}>{formatMoney(remaining)}</div>
        </div>
      </div>

      <AllocationBar allocation={allocation} />

      <div className={`border p-4 ${TONE_STYLES[guidance.tone]}`}>
        <h3 className="font-display text-sm mb-1">Guidance</h3>
        <p className="text-sm leading-snug">{guidance.message}</p>
      </div>
    </div>
  )
}
