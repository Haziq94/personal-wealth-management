import { nowLocalISO } from './finance'

// Reads spending alerts out of phone notifications, without knowing anything
// about which bank or e-wallet sent them. Every rule here is a shape a message
// can take ("card ending 1234", "RM45.90 at ..."), never an issuer name — so a
// new bank or wallet works on day one with no code change.

// A one-time code is never a transaction, and these messages frequently quote
// an amount ("OTP 8842 for your payment of RM50.00"), so they have to be
// thrown out before anything else runs or they'd parse as real spending.
const IGNORE_PATTERNS = [
  /\bTACs?\b/i,
  /\bOTPs?\b/i,
  /one[-\s]?time\s*(?:password|passcode|code|pin)/i,
  /\bverification\s*(?:code|number)/i,
  /\bsecurity\s*code\b/i,
  /\bauthorisation\s*code\b/i,
  /\bauthorization\s*code\b/i,
  /\bactivation\s*code\b/i,
  /\bdo\s*not\s*share\b/i,
  /\bnever\s*share\b/i,
  /\bCVV\b/i,
  /\blog\s?in\b/i,
  /\bsign\s?in\b/i,
  /\bpassword\b/i
]

// Ordered widest-context-first: "card ending 1234" is unambiguous, a bare
// "****1234" much less so, so the specific phrasings get first refusal.
const LAST4_PATTERNS = [
  /ending(?:\s+(?:in|with))?\s*(?:no\.?|number|#)?\s*[:\-]?\s*[*x•·.\s]{0,10}(\d{4})\b/i,
  /(?:card|a\/c|acc(?:t|ount)?)\s*(?:no\.?|number|#)?\s*[:\-]?\s*[*x•·.]{2,}\s*[-\s]?(\d{4})\b/i,
  /[*x•·]{3,}\s*[-\s]?(\d{4})\b/i,
  /\.{3,}\s*(\d{4})\b/i
]

const SYMBOL_TO_CODE = {
  RM: 'MYR',
  MYR: 'MYR',
  SGD: 'SGD',
  'S$': 'SGD',
  USD: 'USD',
  $: 'USD',
  AUD: 'AUD',
  'A$': 'AUD',
  EUR: 'EUR',
  '€': 'EUR',
  GBP: 'GBP',
  '£': 'GBP',
  IDR: 'IDR',
  Rp: 'IDR',
  THB: 'THB',
  '฿': 'THB',
  JPY: 'JPY',
  '¥': 'JPY',
  CNY: 'CNY',
  INR: 'INR',
  '₹': 'INR'
}

const AMOUNT_RE = /(RM|MYR|SGD|S\$|USD|AUD|A\$|EUR|GBP|IDR|THB|JPY|CNY|INR|Rp|[$€£¥₹฿])\s*(\d[\d,]*(?:\.\d{1,2})?)/gi

// Words that mean the number after them is what's left in the account, not what
// was just spent. Alerts routinely quote both in one line.
const NOT_THE_SPEND_RE = /(balance|baki|limit|available|remaining|reward|point)\D{0,12}$/i

const INCOME_RE = /\b(received|credited|refund(?:ed)?|reversal|reversed|cashback|deposit(?:ed)?|incoming)\b/i
const SPEND_RE =
  /\b(paid|payment|purchase[sd]?|spent|spend|debited|debit|charged|deducted|withdrawal|withdrawn|transaction|txn)\b/i

// Everything after these words is context about the payment, not the payee.
const MERCHANT_STOP = '(?:using|use|with|on|via|ref|reference|dated|at\\s+\\d|from|your|card|acc|approved|successful|is|was)'
const MERCHANT_RE = new RegExp(`\\b(?:at|to|for)\\s+(.+?)(?=\\s+${MERCHANT_STOP}\\b|[.,;!|]|$)`, 'i')

// Merchant keyword → category. Matched against the app's own category list, so
// a keyword only ever resolves to a category the user actually has.
const CATEGORY_KEYWORDS = [
  { category: 'Food & Drink', words: ['restoran', 'restaurant', 'cafe', 'kopitiam', 'mcdonald', 'kfc', 'starbucks', 'pizza', 'burger', 'food', 'grabfood', 'foodpanda', 'bakery', 'coffee', 'nasi', 'mamak', 'zus', 'tealive'] },
  { category: 'Groceries', words: ['grocer', 'mart', 'market', 'tesco', 'lotus', 'aeon', 'giant', 'jaya', 'village', 'speedmart', 'mydin', 'econsave', 'hypermarket', 'supermarket'] },
  { category: 'Transport', words: ['grab', 'taxi', 'mrt', 'lrt', 'rapid', 'touch n go', 'tng', 'toll', 'parking', 'airasia', 'flight', 'train', 'ktm'] },
  { category: 'Fuel', words: ['petron', 'petronas', 'shell', 'caltex', 'bhp', 'fuel', 'petrol'] },
  { category: 'Bills & Utility', words: ['tnb', 'tenaga', 'syabas', 'air selangor', 'unifi', 'maxis', 'celcom', 'digi', 'umobile', 'astro', 'indah water', 'bill', 'utility', 'insurance', 'takaful'] },
  { category: 'Shopping', words: ['shopee', 'lazada', 'zalora', 'uniqlo', 'ikea', 'watson', 'guardian', 'pharmacy', 'store', 'mall', 'shop'] },
  { category: 'Entertainment', words: ['netflix', 'spotify', 'youtube', 'cinema', 'gsc', 'tgv', 'steam', 'playstation', 'disney', 'game'] }
]

function combined(notification) {
  return [notification?.title, notification?.text].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

export function shouldIgnoreNotification(notification) {
  const message = combined(notification)
  if (!message) return true
  return IGNORE_PATTERNS.some((pattern) => pattern.test(message))
}

export function extractLast4(message) {
  for (const pattern of LAST4_PATTERNS) {
    const match = message.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Issuers are inconsistent about case ("RM", "rm", "Rp"), so a symbol is looked
// up as written, then upper-cased, then in the mixed-case form the table uses.
function currencyCodeFor(raw) {
  const capitalised = raw[0].toUpperCase() + raw.slice(1).toLowerCase()
  return SYMBOL_TO_CODE[raw] || SYMBOL_TO_CODE[raw.toUpperCase()] || SYMBOL_TO_CODE[capitalised] || null
}

export function extractAmount(message) {
  AMOUNT_RE.lastIndex = 0
  let match
  while ((match = AMOUNT_RE.exec(message)) !== null) {
    const preceding = message.slice(0, match.index)
    if (NOT_THE_SPEND_RE.test(preceding)) continue
    const value = parseFloat(match[2].replace(/,/g, ''))
    if (!Number.isFinite(value) || value <= 0) continue
    return { amount: value, currency: currencyCodeFor(match[1]) }
  }
  return null
}

export function extractMerchant(message) {
  const match = message.match(MERCHANT_RE)
  if (!match) return null
  const cleaned = match[1]
    .replace(/\s+/g, ' ')
    .replace(/^["'(]+|["')]+$/g, '')
    .trim()
  // A lone preposition fragment or a number is noise, not a payee.
  if (cleaned.length < 2 || /^\d+$/.test(cleaned)) return null
  return cleaned
}

// The message's own date text is inconsistent across issuers (and often absent),
// while the moment the notification arrived is always available and always right
// to the minute — so that's what the entry is stamped with.
function dateFromNotification(notification) {
  const postTime = notification?.postTime
  if (typeof postTime === 'number' && Number.isFinite(postTime)) return nowLocalISO(new Date(postTime))
  return nowLocalISO()
}

export function inferCategory(merchant, categories = [], entries = []) {
  if (!merchant) return null
  const needle = merchant.toLowerCase()

  // What the user did last time with this merchant beats any keyword guess.
  const previous = entries.find((e) => e.name && e.category && e.name.toLowerCase() === needle)
  if (previous && categories.includes(previous.category)) return previous.category

  for (const { category, words } of CATEGORY_KEYWORDS) {
    if (!categories.includes(category)) continue
    if (words.some((word) => needle.includes(word))) return category
  }
  return null
}

export function matchAccount(last4, accounts = []) {
  if (!last4) return null
  return accounts.find((a) => a.last4 === last4) || null
}

// Returns a draft transaction for review, or null when the notification isn't a
// spending alert at all. Nothing here writes to the ledger — a parse is a
// suggestion, and a wrong guess should never land silently.
export function parseSpendNotification(notification, { accounts = [], categories = [], entries = [] } = {}) {
  if (shouldIgnoreNotification(notification)) return null

  const message = combined(notification)
  const isIncome = INCOME_RE.test(message)
  if (!isIncome && !SPEND_RE.test(message)) return null

  const money = extractAmount(message)
  if (!money) return null

  const last4 = extractLast4(message)
  const merchant = extractMerchant(message)
  const account = matchAccount(last4, accounts)

  return {
    type: isIncome ? 'income' : 'expense',
    amount: money.amount,
    currency: money.currency,
    last4,
    name: merchant,
    accountId: account?.id ?? null,
    category: isIncome ? null : inferCategory(merchant, categories, entries),
    date: dateFromNotification(notification),
    source: 'notification',
    raw: message
  }
}
