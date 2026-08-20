import { useState } from 'react'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Repeat,
  Landmark,
  Settings as SettingsIcon,
  Wallet2,
  ChevronUp,
  BarChart3,
  ShieldCheck
} from 'lucide-react'

const SUB_TABS = [
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'commitments', label: 'Commitments', icon: Repeat },
  { id: 'savings', label: 'Savings', icon: Landmark }
]
const SUB_TAB_IDS = SUB_TABS.map((t) => t.id)

function PrimaryTab({ id, label, icon: Icon, active, onClick }) {
  const isActive = active === id
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] font-body tracking-wide transition-colors border-t-2 -mt-px ${
        isActive ? 'text-emerald border-emerald' : 'text-muted border-transparent'
      }`}
    >
      <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
      {label}
    </button>
  )
}

export default function NavBar({ active, onChange }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const groupActive = SUB_TAB_IDS.includes(active)

  function handleSelectSubTab(id) {
    onChange(id)
    setMenuOpen(false)
  }

  function handlePrimaryTab(id) {
    setMenuOpen(false)
    onChange(id)
  }

  return (
    <>
      {menuOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-10"
        />
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 bg-surface border-t hairline flex z-20"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <PrimaryTab id="dashboard" label="Dashboard" icon={LayoutDashboard} active={active} onClick={handlePrimaryTab} />
        <PrimaryTab id="analytics" label="Analytics" icon={BarChart3} active={active} onClick={handlePrimaryTab} />

        <div className="flex-1 relative">
          {menuOpen && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 bg-surface border hairline z-20">
              {SUB_TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = active === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSelectSubTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 min-h-[44px] text-sm border-b hairline last:border-b-0 ${
                      isActive ? 'text-emerald' : 'text-ink'
                    }`}
                  >
                    <Icon size={17} strokeWidth={isActive ? 2.25 : 1.75} />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          )}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={`w-full flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] font-body tracking-wide transition-colors border-t-2 -mt-px ${
              groupActive ? 'text-emerald border-emerald' : 'text-muted border-transparent'
            }`}
          >
            <span className="flex items-center gap-0.5">
              <Wallet2 size={20} strokeWidth={groupActive ? 2.25 : 1.75} />
              <ChevronUp size={12} className={menuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </span>
            Money
          </button>
        </div>

        <PrimaryTab id="tax" label="Tax" icon={ShieldCheck} active={active} onClick={handlePrimaryTab} />
        <PrimaryTab id="settings" label="Settings" icon={SettingsIcon} active={active} onClick={handlePrimaryTab} />
      </nav>
    </>
  )
}
