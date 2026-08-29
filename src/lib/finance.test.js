import { describe, it, expect } from 'vitest'
import {
  getNetWorth,
  accountBalanceView,
  isLiabilityAccount,
  monthsBetween,
  isCommitmentPaidThisMonth,
  commitmentFrequencyLabel,
  commitmentMonthlyEquivalent,
  getCommitmentsMonthlyTotal,
  currentMonthKey
} from './finance'

describe('net worth', () => {
  const accounts = [
    { id: 'cash', name: 'Maybank', openingBalance: 3000, isSavings: false, isCredit: false, isLiability: false },
    { id: 'save', name: 'ASNB', openingBalance: 5000, isSavings: true, isCredit: false, isLiability: false },
    { id: 'card', name: 'Visa', openingBalance: -800, isSavings: false, isCredit: true, isLiability: false },
    { id: 'loan', name: 'Car Loan', openingBalance: -47000, isSavings: false, isCredit: false, isLiability: true }
  ]

  it('nets assets against debts', () => {
    const { assets, debts, net } = getNetWorth([], accounts)
    expect(assets).toBe(8000) // 3000 + 5000
    expect(debts).toBe(47800) // 800 + 47000, reported positive
    expect(net).toBe(-39800) // 8000 - 47800
  })

  it('leaves excluded accounts out entirely', () => {
    const withExcluded = accounts.map((a) => (a.id === 'loan' ? { ...a, excludeFromFunds: true } : a))
    const { debts, net } = getNetWorth([], withExcluded)
    expect(debts).toBe(800)
    expect(net).toBe(7200) // 8000 - 800
  })

  it('follows the balance as transactions land', () => {
    const entries = [{ type: 'expense', amount: 200, accountId: 'cash' }]
    expect(getNetWorth(entries, accounts).assets).toBe(7800) // 3000-200 + 5000
  })
})

describe('liability display', () => {
  it('treats loans and BNPL like credit cards', () => {
    expect(isLiabilityAccount({ isCredit: true })).toBe(true)
    expect(isLiabilityAccount({ isLiability: true })).toBe(true)
    expect(isLiabilityAccount({ isSavings: true })).toBe(false)
  })

  it('shows a debt as a positive amount owed', () => {
    const view = accountBalanceView({ isLiability: true, balance: -1200 })
    expect(view.amount).toBe(1200)
    expect(view.label).toBe('owed')
  })

  it('shows an overpaid debt as in credit', () => {
    expect(accountBalanceView({ isLiability: true, balance: 50 }).label).toBe('in credit')
  })

  it('shows a plain account balance as-is', () => {
    const view = accountBalanceView({ balance: 3000 })
    expect(view.amount).toBe(3000)
    expect(view.label).toBeNull()
  })
})

describe('commitment frequency', () => {
  it('measures whole months between period keys', () => {
    expect(monthsBetween('2026-01', '2026-01')).toBe(0)
    expect(monthsBetween('2026-01', '2026-07')).toBe(6)
    expect(monthsBetween('2025-11', '2026-02')).toBe(3)
  })

  it('labels each interval', () => {
    expect(commitmentFrequencyLabel({ intervalMonths: 1 })).toBe('Monthly')
    expect(commitmentFrequencyLabel({ intervalMonths: 6 })).toBe('Every 6 months')
    expect(commitmentFrequencyLabel({ intervalMonths: 12 })).toBe('Yearly')
  })

  it('spreads a payment across its cycle for the monthly-equivalent', () => {
    expect(commitmentMonthlyEquivalent({ monthlyPayment: 90, intervalMonths: 6 })).toBe(15)
    expect(commitmentMonthlyEquivalent({ monthlyPayment: 199, intervalMonths: 1 })).toBe(199)
  })

  it('totals mixed frequencies on a monthly basis', () => {
    const commitments = [
      { monthlyPayment: 100, intervalMonths: 1 }, // 100/mo
      { monthlyPayment: 90, intervalMonths: 6 }, //  15/mo
      { monthlyPayment: 120, intervalMonths: 12 } // 10/mo
    ]
    expect(getCommitmentsMonthlyTotal(commitments)).toBe(125)
  })

  it('keeps a half-yearly bill covered until its next cycle', () => {
    const thisMonth = currentMonthKey()
    // paid this month → not due again yet
    expect(isCommitmentPaidThisMonth({ lastPaidPeriod: thisMonth, intervalMonths: 6 })).toBe(true)
    // a monthly bill paid three months ago is due again
    expect(isCommitmentPaidThisMonth({ lastPaidPeriod: monthsAgoKey(3), intervalMonths: 1 })).toBe(false)
    // a half-yearly bill paid three months ago is still covered
    expect(isCommitmentPaidThisMonth({ lastPaidPeriod: monthsAgoKey(3), intervalMonths: 6 })).toBe(true)
    // …but due again once six months have passed
    expect(isCommitmentPaidThisMonth({ lastPaidPeriod: monthsAgoKey(6), intervalMonths: 6 })).toBe(false)
  })

  it('treats a never-paid commitment as due', () => {
    expect(isCommitmentPaidThisMonth({ lastPaidPeriod: null, intervalMonths: 1 })).toBe(false)
  })
})

function monthsAgoKey(n) {
  const d = new Date()
  // Anchor to the 1st before shifting — otherwise subtracting months from, say,
  // the 29th can overflow a short month and land in the wrong one.
  d.setDate(1)
  d.setMonth(d.getMonth() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
