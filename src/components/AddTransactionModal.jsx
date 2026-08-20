import { useEffect, useState } from 'react'
import {
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  Tag,
  House,
  ShoppingBag,
  Landmark,
  Repeat,
  Wallet,
  ArrowRightLeft,
  CalendarClock,
  Plus,
  Check
} from 'lucide-react'
import { formatMoney, currencySymbol, CURRENCIES, nowLocalISO } from '../lib/finance'
import { makeId } from '../lib/storage'

const BUDGET_GROUP_LABELS = { needs: 'Needs', wants: 'Wants', savings: 'Savings' }
const BUDGET_GROUP_ICONS = { needs: House, wants: ShoppingBag, savings: Landmark }

const TYPES = [
  { key: 'income', label: 'Income', icon: ArrowUpCircle, activeClass: 'border-emerald text-emerald bg-emerald/5' },
  { key: 'expense', label: 'Expense', icon: ArrowDownCircle, activeClass: 'border-rust text-rust bg-rust/5' },
  { key: 'transfer', label: 'Transfer', icon: ArrowLeftRight, activeClass: 'border-ink text-ink bg-ink/5' }
]

const NEW_CATEGORY = '__new__'

export default function AddTransactionModal({ currency, categories, accounts, onAdd, onAddCategory, onClose }) {
  const [type, setType] = useState('expense')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [budgetGroup, setBudgetGroup] = useState('needs')
  const [recurring, setRecurring] = useState(false)
  const [txnCurrency, setTxnCurrency] = useState(currency)
  const [rate, setRate] = useState('')
  const [date, setDate] = useState(nowLocalISO)
  const [accountId, setAccountId] = useState('')
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')

  useEffect(() => {
    setTxnCurrency(currency)
  }, [currency])

  useEffect(() => {
    if (type !== 'expense') {
      setCategory('')
      setAddingCategory(false)
    }
  }, [type])

  const isForeign = txnCurrency !== currency
  const parsedAmount = parseFloat(amount)
  const parsedRate = parseFloat(rate)
  const homeAmount = isForeign ? (parsedAmount > 0 && parsedRate > 0 ? parsedAmount * parsedRate : null) : parsedAmount

  const amountValid = isForeign ? parsedAmount > 0 && parsedRate > 0 : parsedAmount > 0
  const transferValid = type !== 'transfer' || (fromAccountId && toAccountId && fromAccountId !== toAccountId)
  const canSubmit = name.trim() && amountValid && transferValid

  function handleCategorySelect(value) {
    if (value === NEW_CATEGORY) {
      setAddingCategory(true)
      return
    }
    setCategory(value)
  }

  function confirmNewCategory() {
    const trimmed = newCategory.trim()
    if (!trimmed) return
    onAddCategory(trimmed)
    setCategory(trimmed)
    setNewCategory('')
    setAddingCategory(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    const base = {
      id: makeId(),
      name: name.trim(),
      amount: isForeign ? Math.round(homeAmount * 100) / 100 : parsedAmount,
      type,
      budgetGroup: type === 'expense' ? budgetGroup : null,
      category: category || null,
      recurring: type !== 'transfer' && recurring,
      date,
      accountId: type === 'transfer' ? null : accountId || null,
      fromAccountId: type === 'transfer' ? fromAccountId : null,
      toAccountId: type === 'transfer' ? toAccountId : null,
      ...(isForeign ? { foreignCurrency: txnCurrency, foreignAmount: parsedAmount, exchangeRate: parsedRate } : {})
    }
    onAdd(base)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-paper flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b hairline shrink-0">
        <h2 className="font-display text-lg">Log a transaction</h2>
        <button type="button" onClick={onClose} className="p-2 -m-2 text-muted" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 max-w-md mx-auto w-full">
        <div className="flex gap-2">
          {TYPES.map(({ key, label, icon: Icon, activeClass }) => (
            <button
              type="button"
              key={key}
              onClick={() => setType(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] text-sm border ${
                type === key ? activeClass : 'hairline text-muted'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs text-muted mb-1">
            <Tag size={12} />
            Name
          </label>
          <input
            className="w-full border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'income' ? 'e.g. Salary' : type === 'transfer' ? 'e.g. Move to savings' : 'e.g. Groceries'}
          />
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs text-muted mb-1">
            <CalendarClock size={12} />
            Date &amp; time
          </label>
          <input
            type="datetime-local"
            value={date}
            max={nowLocalISO()}
            onChange={(e) => setDate(e.target.value)}
            className="num w-full border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
          />
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
          <div className="bg-surface border hairline p-3 space-y-2">
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
              {homeAmount !== null && <span className="num text-ink">≈ {formatMoney(homeAmount, currency)}</span>}
            </p>
          </div>
        )}

        {type === 'expense' && (
          <div>
            <label className="block text-xs text-muted mb-1">Category</label>
            {!addingCategory ? (
              <select
                value={category}
                onChange={(e) => handleCategorySelect(e.target.value)}
                className="w-full appearance-none border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value={NEW_CATEGORY}>+ Add custom category</option>
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  className="flex-1 border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Subscriptions"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      confirmNewCategory()
                    }
                  }}
                />
                <button type="button" onClick={confirmNewCategory} className="p-2 text-emerald" aria-label="Add category">
                  <Check size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        {type === 'expense' && (
          <div>
            <label className="block text-xs text-muted mb-1">Budget group</label>
            <div className="flex gap-2">
              {Object.entries(BUDGET_GROUP_LABELS).map(([key, label]) => {
                const Icon = BUDGET_GROUP_ICONS[key]
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setBudgetGroup(key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] text-sm border ${
                      budgetGroup === key ? 'border-emerald text-emerald bg-emerald/5' : 'hairline text-muted'
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted mt-1">Feeds the Dashboard's Budget Allocation — separate from Category above.</p>
          </div>
        )}

        {type !== 'transfer' && (
          <div>
            <label className="block text-xs text-muted mb-1">{type === 'income' ? 'Credit to account' : 'Pay from account'}</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full appearance-none border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
              disabled={accounts.length === 0}
            >
              <option value="">{accounts.length === 0 ? 'No accounts set up yet' : 'No account'}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {type === 'transfer' && (
          <div className="space-y-3">
            {accounts.length < 2 && (
              <p className="text-xs text-rust">Add at least two accounts in Settings to log a transfer.</p>
            )}
            <div>
              <label className="block text-xs text-muted mb-1">From account</label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full appearance-none border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
              >
                <option value="">Select account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.id === toAccountId}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">To account</label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full appearance-none border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
              >
                <option value="">Select account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.id === fromAccountId}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {type !== 'transfer' && (
          <label className="flex items-center gap-2 text-sm py-1 min-h-[32px]">
            <input type="checkbox" className="w-4 h-4" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
            <Repeat size={14} className="text-muted" />
            Recurring {type === 'income' ? 'income' : 'commitment'}
          </label>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-1.5 bg-ink text-paper py-3 min-h-[48px] text-sm font-body disabled:opacity-40"
        >
          <Plus size={16} />
          Add {type}
        </button>
      </form>
    </div>
  )
}
