import { formatPct } from '../lib/finance'

const LABELS = { needs: 'Needs', wants: 'Wants', savings: 'Savings' }
const COLORS = { needs: '#1B2430', wants: '#B5482C', savings: '#2F6F4E' }

function Row({ cat, data }) {
  const barWidth = Math.min((data.pct / (data.target * 1.5)) * 100, 100)
  const over = data.pct > data.target

  return (
    <div className="py-3 border-b hairline last:border-b-0">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="font-body text-sm text-ink">{LABELS[cat]}</span>
        <span className="num text-sm">
          <span className={over && cat !== 'savings' ? 'text-rust' : 'text-ink'}>{formatPct(data.pct)}</span>
          <span className="text-muted"> / {formatPct(data.target)} target</span>
        </span>
      </div>
      <div className="relative h-2 bg-paper border hairline overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${barWidth}%`, backgroundColor: COLORS[cat] }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-ink/40"
          style={{ left: `${Math.min((data.target / (data.target * 1.5)) * 100, 100)}%` }}
        />
      </div>
    </div>
  )
}

export default function AllocationBar({ allocation }) {
  return (
    <div className="bg-surface border hairline p-4">
      <h3 className="font-display text-base mb-1">50 / 30 / 20 Allocation</h3>
      <p className="text-xs text-muted mb-2">Actual spend against target, as a share of income</p>
      {Object.entries(allocation).map(([cat, data]) => (
        <Row key={cat} cat={cat} data={data} />
      ))}
    </div>
  )
}
