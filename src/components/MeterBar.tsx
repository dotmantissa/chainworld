// Chain World — Life Meter Bar Component

import { meterColor } from '../game/gameEngine'

interface Props {
  label: string
  value: number
  max: number
  icon?: string
  compact?: boolean
}

export default function MeterBar({ label, value, max, icon, compact = false }: Props) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const color = meterColor(value, max)
  const danger = pct < 20

  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
        >
          {icon} {label}
        </span>
        <span
          className="tabular text-xs font-semibold"
          style={{ color: danger ? 'var(--danger)' : 'var(--ink-2)' }}
        >
          {Math.round(value)}/{max}
        </span>
      </div>
      <div className="meter-bar" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max}>
        <div
          className="meter-fill"
          style={{
            width: `${pct}%`,
            background: danger
              ? `linear-gradient(90deg, ${color}, #fca5a5)`
              : color,
            boxShadow: danger ? `0 0 6px ${color}` : undefined,
          }}
        />
      </div>
    </div>
  )
}
