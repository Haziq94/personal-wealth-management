import { CURRENCIES, DEFAULT_CURRENCY, todayISO } from './finance'

const STORAGE_KEY = 'wealth-ledger:v1'

const DEFAULT_STATE = {
  name: 'Haziq',
  currency: DEFAULT_CURRENCY,
  entries: [],
  goals: []
}

function normalizeCurrency(currency) {
  return typeof currency === 'string' && CURRENCIES[currency] ? currency : DEFAULT_CURRENCY
}

function normalizeEntries(rawEntries, legacyIncome) {
  const entries = (Array.isArray(rawEntries) ? rawEntries : []).map((e) => ({
    id: e.id,
    name: e.name,
    amount: e.amount,
    type: e.type === 'income' ? 'income' : 'expense',
    category: e.type === 'income' ? null : e.category ?? 'needs',
    recurring: !!e.recurring,
    date: typeof e.date === 'string' ? e.date : todayISO(),
    ...(e.foreignCurrency && typeof e.foreignAmount === 'number' && typeof e.exchangeRate === 'number'
      ? { foreignCurrency: e.foreignCurrency, foreignAmount: e.foreignAmount, exchangeRate: e.exchangeRate }
      : {})
  }))

  const hasIncomeEntry = entries.some((e) => e.type === 'income')
  if (!hasIncomeEntry && typeof legacyIncome === 'number' && legacyIncome > 0) {
    entries.unshift({
      id: makeId(),
      name: 'Income (migrated)',
      amount: legacyIncome,
      type: 'income',
      category: null,
      recurring: true,
      date: todayISO()
    })
  }

  return entries
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STATE, entries: [] }
    const parsed = JSON.parse(raw)
    return {
      name: typeof parsed.name === 'string' ? parsed.name : DEFAULT_STATE.name,
      currency: normalizeCurrency(parsed.currency),
      entries: normalizeEntries(parsed.entries, parsed.income),
      goals: Array.isArray(parsed.goals) ? parsed.goals : []
    }
  } catch {
    return { ...DEFAULT_STATE, entries: [] }
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function exportState(state) {
  const payload = {
    ...state,
    exportedAt: new Date().toISOString(),
    schema: 5
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = todayISO()
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
        resolve({
          name: typeof parsed.name === 'string' ? parsed.name : DEFAULT_STATE.name,
          currency: normalizeCurrency(parsed.currency),
          entries: normalizeEntries(parsed.entries, parsed.income),
          goals: parsed.goals
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
