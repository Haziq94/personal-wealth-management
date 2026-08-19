import { useEffect, useState } from 'react'
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Tag,
  House,
  ShoppingBag,
  Landmark,
  Repeat,
  ListPlus,
  Receipt,
  Trash2,
  Wallet,
  ArrowRightLeft,
  CalendarDays
} from 'lucide-react'
import { formatMoney, currencySymbol, CURRENCIES, todayISO } from '../lib/finance'
import { makeId } from '../lib/storage'

const CATEGORY_LABELS = { needs: 'Needs', wants: 'Wants', savings: 'Savings' }
const CATEGORY_ICONS = { needs: House, wants: ShoppingBag, savings: Landmark }

function formatShortDate(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Transactions({ currency, entries, onAdd, onRemove }) {
  const [type, setType] = useState('expense')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('needs')
  const [recurring, setRecurring] = useState(false)
  const [txnCurrency, setTxnCurrency] = useState(currency)
  const [rate, setRate] = useState('')
  const [date, setDate] = useState(todayISO)

  useEffect(() => {
    setTxnCurrency(currency)
  }, [currency])

  const isForeign = txnCurrency !== currency
  const parsedAmount = parseFloat(amount)
  const parsedRate = parseFloat(rate)
  const homeAmount = isForeign
    ? parsedAmount > 0 && parsedRate > 0
      ? parsedAmount * parsedRate
      : null
    : parsedAmount

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (!isForeign) {
      if (!parsedAmount || parsedAmount <= 0) return
      onAdd({
        id: makeId(),
        name: name.trim(),
        amount: parsedAmount,
        type,
        category: type === 'income' ? null : category,
        recurring,
        date
      })
    } else {
      if (!parsedAmount || parsedAmount <= 0 || !parsedRate || parsedRate <= 0) return
      onAdd({
        id: makeId(),
        name: name.trim(),
        amount: Math.round(homeAmount * 100) / 100,
        type,
        category: type === 'income' ? null : category,
        recurring,
        date,
        foreignCurrency: txnCurrency,
        foreignAmount: parsedAmount,
        exchangeRate: parsedRate
      })
    }
    setName('')
    setAmount('')
    setRate('')
    setRecurring(false)
    setTxnCurrency(currency)
    setDate(todayISO())
  }

  const sorted = [...entries].reverse().sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="bg-surface border hairline p-4 space-y-3">
        <h3 className="font-display text-base flex items-center gap-1.5">
          <ListPlus size={18} className="text-emerald" strokeWidth={1.75} />
          Log a transaction
        </h3>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] text-sm border ${
              type === 'income' ? 'border-emerald text-emerald bg-emerald/5' : 'hairline text-muted'
            }`}
          >
            <ArrowUpCircle size={16} />
            Income
          </button>
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] text-sm border ${
              type === 'expense' ? 'border-rust text-rust bg-rust/5' : 'hairline text-muted'
            }`}
          >
            <ArrowDownCircle size={16} />
            Expense
          </button>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div>
            <label className="flex items-center gap-1 text-xs text-muted mb-1">
              <Tag size={12} />
              Name
            </label>
            <input
              className="w-full border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'income' ? 'e.g. Salary' : 'e.g. Groceries'}
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs text-muted mb-1">
              <CalendarDays size={12} />
              Date
            </label>
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="num border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
            />
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div>
            <label className="flex items-center gap-1 text-xs text-muted mb-1">
              <Wallet size={12} />
              Amount {isForeign && `(${txnCurrency})`}
            </label>
            <div className="flex items-center gap-2">
              <span className="num text-base text-muted">{currencySymbol(txnCurrency)}</span>
              <input
                type="number"
                inputMode="decimal"
                className="num flex-1 border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Currency</label>
            <select
              value={txnCurrency}
              onChange={(e) => setTxnCurrency(e.target.value)}
              className="border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
            >
              {Object.keys(CURRENCIES).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isForeign && (
          <div className="bg-paper border hairline p-3 space-y-2">
            <label className="flex items-center gap-1 text-xs text-muted">
              <ArrowRightLeft size={12} />
              Exchange rate — 1 {txnCurrency} = ? {currency}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.0001"
              className="num w-full border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 4.70"
            />
            <p className="text-xs text-muted">
              Use the rate at the time of this transaction.{' '}
              {homeAmount !== null && (
                <span className="num text-ink">≈ {formatMoney(homeAmount, currency)}</span>
              )}
            </p>
          </div>
        )}

        {type === 'expense' && (
          <div>
            <label className="block text-xs text-muted mb-1">Category</label>
            <div className="flex gap-2">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                const Icon = CATEGORY_ICONS[key]
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setCategory(key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] text-sm border ${
                      category === key ? 'border-emerald text-emerald bg-emerald/5' : 'hairline text-muted'
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm py-1 min-h-[32px]">
          <input type="checkbox" className="w-4 h-4" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
          <Repeat size={14} className="text-muted" />
          Recurring {type === 'income' ? 'income' : 'commitment'}
        </label>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-1.5 bg-ink text-paper py-3 min-h-[48px] text-sm font-body"
        >
          {type === 'income' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
          Add {type === 'income' ? 'income' : 'expense'}
        </button>
      </form>

      <div className="bg-surface border hairline">
        {sorted.length === 0 && (
          <div className="p-6 text-sm text-muted flex flex-col items-center gap-2 text-center">
            <Receipt size={28} strokeWidth={1.5} />
            No transactions logged yet.
          </div>
        )}
        {sorted.map((entry) => {
          const CatIcon = entry.type === 'income' ? ArrowUpCircle : CATEGORY_ICONS[entry.category]
          return (
            <div key={entry.id} className="flex items-center justify-between gap-2 px-4 py-3 border-b hairline last:border-b-0">
              <div className="flex items-center gap-3 min-w-0">
                <CatIcon size={18} className={entry.type === 'income' ? 'text-emerald shrink-0' : 'text-muted shrink-0'} strokeWidth={1.75} />
                <div className="min-w-0">
                  <div className="text-sm truncate">{entry.name}</div>
                  <div className="text-xs text-muted flex items-center gap-1 flex-wrap">
                    {entry.type === 'income' ? 'Income' : CATEGORY_LABELS[entry.category]}
                    {entry.date && <span className="num">· {formatShortDate(entry.date)}</span>}
                    {entry.recurring && (
                      <span className="flex items-center gap-0.5">
                        <Repeat size={10} /> recurring
                      </span>
                    )}
                    {entry.foreignCurrency && (
                      <span className="num flex items-center gap-0.5">
                        <ArrowRightLeft size={10} />
                        {currencySymbol(entry.foreignCurrency)} {entry.foreignAmount.toFixed(2)} @ {entry.exchangeRate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`num text-sm ${entry.type === 'income' ? 'text-emerald' : 'text-ink'}`}>
                  {entry.type === 'income' ? '+' : '-'}
                  {formatMoney(entry.amount, currency)}
                </span>
                <button
                  onClick={() => onRemove(entry.id)}
                  className="text-muted p-2 -m-2 hover:text-rust"
                  aria-label={`Remove ${entry.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
