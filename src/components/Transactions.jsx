import { useState } from 'react'
import {
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  House,
  ShoppingBag,
  Landmark,
  Repeat,
  Receipt,
  Trash2,
  ArrowRightLeft,
  Plus,
  Wallet2,
  Utensils,
  Bus,
  Zap,
  Clapperboard,
  Tag
} from 'lucide-react'
import { formatMoney, currencySymbol, formatDateTime, getAccountBalances } from '../lib/finance'
import AddTransactionModal from './AddTransactionModal'

const BUDGET_GROUP_LABELS = { needs: 'Needs', wants: 'Wants', savings: 'Savings' }
const BUDGET_GROUP_ICONS = { needs: House, wants: ShoppingBag, savings: Landmark }

const CATEGORY_ICON_MATCH = {
  'food & drink': Utensils,
  transport: Bus,
  'bills & utility': Zap,
  entertainment: Clapperboard
}

function categoryIcon(category) {
  return CATEGORY_ICON_MATCH[category?.toLowerCase()] ?? Tag
}

function accountName(accounts, id) {
  return accounts.find((a) => a.id === id)?.name ?? 'account'
}

export default function Transactions({ currency, entries, accounts, categories, onAdd, onRemove, onAddCategory }) {
  const [showAdd, setShowAdd] = useState(false)
  const balances = getAccountBalances(entries, accounts)
  const sorted = [...entries].reverse().sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <div className="space-y-4 pb-20">
      {balances.length > 0 && (
        <div className="bg-surface border hairline">
          <div className="flex items-center gap-1.5 text-xs text-muted px-4 pt-3">
            <Wallet2 size={13} />
            Account balances
          </div>
          <div className="flex overflow-x-auto gap-px bg-ink/10 mt-2">
            {balances.map((a) => (
              <div key={a.id} className="bg-surface p-3 min-w-[130px] shrink-0">
                <div className="text-xs text-muted truncate">{a.name}</div>
                <div className={`num text-sm ${a.balance < 0 ? 'text-rust' : 'text-ink'}`}>{formatMoney(a.balance, currency)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                      <>
                        {entry.type === 'expense' && entry.budgetGroup && <span>{BUDGET_GROUP_LABELS[entry.budgetGroup]}</span>}
                        {entry.category && <span>· {entry.category}</span>}
                        {entry.accountId && <span>· {accountName(accounts, entry.accountId)}</span>}
                      </>
                    )}
                    {entry.date && <span className="num">· {formatDateTime(entry.date)}</span>}
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
                <span className={`num text-sm ${amountTone}`}>
                  {sign}
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
    </div>
  )
}
