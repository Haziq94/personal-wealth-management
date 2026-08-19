const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'spending', label: 'Spending' },
  { id: 'commitments', label: 'Commitments' },
  { id: 'savings', label: 'Savings' }
]

export default function NavBar({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t hairline flex z-10">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-3 text-xs font-body tracking-wide transition-colors ${
            active === tab.id ? 'text-emerald border-t-2 border-emerald -mt-px' : 'text-muted border-t-2 border-transparent -mt-px'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
