import { ArrowDownCircle, ArrowUpCircle, Wallet, TriangleAlert, CircleAlert, Sparkles, ArrowRight, CalendarRange } from 'lucide-react'
import {
  getAllocation,
  getInvestmentGuidance,
  getGreeting,
  getPeriodStart,
  getCurrentPeriodEntries,
  totalIncome,
  totalSpent,
  formatMoney,
  formatDateTime
} from '../lib/finance'
import AllocationBar from './AllocationBar'
import InstallPrompt from './InstallPrompt'

const TONE_STYLES = {
  warning: { box: 'border-rust bg-rust/5 text-rust', icon: TriangleAlert },
  caution: { box: 'border-ink/20 bg-ink/5 text-ink', icon: CircleAlert },
  good: { box: 'border-emerald bg-emerald/5 text-emerald', icon: Sparkles }
}

export default function Dashboard({ name, currency, entries, accounts, commitments = [], onGoToTransactions }) {
  const periodStart = getPeriodStart(entries)
  const periodEntries = getCurrentPeriodEntries(entries)
  const income = totalIncome(periodEntries)
  const spent = totalSpent(periodEntries)
  const remaining = income - spent
  const allocation = getAllocation(periodEntries, income, commitments)
  const guidance = getInvestmentGuidance(periodEntries, income, currency, accounts, entries, name, commitments)
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  const ToneIcon = TONE_STYLES[guidance.tone].icon

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl leading-tight">
          {getGreeting()} {name || 'there'}
        </h2>
        <p className="text-xs text-muted num">{today}</p>
      </div>

      <InstallPrompt />

      {periodStart && (
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <CalendarRange size={13} />
          Current pay period: <span className="num text-ink">{formatDateTime(periodStart)} – today</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-px bg-ink/10 border hairline">
        <div className="bg-surface p-3">
          <div className="flex items-center gap-1 text-xs text-muted mb-1">
            <ArrowUpCircle size={13} className="text-emerald" />
            Income
          </div>
          <div className="num text-sm">{formatMoney(income, currency)}</div>
        </div>
        <div className="bg-surface p-3">
          <div className="flex items-center gap-1 text-xs text-muted mb-1">
            <ArrowDownCircle size={13} className="text-rust" />
            Spent
          </div>
          <div className="num text-sm">{formatMoney(spent, currency)}</div>
        </div>
        <div className="bg-surface p-3">
          <div className="flex items-center gap-1 text-xs text-muted mb-1">
            <Wallet size={13} />
            Left
          </div>
          <div className={`num text-sm ${remaining < 0 ? 'text-rust' : 'text-emerald'}`}>{formatMoney(remaining, currency)}</div>
        </div>
      </div>

      {income === 0 && (
        <button
          onClick={onGoToTransactions}
          className="w-full flex items-center justify-between gap-2 text-left bg-emerald/5 border border-emerald text-emerald p-3 text-sm"
        >
          <span className="flex items-center gap-2">
            <ArrowUpCircle size={16} />
            No income logged yet — add your first income transaction
          </span>
          <ArrowRight size={16} className="shrink-0" />
        </button>
      )}

      <AllocationBar allocation={allocation} currency={currency} />

      <div className={`border p-4 ${TONE_STYLES[guidance.tone].box}`}>
        <h3 className="font-display text-sm mb-1 flex items-center gap-1.5">
          <ToneIcon size={16} />
          Guidance
        </h3>
        <p className="text-sm leading-snug">{guidance.message}</p>
      </div>
    </div>
  )
}
