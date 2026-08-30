import { useState } from 'react'
import { Wallet2, CreditCard, Tags, Landmark, Plus, Pencil, X, Info } from 'lucide-react'
import { formatMoney, getAccountBalances, accountBalanceView, getNetWorth } from '../lib/finance'
import { makeId } from '../lib/storage'
import AccountModal from './AccountModal'

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
  // null = closed. { account: null } = adding. { account } = editing that one.
  const [modal, setModal] = useState(null)

  const accountBalances = getAccountBalances(entries, accounts)
  const netWorth = getNetWorth(entries, accounts)
  const savingsTotal = accountBalances
    .filter((a) => a.isSavings)
    .reduce((sum, a) => sum + a.balance, 0)

  // Group accounts under their type, keeping the user's type order, with any
  // untyped accounts gathered under "Other" at the end.
  const byType = new Map()
  for (const a of accountBalances) {
    const key = a.type || ''
    if (!byType.has(key)) byType.set(key, [])
    byType.get(key).push(a)
  }
  const orderedKeys = [
    ...accountTypes.filter((t) => byType.has(t)),
    ...[...byType.keys()].filter((k) => k && !accountTypes.includes(k)),
    ...(byType.has('') ? [''] : [])
  ]
  const showGroupHeaders = !(orderedKeys.length === 1 && orderedKeys[0] === '')

  function handleSubmit(patch, id) {
    if (id) onUpdateAccount(id, patch)
    else onAddAccount({ id: makeId(), ...patch })
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
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-base flex items-center gap-1.5">
            <Wallet2 size={18} className="text-emerald" strokeWidth={1.75} />
            Accounts
          </h3>
          <button
            onClick={() => setModal({ account: null })}
            className="flex items-center gap-1 text-xs text-emerald border border-emerald px-2 py-1 min-h-[32px]"
          >
            <Plus size={14} /> Add
          </button>
        </div>
        <p className="text-xs text-muted">
          Track balances across your bank accounts, cash and e-wallets. Credit cards, loans and BNPL work the other
          way round — spending on one adds to what you owe instead of drawing down a balance.
        </p>
        {accountBalances.length === 0 ? (
          <div className="border hairline p-6 text-sm text-muted flex flex-col items-center gap-2 text-center">
            <Wallet2 size={26} strokeWidth={1.5} />
            No accounts yet. Tap Add to set up your first one.
          </div>
        ) : (
          <div className="space-y-3">
            {orderedKeys.map((key) => (
              <div key={key || '__untyped__'}>
                {showGroupHeaders && (
                  <div className="text-[11px] font-medium text-muted uppercase tracking-wide px-0.5 mb-1">
                    {key || 'Other'}
                  </div>
                )}
                <div className="border hairline divide-y hairline">
                  {byType.get(key).map((a) => {
                    const view = accountBalanceView(a)
                    return (
                      <div key={a.id} className="flex items-center justify-between px-3 py-2">
                        <div className="min-w-0">
                          <span className="text-sm">{a.name}</span>
                          <div className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
                            {(a.isSavings || a.isCredit || a.isLiability || a.excludeFromFunds) && (
                              <span>
                                {[a.isSavings && 'Savings', a.isCredit && 'Credit card', a.excludeFromFunds && 'Not in net worth']
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            )}
                            {a.last4 && (
                              <span className="flex items-center gap-1 num">
                                <CreditCard size={11} />•••• {a.last4}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`num text-sm ${view.tone}`}>
                            {formatMoney(view.amount, currency)}
                            {view.label && <span className="text-muted"> {view.label}</span>}
                          </span>
                          <button onClick={() => setModal({ account: a })} className="text-muted p-1 -m-1 hover:text-emerald" aria-label={`Edit ${a.name}`}>
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
              </div>
            ))}
          </div>
        )}
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
          longer-term investments. Add an account and set its kind to “Savings / investment” to count it here.
        </p>
      </div>

      <div className="bg-surface border hairline p-4 space-y-3">
        <h3 className="font-display text-base flex items-center gap-1.5">
          <Tags size={18} className="text-emerald" strokeWidth={1.75} />
          Account types
        </h3>
        <p className="text-xs text-muted">
          Optional labels that group your accounts above — Bank Account, Gold Reserve, Unit Trust, ASNB, whatever you
          actually use. Add a type from the account form; remove one here.
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

      {modal && (
        <AccountModal
          account={modal.account}
          accountTypes={accountTypes}
          onSubmit={handleSubmit}
          onAddAccountType={onAddAccountType}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
