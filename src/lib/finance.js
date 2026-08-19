export const CATEGORIES = ['needs', 'wants', 'savings']

export const TARGETS = { needs: 0.5, wants: 0.3, savings: 0.2 }

export function sumByCategory(entries, category) {
  return entries
    .filter((e) => e.category === category)
    .reduce((total, e) => total + e.amount, 0)
}

export function totalSpent(entries) {
  return entries.reduce((total, e) => total + e.amount, 0)
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
  const recurring = entries.filter((e) => e.recurring)
  return {
    entries: recurring,
    total: totalSpent(recurring)
  }
}

export function getInvestmentGuidance(entries, goals, income) {
  const spent = totalSpent(entries)
  const remaining = income - spent
  const savingsRate = income > 0 ? sumByCategory(entries, 'savings') / income : 0
  const emergencyGoal = goals.find((g) => g.name.toLowerCase().includes('emergency'))

  if (remaining < 0) {
    return {
      tone: 'warning',
      message: "You've spent more than you earned this month. Trim Wants spending first before anything else."
    }
  }
  if (savingsRate < TARGETS.savings) {
    return {
      tone: 'caution',
      message: `Savings are at ${(savingsRate * 100).toFixed(0)}% of income. Aim to raise Savings toward 20% before investing more.`
    }
  }
  if (!emergencyGoal || emergencyGoal.saved < emergencyGoal.target) {
    return {
      tone: 'caution',
      message: 'Build 3–6 months of essential expenses into an emergency fund before investing your surplus.'
    }
  }
  return {
    tone: 'good',
    message: 'Savings are healthy and your emergency fund is covered. Consider directing monthly surplus into diversified, low-cost investments.'
  }
}

export function formatMoney(n) {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatPct(n) {
  return `${(n * 100).toFixed(0)}%`
}
