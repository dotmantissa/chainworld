// Chain World — Zone Card with live gwei display

import { useState, useEffect } from 'react'
import { Zap, Lock, MapPin } from 'lucide-react'
import type { Zone, ZoneId, GweiData } from '../game/types'
import { getZoneGwei, computeDailyCost } from '../game/zones'

interface Props {
  zone: Zone
  isCurrentZone: boolean
  isUnlocked: boolean
  rarityRank: number
  onTravel: (zoneId: ZoneId) => void
  eventMultiplier?: number
}

export default function ZoneCard({ zone, isCurrentZone, isUnlocked, rarityRank, onTravel, eventMultiplier = 1 }: Props) {
  const [gweiData, setGweiData] = useState<GweiData | null>(null)

  useEffect(() => {
    let mounted = true
    function fetchData() {
      void getZoneGwei(zone.id).then(data => {
        if (mounted) setGweiData(data)
      })
    }
    fetchData()
    const interval = setInterval(fetchData, 60_000)
    return () => { mounted = false; clearInterval(interval) }
  }, [zone.id])

  const dailyCost = gweiData
    ? computeDailyCost(zone, gweiData.gwei, rarityRank, eventMultiplier)
    : null

  const congested = (gweiData?.gwei ?? 0) > 50 && zone.id === 1 // ETH Heights congested

  return (
    <div
      className={`relative p-3 rounded-xl border transition-all duration-200 ${
        isCurrentZone
          ? 'border-white/30 bg-white/10'
          : isUnlocked
          ? 'border-white/10 bg-white/5 hover:bg-white/8 cursor-pointer'
          : 'border-white/5 bg-white/2 opacity-50 cursor-not-allowed'
      }`}
      role="button"
      tabIndex={isUnlocked && !isCurrentZone ? 0 : -1}
      aria-disabled={!isUnlocked || isCurrentZone}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && isUnlocked && !isCurrentZone) { e.preventDefault(); onTravel(zone.id) } }}
      onClick={() => isUnlocked && !isCurrentZone && onTravel(zone.id)}
    >
      {/* Zone color strip */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
        style={{ background: zone.color }}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {isCurrentZone && <MapPin size={10} style={{ color: zone.color, flexShrink: 0 }} />}
            <p className="text-xs font-semibold leading-tight truncate" style={{ color: 'var(--ink)' }}>
              {zone.name}
            </p>
            {!isUnlocked && <Lock size={9} style={{ color: 'var(--subtle)', flexShrink: 0 }} />}
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{zone.chain}</p>
        </div>

        <div className="text-right shrink-0">
          {zone.id === 5 ? (
            <p className="text-xs font-semibold" style={{ color: 'var(--subtle)' }}>Free</p>
          ) : gweiData ? (
            <>
              <div className="flex items-center gap-1 justify-end">
                <div className={`live-dot ${gweiData.stale ? 'opacity-40' : ''}`} style={{ background: zone.color }} />
                <span className="tabular text-xs font-semibold mono" style={{ color: zone.color }}>
                  {gweiData.gwei != null ? `${gweiData.gwei.toPrecision(4)} gwei${gweiData.stale ? ' · stale' : ''}` : 'Fees unavailable · baseline'}
                </span>
              </div>
              {dailyCost != null && (
                <p className="tabular text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {dailyCost} gCHOG/day

                </p>
              )}
            </>
          ) : (
            <span className="text-xs" style={{ color: 'var(--subtle)' }}>Loading...</span>
          )}
        </div>
      </div>

      {congested && (
        <div className="mt-1.5 flex items-center gap-1">
          <Zap size={9} style={{ color: 'var(--danger)' }} />
          <span className="text-xs" style={{ color: 'var(--danger)' }}>CONGESTED — higher upkeep</span>
        </div>
      )}

      {isCurrentZone && (
        <div
          className="mt-1.5 text-xs font-medium"
          style={{ color: zone.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          Current Zone
        </div>
      )}
    </div>
  )
}
