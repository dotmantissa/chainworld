export const GENDERS = ['unspecified', 'female', 'male', 'nonbinary', 'self-described'] as const
export type Gender = typeof GENDERS[number]
export interface ResidentProfile { name:string; gender:Gender; genderLabel:string; pronouns:string }
export const DEFAULT_PROFILE:ResidentProfile={name:'',gender:'unspecified',genderLabel:'',pronouns:''}
export function parseProfile(value:unknown):ResidentProfile|null {
  if(!value||typeof value!=='object')return null
  const p=value as Record<string,unknown>
  if(!GENDERS.includes(p.gender as Gender)||typeof p.name!=='string'||typeof p.genderLabel!=='string'||typeof p.pronouns!=='string')return null
  const fields=[p.name,p.genderLabel,p.pronouns]
  if(fields.some(s=>s.length>40||/[\u0000-\u001f\u007f]/.test(s)))return null
  if(p.gender==='self-described'&&!p.genderLabel.trim())return null
  return {name:p.name.trim(),gender:p.gender as Gender,genderLabel:p.gender==='self-described'?p.genderLabel.trim():'',pronouns:p.pronouns.trim()}
}
export function genderName(profile:ResidentProfile):string {
  return profile.gender==='self-described'?profile.genderLabel:({unspecified:'Prefer not to say',female:'Female / woman',male:'Male / man',nonbinary:'Nonbinary'})[profile.gender]
}
