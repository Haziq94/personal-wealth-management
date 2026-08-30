import { LayoutDashboard, Wallet2, ArrowLeftRight, Repeat, BarChart3 } from 'lucide-react'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'account', label: 'Account', icon: Wallet2 },
  { id: 'transactions', label: 'Transaction', icon: ArrowLeftRight },
  { id: 'commitments', label: 'Commitment', icon: Repeat },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 }
]

export default function NavBar({ active, onChange }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-surface border-t hairline flex z-20"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] font-body tracking-wide transition-colors border-t-2 -mt-px ${
              isActive ? 'text-emerald border-emerald' : 'text-muted border-transparent'
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
