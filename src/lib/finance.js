export const DEFAULT_CURRENCY = 'MYR'

export const CURRENCIES = {
  MYR: { symbol: 'RM', name: 'Malaysian Ringgit' },
  USD: { symbol: '$', name: 'US Dollar' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  IDR: { symbol: 'Rp', name: 'Indonesian Rupiah' },
  THB: { symbol: '฿', name: 'Thai Baht' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
  CNY: { symbol: '¥', name: 'Chinese Yuan' },
  INR: { symbol: '₹', name: 'Indian Rupee' }
}

export function todayISO(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// "YYYY-MM-DDTHH:mm", the same shape a <input type="datetime-local"> reads/writes.
// Entries store this as their `date` field — it still sorts and compares correctly
// as a plain string, so period-boundary logic below needed no changes.
export function nowLocalISO(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${todayISO(date)}T${hours}:${minutes}`
}

export function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso.length > 10 ? iso : `${iso}T00:00`)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export const BUDGET_GROUPS = ['needs', 'wants', 'savings']

export const DEFAULT_CATEGORIES = ['Food & Drink', 'Transport', 'Bills & Utility', 'Entertainment']

export function expensesOf(entries) {
  return entries.filter((e) => e.type === 'expense')
}

export function incomeOf(entries) {
  return entries.filter((e) => e.type === 'income')
}

export function transfersOf(entries) {
  return entries.filter((e) => e.type === 'transfer')
}

export function totalIncome(entries) {
  return incomeOf(entries).reduce((total, e) => total + e.amount, 0)
}

export function totalSpent(entries) {
  return expensesOf(entries).reduce((total, e) => total + e.amount, 0)
}

export function getAllocationTargets(entries, income) {
  const needsAmount = getCommitments(entries).total
  const balance = Math.max(income - needsAmount, 0)
  // Wants gets at most half the surplus, capped at your commitments size (a reasonable
  // lifestyle ceiling) — any surplus beyond that, including bonuses, flows to Savings.
  const wantsAmount = Math.min(balance / 2, needsAmount)
  const savingsAmount = balance - wantsAmount
  const pct = (amount) => (income > 0 ? amount / income : 0)
  return {
    needs: { amount: needsAmount, pct: pct(needsAmount) },
    wants: { amount: wantsAmount, pct: pct(wantsAmount) },
    savings: { amount: savingsAmount, pct: pct(savingsAmount) }
  }
}

// Budget groups are purely a visualization of how income *should* split — there's
// no per-transaction tagging. Actual spend per group is derived instead: Needs is
// exactly your commitments (that's the definition), Wants is whatever else you
// spent, and Savings is whatever of your income is left untouched.
export function getAllocation(entries, income) {
  const targets = getAllocationTargets(entries, income)
  const needsSpent = getCommitments(entries).total
  const spentTotal = totalSpent(entries)
  const wantsSpent = Math.max(spentTotal - needsSpent, 0)
  const savingsSpent = Math.max(income - spentTotal, 0)
  const spentByGroup = { needs: needsSpent, wants: wantsSpent, savings: savingsSpent }

  return BUDGET_GROUPS.reduce((acc, cat) => {
    const spent = spentByGroup[cat]
    acc[cat] = {
      spent,
      pct: income > 0 ? spent / income : 0,
      target: targets[cat].pct,
      targetAmount: targets[cat].amount
    }
    return acc
  }, {})
}

export function getPeriodStart(entries) {
  const incomeDates = incomeOf(entries)
    .map((e) => e.date)
    .filter(Boolean)
  if (incomeDates.length === 0) return null
  return incomeDates.reduce((latest, d) => (d > latest ? d : latest))
}

export function getCurrentPeriodEntries(entries) {
  const periodStart = getPeriodStart(entries)
  if (!periodStart) return entries
  return entries.filter((e) => !e.date || e.date >= periodStart)
}

export function getCommitments(entries) {
  const recurring = expensesOf(entries).filter((e) => e.recurring)
  return {
    entries: recurring,
    total: recurring.reduce((total, e) => total + e.amount, 0)
  }
}

export function getInvestmentGuidance(entries, goals, income, name = '') {
  const spent = totalSpent(entries)
  const remaining = income - spent
  const targets = getAllocationTargets(entries, income)
  const savingsRate = income > 0 ? Math.max(income - spent, 0) / income : 0
  const emergencyGoal = goals.find((g) => g.name.toLowerCase().includes('emergency'))
  const you = name ? `${name}, ` : ''
  const cap = (s) => (you ? s : s.charAt(0).toUpperCase() + s.slice(1))

  if (income <= 0) {
    return {
      tone: 'caution',
      message: `${you}${cap('log your income as a transaction to see personalized guidance here.')}`
    }
  }
  if (targets.needs.amount > income) {
    return {
      tone: 'warning',
      message: `${you}${cap('your recurring commitments exceed your income this period. Review Commitments before anything else.')}`
    }
  }
  if (remaining < 0) {
    return {
      tone: 'warning',
      message: `${you}${cap("you've spent more than you earned this month. Trim Wants spending first before anything else.")}`
    }
  }
  if (savingsRate < targets.savings.pct) {
    return {
      tone: 'caution',
      message: `${you}${cap(`savings are at ${(savingsRate * 100).toFixed(0)}% of income. Aim to raise Savings toward ${(targets.savings.pct * 100).toFixed(0)}% before investing more.`)}`
    }
  }
  if (!emergencyGoal || emergencyGoal.saved < emergencyGoal.target) {
    return {
      tone: 'caution',
      message: `${you}${cap('build 3–6 months of essential expenses into an emergency fund before investing your surplus.')}`
    }
  }
  return {
    tone: 'good',
    message: `${you}${cap('savings are healthy and your emergency fund is covered. Consider directing monthly surplus into diversified, low-cost investments.')}`
  }
}

export function getAccountBalances(entries, accounts) {
  return accounts.map((account) => {
    let balance = account.openingBalance || 0
    for (const e of entries) {
      if (e.type === 'income' && e.accountId === account.id) balance += e.amount
      else if (e.type === 'expense' && e.accountId === account.id) balance -= e.amount
      else if (e.type === 'transfer') {
        if (e.fromAccountId === account.id) balance -= e.amount
        if (e.toAccountId === account.id) balance += e.amount
      }
    }
    return { ...account, balance }
  })
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 5) return 'Burning the midnight oil,'
  if (hour < 12) return 'Good morning,'
  if (hour < 17) return 'Good afternoon,'
  if (hour < 21) return 'Good evening,'
  return 'Working late,'
}

export function currencySymbol(currency = DEFAULT_CURRENCY) {
  return CURRENCIES[currency]?.symbol ?? currency
}

export function formatMoney(n, currency = DEFAULT_CURRENCY) {
  const sign = n < 0 ? '-' : ''
  const symbol = currencySymbol(currency)
  return `${sign}${symbol} ${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatPct(n) {
  return `${(n * 100).toFixed(0)}%`
}
