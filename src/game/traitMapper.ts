// Chain World — NFT Trait → Game Stats & Appearance Mapper

import type {
  ChogTrait,
  CharacterStats,
  CharacterAppearance,
  Profession,
  RarityTier,
  ZoneId,
} from './types'

// ─── Background → Zone + Wealth ───────────────────────────────────────────────
function backgroundToZone(bg: string): { zoneId: ZoneId; wealthMod: number } {
  const b = bg.toLowerCase()
  if (b.includes('gold') || b.includes('yellow')) return { zoneId: 1, wealthMod: 1.4 }
  if (b.includes('purple') || b.includes('monad')) return { zoneId: 0, wealthMod: 1.25 }
  if (b.includes('blue')) return { zoneId: 2, wealthMod: 1.1 }
  if (b.includes('green')) return { zoneId: 3, wealthMod: 1.05 }
  if (b.includes('red') || b.includes('orange')) return { zoneId: 4, wealthMod: 0.9 }
  if (b.includes('black') || b.includes('dark') || b.includes('void')) return { zoneId: 5, wealthMod: 0.8 }
  return { zoneId: 0, wealthMod: 1.0 }
}

// ─── Eyes → Charisma + Social ─────────────────────────────────────────────────
function eyesToCharisma(eyes: string): { charisma: number; socialGain: number; eyeType: string } {
  const e = eyes.toLowerCase()
  if (e.includes('laser')) return { charisma: 90, socialGain: 20, eyeType: 'laser' }
  if (e.includes('smirk') || e.includes('green smirk')) return { charisma: 75, socialGain: 15, eyeType: 'smirk' }
  if (e.includes('happy') || e.includes('smile')) return { charisma: 60, socialGain: 10, eyeType: 'happy' }
  if (e.includes('sunglass') || e.includes('shades')) return { charisma: 80, socialGain: 18, eyeType: 'shades' }
  if (e.includes('dead') || e.includes(' x ') || e.includes('closed')) return { charisma: 20, socialGain: -15, eyeType: 'dead' }
  if (e.includes('cry') || e.includes('tear')) return { charisma: 30, socialGain: -10, eyeType: 'cry' }
  if (e.includes('angry') || e.includes('mad')) return { charisma: 50, socialGain: 5, eyeType: 'angry' }
  if (e.includes('heart')) return { charisma: 70, socialGain: 14, eyeType: 'heart' }
  return { charisma: 50, socialGain: 0, eyeType: 'default' }
}

// ─── Mouth → Persuasion + Income ──────────────────────────────────────────────
function mouthToPersuasion(mouth: string): { persuasion: number; incomeMultiplier: number; mouthType: string } {
  const m = mouth.toLowerCase()
  if (m.includes('grin') || m.includes('big smile')) return { persuasion: 85, incomeMultiplier: 1.3, mouthType: 'grin' }
  if (m.includes('smirk')) return { persuasion: 70, incomeMultiplier: 1.15, mouthType: 'smirk' }
  if (m.includes('frown') || m.includes('sad')) return { persuasion: 35, incomeMultiplier: 0.9, mouthType: 'frown' }
  if (m.includes('open') || m.includes('scream') || m.includes('yell')) return { persuasion: 60, incomeMultiplier: 1.0, mouthType: 'open' }
  if (m.includes('tongue')) return { persuasion: 65, incomeMultiplier: 1.1, mouthType: 'tongue' }
  return { persuasion: 50, incomeMultiplier: 1.0, mouthType: 'default' }
}

// ─── Body/Fur → Endurance + Decay ─────────────────────────────────────────────
function bodyToEndurance(body: string): { endurance: number; decayMultiplier: number; bodyColor: string } {
  const b = body.toLowerCase()
  if (b.includes('gold') || b.includes('metallic')) return { endurance: 95, decayMultiplier: 0.6, bodyColor: '#f5c542' }
  if (b.includes('pink')) return { endurance: 80, decayMultiplier: 0.75, bodyColor: '#e783b8' }
  if (b.includes('purple') || b.includes('chrome')) return { endurance: 80, decayMultiplier: 0.75, bodyColor: '#54278f' }
  if (b.includes('blue')) return { endurance: 65, decayMultiplier: 0.9, bodyColor: '#3b82f6' }
  if (b.includes('green')) return { endurance: 60, decayMultiplier: 0.95, bodyColor: '#22c55e' }
  if (b.includes('dark') || b.includes('black') || b.includes('shadow')) return { endurance: 30, decayMultiplier: 1.2, bodyColor: '#374151' }
  if (b.includes('red') || b.includes('orange')) return { endurance: 55, decayMultiplier: 1.0, bodyColor: '#f97316' }
  if (b.includes('white') || b.includes('cream')) return { endurance: 50, decayMultiplier: 1.0, bodyColor: '#f1e6c7' }
  if (b.includes('yellow')) return { endurance: 55, decayMultiplier: 1.0, bodyColor: '#e9bc4e' }
  return { endurance: 50, decayMultiplier: 1.0, bodyColor: '#40206c' }
}

// ─── Hat → Intelligence + Unlocks ─────────────────────────────────────────────
function hatToIntelligence(hat: string): { intelligence: number; hatType: string } {
  const h = hat.toLowerCase()
  if (h.includes('crown') || h.includes('king')) return { intelligence: 95, hatType: 'crown' }
  if (h.includes('wizard') || h.includes('witch')) return { intelligence: 85, hatType: 'wizard' }
  if (h.includes('cap') || h.includes('snapback') || h.includes('baseball')) return { intelligence: 60, hatType: 'cap' }
  if (h.includes('top hat') || h.includes('tophat')) return { intelligence: 75, hatType: 'tophat' }
  if (h.includes('halo')) return { intelligence: 80, hatType: 'halo' }
  if (h.includes('none') || h === '') return { intelligence: 45, hatType: 'none' }
  return { intelligence: 55, hatType: 'other' }
}

// ─── Clothes → Profession ──────────────────────────────────────────────────────
function clothesToProfession(clothes: string): { profession: Profession; clothesType: string } {
  const c = clothes.toLowerCase()
  if (c.includes('suit') || c.includes('business') || c.includes('tie')) return { profession: 'banker', clothesType: 'suit' }
  if (c.includes('hoodie') || c.includes('casual') || c.includes('tshirt') || c.includes('t-shirt')) return { profession: 'dev', clothesType: 'hoodie' }
  if (c.includes('armor') || c.includes('knight') || c.includes('warrior')) return { profession: 'validator', clothesType: 'armor' }
  if (c.includes('naked') || c.includes('none') || c.includes('bare')) return { profession: 'degen', clothesType: 'none' }
  return { profession: 'freelancer', clothesType: 'other' }
}

// ─── Accessories → Special Ability ────────────────────────────────────────────
function accessoryToAbility(acc: string): { ability: string | null; accessoryType: string } {
  const a = acc.toLowerCase()
  if (a.includes('chain') || a.includes('necklace') || a.includes('gold chain')) return { ability: 'diamond_hands', accessoryType: 'chain' }
  if (a.includes('glass') || a.includes('monocle') || a.includes('spectacle')) return { ability: 'alpha_reader', accessoryType: 'glasses' }
  if (a.includes('earring') || a.includes('piercing')) return { ability: 'smooth_talker', accessoryType: 'earring' }
  if (a.includes('pipe') || a.includes('cigar') || a.includes('cigarette')) return { ability: 'whale_aura', accessoryType: 'pipe' }
  return { ability: null, accessoryType: 'none' }
}

// ─── Rarity tier from rank ─────────────────────────────────────────────────────
export function rankToTier(rank: number): RarityTier {
  if (rank <= 50) return 'genesis'
  if (rank <= 200) return 'legendary'
  if (rank <= 500) return 'rare'
  if (rank <= 900) return 'uncommon'
  if (rank <= 1400) return 'common'
  return 'floor'
}

// ─── Starting gCHOG by tier ────────────────────────────────────────────────────
export function tierToStartingFunds(tier: RarityTier): number {
  const map: Record<RarityTier, number> = {
    genesis: 3200,
    legendary: 1600,
    rare: 800,
    uncommon: 400,
    common: 200,
    floor: 100,
  }
  return map[tier]
}

// ─── Unlocked zones by tier ────────────────────────────────────────────────────
export function tierToUnlockedZones(tier: RarityTier): ZoneId[] {
  const map: Record<RarityTier, ZoneId[]> = {
    genesis:   [0, 1, 2, 3, 4, 5],
    legendary: [0, 1, 2, 3, 4],
    rare:      [0, 2, 3],
    uncommon:  [0, 2],
    common:    [0],
    floor:     [0],
  }
  return map[tier]
}

// ─── Housing tier number from rarity tier ──────────────────────────────────────
export function tierToHousingLevel(tier: RarityTier): number {
  const map: Record<RarityTier, number> = {
    genesis: 5, legendary: 4, rare: 3, uncommon: 2, common: 1, floor: 0,
  }
  return map[tier]
}

// ─── Main mapper ───────────────────────────────────────────────────────────────
export function mapTraitsToCharacter(
  traits: ChogTrait[],
  _tokenId: number
): { stats: CharacterStats; appearance: CharacterAppearance; startingZone: ZoneId } {

  const get = (type: string) =>
    traits.find(t => t.trait_type.trim().toLowerCase()===type.toLowerCase())?.value ?? ''

  const bg = get('background')
  const eyes = get('eyes') || get('eye')
  const mouth = get('mouth')
  const body = get('skin') || get('fur') || get('color')
  const hat = get('hat') || get('head') || get('head wear')
  const clothes = get('body') || get('clothes') || get('clothing') || get('outfit') || get('wear') || get('shirt') || get('top')
  const accessory = get('accessory') || get('accessories') || get('accessor') || get('neck') || get('jewel') || get('item')

  const { zoneId: startingZone } = backgroundToZone(bg)
  const { charisma, socialGain, eyeType } = eyesToCharisma(eyes)
  const { persuasion, incomeMultiplier, mouthType } = mouthToPersuasion(mouth)
  const { endurance, decayMultiplier, bodyColor } = bodyToEndurance(body)
  const { intelligence, hatType } = hatToIntelligence(hat)
  const { profession, clothesType } = clothesToProfession(clothes)
  const { ability, accessoryType } = accessoryToAbility(accessory)

  // Profession income multiplier stacks on top of mouth
  const professionMod =
    profession === 'banker' ? 1.3
    : profession === 'dev' ? 1.1
    : profession === 'validator' ? 1.2
    : profession === 'degen' ? 1.5  // high variance handled in job logic
    : 1.0

  // Accessory stacks
  const abilityMod = ability === 'whale_aura' ? 1.1 : ability === 'alpha_reader' ? 1.08 : 1.0
  const housingMod = ability === 'diamond_hands' ? 0.5 : 1.0

  const stats: CharacterStats = {
    charisma,
    persuasion,
    endurance,
    intelligence,
    incomeMultiplier: incomeMultiplier * professionMod * abilityMod,
    meterDecayMultiplier: Math.max(0.5, Math.min(1.3, decayMultiplier * housingMod)),
    socialGainRate: Math.max(5, Math.min(30, 15 + socialGain + (ability === 'smooth_talker' ? 5 : 0))),
  }

  const appearance: CharacterAppearance = {
    sourceTier:get('tier'),
    schemaVersion:2,
    skinTrait:body,bodyTrait:clothes,headTrait:hat,eyeTrait:eyes,mouthTrait:mouth,formTrait:get('form'),sideTrait:get('side'),
    bodyColor,
    eyeType,
    mouthType,
    hatType,
    clothesType,
    accessoryType,
    backgroundTrait: bg,
    profession,
    specialAbility: ability,
  }

  return { stats, appearance, startingZone }
}
