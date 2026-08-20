import { useState } from 'react'
import { Landmark, Trash2, Wallet, Info, Plus, Check, Tag } from 'lucide-react'
import { formatMoney, getAccountBalances } from '../lib/finance'
import { makeId } from '../lib/storage'

const NEW_TYPE = '__new__'

export default function Savings({ currency, entries, accounts, accountTypes, onAddAccount, onRemoveAccount, onAddAccountType }) {
  const [name, setName] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')
  const [type, setType] = useState('')
  const [addingType, setAddingType] = useState(false)
  const [newType, setNewType] = useState('')

  const savingsAccounts = accounts.filter((a) => a.isSavings)
  const balances = getAccountBalances(entries, savingsAccounts)
  const total = balances.reduce((sum, a) => sum + a.balance, 0)

  function handleTypeSelect(value) {
    if (value === NEW_TYPE) {
      setAddingType(true)
      return
    }
    setType(value)
  }

  function confirmNewType() {
    const trimmed = newType.trim()
    if (!trimmed) return
    onAddAccountType(trimmed)
    setType(trimmed)
    setNewType('')
    setAddingType(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    onAddAccount({
      id: makeId(),
      name: trimmedName,
      openingBalance: parseFloat(openingBalance) || 0,
      type: type || null,
      isSavings: true
    })
    setName('')
    setOpeningBalance('')
    setType('')
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface border hairline p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
          <Landmark size={13} />
          Total across savings &amp; investment accounts
        </div>
        <div className="num text-2xl text-emerald">{formatMoney(total, currency)}</div>
      </div>

      <div className="bg-surface border hairline">
        {savingsAccounts.length === 0 && (
          <div className="p-6 text-sm text-muted flex flex-col items-center gap-2 text-center">
            <Landmark size={28} strokeWidth={1.5} />
            No savings or investment accounts yet. Add a bank account, gold reserve, unit trust, ASNB — whatever you actually use.
          </div>
        )}
        {balances.map((a) => (
          <div key={a.id} className="flex items-center justify-between px-4 py-3 border-b hairline last:border-b-0">
            <div className="flex items-center gap-3 min-w-0">
              <Landmark size={18} className="text-emerald shrink-0" strokeWidth={1.75} />
              <div className="min-w-0">
                <div className="text-sm truncate">{a.name}</div>
                {a.type && <div className="text-xs text-muted">{a.type}</div>}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="num text-sm">{formatMoney(a.balance, currency)}</span>
              <button
                onClick={() => onRemoveAccount(a.id)}
                className="text-muted p-2 -m-2 hover:text-rust"
                aria-label={`Remove ${a.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-surface border hairline p-4 space-y-3">
        <h3 className="font-display text-base flex items-center gap-1.5">
          <Plus size={18} className="text-emerald" strokeWidth={1.75} />
          Add a savings or investment account
        </h3>
        <div>
          <label className="flex items-center gap-1 text-xs text-muted mb-1">
            <Landmark size={12} />
            Name
          </label>
          <input
            className="w-full border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ASNB, Public Gold, Maybank Savings"
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-xs text-muted mb-1">
            <Wallet size={12} />
            Current balance
          </label>
          <div className="flex items-center gap-2">
            <span className="num text-base text-muted">{formatMoney(0, currency).split(' ')[0]}</span>
            <input
              type="number"
              inputMode="decimal"
              className="num flex-1 border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        <div>
          <label className="flex items-center gap-1 text-xs text-muted mb-1">
            <Tag size={12} />
            Type (optional)
          </label>
          {!addingType ? (
            <select
              value={type}
              onChange={(e) => handleTypeSelect(e.target.value)}
              className="w-full appearance-none border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
            >
              <option value="">No type</option>
              {accountTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value={NEW_TYPE}>+ Add custom type</option>
            </select>
          ) : (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                className="flex-1 border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                placeholder="e.g. Gold Reserve, Unit Trust, ASNB"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    confirmNewType()
                  }
                }}
              />
              <button type="button" onClick={confirmNewType} className="p-2 text-emerald" aria-label="Add type">
                <Check size={18} />
              </button>
            </div>
          )}
          <p className="text-xs text-muted mt-1">
            Only types you've actually added ever show up here — nothing preset to sift through.
          </p>
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-1.5 bg-ink text-paper py-3 min-h-[48px] text-sm font-body"
        >
          <Plus size={16} />
          Add account
        </button>
      </form>

      <div className="bg-ink/5 border hairline p-4 text-xs text-muted leading-relaxed flex gap-2">
        <Info size={14} className="shrink-0 mt-0.5" />
        Rule of thumb: build 3–6 months of essential expenses into an accessible account before locking money into
        longer-term investments.
      </div>
    </div>
  )
}
