import { LayoutDashboard, ArrowLeftRight, Repeat, Landmark } from 'lucide-react'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'commitments', label: 'Commitments', icon: Repeat },
  { id: 'savings', label: 'Savings', icon: Landmark }
]

export default function NavBar({ active, onChange }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-surface border-t hairline flex z-10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] font-body tracking-wide transition-colors border-t-2 -mt-px ${
              isActive ? 'text-emerald border-emerald' : 'text-muted border-transparent'
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
