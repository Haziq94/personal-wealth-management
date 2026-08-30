import { useState } from 'react'
import {
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  Repeat,
  Receipt,
  Trash2,
  Pencil,
  ArrowRightLeft,
  Plus,
  Camera,
  ShieldCheck
} from 'lucide-react'
import { formatMoney, currencySymbol, formatDateTime } from '../lib/finance'
import { categoryIcon } from '../lib/categoryIcons'
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
  onUpdate,
  onRemove,
  onAddCategory,
  pending = [],
  onConfirmPending,
  onDiscardPending
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [viewingReceipt, setViewingReceipt] = useState(null)
  const sorted = [...entries].reverse().sort((a, b) => (b.date || '').localeCompare(a.date || ''))

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
                  onClick={() => setEditingEntry(entry)}
                  className="text-muted p-2 -m-2 hover:text-emerald"
                  aria-label={`Edit ${entry.name}`}
                >
                  <Pencil size={16} />
                </button>
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

      {(showAdd || editingEntry) && (
        <AddTransactionModal
          currency={currency}
          categories={categories}
          accounts={accounts}
          initial={editingEntry}
          onSubmit={(entry) => (editingEntry ? onUpdate(entry.id, entry) : onAdd(entry))}
          onAddCategory={onAddCategory}
          onClose={() => {
            setShowAdd(false)
            setEditingEntry(null)
          }}
        />
      )}

      {viewingReceipt && <ReceiptViewer receiptId={viewingReceipt} onClose={() => setViewingReceipt(null)} />}
    </div>
  )
}
