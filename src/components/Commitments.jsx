import { useState } from 'react'
import { Repeat, House, CalendarClock, Trash2, Plus, Pencil, CheckCircle2, Landmark } from 'lucide-react'
import { formatMoney, getCommitmentsTotal, isCommitmentPaidThisMonth } from '../lib/finance'
import AddCommitmentModal from './AddCommitmentModal'

function accountName(accounts, id) {
  return accounts.find((a) => a.id === id)?.name
}

export default function Commitments({
  currency,
  commitments,
  accounts,
  categories,
  onAddCommitment,
  onUpdateCommitment,
  onRemoveCommitment,
  onMarkPaid,
  onAddCategory
}) {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const total = getCommitmentsTotal(commitments)

  function openEdit(commitment) {
    setEditing(commitment)
    setShowModal(true)
  }

  function openAdd() {
    setEditing(null)
    setShowModal(true)
  }

  function handleSave(commitment) {
    if (editing) onUpdateCommitment(commitment.id, commitment)
    else onAddCommitment(commitment)
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-surface border hairline p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
          <Repeat size={13} />
          Total monthly commitments
        </div>
        <div className="num text-2xl">{formatMoney(total, currency)}</div>
        <p className="text-xs text-muted mt-1">
          Set each commitment up once, then mark it paid every period — that logs the actual expense and updates any
          outstanding balance.
        </p>
      </div>

      <div className="bg-surface border hairline">
        {commitments.length === 0 && (
          <div className="p-6 text-sm text-muted flex flex-col items-center gap-2 text-center">
            <CalendarClock size={28} strokeWidth={1.5} />
            No commitments yet. Tap + to add rent, loans, subscriptions, and the like.
          </div>
        )}
        {commitments.map((c) => {
          const paid = isCommitmentPaidThisMonth(c)
          const acct = accountName(accounts, c.accountId)
          return (
            <div key={c.id} className="px-4 py-3 border-b hairline last:border-b-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <House size={18} className="text-muted shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div className="min-w-0">
                    <div className="text-sm truncate">{c.name}</div>
                    <div className="text-xs text-muted flex flex-wrap items-center gap-x-1.5">
                      {c.dueDay && <span>Due on day {c.dueDay}</span>}
                      {c.category && <span>· {c.category}</span>}
                      {acct && (
                        <span className="flex items-center gap-0.5">
                          · <Landmark size={10} /> {acct}
                        </span>
                      )}
                    </div>
                    {c.balance != null && (
                      <div className="num text-xs text-muted mt-0.5">{formatMoney(c.balance, currency)} balance remaining</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(c)} className="text-muted p-2 -m-2 hover:text-ink" aria-label={`Edit ${c.name}`}>
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => onRemoveCommitment(c.id)}
                    className="text-muted p-2 -m-2 hover:text-rust"
                    aria-label={`Remove ${c.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="num text-sm">{formatMoney(c.monthlyPayment, currency)} / mo</span>
                {paid ? (
                  <span className="flex items-center gap-1 text-xs text-emerald">
                    <CheckCircle2 size={13} /> Paid this month
                  </span>
                ) : (
                  <button
                    onClick={() => onMarkPaid(c)}
                    className="flex items-center gap-1 text-xs border border-emerald text-emerald px-2 py-1"
                  >
                    <CheckCircle2 size={13} /> Mark paid
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={openAdd}
        className="fixed right-4 bottom-24 w-14 h-14 rounded-full bg-ink text-paper flex items-center justify-center z-20"
        aria-label="Add commitment"
      >
        <Plus size={24} />
      </button>

      {showModal && (
        <AddCommitmentModal
          currency={currency}
          categories={categories}
          accounts={accounts}
          existing={editing}
          onSave={handleSave}
          onAddCategory={onAddCategory}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
