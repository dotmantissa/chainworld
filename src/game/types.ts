export type RarityTier = 'genesis' | 'legendary' | 'rare' | 'uncommon' | 'common' | 'floor'
export interface ChogTrait { trait_type: string; value: string }
export interface ChogMetadata { name: string; description?: string; image: string; attributes: ChogTrait[] }
export interface CharacterStats {
  charisma: number; persuasion: number; endurance: number; intelligence: number
  incomeMultiplier: number; meterDecayMultiplier: number; socialGainRate: number
}
export interface CharacterAppearance {
  sourceTier?:string
  schemaVersion?:2
  bodyColor: string; eyeType: string; mouthType: string; hatType: string; clothesType: string
  accessoryType: string; backgroundTrait: string; profession: Profession; specialAbility: string | null
  skinTrait?:string; bodyTrait?:string; headTrait?:string; eyeTrait?:string; mouthTrait?:string; formTrait?:string; sideTrait?:string
  sourceImage?:string; sourceName?:string
}
export type Profession = 'banker' | 'dev' | 'validator' | 'degen' | 'freelancer'
export type ZoneId = 0 | 1 | 2 | 3 | 4 | 5
export const ZONE_IDS: ZoneId[] = [0, 1, 2, 3, 4, 5]
export interface Zone {
  id: ZoneId; name: string; chain: string; rpc: string | null; vibe: string; baseDailyCost: number
  multiplier: number; color: string; bgClass: string; locked: boolean
}
export interface GameMeters {
  hunger: number; energy: number; social: number; hygiene: number; fun: number; comfort: number; reputation: number; housingTier: number
}
export type ActionKind = 'eat' | 'snack' | 'rest' | 'sleep' | 'socialize' | 'unwind' | 'work' | 'focus' | 'hermit' | 'wash' | 'relax' | 'cookBreakfast' | 'cookStew' | 'eatLeftovers' | 'practiceCoding' | 'paint' | 'npcHangout'
export type JobKind = 'validator' | 'grifter'
export interface ActiveAction { id: number; kind: ActionKind; startedAt: number; endsAt: number;objectId?:string;npcId?:string;mealRecipe?:import('./life').Recipe }
export interface JobSession {
  id: number; kind: JobKind; startedAt: number; endsAt: number; zone: ZoneId
  seed: number; score: number; clicked: number[]; openingWei?: string; openingAt?: number; prediction?: 'up' | 'down'
}
export interface GameState {
  daily?:import('./dailyGoals').DailyState
  routine?:import('./routine').RoutineState
  life?:import('./life').LifeState
  household?:import('./household').Household
  home: import('./neighborhood').Estate
  location: import('./neighborhood').WorldLocation
  profile: import('./residentProfile').ResidentProfile
  version: 2; chainId: number; collection: string; walletAddress: string; tokenId: number
  registeredLot: number | null; registeredOnChain: boolean
  currentZone: ZoneId; meters: GameMeters; gChog: number; upkeepCarry: number; lastSaved: number
  stats: CharacterStats; appearance: CharacterAppearance; rarityTier: RarityTier; rarityRank: number
  rarityVerified: boolean; chogBadgeTier: number; unlockedZones: ZoneId[]
  action: ActiveAction | null; job: JobSession | null; sequence: number
  cooldowns: Record<string, number>; xp: number; completedWork: number; upgrades: number
  quests: string[]; streak: number; lastMessage: string
}
export interface GweiData {
  zoneId: ZoneId; gwei: number | null; wei: string | null; fetchedAt: number; stale: boolean
}
export type EventTarget = 'cost' | 'income' | 'social'
export interface DailyEvent {
  id: string; name: string; description: string; effect: string; icon: string
  startsAt: number; endsAt: number; multiplier: number; affectedZone: ZoneId | 'all'; target: EventTarget
}
