# Wealth Management App — Project Context

Handoff notes from a Claude.ai conversation, for building a real standalone app with Claude Code.

## Who it's for
- Single user, personal use only — no multi-user accounts, no auth needed beyond whatever you want for your own device security.
- Primary device: Android, Samsung Galaxy S24+.
- A working prototype already exists as a Claude.ai artifact (React, in-memory + Claude-hosted persistent storage). It proved out the data model and UI, but that storage only works inside Claude — this app needs its own real, standalone persistence.

## What the app does
One dashboard covering four areas of personal finance:

1. **Dashboard** — income vs. spent vs. remaining for the month, a 50/30/20 allocation bar (Needs / Wants / Savings actual vs. target), and a short investment-guidance message that changes based on the numbers.
2. **Spending** — log expenses with a name, amount, and category (needs / wants / savings); each entry can be flagged as recurring.
3. **Commitments** — auto-derived view: every expense flagged recurring, summed into a monthly total. Not separately entered data — it's a filtered view of Spending.
4. **Savings & Investing** — named savings goals with a target amount and amount saved so far, progress bars, plus a static rule-of-thumb note (build 3–6 months of essential expenses as an emergency fund before investing surplus).

## Data model
```
income: number  (monthly, single value)

entry: {
  id: string
  name: string
  amount: number
  category: "needs" | "wants" | "savings"
  recurring: boolean
}

goal: {
  id: string
  name: string
  target: number
  saved: number
}
```
`entries[]` and `goals[]` are the only collections. Commitments are computed (`entries.filter(e => e.recurring)`), not stored separately.

## Core logic
- **50/30/20 targets**: Needs ≤ 50% of income, Wants ≤ 30%, Savings ≥ 20%. Actual % per category = sum of that category's entries ÷ income.
- **Investment guidance** (evaluated in this priority order):
  1. If `remaining < 0` (overspent) → tell them to trim Wants first.
  2. Else if savings rate < 20% of income → tell them to raise Savings toward 20% before investing more.
  3. Else if the "emergency fund" goal (matched by name containing "emergency") isn't fully funded → recommend funding 3–6 months of essential (Needs) expenses in cash first.
  4. Else → savings healthy and emergency fund covered → recommend directing monthly surplus into diversified, low-cost investments.
- This is all simple rule-of-thumb logic, not personalized financial advice — keep it that way unless you deliberately want to add real portfolio guidance later.

## Visual design (already decided — carry this over)
Ledger / financial-statement aesthetic, deliberately not a generic fintech-gradient look.

- **Colors**: background `#F6F5F1` (paper), surface `#FFFFFF`, text/ink `#1B2430`, primary accent (Savings/growth) `#2F6F4E` deep emerald, secondary accent (Wants/warning) `#B5482C` muted rust, muted/caption text `#8A8F98`.
- **Type**: Newsreader (serif, display headings), Inter (body/UI), IBM Plex Mono (all numbers — gives it a real-ledger feel; monetary and percentage values are always tabular monospace).
- **Signature element**: the 50/30/20 segmented allocation bar on the dashboard, showing actual spend as filled segments against the 50/30/20 targets.
- Layout style: ruled "ledger rows" (hairline dividers) rather than heavy card shadows; minimal border-radius; calm and precise, not flashy.

## What "proper app" should mean here
The person wants to move off the Claude-hosted prototype into something real on their own phone. Worth clarifying with them early in the Claude Code session:
- Installable Android app (native, e.g. via Expo/React Native) vs. an installable PWA (works offline, add-to-home-screen, no app-store install) — PWA is the faster path and reuses the existing React/Tailwind code almost directly; native gives a truer app feel and app-store distribution potential.
- Local persistence approach (e.g. IndexedDB/localStorage for a PWA, or SQLite/AsyncStorage for native) — replaces the Claude `window.storage` calls, which won't exist outside Claude.
- Whether they ever want it on more than one device (would need real sync/backend), or if single-device local storage is enough.

## Reference implementation
The full working prototype (React component, Tailwind classes, lucide-react icons) is attached as `wealth-dashboard.jsx`. It's a complete, working reference for the UI, data model, and logic above — the main porting work is swapping Claude's `window.storage` calls for whatever local persistence the chosen platform uses.
