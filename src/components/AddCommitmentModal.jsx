import { useState } from 'react'
import { X, Wallet, CalendarClock, Plus, Check, Tag, Landmark } from 'lucide-react'
import { currencySymbol } from '../lib/finance'
import { makeId } from '../lib/storage'

const NEW_CATEGORY = '__new__'

export default function AddCommitmentModal({ currency, categories, accounts, existing, onSave, onAddCategory, onClose }) {
  const [name, setName] = useState(existing?.name ?? '')
  const [monthlyPayment, setMonthlyPayment] = useState(existing?.monthlyPayment ? String(existing.monthlyPayment) : '')
  const [dueDay, setDueDay] = useState(existing?.dueDay ? String(existing.dueDay) : '')
  const [balance, setBalance] = useState(existing?.balance != null ? String(existing.balance) : '')
  const [category, setCategory] = useState(existing?.category ?? '')
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [accountId, setAccountId] = useState(existing?.accountId ?? '')

  const parsedPayment = parseFloat(monthlyPayment)
  const parsedDueDay = parseInt(dueDay, 10)
  const canSubmit = name.trim() && parsedPayment > 0

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
    onSave({
      id: existing?.id ?? makeId(),
      name: name.trim(),
      monthlyPayment: parsedPayment,
      dueDay: parsedDueDay >= 1 && parsedDueDay <= 31 ? parsedDueDay : null,
      balance: balance.trim() !== '' && !isNaN(parseFloat(balance)) ? parseFloat(balance) : null,
      category: category || null,
      accountId: accountId || null,
      lastPaidPeriod: existing?.lastPaidPeriod ?? null
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-paper flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b hairline shrink-0">
        <h2 className="font-display text-lg">{existing ? 'Edit commitment' : 'Log a commitment'}</h2>
        <button type="button" onClick={onClose} className="p-2 -m-2 text-muted" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 max-w-md mx-auto w-full">
        <div>
          <label className="flex items-center gap-1 text-xs text-muted mb-1">
            <Tag size={12} />
            Name
          </label>
          <input
            className="w-full border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Car loan, Rent, Netflix"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1 text-xs text-muted mb-1">
              <Wallet size={12} />
              Monthly payment
            </label>
            <div className="flex items-center gap-2">
              <span className="num text-base text-muted">{currencySymbol(currency)}</span>
              <input
                type="number"
                inputMode="decimal"
                className="num flex-1 border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs text-muted mb-1">
              <CalendarClock size={12} />
              Due day
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="31"
              className="num w-full border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              placeholder="e.g. 5"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Outstanding balance (optional)</label>
          <div className="flex items-center gap-2">
            <span className="num text-base text-muted">{currencySymbol(currency)}</span>
            <input
              type="number"
              inputMode="decimal"
              className="num flex-1 border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="e.g. remaining loan principal"
            />
          </div>
          <p className="text-xs text-muted mt-1">
            For a loan — shrinks by the monthly payment each time you mark it paid. Leave blank for rent, subscriptions, etc.
          </p>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Category (optional)</label>
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
                placeholder="e.g. Loan"
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

        <div>
          <label className="flex items-center gap-1 text-xs text-muted mb-1">
            <Landmark size={12} />
            Pay from account
          </label>
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

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-1.5 bg-ink text-paper py-3 min-h-[48px] text-sm font-body disabled:opacity-40"
        >
          <Plus size={16} />
          {existing ? 'Save changes' : 'Add commitment'}
        </button>
      </form>
    </div>
  )
}
