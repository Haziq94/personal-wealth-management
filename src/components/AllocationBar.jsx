import { House, ShoppingBag, Landmark, Scale, ShieldAlert } from 'lucide-react'
import { formatPct } from '../lib/finance'

const LABELS = { needs: 'Commitment', wants: 'Daily Budget', emergency: 'Emergency', savings: 'Savings' }
const CAPTIONS = {
  needs: 'target = your commitments',
  wants: 'target = capped near your commitments — extra surplus goes to Savings',
  emergency: 'target = 0% — only appears when something unexpected forces a draw from Savings',
  savings: 'target = everything left after Commitment and Daily Budget — grows fastest on a bonus'
}
const COLORS = {
  needs: 'var(--color-cat-needs)',
  wants: 'var(--color-cat-wants)',
  emergency: 'var(--color-cat-emergency)',
  savings: 'var(--color-cat-savings)'
}
const ICONS = { needs: House, wants: ShoppingBag, emergency: ShieldAlert, savings: Landmark }

function Row({ cat, data }) {
  const laneMax = data.target > 0 ? data.target * 1.5 : Math.max(data.pct, 0.1)
  const barWidth = Math.min((data.pct / laneMax) * 100, 100)
  const markerPos = data.target > 0 ? Math.min((data.target / laneMax) * 100, 100) : 0
  const over = data.pct > data.target
  const Icon = ICONS[cat]

  return (
    <div className="py-3 border-b hairline last:border-b-0">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="font-body text-sm text-ink flex items-center gap-1.5">
          <Icon size={15} style={{ color: COLORS[cat] }} strokeWidth={1.75} />
          {LABELS[cat]}
        </span>
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
          style={{ left: `${markerPos}%` }}
        />
      </div>
      <p className="text-[11px] text-muted mt-1">{CAPTIONS[cat]}</p>
    </div>
  )
}

export default function AllocationBar({ allocation }) {
  return (
    <div className="bg-surface border hairline p-4">
      <h3 className="font-display text-base mb-1 flex items-center gap-1.5">
        <Scale size={17} className="text-emerald" strokeWidth={1.75} />
        Budget Allocation
      </h3>
      <p className="text-xs text-muted mb-2">
        Commitment is set to your recurring commitments. Daily Budget is capped near that same amount — any extra,
        like a bonus, flows straight to Savings. Tag a transaction "Emergency" and it draws from Savings instead.
      </p>
      {Object.entries(allocation).map(([cat, data]) => (
        <Row key={cat} cat={cat} data={data} />
      ))}
    </div>
  )
}
