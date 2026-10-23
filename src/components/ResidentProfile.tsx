import { useState } from 'react'
import { DEFAULT_PROFILE, genderName, parseProfile, type ResidentProfile as Profile } from '../game/residentProfile'
export default function ResidentProfile({profile,onSave,pending}:{profile:Profile|undefined;onSave(profile:Profile):void;pending:boolean}) {
  const current=profile??DEFAULT_PROFILE
  const [editing,setEditing]=useState(false),[draft,setDraft]=useState(current)
  const valid=parseProfile(draft)
  if(!editing)return <div className="resident-profile"><p className="muted">{genderName(current)}{current.pronouns?` · ${current.pronouns}`:''}</p><button onClick={()=>{setDraft(current);setEditing(true)}}>Customize resident</button></div>
  return <form className="profile-form" onSubmit={event=>{event.preventDefault();if(valid){onSave(valid);setEditing(false)}}}>
    <label>Resident name<input value={draft.name} maxLength={40} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Your Chog’s name"/></label>
    <label>Sex / gender<select aria-label="Sex / gender" value={draft.gender} onChange={e=>setDraft({...draft,gender:e.target.value as Profile['gender']})}><option value="unspecified">Prefer not to say</option><option value="female">Female / woman</option><option value="male">Male / man</option><option value="nonbinary">Nonbinary</option><option value="self-described">Self describe</option></select></label>
    {draft.gender==='self-described'&&<label>Your gender<input value={draft.genderLabel} maxLength={40} onChange={e=>setDraft({...draft,genderLabel:e.target.value})}/></label>}
    <label>Pronouns <small>(optional)</small><input value={draft.pronouns} maxLength={40} placeholder="e.g. she/her, he/him, they/them" onChange={e=>setDraft({...draft,pronouns:e.target.value})}/></label>
    <p className="muted">Your choice is editable. Your NFT determines appearance and rarity; gender does not change your stats.</p>
    <div className="flex gap-2"><button className="primary" type="submit" disabled={!valid||pending}>Save resident</button><button type="button" onClick={()=>setEditing(false)}>Cancel editing</button></div>
  </form>
}
