import { useState } from 'react'
import { Landmark, ShieldCheck, Plus, Trash2, Camera, ChevronDown } from 'lucide-react'
import { formatMoney, formatDateTime, getTaxYears, getTaxDeductibleExpenses, getPayslipSummary } from '../lib/finance'
import { categoryIcon } from '../lib/categoryIcons'
import AddPayslipModal from './AddPayslipModal'
import ReceiptViewer from './ReceiptViewer'

export default function Tax({ currency, entries, payslips, onAddPayslip, onRemovePayslip }) {
  const years = getTaxYears(entries, payslips)
  const [year, setYear] = useState(years[0])
  const [showAddPayslip, setShowAddPayslip] = useState(false)
  const [viewingReceipt, setViewingReceipt] = useState(null)

  const summary = getPayslipSummary(payslips, year)
  const deductibleExpenses = getTaxDeductibleExpenses(entries, year)
  const deductibleTotal = deductibleExpenses.reduce((t, e) => t + e.amount, 0)

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-sm text-muted">
          Tax year
        </label>
        <div className="relative">
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="num appearance-none border hairline bg-surface pl-3 pr-7 py-1.5 text-sm focus:outline-none focus:border-emerald"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-ink/10 border hairline">
        <div className="bg-surface p-3">
          <div className="text-xs text-muted mb-1">Gross income</div>
          <div className="num text-sm text-emerald">{formatMoney(summary.grossTotal, currency)}</div>
        </div>
        <div className="bg-surface p-3">
          <div className="text-xs text-muted mb-1">Nett income</div>
          <div className="num text-sm">{formatMoney(summary.nettTotal, currency)}</div>
        </div>
        <div className="bg-surface p-3">
          <div className="text-xs text-muted mb-1">Statutory deductions</div>
          <div className="num text-sm text-rust">{formatMoney(summary.deductionsTotal, currency)}</div>
        </div>
        <div className="bg-surface p-3">
          <div className="text-xs text-muted mb-1">Deductible expenses</div>
          <div className="num text-sm text-emerald">{formatMoney(deductibleTotal, currency)}</div>
        </div>
      </div>

      <div className="bg-surface border hairline">
        <div className="flex items-center justify-between p-4 pb-1">
          <h3 className="font-display text-base flex items-center gap-1.5">
            <Landmark size={17} className="text-emerald" strokeWidth={1.75} />
            Payslips
          </h3>
          <button
            onClick={() => setShowAddPayslip(true)}
            className="flex items-center gap-1 text-xs text-emerald border border-emerald px-2 py-1"
          >
            <Plus size={13} /> Add
          </button>
        </div>
        {summary.deductionBreakdown.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {summary.deductionBreakdown.map((d) => (
              <span key={d.label} className="num">
                {d.label}: {formatMoney(d.amount, currency)}
              </span>
            ))}
          </div>
        )}
        {summary.payslips.length === 0 && (
          <div className="p-6 text-sm text-muted flex flex-col items-center gap-2 text-center">
            <Landmark size={28} strokeWidth={1.5} />
            No payslips logged for {year} yet.
          </div>
        )}
        {summary.payslips.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 px-4 py-3 border-b hairline last:border-b-0">
            <div className="min-w-0">
              <div className="text-sm">{p.date}</div>
              <div className="text-xs text-muted num">
                Gross {formatMoney(p.grossSalary, currency)} · Nett {formatMoney(p.nettSalary, currency)}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {p.receiptId && (
                <button
                  onClick={() => setViewingReceipt(p.receiptId)}
                  className="text-muted p-2 -m-2 hover:text-emerald"
                  aria-label={`View payslip photo for ${p.date}`}
                >
                  <Camera size={16} />
                </button>
              )}
              <button
                onClick={() => onRemovePayslip(p.id)}
                className="text-muted p-2 -m-2 hover:text-rust"
                aria-label={`Remove payslip ${p.date}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface border hairline">
        <div className="p-4 pb-1">
          <h3 className="font-display text-base mb-1 flex items-center gap-1.5">
            <ShieldCheck size={17} className="text-emerald" strokeWidth={1.75} />
            Tax-deductible expenses
          </h3>
          <p className="text-xs text-muted">
            Transactions marked "Tax deductible" when logged in Transactions. Total for {year}: {formatMoney(deductibleTotal, currency)}.
          </p>
        </div>
        {deductibleExpenses.length === 0 && (
          <div className="p-6 text-sm text-muted flex flex-col items-center gap-2 text-center">
            <ShieldCheck size={28} strokeWidth={1.5} />
            No tax-deductible expenses tagged for {year} yet.
          </div>
        )}
        {deductibleExpenses.map((e) => {
          const Icon = categoryIcon(e.category)
          return (
            <div key={e.id} className="flex items-center justify-between gap-2 px-4 py-3 border-b hairline last:border-b-0">
              <div className="flex items-center gap-3 min-w-0">
                <Icon size={16} className="text-muted shrink-0" strokeWidth={1.75} />
                <div className="min-w-0">
                  <div className="text-sm truncate">{e.name}</div>
                  <div className="text-xs text-muted">
                    {[e.category, formatDateTime(e.date)].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="num text-sm">{formatMoney(e.amount, currency)}</span>
                {e.receiptId && (
                  <button
                    onClick={() => setViewingReceipt(e.receiptId)}
                    className="text-muted p-2 -m-2 hover:text-emerald"
                    aria-label={`View receipt for ${e.name}`}
                  >
                    <Camera size={16} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showAddPayslip && (
        <AddPayslipModal currency={currency} onAdd={onAddPayslip} onClose={() => setShowAddPayslip(false)} />
      )}

      {viewingReceipt && <ReceiptViewer receiptId={viewingReceipt} onClose={() => setViewingReceipt(null)} />}
    </div>
  )
}
