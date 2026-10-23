import type { DailyEvent, ZoneId, EventTarget } from './types'

export const EVENT_DURATION_MS = 2 * 60 * 60 * 1000
const templates: Omit<DailyEvent, 'startsAt' | 'endsAt'>[] = [
  { id: 'gas_war', name: 'Gas War', description: 'Congestion increases upkeep.', effect: 'Living costs ×2', icon: 'Flame', multiplier: 2, affectedZone: 'all', target: 'cost' },
  { id: 'airdrop', name: 'Airdrop Season', description: 'Work is in demand.', effect: 'Job earnings ×1.5', icon: 'Gift', multiplier: 1.5, affectedZone: 'all', target: 'income' },
  { id: 'parade', name: 'Chog Parade', description: 'Meet your neighbors in Monad.', effect: 'Monad social gains ×3', icon: 'Users', multiplier: 3, affectedZone: 0, target: 'social' },
  { id: 'eth_surge', name: 'Ethereum Surge', description: 'Ethereum is congested.', effect: 'Ethereum upkeep ×4', icon: 'Zap', multiplier: 4, affectedZone: 1, target: 'cost' },
  { id: 'monad_speed', name: 'Monad Speed Demon', description: 'Validators are hiring.', effect: 'Monad job earnings ×2', icon: 'Rocket', multiplier: 2, affectedZone: 0, target: 'income' },
]
// Deterministic UTC rotation for the local simulation. No block-time authority is claimed.
export function getTodaysEvent(now = Date.now()): DailyEvent {
  const slot = Math.floor(now / EVENT_DURATION_MS)
  return { ...templates[((slot % templates.length) + templates.length) % templates.length], startsAt: slot * EVENT_DURATION_MS, endsAt: (slot + 1) * EVENT_DURATION_MS }
}
export function isEventActive(event: DailyEvent, now = Date.now()): boolean {
  return now >= event.startsAt && now < event.endsAt
}
export function getEventMultiplier(event: DailyEvent, zone: ZoneId, target: EventTarget = 'cost', now = Date.now()): number {
  return isEventActive(event, now) && event.target === target && (event.affectedZone === 'all' || event.affectedZone === zone) ? event.multiplier : 1
}
