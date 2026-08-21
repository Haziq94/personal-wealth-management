import { useState } from 'react'
import {
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  Repeat,
  Receipt,
  Trash2,
  ArrowRightLeft,
  Plus,
  Wallet2,
  Camera,
  ShieldCheck
} from 'lucide-react'
import { formatMoney, currencySymbol, formatDateTime, getAccountBalances, accountBalanceView } from '../lib/finance'
import { categoryIcon } from '../lib/categoryIcons'
import { makeId } from '../lib/storage'
import AddTransactionModal from './AddTransactionModal'
import ReceiptViewer from './ReceiptViewer'
import PendingReview from './PendingReview'

function accountName(accounts, id) {
  return accounts.find((a) => a.id === id)?.name ?? 'account'
}

export default function Transactions({
  currency,
  entries,
  accounts,
  categories,
  onAdd,
  onRemove,
  onAddCategory,
  onAddAccount,
  pending = [],
  onConfirmPending,
  onDiscardPending
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [addingAccount, setAddingAccount] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountBalance, setNewAccountBalance] = useState('')
  const [newAccountIsCredit, setNewAccountIsCredit] = useState(false)
  const [viewingReceipt, setViewingReceipt] = useState(null)
  const balances = getAccountBalances(entries, accounts)
  const sorted = [...entries].reverse().sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  function handleAddAccount(e) {
    e.preventDefault()
    const trimmed = newAccountName.trim()
    if (!trimmed) return
    const entered = parseFloat(newAccountBalance) || 0
    onAddAccount({
      id: makeId(),
      name: trimmed,
      openingBalance: newAccountIsCredit ? -Math.abs(entered) : entered,
      isCredit: newAccountIsCredit
    })
    setNewAccountName('')
    setNewAccountBalance('')
    setNewAccountIsCredit(false)
    setAddingAccount(false)
  }

  return (
    <div className="space-y-4 pb-20">
      <PendingReview
        pending={pending}
        currency={currency}
        accounts={accounts}
        categories={categories}
        onConfirm={onConfirmPending}
        onDiscard={onDiscardPending}
      />

      <div className="bg-surface border hairline">
        <div className="flex items-center gap-1.5 text-xs text-muted px-4 pt-3">
          <Wallet2 size={13} />
          Account balances
        </div>
        <div className="flex overflow-x-auto gap-px bg-ink/10 mt-2">
          {balances.map((a) => {
            const view = accountBalanceView(a)
            return (
              <div key={a.id} className="bg-surface p-3 min-w-[130px] shrink-0">
                <div className="text-xs text-muted truncate">{a.name}</div>
                <div className={`num text-sm ${view.tone}`}>{formatMoney(view.amount, currency)}</div>
                <div className="text-[10px] text-muted flex items-center gap-1">
                  {view.label}
                  {a.last4 && <span className="num">•••• {a.last4}</span>}
                </div>
              </div>
            )
          })}
          <button
            onClick={() => setAddingAccount(true)}
            className="bg-surface p-3 min-w-[64px] shrink-0 flex flex-col items-center justify-center text-muted hover:text-emerald"
            aria-label="Add account"
          >
            <Plus size={18} />
          </button>
        </div>
        {addingAccount && (
          <form onSubmit={handleAddAccount} className="p-3 border-t hairline space-y-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs text-muted mb-1">Account name</label>
                <input
                  autoFocus
                  className="w-full border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="e.g. Maybank"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs text-muted mb-1">{newAccountIsCredit ? 'Owed now' : 'Balance'}</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="num w-full border-b hairline bg-transparent py-2 text-sm focus:outline-none focus:border-emerald"
                  value={newAccountBalance}
                  onChange={(e) => setNewAccountBalance(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <button type="submit" className="p-2.5 border hairline text-emerald" aria-label="Save account">
                <Plus size={16} />
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm py-1 min-h-[32px]">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={newAccountIsCredit}
                onChange={(e) => setNewAccountIsCredit(e.target.checked)}
              />
              Credit card — money you owe
            </label>
          </form>
        )}
      </div>

      <div className="bg-surface border hairline">
        {sorted.length === 0 && (
          <div className="p-6 text-sm text-muted flex flex-col items-center gap-2 text-center">
            <Receipt size={28} strokeWidth={1.5} />
            No transactions logged yet. Tap + to add one.
          </div>
        )}
        {sorted.map((entry) => {
          const TypeIcon =
            entry.type === 'income' ? ArrowUpCircle : entry.type === 'transfer' ? ArrowLeftRight : categoryIcon(entry.category)
          const iconTone =
            entry.type === 'income' ? 'text-emerald' : entry.type === 'transfer' ? 'text-ink' : 'text-muted'
          const amountTone = entry.type === 'income' ? 'text-emerald' : entry.type === 'transfer' ? 'text-ink' : 'text-ink'
          const sign = entry.type === 'income' ? '+' : entry.type === 'transfer' ? '' : '-'
          return (
            <div key={entry.id} className="flex items-center justify-between gap-2 px-4 py-3 border-b hairline last:border-b-0">
              <div className="flex items-center gap-3 min-w-0">
                <TypeIcon size={18} className={`${iconTone} shrink-0`} strokeWidth={1.75} />
                <div className="min-w-0">
                  <div className="text-sm truncate">{entry.name}</div>
                  <div className="text-xs text-muted flex items-center gap-1 flex-wrap">
                    {entry.type === 'transfer' ? (
                      <span>
                        {accountName(accounts, entry.fromAccountId)} → {accountName(accounts, entry.toAccountId)}
                      </span>
                    ) : (
                      [entry.category, entry.accountId ? accountName(accounts, entry.accountId) : null]
                        .filter(Boolean)
                        .map((part, i) => <span key={i}>{i > 0 && '· '}{part}</span>)
                    )}
                    {entry.date && <span className="num">· {formatDateTime(entry.date)}</span>}
                    {entry.recurring && (
                      <span className="flex items-center gap-0.5">
                        <Repeat size={10} /> recurring
                      </span>
                    )}
                    {entry.taxDeductible && (
                      <span className="flex items-center gap-0.5 text-emerald">
                        <ShieldCheck size={10} /> tax
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
                <span className={`num text-sm ${amountTone}`}>
                  {sign}
                  {formatMoney(entry.amount, currency)}
                </span>
                {entry.receiptId && (
                  <button
                    onClick={() => setViewingReceipt(entry.receiptId)}
                    className="text-muted p-2 -m-2 hover:text-emerald"
                    aria-label={`View receipt for ${entry.name}`}
                  >
                    <Camera size={16} />
                  </button>
                )}
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

      <button
        onClick={() => setShowAdd(true)}
        className="fixed right-4 bottom-24 w-14 h-14 rounded-full bg-ink text-paper flex items-center justify-center z-20"
        aria-label="Add transaction"
      >
        <Plus size={24} />
      </button>

      {showAdd && (
        <AddTransactionModal
          currency={currency}
          categories={categories}
          accounts={accounts}
          onAdd={onAdd}
          onAddCategory={onAddCategory}
          onClose={() => setShowAdd(false)}
        />
      )}

      {viewingReceipt && <ReceiptViewer receiptId={viewingReceipt} onClose={() => setViewingReceipt(null)} />}
    </div>
  )
}
