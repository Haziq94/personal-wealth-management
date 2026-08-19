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

export const CATEGORIES = ['needs', 'wants', 'savings']

export const TARGETS = { needs: 0.5, wants: 0.3, savings: 0.2 }

export function expensesOf(entries) {
  return entries.filter((e) => e.type !== 'income')
}

export function incomeOf(entries) {
  return entries.filter((e) => e.type === 'income')
}

export function sumByCategory(entries, category) {
  return expensesOf(entries)
    .filter((e) => e.category === category)
    .reduce((total, e) => total + e.amount, 0)
}

export function totalIncome(entries) {
  return incomeOf(entries).reduce((total, e) => total + e.amount, 0)
}

export function totalSpent(entries) {
  return expensesOf(entries).reduce((total, e) => total + e.amount, 0)
}

export function getAllocation(entries, income) {
  return CATEGORIES.reduce((acc, cat) => {
    const spent = sumByCategory(entries, cat)
    acc[cat] = {
      spent,
      pct: income > 0 ? spent / income : 0,
      target: TARGETS[cat]
    }
    return acc
  }, {})
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
  const savingsRate = income > 0 ? sumByCategory(entries, 'savings') / income : 0
  const emergencyGoal = goals.find((g) => g.name.toLowerCase().includes('emergency'))
  const you = name ? `${name}, ` : ''
  const cap = (s) => (you ? s : s.charAt(0).toUpperCase() + s.slice(1))

  if (income <= 0) {
    return {
      tone: 'caution',
      message: `${you}${cap('log your income as a transaction to see personalized guidance here.')}`
    }
  }
  if (remaining < 0) {
    return {
      tone: 'warning',
      message: `${you}${cap("you've spent more than you earned this month. Trim Wants spending first before anything else.")}`
    }
  }
  if (savingsRate < TARGETS.savings) {
    return {
      tone: 'caution',
      message: `${you}${cap(`savings are at ${(savingsRate * 100).toFixed(0)}% of income. Aim to raise Savings toward 20% before investing more.`)}`
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
