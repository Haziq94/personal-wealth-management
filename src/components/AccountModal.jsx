import { useState } from 'react'
import { X, Check, Plus, Wallet2 } from 'lucide-react'

const NEW_TYPE = '__new__'

// Credit card, loan and BNPL are all debts entered as an amount owed.
function isLiabilityKind(kind) {
  return kind === 'credit' || kind === 'loan' || kind === 'bnpl'
}

// Recover the editable "kind" from the flags stored on an account. Loan and BNPL
// share the isLiability flag, so the type label is what tells them apart.
function kindOf(account) {
  if (!account) return 'cash'
  if (account.isSavings) return 'savings'
  if (account.isCredit) return 'credit'
  if (account.isLiability) return account.type === 'BNPL' ? 'bnpl' : 'loan'
  return 'cash'
}

function sanitizeLast4(value) {
  return value.replace(/\D/g, '').slice(0, 4)
}

// Handles both adding a new account (account = null) and editing an existing one.
// onSubmit(patch, id) — id is null when adding, so the parent creates it there.
export default function AccountModal({ account = null, accountTypes, onSubmit, onAddAccountType, onClose }) {
  const editing = !!account
  const [name, setName] = useState(account?.name || '')
  const [kind, setKind] = useState(kindOf(account))
  // The stored opening balance is negative for debts; the field shows the plain
  // amount and the sign is re-applied on save.
  const [balance, setBalance] = useState(account ? String(Math.abs(account.openingBalance ?? 0)) : '')
  const [type, setType] = useState(account?.type || '')
  const [addingType, setAddingType] = useState(false)
  const [newType, setNewType] = useState('')
  const [last4, setLast4] = useState(account?.last4 || '')
  const [excluded, setExcluded] = useState(!!account?.excludeFromFunds)

  const owed = isLiabilityKind(kind)

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
    const trimmed = name.trim()
    if (!trimmed) return
    const entered = parseFloat(balance) || 0
    onSubmit(
      {
        name: trimmed,
        openingBalance: owed ? -Math.abs(entered) : entered,
        type: type || (kind === 'loan' ? 'Loan' : kind === 'bnpl' ? 'BNPL' : null),
        isSavings: kind === 'savings',
        isCredit: kind === 'credit',
        isLiability: kind === 'loan' || kind === 'bnpl',
        excludeFromFunds: excluded,
        // Any account may carry a card ending, not just credit cards.
        last4: /^\d{4}$/.test(last4) ? last4 : null
      },
      account?.id ?? null
    )
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-paper flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b hairline shrink-0">
        <h2 className="font-display text-lg flex items-center gap-1.5">
          <Wallet2 size={18} className="text-emerald" strokeWidth={1.75} />
          {editing ? 'Edit account' : 'Add account'}
        </h2>
        <button type="button" onClick={onClose} className="p-2 -m-2 text-muted" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 max-w-md mx-auto w-full">
        <div>
          <label className="block text-xs text-muted mb-1">Account name</label>
          <input
            autoFocus
            className="w-full border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Maybank"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Account kind</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full appearance-none border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
          >
            <option value="cash">Cash / bank account — money you hold</option>
            <option value="savings">Savings / investment account — money you hold</option>
            <option value="credit">Credit card — money you owe</option>
            <option value="loan">Loan — money you owe</option>
            <option value="bnpl">Buy now, pay later — money you owe</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">{owed ? 'Owed now' : editing ? 'Opening balance' : 'Balance'}</label>
          <input
            type="number"
            inputMode="decimal"
            className="num w-full border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0.00"
          />
          {editing && (
            <p className="text-xs text-muted mt-1">
              The starting figure this account was created with. Logged transactions still adjust it from here.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Card ends in (optional)</label>
          <input
            className="num w-20 border-b hairline bg-transparent py-2 text-base focus:outline-none focus:border-emerald"
            inputMode="numeric"
            maxLength={4}
            value={last4}
            onChange={(e) => setLast4(sanitizeLast4(e.target.value))}
            placeholder="1234"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Type (optional)</label>
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
        </div>

        <label className="flex items-center gap-2 text-sm py-1 min-h-[32px]">
          <input type="checkbox" className="w-4 h-4" checked={excluded} onChange={(e) => setExcluded(e.target.checked)} />
          Leave out of net worth
        </label>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-1.5 bg-ink text-paper py-3 min-h-[48px] text-sm font-body"
        >
          {editing ? <Check size={16} /> : <Plus size={16} />}
          {editing ? 'Save changes' : 'Add account'}
        </button>
      </form>
    </div>
  )
}
