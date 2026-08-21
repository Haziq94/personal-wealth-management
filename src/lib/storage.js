import { CURRENCIES, DEFAULT_CURRENCY, DEFAULT_CATEGORIES, nowLocalISO } from './finance'

const STORAGE_KEY = 'wealth-ledger:v1'
// The old budget-group values `category` could hold before it split into
// budgetGroup (derived) + category (free-text tag) — fixed, not the live BUDGET_GROUPS
// list, so adding "emergency" there later can't accidentally affect this legacy check.
const LEGACY_BUDGET_GROUP_VALUES = ['needs', 'wants', 'savings']

const DEFAULT_SECURITY = {
  enabled: false,
  pinHash: null,
  salt: null,
  biometricEnabled: false,
  credentialId: null
}

const DEFAULT_STATE = {
  name: 'Haziq',
  currency: DEFAULT_CURRENCY,
  entries: [],
  accounts: [],
  categories: [...DEFAULT_CATEGORIES],
  accountTypes: [],
  payslips: [],
  commitments: [],
  pending: [],
  security: DEFAULT_SECURITY
}

// Transactions parsed out of a bank notification, waiting to be confirmed. They
// are not part of the ledger and are counted nowhere until the user accepts one.
function normalizePending(pending) {
  if (!Array.isArray(pending)) return []
  return pending
    .filter((p) => p && typeof p.amount === 'number' && Number.isFinite(p.amount))
    .map((p) => ({
      id: typeof p.id === 'string' ? p.id : makeId(),
      type: p.type === 'income' ? 'income' : 'expense',
      name: typeof p.name === 'string' ? p.name : '',
      amount: p.amount,
      currency: typeof p.currency === 'string' ? p.currency : null,
      last4: typeof p.last4 === 'string' ? p.last4 : null,
      accountId: typeof p.accountId === 'string' ? p.accountId : null,
      category: typeof p.category === 'string' ? p.category : null,
      date: normalizeDateTime(p.date),
      raw: typeof p.raw === 'string' ? p.raw : ''
    }))
}

function normalizeSecurity(security) {
  if (!security || typeof security !== 'object') return { ...DEFAULT_SECURITY }
  return {
    enabled: !!security.enabled,
    pinHash: typeof security.pinHash === 'string' ? security.pinHash : null,
    salt: typeof security.salt === 'string' ? security.salt : null,
    biometricEnabled: !!security.biometricEnabled,
    credentialId: typeof security.credentialId === 'string' ? security.credentialId : null
  }
}

function normalizeCurrency(currency) {
  return typeof currency === 'string' && CURRENCIES[currency] ? currency : DEFAULT_CURRENCY
}

function normalizeCategories(categories) {
  if (!Array.isArray(categories)) return [...DEFAULT_CATEGORIES]
  const cleaned = categories.filter((c) => typeof c === 'string' && c.trim())
  const base = cleaned.length > 0 ? [...new Set(cleaned)] : [...DEFAULT_CATEGORIES]
  // Emergency is special-cased in the allocation logic (see finance.js), so every
  // install gets it even if their category list predates the feature.
  if (!base.some((c) => c.toLowerCase() === 'emergency')) base.push('Emergency')
  return base
}

function normalizeAccounts(accounts) {
  if (!Array.isArray(accounts)) return []
  return accounts
    .filter((a) => a && typeof a.name === 'string')
    .map((a) => ({
      id: typeof a.id === 'string' ? a.id : makeId(),
      name: a.name,
      openingBalance: typeof a.openingBalance === 'number' ? a.openingBalance : 0,
      type: typeof a.type === 'string' && a.type.trim() ? a.type : null,
      isSavings: !!a.isSavings,
      isCredit: !!a.isCredit,
      // Last 4 digits of the card, so a bank alert naming "...1234" can be
      // matched back to the account it belongs to. Never the full number.
      last4: typeof a.last4 === 'string' && /^\d{4}$/.test(a.last4) ? a.last4 : null
    }))
}

function normalizeAccountTypes(accountTypes) {
  if (!Array.isArray(accountTypes)) return []
  return [...new Set(accountTypes.filter((t) => typeof t === 'string' && t.trim()))]
}

// Payslip photos live in IndexedDB (see receiptStore.js) — receiptId here is just
// a pointer, and stays a dangling id with no matching image if it's missing.
function normalizePayslips(payslips) {
  if (!Array.isArray(payslips)) return []
  return payslips
    .filter((p) => p && typeof p.id === 'string')
    .map((p) => ({
      id: p.id,
      date: typeof p.date === 'string' ? p.date : '',
      grossSalary: typeof p.grossSalary === 'number' ? p.grossSalary : 0,
      nettSalary: typeof p.nettSalary === 'number' ? p.nettSalary : 0,
      deductions: Array.isArray(p.deductions)
        ? p.deductions
            .filter((d) => d && typeof d.label === 'string' && typeof d.amount === 'number')
            .map((d) => ({ label: d.label, amount: d.amount }))
        : [],
      receiptId: typeof p.receiptId === 'string' ? p.receiptId : null,
      notes: typeof p.notes === 'string' ? p.notes : ''
    }))
}

// A commitment is a standing bill/loan set up once (name, monthly payment, due
// day, optional payoff balance) rather than re-logged as a transaction every
// period — marking it paid generates the actual recurring expense entry (see
// App.jsx's handleMarkCommitmentPaid) and decrements balance if it has one.
function normalizeCommitments(commitments) {
  if (!Array.isArray(commitments)) return []
  return commitments
    .filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string')
    .map((c) => ({
      id: c.id,
      name: c.name,
      monthlyPayment: typeof c.monthlyPayment === 'number' ? c.monthlyPayment : 0,
      dueDay: typeof c.dueDay === 'number' && c.dueDay >= 1 && c.dueDay <= 31 ? c.dueDay : null,
      balance: typeof c.balance === 'number' ? c.balance : null,
      category: typeof c.category === 'string' && c.category.trim() ? c.category : null,
      accountId: typeof c.accountId === 'string' ? c.accountId : null,
      // "YYYY-MM" of the last period this was marked paid — drives the paid/due
      // badge on the Commitments page (calendar month, not the salary pay period).
      lastPaidPeriod: typeof c.lastPaidPeriod === 'string' ? c.lastPaidPeriod : null
    }))
}

// Datetime-local format ("YYYY-MM-DDTHH:mm"); older backups only stored a bare
// date ("YYYY-MM-DD"), so those get a default time appended.
function normalizeDateTime(raw) {
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) return raw.slice(0, 16)
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T12:00`
  return nowLocalISO()
}

function normalizeEntries(rawEntries, legacyIncome) {
  const entries = (Array.isArray(rawEntries) ? rawEntries : []).map((e) => {
    const type = e.type === 'income' ? 'income' : e.type === 'transfer' ? 'transfer' : 'expense'
    // Budget group (needs/wants/savings) used to be a manual per-transaction field —
    // it's now fully derived from commitments/spend (see getAllocation), so any old
    // `budgetGroup`/needs-wants-savings `category` value is simply dropped, not migrated.
    const legacyBudgetGroup = LEGACY_BUDGET_GROUP_VALUES.includes(e.category)
    return {
      id: e.id,
      name: e.name,
      amount: e.amount,
      type,
      category: legacyBudgetGroup ? null : typeof e.category === 'string' ? e.category : null,
      recurring: !!e.recurring,
      date: normalizeDateTime(e.date),
      accountId: typeof e.accountId === 'string' ? e.accountId : null,
      fromAccountId: typeof e.fromAccountId === 'string' ? e.fromAccountId : null,
      toAccountId: typeof e.toAccountId === 'string' ? e.toAccountId : null,
      receiptId: typeof e.receiptId === 'string' ? e.receiptId : null,
      // Only meaningful on an expense — dropped if the type doesn't match so a
      // legacy/imported record can't mark a transfer as tax-deductible.
      taxDeductible: type === 'expense' && !!e.taxDeductible,
      // Set when this entry was generated by marking a Commitment paid — links
      // back to the commitment it settled, purely informational.
      commitmentId: typeof e.commitmentId === 'string' ? e.commitmentId : null,
      ...(e.foreignCurrency && typeof e.foreignAmount === 'number' && typeof e.exchangeRate === 'number'
        ? { foreignCurrency: e.foreignCurrency, foreignAmount: e.foreignAmount, exchangeRate: e.exchangeRate }
        : {})
    }
  })

  const hasIncomeEntry = entries.some((e) => e.type === 'income')
  if (!hasIncomeEntry && typeof legacyIncome === 'number' && legacyIncome > 0) {
    entries.unshift({
      id: makeId(),
      name: 'Income (migrated)',
      amount: legacyIncome,
      type: 'income',
      category: null,
      recurring: true,
      date: nowLocalISO(),
      accountId: null,
      fromAccountId: null,
      toAccountId: null
    })
  }

  return entries
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw)
      return {
        ...DEFAULT_STATE,
        entries: [],
        accounts: [],
        categories: [...DEFAULT_CATEGORIES],
        accountTypes: [],
        payslips: [],
        commitments: [],
        pending: []
      }
    const parsed = JSON.parse(raw)
    return {
      name: typeof parsed.name === 'string' ? parsed.name : DEFAULT_STATE.name,
      currency: normalizeCurrency(parsed.currency),
      entries: normalizeEntries(parsed.entries, parsed.income),
      accounts: normalizeAccounts(parsed.accounts),
      categories: normalizeCategories(parsed.categories),
      accountTypes: normalizeAccountTypes(parsed.accountTypes),
      payslips: normalizePayslips(parsed.payslips),
      commitments: normalizeCommitments(parsed.commitments),
      pending: normalizePending(parsed.pending),
      security: normalizeSecurity(parsed.security)
    }
  } catch {
    return {
      ...DEFAULT_STATE,
      entries: [],
      accounts: [],
      categories: [...DEFAULT_CATEGORIES],
      accountTypes: [],
      payslips: [],
      commitments: [],
      pending: []
    }
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function exportState(state) {
  // security (PIN hash/salt/biometric credential) is device-local and deliberately
  // left out of backups — it never needs to travel and shouldn't sit in a JSON file.
  // Receipt/payslip photos are also device-local (IndexedDB, see receiptStore.js) —
  // the receiptId pointers travel with entries/payslips, but the image bytes don't.
  // `pending` is left out for the same reason: unconfirmed drafts carry the raw
  // notification text they came from, which belongs on the device that captured
  // it and nowhere else.
  const { security, pending, ...rest } = state
  const payload = {
    ...rest,
    exportedAt: new Date().toISOString(),
    schema: 9
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = nowLocalISO().slice(0, 10)
  a.href = url
  a.download = `wealth-ledger-backup-${date}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function importState(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        if (!Array.isArray(parsed.entries)) {
          reject(new Error('This file does not look like a valid Ledger backup.'))
          return
        }
        // security is intentionally not restored from a backup file — it stays
        // whatever this device already has (see exportState). Old backups may carry
        // a `goals` array from before Savings accounts replaced manual goals — it's
        // simply dropped, not migrated.
        resolve({
          name: typeof parsed.name === 'string' ? parsed.name : DEFAULT_STATE.name,
          currency: normalizeCurrency(parsed.currency),
          entries: normalizeEntries(parsed.entries, parsed.income),
          accounts: normalizeAccounts(parsed.accounts),
          categories: normalizeCategories(parsed.categories),
          accountTypes: normalizeAccountTypes(parsed.accountTypes),
          payslips: normalizePayslips(parsed.payslips),
          commitments: normalizeCommitments(parsed.commitments),
          pending: []
        })
      } catch {
        reject(new Error('Could not parse this file as JSON.'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read this file.'))
    reader.readAsText(file)
  })
}

export function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
