import { useState } from 'react'
import { BarChart3, PieChart, Repeat, Receipt, ShieldCheck } from 'lucide-react'
import { getMonthlyTrend, getCategoryBreakdown, getSpendingHabits, filterRecentMonths, formatMoney, formatPct } from '../lib/finance'
import { categoryIcon } from '../lib/categoryIcons'
import Tax from './Tax'

const MONTHS = 6

const VIEWS = [
  { id: 'spending', label: 'Spending', icon: BarChart3 },
  { id: 'tax', label: 'Tax', icon: ShieldCheck }
]

export default function Analytics({ currency, entries, payslips, onAddPayslip, onRemovePayslip }) {
  const [view, setView] = useState('spending')

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 min-h-[40px] text-sm border ${
              view === id ? 'border-emerald text-emerald bg-emerald/5' : 'hairline text-muted'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {view === 'tax' ? (
        <Tax
          currency={currency}
          entries={entries}
          payslips={payslips}
          onAddPayslip={onAddPayslip}
          onRemovePayslip={onRemovePayslip}
        />
      ) : (
        <SpendingView currency={currency} entries={entries} />
      )}
    </div>
  )
}

function SpendingView({ currency, entries }) {
  if (entries.length === 0) {
    return (
      <div className="bg-surface border hairline p-6 text-sm text-muted flex flex-col items-center gap-2 text-center">
        <Receipt size={28} strokeWidth={1.5} />
        No transactions yet. Log some income and expenses to see analytics here.
      </div>
    )
  }

  const trend = getMonthlyTrend(entries, MONTHS)
  const breakdown = getCategoryBreakdown(entries, MONTHS)
  const habits = getSpendingHabits(filterRecentMonths(entries, MONTHS), 5, 4)
  const totalIncome = trend.reduce((sum, m) => sum + m.income, 0)
  const totalSpent = trend.reduce((sum, m) => sum + m.spent, 0)
  const net = totalIncome - totalSpent
  const maxVal = Math.max(1, ...trend.map((m) => Math.max(m.income, m.spent)))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-px bg-ink/10 border hairline">
        <div className="bg-surface p-3">
          <div className="text-xs text-muted mb-1">Income ({MONTHS}mo)</div>
          <div className="num text-sm text-emerald">{formatMoney(totalIncome, currency)}</div>
        </div>
        <div className="bg-surface p-3">
          <div className="text-xs text-muted mb-1">Spent ({MONTHS}mo)</div>
          <div className="num text-sm text-rust">{formatMoney(totalSpent, currency)}</div>
        </div>
        <div className="bg-surface p-3">
          <div className="text-xs text-muted mb-1">Net</div>
          <div className={`num text-sm ${net < 0 ? 'text-rust' : 'text-emerald'}`}>{formatMoney(net, currency)}</div>
        </div>
      </div>

      <div className="bg-surface border hairline p-4">
        <h3 className="font-display text-base mb-1 flex items-center gap-1.5">
          <BarChart3 size={17} className="text-emerald" strokeWidth={1.75} />
          Income vs spending
        </h3>
        <p className="text-xs text-muted mb-3">Last {MONTHS} months, by calendar month.</p>
        <div className="flex items-end gap-3 h-32">
          {trend.map((m) => (
            <div key={m.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div className="flex items-end gap-0.5 h-full">
                <div className="w-2.5 bg-emerald" style={{ height: `${(m.income / maxVal) * 100}%` }} />
                <div className="w-2.5 bg-rust" style={{ height: `${(m.spent / maxVal) * 100}%` }} />
              </div>
              <span className="text-[10px] text-muted">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3 text-[11px] text-muted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald inline-block" /> Income
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-rust inline-block" /> Spent
          </span>
        </div>
      </div>

      <div className="bg-surface border hairline">
        <div className="p-4 pb-1">
          <h3 className="font-display text-base mb-1 flex items-center gap-1.5">
            <PieChart size={17} className="text-emerald" strokeWidth={1.75} />
            Spending by category
          </h3>
          <p className="text-xs text-muted">Last {MONTHS} months.</p>
        </div>
        {breakdown.length === 0 && (
          <div className="p-6 text-sm text-muted flex flex-col items-center gap-2 text-center">
            <PieChart size={28} strokeWidth={1.5} />
            No spending in the last {MONTHS} months yet.
          </div>
        )}
        {breakdown.map((c) => {
          const Icon = categoryIcon(c.category)
          return (
            <div key={c.category} className="px-4 py-3 border-b hairline last:border-b-0">
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span className="text-sm flex items-center gap-1.5 min-w-0 truncate">
                  <Icon size={15} className="text-muted shrink-0" strokeWidth={1.75} />
                  {c.category}
                </span>
                <span className="num text-sm shrink-0">
                  {formatMoney(c.amount, currency)} <span className="text-muted">({formatPct(c.pct)})</span>
                </span>
              </div>
              <div className="h-1.5 bg-paper border hairline overflow-hidden">
                <div className="h-full bg-emerald" style={{ width: `${c.pct * 100}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {habits.length > 0 && (
        <div className="bg-surface border hairline">
          <div className="p-4 pb-1">
            <h3 className="font-display text-base mb-1 flex items-center gap-1.5">
              <Repeat size={17} className="text-emerald" strokeWidth={1.75} />
              Repeat purchases
            </h3>
            <p className="text-xs text-muted">
              Same-named items bought 4+ times in the last {MONTHS} months — often the easiest place to cut, since
              it's a specific habit rather than a whole category.
            </p>
          </div>
          {habits.map((h) => (
            <div key={h.name} className="flex items-center justify-between px-4 py-3 border-b hairline last:border-b-0 gap-2">
              <div className="min-w-0">
                <div className="text-sm truncate">{h.name}</div>
                <div className="text-xs text-muted">
                  {h.count}× · avg {formatMoney(h.avg, currency)} each
                </div>
              </div>
              <span className="num text-sm shrink-0">{formatMoney(h.total, currency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
