import { useEffect, useRef, useState } from 'react'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Repeat,
  Landmark,
  Settings as SettingsIcon,
  BarChart3,
  ShieldCheck
} from 'lucide-react'
import { loadState, saveState, downloadBackup, buildBackup, importState, parseBackup, resetAllData, makeId } from './lib/storage'
import { nowLocalISO, currentMonthKey } from './lib/finance'
import { parseSpendNotification } from './lib/notificationParser'
import { isCaptureSupported, takePendingNotifications, onNotificationCaptured } from './lib/notificationCapture'
import NavBar from './components/NavBar'
import Dashboard from './components/Dashboard'
import Analytics from './components/Analytics'
import Transactions from './components/Transactions'
import Commitments from './components/Commitments'
import Savings from './components/Savings'
import Tax from './components/Tax'
import Settings from './components/Settings'
import LockScreen from './components/LockScreen'

// How long the app can sit in the background before coming back demands the
// PIN again. Short enough that a phone left on a table isn't left open,
// long enough that checking another app mid-entry doesn't cost anything.
const LOCK_GRACE_MS = 60_000

const TITLES = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard },
  analytics: { label: 'Analytics', icon: BarChart3 },
  transactions: { label: 'Transactions', icon: ArrowLeftRight },
  commitments: { label: 'Commitments', icon: Repeat },
  savings: { label: 'Savings & Investing', icon: Landmark },
  tax: { label: 'Tax', icon: ShieldCheck },
  settings: { label: 'Settings', icon: SettingsIcon }
}

export default function App() {
  const [state, setState] = useState(loadState)
  const [tab, setTab] = useState('dashboard')
  const [importError, setImportError] = useState('')
  // Force setup when there's no PIN yet, and lock every open when a PIN exists and is enabled.
  const [locked, setLocked] = useState(() => !state.security?.pinHash || !!state.security?.enabled)
  const lockedRef = useRef(locked)
  // When the app was last backgrounded, or null if that session wasn't unlocked.
  const backgroundedAt = useRef(null)

  const appTitle = state.name ? `${state.name}'s Wealth` : 'My Wealth'

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    document.title = appTitle
  }, [appTitle])

  // The content behind the lock keeps its DOM, so a field that was focused
  // when the app was minimized would otherwise still take keystrokes.
  useEffect(() => {
    if (locked) document.activeElement?.blur?.()
  }, [locked])

  // Read inside the visibility handler, which must see the value at the moment
  // the app was backgrounded rather than whatever it was when the listener
  // was attached.
  useEffect(() => {
    lockedRef.current = locked
  }, [locked])

  useEffect(() => {
    function onVisibilityChange() {
      // Still locks the instant the app is backgrounded, so nothing sensitive
      // sits in the app switcher's preview or on screen for whoever picks the
      // phone up next.
      if (document.visibilityState === 'hidden' && state.security?.enabled) {
        // Only a session that was already unlocked earns the grace period —
        // otherwise minimizing at the lock screen and coming straight back
        // would walk right past the PIN.
        backgroundedAt.current = lockedRef.current ? null : Date.now()
        setLocked(true)
        return
      }
      // Coming back quickly is treated as never having left, so glancing at
      // another app mid-entry doesn't cost a PIN every time.
      if (document.visibilityState === 'visible') {
        const leftAt = backgroundedAt.current
        backgroundedAt.current = null
        if (leftAt !== null && Date.now() - leftAt < LOCK_GRACE_MS) setLocked(false)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [state.security?.enabled])

  // Captured alerts become drafts for review, never ledger entries directly.
  // Parsing runs inside the state updater so it always sees current accounts and
  // categories, rather than whatever they were when the listener was attached.
  function ingestNotification(notification) {
    setState((s) => {
      const draft = parseSpendNotification(notification, {
        accounts: s.accounts,
        categories: s.categories,
        entries: s.entries
      })
      if (!draft) return s
      // The same alert can arrive live and again from the queue on next launch.
      const alreadyQueued = s.pending.some((p) => p.raw === draft.raw && p.date === draft.date)
      if (alreadyQueued) return s
      return { ...s, pending: [...s.pending, { ...draft, id: makeId() }] }
    })
  }

  useEffect(() => {
    if (!isCaptureSupported()) return
    function drainQueue() {
      takePendingNotifications().then((items) => items.forEach(ingestNotification))
    }
    // Anything captured while the app was closed, plus live delivery while open.
    drainQueue()
    const unsubscribe = onNotificationCaptured(ingestNotification)
    function onVisible() {
      if (document.visibilityState === 'visible') drainQueue()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  function handleConfirmPending(id, patch) {
    setState((s) => {
      const item = s.pending.find((p) => p.id === id)
      if (!item) return s
      const entry = {
        id: makeId(),
        type: item.type,
        name: patch.name,
        amount: item.amount,
        category: patch.category,
        date: item.date,
        accountId: patch.accountId,
        fromAccountId: null,
        toAccountId: null,
        recurring: false,
        taxDeductible: false,
        receiptId: null,
        commitmentId: null
      }
      return { ...s, entries: [...s.entries, entry], pending: s.pending.filter((p) => p.id !== id) }
    })
  }

  function handleDiscardPending(id) {
    setState((s) => ({ ...s, pending: s.pending.filter((p) => p.id !== id) }))
  }

  function handleNameChange(name) {
    setState((s) => ({ ...s, name }))
  }

  function handleCurrencyChange(currency) {
    setState((s) => ({ ...s, currency }))
  }

  function handleAddEntry(entry) {
    setState((s) => ({ ...s, entries: [...s.entries, entry] }))
  }

  function handleUpdateEntry(id, patch) {
    setState((s) => ({ ...s, entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
  }

  function handleRemoveEntry(id) {
    setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }))
  }

  function handleAddAccount(account) {
    setState((s) => ({ ...s, accounts: [...s.accounts, account] }))
  }

  function handleUpdateAccount(id, patch) {
    setState((s) => ({ ...s, accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }))
  }

  function handleRemoveAccount(id) {
    setState((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== id) }))
  }

  function handleAddCategory(name) {
    setState((s) => (s.categories.includes(name) ? s : { ...s, categories: [...s.categories, name] }))
  }

  function handleRemoveCategory(name) {
    setState((s) => ({ ...s, categories: s.categories.filter((c) => c !== name) }))
  }

  function handleAddAccountType(type) {
    setState((s) => (s.accountTypes.includes(type) ? s : { ...s, accountTypes: [...s.accountTypes, type] }))
  }

  function handleAddCommitment(commitment) {
    setState((s) => ({ ...s, commitments: [...s.commitments, commitment] }))
  }

  function handleUpdateCommitment(id, patch) {
    setState((s) => ({ ...s, commitments: s.commitments.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
  }

  function handleRemoveCommitment(id) {
    setState((s) => ({ ...s, commitments: s.commitments.filter((c) => c.id !== id) }))
  }

  function handleMarkCommitmentPaid(commitment) {
    const period = currentMonthKey()
    const entry = {
      id: makeId(),
      name: commitment.name,
      amount: commitment.monthlyPayment,
      type: 'expense',
      category: commitment.category || null,
      recurring: true,
      date: nowLocalISO(),
      accountId: commitment.accountId || null,
      fromAccountId: null,
      toAccountId: null,
      receiptId: null,
      taxDeductible: false,
      commitmentId: commitment.id
    }
    setState((s) => ({
      ...s,
      entries: [...s.entries, entry],
      commitments: s.commitments.map((c) =>
        c.id === commitment.id
          ? { ...c, lastPaidPeriod: period, balance: c.balance != null ? Math.max(c.balance - c.monthlyPayment, 0) : null }
          : c
      )
    }))
  }

  function handleAddPayslip(payslip) {
    setState((s) => ({ ...s, payslips: [...s.payslips, payslip] }))
  }

  function handleRemovePayslip(id) {
    setState((s) => ({ ...s, payslips: s.payslips.filter((p) => p.id !== id) }))
  }

  function handleRemoveAccountType(type) {
    setState((s) => ({ ...s, accountTypes: s.accountTypes.filter((t) => t !== type) }))
  }

  function handleRestoreText(text) {
    // Throws on bad input so BackupModal can show the reason inline.
    const imported = parseBackup(text)
    setState((s) => ({ ...imported, security: s.security }))
    setImportError('')
  }

  // Merges a Bajetlah .xlsx into the current data, entirely in the browser — the
  // file never leaves the device. Returns a count summary for the caller to show.
  async function handleImportBajetlah(file) {
    const { readBajetlahFile } = await import('./lib/readBajetlahFile')
    const { counts, ...next } = await readBajetlahFile(file, state)
    setState((s) => ({ ...next, security: s.security }))
    return counts
  }

  async function handleResetAll() {
    await resetAllData()
    // A full reload re-runs loadState against the now-empty storage, so the app
    // comes back to first-run defaults and the PIN-setup screen.
    window.location.reload()
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imported = await importState(file)
      // security is device-local — a restored backup never touches this phone's lock setup.
      setState((s) => ({ ...imported, security: s.security }))
      setImportError('')
    } catch (err) {
      setImportError(err.message)
    } finally {
      e.target.value = ''
    }
  }

  function handleSecuritySetupComplete(patch) {
    setState((s) => ({ ...s, security: { ...s.security, ...patch, enabled: true } }))
    setLocked(false)
  }

  function handleSecurityChange(patch) {
    setState((s) => ({ ...s, security: { ...s.security, ...patch } }))
  }

  const TabIcon = TITLES[tab].icon

  // The lock covers the app rather than replacing it. Rendering LockScreen
  // instead of the tree used to unmount everything below it, so a half-filled
  // transaction form was thrown away by the act of glancing at another app.
  // `invisible` hides the content (and blocks pointer events) while leaving
  // every component mounted with its state intact.
  return (
    <>
      <div className={`min-h-screen pb-24${locked ? ' invisible' : ''}`} aria-hidden={locked || undefined}>
      <header
        className="bg-surface border-b hairline sticky top-0 z-10"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 pt-4 pb-3">
          <div className="text-xs text-muted tracking-wide uppercase">{appTitle}</div>
          <h1 className="font-display text-xl flex items-center gap-2 mt-0.5">
            <TabIcon size={20} className="text-emerald shrink-0" strokeWidth={1.75} />
            {TITLES[tab].label}
          </h1>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto">
        {tab === 'dashboard' && (
          <Dashboard
            name={state.name}
            currency={state.currency}
            entries={state.entries}
            accounts={state.accounts}
            commitments={state.commitments}
            onGoToTransactions={() => setTab('transactions')}
          />
        )}
        {tab === 'analytics' && <Analytics currency={state.currency} entries={state.entries} />}
        {tab === 'transactions' && (
          <Transactions
            currency={state.currency}
            entries={state.entries}
            accounts={state.accounts}
            categories={state.categories}
            onAdd={handleAddEntry}
            onUpdate={handleUpdateEntry}
            onRemove={handleRemoveEntry}
            onAddCategory={handleAddCategory}
            onAddAccount={handleAddAccount}
            pending={state.pending}
            onConfirmPending={handleConfirmPending}
            onDiscardPending={handleDiscardPending}
          />
        )}
        {tab === 'commitments' && (
          <Commitments
            currency={state.currency}
            commitments={state.commitments}
            accounts={state.accounts}
            categories={state.categories}
            onAddCommitment={handleAddCommitment}
            onUpdateCommitment={handleUpdateCommitment}
            onRemoveCommitment={handleRemoveCommitment}
            onMarkPaid={handleMarkCommitmentPaid}
            onAddCategory={handleAddCategory}
          />
        )}
        {tab === 'savings' && (
          <Savings
            currency={state.currency}
            entries={state.entries}
            accounts={state.accounts}
            accountTypes={state.accountTypes}
            onAddAccount={handleAddAccount}
            onRemoveAccount={handleRemoveAccount}
            onAddAccountType={handleAddAccountType}
          />
        )}
        {tab === 'tax' && (
          <Tax
            currency={state.currency}
            entries={state.entries}
            payslips={state.payslips}
            onAddPayslip={handleAddPayslip}
            onRemovePayslip={handleRemovePayslip}
          />
        )}
        {tab === 'settings' && (
          <Settings
            state={state}
            onNameChange={handleNameChange}
            onCurrencyChange={handleCurrencyChange}
            onExport={() => downloadBackup(state)}
            buildBackup={() => buildBackup(state)}
            onRestoreText={handleRestoreText}
            onImportBajetlah={handleImportBajetlah}
            onResetAll={handleResetAll}
            onImport={handleImportFile}
            importError={importError}
            onSecurityChange={handleSecurityChange}
            onPinReset={handleSecuritySetupComplete}
            onAddAccount={handleAddAccount}
            onUpdateAccount={handleUpdateAccount}
            onRemoveAccount={handleRemoveAccount}
            onAddCategory={handleAddCategory}
            onRemoveCategory={handleRemoveCategory}
            onAddAccountType={handleAddAccountType}
            onRemoveAccountType={handleRemoveAccountType}
          />
        )}
      </main>

        <NavBar active={tab} onChange={setTab} />
      </div>

      {locked && (
        // Above the modals, which sit at z-50.
        <div className="fixed inset-0 z-[60] bg-paper overflow-y-auto">
          <LockScreen
            security={state.security}
            name={state.name}
            onSetupComplete={handleSecuritySetupComplete}
            onUnlock={() => setLocked(false)}
          />
        </div>
      )}
    </>
  )
}
