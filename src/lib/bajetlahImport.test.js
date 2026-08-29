import { describe, it, expect } from 'vitest'
import { mapBajetlahExport } from './bajetlahImport'
import { currentMonthKey } from './finance'

// Synthetic rows only — shaped like a Bajetlah export but invented here. No real
// financial data is ever committed to this repo.
const emptyState = { accounts: [], entries: [], commitments: [], categories: ['Emergency'], accountTypes: [] }

const accounts = [
  { Account: 'Maybank', Type: 'BANK', 'Original balance': null, 'Account ending': null, 'Excluded from funds': false, 'Account ID': 'acc-bank' },
  { Account: 'Tabung Aeon', Type: 'TABUNG', 'Original balance': null, 'Account ID': 'acc-tabung' },
  { Account: 'CIMB Card', Type: 'CARD', 'Account ending': 1486, 'Credit limit': 20000, 'Account ID': 'acc-card' },
  { Account: 'Car Loan', Type: 'LOAN', 'Original balance': 47151, 'Account ID': 'acc-loan' },
  { Account: 'ShopeePay Later', Type: 'BNPL', 'Original balance': null, 'Account ID': 'acc-bnpl' }
]

const transactions = [
  {
    Date: '2026-08-28 21:10:31',
    Account: 'CIMB Card',
    'Income / Expense': 'Expense',
    'Original amount': 34.25,
    Currency: 'MYR',
    'MYR equivalent': 34.25,
    Category: 'Food & Drink',
    Merchant: "McDonald's",
    'Transaction ID': 'txn-1'
  },
  {
    Date: '2026-08-27 09:00:00',
    Account: 'Maybank',
    'Income / Expense': 'Income',
    'Original amount': 5000,
    Currency: 'MYR',
    'MYR equivalent': 5000,
    Category: 'Income',
    Merchant: 'Salary',
    'Transaction ID': 'txn-2'
  }
]

const commitments = [
  {
    Commitment: 'Indah Water',
    Amount: 90,
    Frequency: 'Every 6 monthly',
    'Next due date': '2026-08-09 00:00:00',
    'Linked account': 'Maybank',
    Paid: false,
    Archived: false,
    'Commitment ID': 'com-water'
  },
  {
    Commitment: 'Netflix',
    Amount: 55,
    Frequency: 'Every 1 monthly',
    'Next due date': '2026-08-05 00:00:00',
    Paid: true,
    Archived: false,
    'Commitment ID': 'com-netflix'
  },
  {
    Commitment: 'Old Gym',
    Amount: 100,
    Frequency: 'Every 1 monthly',
    Archived: true,
    'Commitment ID': 'com-gym'
  }
]

describe('mapping accounts', () => {
  const result = mapBajetlahExport({ accounts }, emptyState)
  const byId = Object.fromEntries(result.accounts.map((a) => [a.id, a]))

  it('flags each account type correctly', () => {
    expect(byId['acc-bank']).toMatchObject({ isSavings: false, isCredit: false, isLiability: false, type: 'Bank' })
    expect(byId['acc-tabung']).toMatchObject({ isSavings: true, type: 'Savings pot' })
    expect(byId['acc-card']).toMatchObject({ isCredit: true, type: 'Credit card', last4: '1486' })
    expect(byId['acc-loan']).toMatchObject({ isLiability: true, type: 'Loan' })
    expect(byId['acc-bnpl']).toMatchObject({ isLiability: true, type: 'BNPL' })
  })

  it('holds a loan as a negative balance (amount owed)', () => {
    expect(byId['acc-loan'].openingBalance).toBe(-47151)
  })

  it('starts asset accounts at zero, since the export carries no balance', () => {
    expect(byId['acc-bank'].openingBalance).toBe(0)
  })
})

describe('mapping transactions', () => {
  const result = mapBajetlahExport({ accounts, transactions }, emptyState)
  const byId = Object.fromEntries(result.entries.map((e) => [e.id, e]))

  it('takes the merchant as the name and the MYR figure as the amount', () => {
    expect(byId['txn-1']).toMatchObject({ name: "McDonald's", amount: 34.25, type: 'expense', category: 'Food & Drink' })
  })

  it('links a transaction to its account by name', () => {
    expect(byId['txn-1'].accountId).toBe('acc-card')
  })

  it('marks income as income', () => {
    expect(byId['txn-2'].type).toBe('income')
  })

  it('converts the timestamp to the app format', () => {
    expect(byId['txn-1'].date).toBe('2026-08-28T21:10')
  })

  it('adds referenced categories the app did not have', () => {
    expect(result.categories).toContain('Food & Drink')
    expect(result.categories).toContain('Emergency') // the pre-existing one survives
  })
})

describe('mapping commitments', () => {
  const result = mapBajetlahExport({ accounts, commitments }, emptyState)
  const byId = Object.fromEntries(result.commitments.map((c) => [c.id, c]))

  it('parses a half-yearly frequency', () => {
    expect(byId['com-water']).toMatchObject({ intervalMonths: 6, monthlyPayment: 90, dueDay: 9 })
  })

  it('links a commitment to its account', () => {
    expect(byId['com-water'].accountId).toBe('acc-bank')
  })

  it('treats a ticked Paid as settled this cycle', () => {
    expect(byId['com-netflix'].lastPaidPeriod).toBe(currentMonthKey())
    expect(byId['com-water'].lastPaidPeriod).toBeNull()
  })

  it('accepts Paid however the spreadsheet encodes a boolean', () => {
    const variants = ['TRUE', 'True', 1, 'yes'].map((paid, i) => ({
      Commitment: `C${i}`,
      Amount: 10,
      Frequency: 'Every 1 monthly',
      Paid: paid,
      'Commitment ID': `v${i}`
    }))
    const result = mapBajetlahExport({ commitments: variants }, emptyState)
    expect(result.commitments.every((c) => c.lastPaidPeriod === currentMonthKey())).toBe(true)
  })

  it('skips archived commitments', () => {
    expect(byId['com-gym']).toBeUndefined()
    expect(result.commitments).toHaveLength(2)
  })
})

describe('foreign currency', () => {
  it('records the original amount and rate when not in MYR', () => {
    const fx = [
      {
        Date: '2026-08-01 10:00:00',
        Account: 'Maybank',
        'Income / Expense': 'Expense',
        'Original amount': 10,
        Currency: 'USD',
        'MYR equivalent': 47,
        Merchant: 'Steam',
        'Transaction ID': 'txn-fx'
      }
    ]
    const [entry] = mapBajetlahExport({ accounts, transactions: fx }, emptyState).entries.filter((e) => e.id === 'txn-fx')
    expect(entry).toMatchObject({ amount: 47, foreignCurrency: 'USD', foreignAmount: 10, exchangeRate: 4.7 })
  })
})

describe('re-import is idempotent', () => {
  it('updates in place rather than duplicating, by id', () => {
    const once = mapBajetlahExport({ accounts, transactions, commitments }, emptyState)
    const twice = mapBajetlahExport({ accounts, transactions, commitments }, once)
    expect(twice.accounts).toHaveLength(once.accounts.length)
    expect(twice.entries).toHaveLength(once.entries.length)
    expect(twice.commitments).toHaveLength(once.commitments.length)
  })

  it('reports what it brought in', () => {
    const result = mapBajetlahExport({ accounts, transactions, commitments }, emptyState)
    expect(result.counts).toEqual({ accounts: 5, entries: 2, commitments: 2 })
  })
})
