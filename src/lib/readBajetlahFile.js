import { mapBajetlahExport } from './bajetlahImport'

// Reads a Bajetlah .xlsx entirely in the browser and returns the merged app
// state. The spreadsheet library is imported dynamically so it lands in its own
// chunk — normal use never downloads it, only an actual import does. The file
// bytes never leave the device: no upload, no network, no server.
export async function readBajetlahFile(file, state) {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { cellDates: true })

  const sheet = (name) => {
    const ws = book.Sheets[name]
    return ws ? XLSX.utils.sheet_to_json(ws, { defval: null }) : []
  }

  const sheets = {
    accounts: sheet('Accounts'),
    transactions: sheet('Transactions'),
    commitments: sheet('Commitments')
  }

  if (sheets.accounts.length === 0 && sheets.transactions.length === 0 && sheets.commitments.length === 0) {
    throw new Error("This doesn't look like a Bajetlah export — no Accounts, Transactions or Commitments sheet found.")
  }

  return mapBajetlahExport(sheets, state)
}
