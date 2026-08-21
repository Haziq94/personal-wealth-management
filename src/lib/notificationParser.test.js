import { describe, it, expect } from 'vitest'
import { parseSpendNotification, shouldIgnoreNotification, extractLast4, extractAmount } from './notificationParser'

const accounts = [
  { id: 'a1', name: 'Maybank', last4: '7935' },
  { id: 'a2', name: 'CIMB Visa', last4: '4821', isCredit: true }
]
const categories = ['Food & Drink', 'Groceries', 'Transport', 'Bills & Utility', 'Entertainment', 'Emergency']

function parse(text, extra = {}) {
  return parseSpendNotification({ text, postTime: Date.parse('2026-08-22T14:30:00') }, { accounts, categories, ...extra })
}

describe('one-time codes are never transactions', () => {
  const codes = [
    'Your TAC is 482913. Do not share it with anyone.',
    'OTP 998877 for your payment of RM50.00 to SHOPEE.',
    'Your one-time password is 123456.',
    'Verification code: 8842',
    'Use security code 5567 to authorise your purchase of RM 89.00.'
  ]
  for (const text of codes) {
    it(`ignores: ${text.slice(0, 40)}...`, () => {
      expect(shouldIgnoreNotification({ text })).toBe(true)
      expect(parse(text)).toBeNull()
    })
  }
})

describe('card last 4 digits, however the issuer writes it', () => {
  const shapes = {
    'card ending 1234': '1234',
    'card ending in 1234': '1234',
    'card ending with 1234': '1234',
    'Card ending no. 1234': '1234',
    'card **** 1234': '1234',
    'card ****1234': '1234',
    'Card no. xxxx1234': '1234',
    'a/c ...1234': '1234',
    'using •••• 1234': '1234'
  }
  for (const [text, expected] of Object.entries(shapes)) {
    it(`reads "${text}"`, () => expect(extractLast4(text)).toBe(expected))
  }
})

describe('amounts', () => {
  it('reads a plain ringgit amount', () => {
    expect(extractAmount('RM45.90')).toEqual({ amount: 45.9, currency: 'MYR' })
  })

  it('handles thousands separators', () => {
    expect(extractAmount('RM 1,234.56')).toEqual({ amount: 1234.56, currency: 'MYR' })
  })

  it('takes the spend, not the balance quoted after it', () => {
    expect(extractAmount('Purchase of RM30.00 at 99 SPEEDMART. Available balance RM1,200.00')).toEqual({
      amount: 30,
      currency: 'MYR'
    })
  })

  it('is not thrown by how the issuer cases the symbol', () => {
    expect(extractAmount('you paid rm45.90')).toEqual({ amount: 45.9, currency: 'MYR' })
    expect(extractAmount('paid rp 50,000')).toEqual({ amount: 50000, currency: 'IDR' })
  })

  it('reads other currencies', () => {
    expect(extractAmount('You paid SGD 12.00')).toEqual({ amount: 12, currency: 'SGD' })
    expect(extractAmount('Payment of Rp 50,000 made')).toEqual({ amount: 50000, currency: 'IDR' })
  })
})

describe('real-world spending alerts', () => {
  it('parses a card payment and links it to the matching account', () => {
    const draft = parse('You have made a payment of RM45.90 to STARBUCKS MY using card ending 4821.')
    expect(draft).toMatchObject({
      type: 'expense',
      amount: 45.9,
      currency: 'MYR',
      last4: '4821',
      name: 'STARBUCKS MY',
      accountId: 'a2',
      category: 'Food & Drink'
    })
  })

  it('parses a differently-worded alert from another issuer', () => {
    const draft = parse('Transaction Alert: RM 120.00 at TESCO EXTRA with card **** 7935')
    expect(draft).toMatchObject({
      amount: 120,
      last4: '7935',
      name: 'TESCO EXTRA',
      accountId: 'a1',
      category: 'Groceries'
    })
  })

  it('parses an e-wallet payment with no card number at all', () => {
    const draft = parse('You paid RM12.50 to GRAB. Your balance is RM88.20.')
    expect(draft).toMatchObject({ amount: 12.5, name: 'GRAB', category: 'Transport' })
    expect(draft.last4).toBeNull()
    expect(draft.accountId).toBeNull()
  })

  it('stamps the entry with the time the notification arrived', () => {
    expect(parse('Payment of RM10.00 to KFC made').date).toBe('2026-08-22T14:30')
  })

  it('flags incoming money as income rather than spending', () => {
    const draft = parse('You have received RM500.00 from AHMAD BIN ALI.')
    expect(draft.type).toBe('income')
  })

  it('prefers the category the user chose for this merchant last time', () => {
    const entries = [{ name: 'GRAB', category: 'Emergency' }]
    const draft = parse('You paid RM12.50 to GRAB.', { entries })
    expect(draft.category).toBe('Emergency')
  })

  it('only suggests categories the user actually has', () => {
    const draft = parseSpendNotification(
      { text: 'Payment of RM20.00 to NETFLIX made' },
      { accounts, categories: ['Food & Drink'] }
    )
    expect(draft.category).toBeNull()
  })

  it('ignores notifications that quote no money', () => {
    expect(parse('Your statement for card ending 4821 is ready.')).toBeNull()
  })

  it('ignores chatter that is not about a transaction', () => {
    expect(parse('Enjoy 20% off at ZUS COFFEE this weekend!')).toBeNull()
  })
})
