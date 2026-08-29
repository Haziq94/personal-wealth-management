import { makeId } from './storage'
import { currentMonthKey, nowLocalISO } from './finance'

// Maps a Bajetlah spreadsheet export into this app's data model. Kept separate
// from the file-reading step (see readBajetlahFile) so the mapping is pure and
// testable with plain objects — no spreadsheet, and never any real data, in the
// tests. Everything here runs in the browser; nothing is uploaded anywhere.

// Bajetlah's account "Type" → this app's flags. Its balances come from
// transactions for everything except debts, which carry the amount owed.
const ACCOUNT_TYPE_MAP = {
  BANK: { label: 'Bank', isSavings: false, isCredit: false, isLiability: false },
  WALLET: { label: 'E-wallet', isSavings: false, isCredit: false, isLiability: false },
  DEBIT_CARD: { label: 'Debit card', isSavings: false, isCredit: false, isLiability: false },
  TABUNG: { label: 'Savings pot', isSavings: true, isCredit: false, isLiability: false },
  CARD: { label: 'Credit card', isSavings: false, isCredit: true, isLiability: false },
  LOAN: { label: 'Loan', isSavings: false, isCredit: false, isLiability: true },
  BNPL: { label: 'BNPL', isSavings: false, isCredit: false, isLiability: true }
}

function str(value) {
  return value == null ? '' : String(value).trim()
}

// Excel booleans arrive from the spreadsheet reader in assorted shapes — a real
// boolean, "TRUE"/"True", 1 — so accept them all rather than a strict === true.
function truthy(value) {
  if (value === true) return true
  if (typeof value === 'number') return value === 1
  return /^(true|yes|1)$/i.test(str(value))
}

function num(value) {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(n) ? n : null
}

// Accepts a JS Date (SheetJS with cellDates) or a string, and returns the
// "YYYY-MM-DDTHH:mm" this app stores. Falls back to now for anything unparseable.
function toLocalDateTime(value) {
  const d = value instanceof Date ? value : new Date(str(value).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return nowLocalISO()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

// Bajetlah's "Account ending" comes through as a number like 1486 or 3826.0.
function toLast4(value) {
  const digits = str(value).replace(/\D/g, '')
  if (digits.length < 4) return null
  return digits.slice(-4)
}

// "Every 1 monthly" → 1, "Every 6 monthly" → 6, "Every 1 yearly" → 12.
function toIntervalMonths(frequency) {
  const m = str(frequency)
    .toLowerCase()
    .match(/every\s+(\d+)\s+(month|year)/)
  if (!m) return 1
  const n = parseInt(m[1], 10) || 1
  return m[2] === 'year' ? n * 12 : n
}

function dayOfMonth(value) {
  const d = value instanceof Date ? value : new Date(str(value).replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? null : d.getDate()
}

function mapAccount(row) {
  const name = str(row['Account'])
  if (!name) return null
  const kind = ACCOUNT_TYPE_MAP[str(row['Type']).toUpperCase()] || ACCOUNT_TYPE_MAP.BANK
  const declared = num(row['Original balance'])
  // Debts store the amount owed as a positive number; this app holds it as a
  // negative running balance. Asset balances aren't in the export, so they
  // start at 0 and build from the imported transactions.
  const openingBalance = kind.isLiability ? -Math.abs(declared || 0) : declared || 0
  return {
    id: str(row['Account ID']) || makeId(),
    name,
    openingBalance,
    type: kind.label,
    isSavings: kind.isSavings,
    isCredit: kind.isCredit,
    isLiability: kind.isLiability,
    excludeFromFunds: truthy(row['Excluded from funds']),
    last4: toLast4(row['Account ending'])
  }
}

function mapTransaction(row, accountIdByName) {
  const myr = num(row['MYR equivalent'])
  const original = num(row['Original amount'])
  const amount = myr != null ? myr : original
  if (amount == null || amount <= 0) return null
  const currency = str(row['Currency']) || 'MYR'
  const isForeign = currency !== 'MYR' && original != null && myr != null && original > 0
  return {
    id: str(row['Transaction ID']) || makeId(),
    name: str(row['Merchant']) || str(row['Notes']) || 'Imported',
    amount: Math.abs(amount),
    type: str(row['Income / Expense']).toLowerCase() === 'income' ? 'income' : 'expense',
    category: str(row['Category']) || null,
    recurring: false,
    date: toLocalDateTime(row['Date']),
    accountId: accountIdByName.get(str(row['Account']).toLowerCase()) || null,
    fromAccountId: null,
    toAccountId: null,
    receiptId: null,
    taxDeductible: false,
    commitmentId: null,
    ...(isForeign
      ? { foreignCurrency: currency, foreignAmount: Math.abs(original), exchangeRate: Math.abs(myr / original) }
      : {})
  }
}

function mapCommitment(row, accountIdByName) {
  if (truthy(row['Archived'])) return null
  const name = str(row['Commitment'])
  const amount = num(row['Amount'])
  if (!name || amount == null) return null
  return {
    id: str(row['Commitment ID']) || makeId(),
    name,
    monthlyPayment: Math.abs(amount),
    intervalMonths: toIntervalMonths(row['Frequency']),
    dueDay: dayOfMonth(row['Next due date']),
    balance: null,
    category: null,
    accountId: accountIdByName.get(str(row['Linked account']).toLowerCase()) || null,
    // A ticked "Paid" means it's settled for the current cycle.
    lastPaidPeriod: truthy(row['Paid']) ? currentMonthKey() : null
  }
}

// Upsert by id: an item already present (same Bajetlah UUID) is replaced, so a
// re-import updates in place rather than duplicating.
function upsertById(existing, incoming) {
  const byId = new Map(existing.map((item) => [item.id, item]))
  for (const item of incoming) byId.set(item.id, item)
  return [...byId.values()]
}

export function mapBajetlahExport(sheets, state) {
  const accountRows = Array.isArray(sheets.accounts) ? sheets.accounts : []
  const transactionRows = Array.isArray(sheets.transactions) ? sheets.transactions : []
  const commitmentRows = Array.isArray(sheets.commitments) ? sheets.commitments : []

  const accounts = accountRows.map(mapAccount).filter(Boolean)

  // Transactions and commitments reference accounts by name; resolve against
  // both the incoming accounts and any that already exist.
  const accountIdByName = new Map()
  for (const a of state.accounts) accountIdByName.set(a.name.toLowerCase(), a.id)
  for (const a of accounts) accountIdByName.set(a.name.toLowerCase(), a.id)

  const entries = transactionRows.map((r) => mapTransaction(r, accountIdByName)).filter(Boolean)
  const commitments = commitmentRows.map((r) => mapCommitment(r, accountIdByName)).filter(Boolean)

  // Any category the import references but the app doesn't have yet.
  const categories = [...new Set([...state.categories, ...entries.map((e) => e.category).filter(Boolean)])]
  const accountTypes = [...new Set([...state.accountTypes, ...accounts.map((a) => a.type).filter(Boolean)])]

  return {
    ...state,
    accounts: upsertById(state.accounts, accounts),
    entries: upsertById(state.entries, entries),
    commitments: upsertById(state.commitments, commitments),
    categories,
    accountTypes,
    counts: { accounts: accounts.length, entries: entries.length, commitments: commitments.length }
  }
}
