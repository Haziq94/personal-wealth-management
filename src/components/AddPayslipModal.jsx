import { useState } from 'react'
import { X, Wallet, CalendarClock, Plus, Trash2, Camera, ListPlus } from 'lucide-react'
import { formatMoney, currencySymbol } from '../lib/finance'
import { makeId } from '../lib/storage'
import { saveReceipt } from '../lib/receiptStore'

const QUICK_DEDUCTIONS = ['EPF', 'SOCSO', 'EIS', 'PCB (Income Tax)', 'Zakat']

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function AddPayslipModal({ currency, onAdd, onClose }) {
  const [date, setDate] = useState(currentMonth)
  const [grossSalary, setGrossSalary] = useState('')
  const [nettSalary, setNettSalary] = useState('')
  const [deductions, setDeductions] = useState([])
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  const parsedGross = parseFloat(grossSalary)
  const parsedNett = parseFloat(nettSalary)
  const deductionsTotal = deductions.reduce((t, d) => t + (parseFloat(d.amount) || 0), 0)
  const canSubmit = date && parsedGross > 0

  function addDeductionRow(label = '') {
    setDeductions((rows) => [...rows, { id: makeId(), label, amount: '' }])
  }

  function updateDeduction(id, patch) {
    setDeductions((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeDeduction(id) {
    setDeductions((rows) => rows.filter((r) => r.id !== id))
  }

  function handleReceiptChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (receiptPreview) URL.revokeObjectURL(receiptPreview)
    setReceiptFile(file)
    setReceiptPreview(URL.createObjectURL(file))
  }

  function clearReceipt() {
    if (receiptPreview) URL.revokeObjectURL(receiptPreview)
    setReceiptFile(null)
    setReceiptPreview(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit || saving) return
    setSaving(true)
    let receiptId = null
    if (receiptFile) {
      receiptId = makeId()
      await saveReceipt(receiptId, receiptFile)
    }
    onAdd({
      id: makeId(),
      date,
      grossSalary: parsedGross,
      nettSalary: parsedNett > 0 ? parsedNett : parsedGross - deductionsTotal,
      deductions: deductions
        .filter((d) => d.label.trim() && parseFloat(d.amount) > 0)
        .map((d) => ({ label: d.label.trim(), amount: parseFloat(d.amount) })),
      receiptId
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-paper flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b hairline shrink-0">
        <h2 className="font-display text-lg">Log a payslip</h2>
        <button type="button" onClick={onClose} className="p-2 -m-2 text-muted" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 max-w-md mx-auto w-full">
        <div>
          <label className="flex items-center gap-1 text-xs text-muted mb-1">
            <CalendarClock size={12} />
            Pay month
          </label>
          <input
            type="month"
            value={date}
            max={currentMonth()}
            onChange={(e) => setDate(e.target.value)}
            className="num w-full border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1 text-xs text-muted mb-1">
              <Wallet size={12} />
              Gross salary
            </label>
            <div className="flex items-center gap-2">
              <span className="num text-base text-muted">{currencySymbol(currency)}</span>
              <input
                type="number"
                inputMode="decimal"
                className="num flex-1 border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
                value={grossSalary}
                onChange={(e) => setGrossSalary(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Nett salary</label>
            <div className="flex items-center gap-2">
              <span className="num text-base text-muted">{currencySymbol(currency)}</span>
              <input
                type="number"
                inputMode="decimal"
                className="num flex-1 border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
                value={nettSalary}
                onChange={(e) => setNettSalary(e.target.value)}
                placeholder={parsedGross > 0 ? (parsedGross - deductionsTotal).toFixed(2) : '0.00'}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-muted">Deductions</label>
            {deductionsTotal > 0 && <span className="num text-xs text-muted">Total {formatMoney(deductionsTotal, currency)}</span>}
          </div>

          {deductions.map((row) => (
            <div key={row.id} className="flex items-center gap-2 mb-2">
              <input
                className="flex-1 border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
                value={row.label}
                onChange={(e) => updateDeduction(row.id, { label: e.target.value })}
                placeholder="e.g. EPF"
              />
              <input
                type="number"
                inputMode="decimal"
                className="num w-24 border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
                value={row.amount}
                onChange={(e) => updateDeduction(row.id, { amount: e.target.value })}
                placeholder="0.00"
              />
              <button type="button" onClick={() => removeDeduction(row.id)} className="text-muted p-2 -m-2 hover:text-rust" aria-label="Remove deduction">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <div className="flex flex-wrap gap-1.5 mb-2">
            {QUICK_DEDUCTIONS.map((label) => (
              <button
                type="button"
                key={label}
                onClick={() => addDeductionRow(label)}
                className="text-xs border hairline px-2 py-1 text-muted hover:text-emerald hover:border-emerald"
              >
                + {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addDeductionRow('')}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-emerald"
          >
            <ListPlus size={14} />
            Add another deduction
          </button>
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs text-muted mb-1">
            <Camera size={12} />
            Payslip photo (optional)
          </label>
          {!receiptPreview ? (
            <label className="flex items-center justify-center gap-1.5 border hairline py-2.5 text-sm text-muted cursor-pointer">
              <Plus size={14} /> Attach photo
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleReceiptChange} />
            </label>
          ) : (
            <div className="relative inline-block">
              <img src={receiptPreview} alt="Payslip preview" className="h-24 border hairline object-cover" />
              <button
                type="button"
                onClick={clearReceipt}
                className="absolute -top-2 -right-2 bg-ink text-paper rounded-full p-1"
                aria-label="Remove photo"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="w-full flex items-center justify-center gap-1.5 bg-ink text-paper py-3 min-h-[48px] text-sm font-body disabled:opacity-40"
        >
          <Plus size={16} />
          {saving ? 'Saving…' : 'Add payslip'}
        </button>
      </form>
    </div>
  )
}
