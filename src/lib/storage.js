const STORAGE_KEY = 'wealth-ledger:v1'

const DEFAULT_STATE = {
  name: 'Haziq',
  income: 0,
  entries: [],
  goals: []
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STATE }
    const parsed = JSON.parse(raw)
    return {
      name: typeof parsed.name === 'string' ? parsed.name : DEFAULT_STATE.name,
      income: typeof parsed.income === 'number' ? parsed.income : 0,
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      goals: Array.isArray(parsed.goals) ? parsed.goals : []
    }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function exportState(state) {
  const payload = {
    ...state,
    exportedAt: new Date().toISOString(),
    schema: 1
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
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
        if (typeof parsed.income !== 'number' || !Array.isArray(parsed.entries) || !Array.isArray(parsed.goals)) {
          reject(new Error('This file does not look like a valid Ledger backup.'))
          return
        }
        resolve({
          name: typeof parsed.name === 'string' ? parsed.name : DEFAULT_STATE.name,
          income: parsed.income,
          entries: parsed.entries,
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
