import { useRef, useState } from 'react'
import { Wallet2, CreditCard, Tags, Landmark, Plus, Pencil, Check, X, Info } from 'lucide-react'
import { formatMoney, getAccountBalances, accountBalanceView, getNetWorth } from '../lib/finance'
import { makeId } from '../lib/storage'
import EditAccountModal from './EditAccountModal'

const NEW_TYPE = '__new__'

// Credit card, loan and BNPL are all debts entered as an amount owed.
function isLiabilityKind(kind) {
  return kind === 'credit' || kind === 'loan' || kind === 'bnpl'
}

function sanitizeLast4(value) {
  return value.replace(/\D/g, '').slice(0, 4)
}

export default function Accounts({
  currency,
  entries,
  accounts,
  accountTypes,
  onAddAccount,
  onUpdateAccount,
  onRemoveAccount,
  onAddAccountType,
  onRemoveAccountType
}) {
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountBalance, setNewAccountBalance] = useState('')
  const [newAccountType, setNewAccountType] = useState('')
  const [addingAccountType, setAddingAccountType] = useState(false)
  const [newTypeInput, setNewTypeInput] = useState('')
  const [newAccountKind, setNewAccountKind] = useState('cash')
  const [newAccountLast4, setNewAccountLast4] = useState('')
  const [newAccountExcluded, setNewAccountExcluded] = useState(false)
  const [last4Drafts, setLast4Drafts] = useState({})
  const [editingAccount, setEditingAccount] = useState(null)
  const addNameRef = useRef(null)

  const accountBalances = getAccountBalances(entries, accounts)
  const netWorth = getNetWorth(entries, accounts)
  const savingsTotal = accountBalances
    .filter((a) => a.isSavings)
    .reduce((sum, a) => sum + a.balance, 0)

  function handleAddAccount(e) {
    e.preventDefault()
    const trimmed = newAccountName.trim()
    if (!trimmed) return
    const entered = parseFloat(newAccountBalance) || 0
    const owed = isLiabilityKind(newAccountKind)
    onAddAccount({
      id: makeId(),
      name: trimmed,
      openingBalance: owed ? -Math.abs(entered) : entered,
      type: newAccountType || (newAccountKind === 'loan' ? 'Loan' : newAccountKind === 'bnpl' ? 'BNPL' : null),
      isSavings: newAccountKind === 'savings',
      isCredit: newAccountKind === 'credit',
      isLiability: newAccountKind === 'loan' || newAccountKind === 'bnpl',
      excludeFromFunds: newAccountExcluded,
      last4: newAccountKind === 'credit' && /^\d{4}$/.test(newAccountLast4) ? newAccountLast4 : null
    })
    setNewAccountName('')
    setNewAccountBalance('')
    setNewAccountType('')
    setNewAccountKind('cash')
    setNewAccountLast4('')
    setNewAccountExcluded(false)
  }

  // Only a complete 4-digit value is worth storing, but half-typed input still
  // has to stay on screen — hence a local draft alongside the saved value.
  function last4Value(account) {
    return last4Drafts[account.id] !== undefined ? last4Drafts[account.id] : account.last4 || ''
  }

  function handleLast4Change(id, raw) {
    const digits = sanitizeLast4(raw)
    setLast4Drafts((drafts) => ({ ...drafts, [id]: digits }))
    onUpdateAccount(id, { last4: digits.length === 4 ? digits : null })
  }

  function handleAccountTypeSelect(value) {
    if (value === NEW_TYPE) {
      setAddingAccountType(true)
      return
    }
    setNewAccountType(value)
  }

  function confirmNewAccountType() {
    const trimmed = newTypeInput.trim()
    if (!trimmed) return
    onAddAccountType(trimmed)
    setNewAccountType(trimmed)
    setNewTypeInput('')
    setAddingAccountType(false)
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface border hairline p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
          <Wallet2 size={13} />
          Net worth
        </div>
        <div className={`num text-2xl ${netWorth.net < 0 ? 'text-rust' : 'text-emerald'}`}>
          {formatMoney(netWorth.net, currency)}
        </div>
        {netWorth.debts > 0 && (
          <div className="num text-[11px] text-muted mt-0.5">
            {formatMoney(netWorth.assets, currency)} assets − {formatMoney(netWorth.debts, currency)} owed
          </div>
        )}
      </div>

      <div className="bg-surface border hairline p-4 space-y-3">
        <h3 className="font-display text-base flex items-center gap-1.5">
          <Wallet2 size={18} className="text-emerald" strokeWidth={1.75} />
          Accounts
        </h3>
        <p className="text-xs text-muted">
          Track balances across your bank accounts, cash and e-wallets. Credit cards, loans and BNPL work the other
          way round — spending on one adds to what you owe instead of drawing down a balance.
        </p>
        {accountBalances.length > 0 && (
          <div className="border hairline divide-y hairline">
            {accountBalances.map((a) => {
              const view = accountBalanceView(a)
              return (
                <div key={a.id} className="flex items-center justify-between px-3 py-2">
                  <div className="min-w-0">
                    <span className="text-sm">{a.name}</span>
                    <div className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
                      {(a.type || a.isSavings || a.isCredit || a.isLiability || a.excludeFromFunds) && (
                        <span>
                          {[a.type, a.isSavings && 'Savings', a.isCredit && !a.type && 'Credit card', a.excludeFromFunds && 'Not in net worth']
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      )}
                      {a.isCredit && (
                        <span className="flex items-center gap-1">
                          <CreditCard size={11} />
                          ••••
                          <input
                            className="num w-9 border-b hairline bg-transparent text-xs py-0.5 focus:outline-none focus:border-emerald"
                            inputMode="numeric"
                            maxLength={4}
                            value={last4Value(a)}
                            placeholder="1234"
                            aria-label={`Last 4 card digits for ${a.name}`}
                            onChange={(e) => handleLast4Change(a.id, e.target.value)}
                          />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`num text-sm ${view.tone}`}>
                      {formatMoney(view.amount, currency)}
                      {view.label && <span className="text-muted"> {view.label}</span>}
                    </span>
                    <button onClick={() => setEditingAccount(a)} className="text-muted p-1 -m-1 hover:text-emerald" aria-label={`Edit ${a.name}`}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => onRemoveAccount(a.id)} className="text-muted p-1 -m-1 hover:text-rust" aria-label={`Remove ${a.name}`}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <form onSubmit={handleAddAccount} className="space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs text-muted mb-1">Account name</label>
              <input
                ref={addNameRef}
                className="w-full border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="e.g. Maybank"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs text-muted mb-1">
                {isLiabilityKind(newAccountKind) ? 'Owed now' : 'Balance'}
              </label>
              <input
                type="number"
                inputMode="decimal"
                className="num w-full border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
                value={newAccountBalance}
                onChange={(e) => setNewAccountBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <select
            value={newAccountKind}
            onChange={(e) => setNewAccountKind(e.target.value)}
            className="w-full appearance-none border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
          >
            <option value="cash">Cash / bank account — money you hold</option>
            <option value="savings">Savings / investment account — money you hold</option>
            <option value="credit">Credit card — money you owe</option>
            <option value="loan">Loan — money you owe</option>
            <option value="bnpl">Buy now, pay later — money you owe</option>
          </select>
          {newAccountKind === 'credit' && (
            <div>
              <label className="block text-xs text-muted mb-1">Card ends in (optional)</label>
              <input
                className="num w-20 border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
                inputMode="numeric"
                maxLength={4}
                value={newAccountLast4}
                onChange={(e) => setNewAccountLast4(sanitizeLast4(e.target.value))}
                placeholder="1234"
              />
            </div>
          )}
          {!addingAccountType ? (
            <select
              value={newAccountType}
              onChange={(e) => handleAccountTypeSelect(e.target.value)}
              className="w-full appearance-none border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
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
                className="flex-1 border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
                value={newTypeInput}
                onChange={(e) => setNewTypeInput(e.target.value)}
                placeholder="e.g. Gold Reserve, Unit Trust, ASNB"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    confirmNewAccountType()
                  }
                }}
              />
              <button type="button" onClick={confirmNewAccountType} className="p-2 text-emerald" aria-label="Add type">
                <Check size={18} />
              </button>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm py-1 min-h-[32px]">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={newAccountExcluded}
              onChange={(e) => setNewAccountExcluded(e.target.checked)}
            />
            Leave out of net worth
          </label>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1.5 border hairline py-2.5 min-h-[44px] text-sm text-emerald hover:border-emerald"
          >
            <Plus size={16} />
            Add account
          </button>
        </form>
      </div>

      <div className="bg-surface border hairline p-4 space-y-2">
        <h3 className="font-display text-base flex items-center gap-1.5">
          <Landmark size={18} className="text-emerald" strokeWidth={1.75} />
          Savings &amp; investing
        </h3>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted">Total across savings &amp; investment accounts</span>
          <span className="num text-lg text-emerald">{formatMoney(savingsTotal, currency)}</span>
        </div>
        <p className="text-xs text-muted leading-relaxed flex gap-2 pt-1">
          <Info size={14} className="shrink-0 mt-0.5" />
          Rule of thumb: build 3–6 months of essential expenses into an accessible account before locking money into
          longer-term investments. Add an account above and set its kind to “Savings / investment” to count it here.
        </p>
      </div>

      <div className="bg-surface border hairline p-4 space-y-3">
        <h3 className="font-display text-base flex items-center gap-1.5">
          <Tags size={18} className="text-emerald" strokeWidth={1.75} />
          Account types
        </h3>
        <p className="text-xs text-muted">
          Optional labels for accounts — Bank Account, Gold Reserve, Unit Trust, ASNB, whatever you actually use.
          Nothing preset; add only what applies.
        </p>
        {accountTypes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {accountTypes.map((t) => (
              <span key={t} className="flex items-center gap-1.5 border hairline pl-2.5 pr-1.5 py-1 text-sm">
                {t}
                <button onClick={() => onRemoveAccountType(t)} className="text-muted p-0.5 hover:text-rust" aria-label={`Remove ${t}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {editingAccount && (
        <EditAccountModal
          account={editingAccount}
          accountTypes={accountTypes}
          onSave={onUpdateAccount}
          onAddAccountType={onAddAccountType}
          onClose={() => setEditingAccount(null)}
        />
      )}
    </div>
  )
}
