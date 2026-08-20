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

export const BUDGET_GROUPS = ['needs', 'wants', 'emergency', 'savings']

export const DEFAULT_CATEGORIES = ['Food & Drink', 'Transport', 'Bills & Utility', 'Entertainment', 'Emergency']

// Tagging an expense with the "Emergency" category (case-insensitive — it's just
// a normal transaction category, nothing special about how it's entered) pulls it
// out of Daily Budget and into its own always-0%-target group, so unexpected
// necessities (car breakdown, a burst pipe) are visibly a draw against Savings
// rather than blowing out the everyday spending number.
export function isEmergencyEntry(entry) {
  return typeof entry.category === 'string' && entry.category.toLowerCase() === 'emergency'
}

export function getEmergencySpend(entries) {
  return expensesOf(entries)
    .filter((e) => !e.recurring && isEmergencyEntry(e))
    .reduce((total, e) => total + e.amount, 0)
}

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
    // No planned allocation — an emergency fund is meant to sit untouched until
    // something breaks, at which point it draws from Savings rather than a target.
    emergency: { amount: 0, pct: 0 },
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
  const emergencySpent = getEmergencySpend(entries)
  const spentTotal = totalSpent(entries)
  const wantsSpent = Math.max(spentTotal - needsSpent - emergencySpent, 0)
  const savingsSpent = Math.max(income - spentTotal, 0)
  const spentByGroup = { needs: needsSpent, wants: wantsSpent, emergency: emergencySpent, savings: savingsSpent }

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

// Non-recurring expenses only — commitments (rent, insurance, loan repayments) aren't
// something you can quickly cut, so "what should I spend less on" suggestions should
// only ever point at discretionary (Daily Budget) categories.
export function getTopSpendingCategories(entries, limit = 3) {
  const totals = {}
  for (const e of expensesOf(entries)) {
    if (e.recurring || isEmergencyEntry(e)) continue
    const cat = e.category || 'Uncategorized'
    totals[cat] = (totals[cat] || 0) + e.amount
  }
  return Object.entries(totals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}

// A whole category ("Food & Drink") is too blunt a target — it can't tell a habitual
// small purchase (the same coffee, bought most days) from a one-off or a legitimately
// bigger month (more lunches because you were in the office more). What IS a reliable
// signal from the data we have: the same-named item bought repeatedly. That's specific,
// nameable, and — unlike a category total climbing for a good reason — actually optional.
export function getSpendingHabits(entries, limit = 3, minOccurrences = 3) {
  const groups = {}
  for (const e of expensesOf(entries)) {
    if (e.recurring || isEmergencyEntry(e)) continue
    const key = (e.name || '').trim().toLowerCase()
    if (!key) continue
    if (!groups[key]) groups[key] = { name: e.name.trim(), count: 0, total: 0 }
    groups[key].count += 1
    groups[key].total += e.amount
  }
  return Object.values(groups)
    .filter((g) => g.count >= minOccurrences)
    .map((g) => ({ ...g, avg: g.total / g.count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

export function getInvestmentGuidance(entries, income, currency, accounts = [], allEntries = entries, name = '') {
  const spent = totalSpent(entries)
  const remaining = income - spent
  const targets = getAllocationTargets(entries, income)
  const savingsRate = income > 0 ? Math.max(income - spent, 0) / income : 0
  const you = name ? `${name}, ` : ''
  const cap = (s) => (you ? s : s.charAt(0).toUpperCase() + s.slice(1))
  const suggestSpending = (limit) => {
    // Prefer a specific, nameable habit ("Iced Latte × 14, RM 168.00") — only fall
    // back to a whole-category total when nothing repeats often enough to call a habit.
    const habits = getSpendingHabits(entries, limit)
    if (habits.length > 0) {
      const list = habits.map((h) => `${h.name} × ${h.count} (${formatMoney(h.total, currency)})`).join(', ')
      return ` A repeat habit worth cutting: ${list}.`
    }
    const top = getTopSpendingCategories(entries, limit)
    if (top.length === 0) return ''
    const list = top.map((t) => `${t.category} (${formatMoney(t.amount, currency)})`).join(', ')
    return ` Biggest discretionary spend this period: ${list} — trim there first.`
  }

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
      message: `${you}${cap("you've spent more than you earned this period.")}${suggestSpending(2)}`
    }
  }
  const emergencySpent = getEmergencySpend(entries)
  if (emergencySpent > 0) {
    // Emergency spending exists precisely so a one-off necessity doesn't read as
    // "overspending" — only escalate to an alert when there's genuinely no cushion
    // left (real Savings account balances, not just this period's derived rate).
    const savingsBalance = getAccountBalances(allEntries, accounts.filter((a) => a.isSavings)).reduce(
      (sum, a) => sum + a.balance,
      0
    )
    if (savingsBalance <= 0) {
      return {
        tone: 'warning',
        message: `${you}${cap(`this period included ${formatMoney(emergencySpent, currency)} of emergency spending and your savings are empty. That's a real risk — prioritize rebuilding Savings before anything else.`)}`
      }
    }
  }
  if (savingsRate < targets.savings.pct) {
    return {
      tone: 'caution',
      message: `${you}${cap(`savings are at ${(savingsRate * 100).toFixed(0)}% of income. Aim to raise Savings toward ${(targets.savings.pct * 100).toFixed(0)}%.`)}${suggestSpending(2)}`
    }
  }
  return {
    tone: 'good',
    message: `${you}${cap('savings are healthy. Keep 3–6 months of essential expenses accessible, then consider directing surplus into diversified, low-cost investments.')}`
  }
}

// Calendar months, not pay periods — analytics looks at long-run trends, so it
// intentionally ignores the salary-anchored "current period" the Dashboard uses.
export function getMonthlyTrend(entries, months = 6) {
  const now = new Date()
  const buckets = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.push({ key, label: d.toLocaleDateString(undefined, { month: 'short' }), income: 0, spent: 0 })
  }
  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]))
  for (const e of entries) {
    const bucket = e.date && byKey[e.date.slice(0, 7)]
    if (!bucket) continue
    if (e.type === 'income') bucket.income += e.amount
    else if (e.type === 'expense') bucket.spent += e.amount
  }
  return buckets
}

export function filterRecentMonths(entries, months = 6) {
  const now = new Date()
  const cutoff = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}`
  return entries.filter((e) => e.date && e.date.slice(0, 7) >= cutoffKey)
}

export function getCategoryBreakdown(entries, months = 6) {
  const totals = {}
  let total = 0
  for (const e of expensesOf(filterRecentMonths(entries, months))) {
    const cat = e.category || 'Uncategorized'
    totals[cat] = (totals[cat] || 0) + e.amount
    total += e.amount
  }
  return Object.entries(totals)
    .map(([category, amount]) => ({ category, amount, pct: total > 0 ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount)
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

// Years worth showing in the Tax page's year picker — every year with either a
// transaction or a payslip, plus the current year so a first-time user isn't
// staring at an empty selector.
export function getTaxYears(entries, payslips = []) {
  const years = new Set([String(new Date().getFullYear())])
  for (const e of entries) if (e.date) years.add(e.date.slice(0, 4))
  for (const p of payslips) if (p.date) years.add(p.date.slice(0, 4))
  return [...years].sort((a, b) => b.localeCompare(a))
}

export function getTaxDeductibleExpenses(entries, year) {
  return expensesOf(entries)
    .filter((e) => e.taxDeductible && e.date && e.date.slice(0, 4) === year)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

// Payslips carry a free-form deductions breakdown (EPF, SOCSO, PCB, etc.) — this
// aggregates that across every payslip in the given year, both as a grand total
// and per-label, so the Tax page can show "PCB: RM 1,200" without hardcoding
// Malaysia-specific deduction names into the data model.
export function getPayslipSummary(payslips, year) {
  const inYear = payslips.filter((p) => p.date && p.date.slice(0, 4) === year).sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const grossTotal = inYear.reduce((t, p) => t + (p.grossSalary || 0), 0)
  const nettTotal = inYear.reduce((t, p) => t + (p.nettSalary || 0), 0)
  const deductionTotals = {}
  let deductionsTotal = 0
  for (const p of inYear) {
    for (const d of p.deductions || []) {
      deductionTotals[d.label] = (deductionTotals[d.label] || 0) + d.amount
      deductionsTotal += d.amount
    }
  }
  return {
    payslips: inYear,
    grossTotal,
    nettTotal,
    deductionsTotal,
    deductionBreakdown: Object.entries(deductionTotals)
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount)
  }
}

// Commitments use a calendar month ("YYYY-MM"), not the salary-anchored pay
// period — a bill's due date doesn't move with when you got paid.
export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function isCommitmentPaidThisMonth(commitment) {
  return commitment.lastPaidPeriod === currentMonthKey()
}

export function getCommitmentsTotal(commitments) {
  return commitments.reduce((total, c) => total + (c.monthlyPayment || 0), 0)
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
