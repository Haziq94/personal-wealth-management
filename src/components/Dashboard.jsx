import { getAllocation, getInvestmentGuidance, getGreeting, totalIncome, totalSpent, formatMoney } from '../lib/finance'
import AllocationBar from './AllocationBar'

const TONE_STYLES = {
  warning: 'border-rust bg-rust/5 text-rust',
  caution: 'border-ink/20 bg-ink/5 text-ink',
  good: 'border-emerald bg-emerald/5 text-emerald'
}

export default function Dashboard({ name, entries, goals, onGoToTransactions }) {
  const income = totalIncome(entries)
  const spent = totalSpent(entries)
  const remaining = income - spent
  const allocation = getAllocation(entries, income)
  const guidance = getInvestmentGuidance(entries, goals, income, name)
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl leading-tight">
          {getGreeting()} {name || 'there'}
        </h2>
        <p className="text-xs text-muted num">{today}</p>
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

      {income === 0 && (
        <button
          onClick={onGoToTransactions}
          className="w-full text-left bg-emerald/5 border border-emerald text-emerald p-3 text-sm"
        >
          No income logged yet — tap to add your first income transaction →
        </button>
      )}

      <AllocationBar allocation={allocation} />

      <div className={`border p-4 ${TONE_STYLES[guidance.tone]}`}>
        <h3 className="font-display text-sm mb-1">Guidance</h3>
        <p className="text-sm leading-snug">{guidance.message}</p>
      </div>
    </div>
  )
}
