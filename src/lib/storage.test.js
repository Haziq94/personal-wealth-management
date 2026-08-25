import { describe, it, expect } from 'vitest'
import { buildBackup, parseBackup } from './storage'

const state = {
  name: 'Haziq',
  currency: 'MYR',
  entries: [
    { id: 'e1', name: 'STARBUCKS', amount: 45.9, type: 'expense', category: 'Food & Drink', date: '2026-08-22T14:30', accountId: 'a1' }
  ],
  accounts: [{ id: 'a1', name: 'Maybank', openingBalance: 1000, type: null, isSavings: false, isCredit: false, last4: '7935' }],
  categories: ['Food & Drink', 'Emergency'],
  accountTypes: ['Bank Account'],
  payslips: [],
  commitments: [],
  pending: [{ id: 'p1', type: 'expense', amount: 12, name: 'GRAB', raw: 'You paid RM12.00 to GRAB', date: '2026-08-22T09:00' }],
  security: { enabled: true, pinHash: 'HASH', salt: 'SALT', biometricEnabled: true, credentialId: 'CRED' }
}

describe('backup contents', () => {
  const { json, filename } = buildBackup(state)
  const payload = JSON.parse(json)

  it('names the file by date', () => {
    expect(filename).toMatch(/^wealth-ledger-backup-\d{4}-\d{2}-\d{2}\.json$/)
  })

  it('never carries the PIN, its salt, or the biometric credential', () => {
    expect(payload.security).toBeUndefined()
    expect(json).not.toContain('HASH')
    expect(json).not.toContain('SALT')
    expect(json).not.toContain('CRED')
  })

  it('never carries unconfirmed drafts, which hold raw notification text', () => {
    expect(payload.pending).toBeUndefined()
    expect(json).not.toContain('You paid RM12.00 to GRAB')
  })

  it('carries the ledger itself', () => {
    expect(payload.entries).toHaveLength(1)
    expect(payload.accounts[0].last4).toBe('7935')
    expect(payload.categories).toContain('Food & Drink')
  })
})

describe('restoring a backup', () => {
  it('round-trips the ledger back', () => {
    const restored = parseBackup(buildBackup(state).json)
    expect(restored.name).toBe('Haziq')
    expect(restored.currency).toBe('MYR')
    expect(restored.entries[0]).toMatchObject({ name: 'STARBUCKS', amount: 45.9, accountId: 'a1' })
    expect(restored.accounts[0]).toMatchObject({ name: 'Maybank', last4: '7935' })
  })

  it('leaves this device its own lock setup', () => {
    expect(parseBackup(buildBackup(state).json).security).toBeUndefined()
  })

  it('starts with an empty review queue', () => {
    expect(parseBackup(buildBackup(state).json).pending).toEqual([])
  })

  it('rejects text that is not JSON, naming the likely cause', () => {
    expect(() => parseBackup('{"entries": [')).toThrow(/whole backup was copied/)
  })

  it('rejects JSON that is not a backup', () => {
    expect(() => parseBackup('{"hello":"world"}')).toThrow(/valid Ledger backup/)
    expect(() => parseBackup('null')).toThrow(/valid Ledger backup/)
  })

  it('accepts a backup pasted with surrounding whitespace', () => {
    const restored = parseBackup(`\n  ${buildBackup(state).json}\n `)
    expect(restored.entries).toHaveLength(1)
  })
})
