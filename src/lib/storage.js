import { CURRENCIES, DEFAULT_CURRENCY, DEFAULT_CATEGORIES, BUDGET_GROUPS, nowLocalISO } from './finance'

const STORAGE_KEY = 'wealth-ledger:v1'

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
  goals: [],
  accounts: [],
  categories: [...DEFAULT_CATEGORIES],
  security: DEFAULT_SECURITY
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
  return cleaned.length > 0 ? [...new Set(cleaned)] : [...DEFAULT_CATEGORIES]
}

function normalizeAccounts(accounts) {
  if (!Array.isArray(accounts)) return []
  return accounts
    .filter((a) => a && typeof a.name === 'string')
    .map((a) => ({
      id: typeof a.id === 'string' ? a.id : makeId(),
      name: a.name,
      openingBalance: typeof a.openingBalance === 'number' ? a.openingBalance : 0
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
    const legacyBudgetGroup = BUDGET_GROUPS.includes(e.category)
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
    if (!raw) return { ...DEFAULT_STATE, entries: [], accounts: [], categories: [...DEFAULT_CATEGORIES] }
    const parsed = JSON.parse(raw)
    return {
      name: typeof parsed.name === 'string' ? parsed.name : DEFAULT_STATE.name,
      currency: normalizeCurrency(parsed.currency),
      entries: normalizeEntries(parsed.entries, parsed.income),
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      accounts: normalizeAccounts(parsed.accounts),
      categories: normalizeCategories(parsed.categories),
      security: normalizeSecurity(parsed.security)
    }
  } catch {
    return { ...DEFAULT_STATE, entries: [], accounts: [], categories: [...DEFAULT_CATEGORIES] }
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function exportState(state) {
  // security (PIN hash/salt/biometric credential) is device-local and deliberately
  // left out of backups — it never needs to travel and shouldn't sit in a JSON file.
  const { security, ...rest } = state
  const payload = {
    ...rest,
    exportedAt: new Date().toISOString(),
    schema: 6
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
        if (!Array.isArray(parsed.entries) || !Array.isArray(parsed.goals)) {
          reject(new Error('This file does not look like a valid Ledger backup.'))
          return
        }
        // security is intentionally not restored from a backup file — it stays
        // whatever this device already has (see exportState).
        resolve({
          name: typeof parsed.name === 'string' ? parsed.name : DEFAULT_STATE.name,
          currency: normalizeCurrency(parsed.currency),
          entries: normalizeEntries(parsed.entries, parsed.income),
          goals: parsed.goals,
          accounts: normalizeAccounts(parsed.accounts),
          categories: normalizeCategories(parsed.categories)
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
