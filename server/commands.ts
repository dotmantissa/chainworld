import type { ActionKind, ZoneId } from '../src/game/types'
import type { Command } from '../src/game/gameEngine'
import { HttpError } from './http'
import { HOME_STYLES, type HomeStyle } from '../src/game/neighborhood'
import { parseProfile } from '../src/game/residentProfile'
export function parseCommand(value:unknown):Command {
  if(!value||typeof value!=='object')throw new HttpError(400,'Missing command')
  const c=value as Record<string,unknown>
  const coordinate=(v:unknown)=>Number.isInteger(v)&&Number(v)>=0&&Number(v)<8
  switch(c.type){
    case 'leaveHome':return {type:'leaveHome'}
    case 'walk':{const t=c.target as Record<string,unknown>|undefined;if(t&&Number.isInteger(t.x)&&Number.isInteger(t.y)&&Number(t.x)>=0&&Number(t.x)<36&&Number(t.y)>=0&&Number(t.y)<39)return {type:'walk',target:{x:Number(t.x),y:Number(t.y)}};break}
    case 'enterHome':if(c.host===undefined||typeof c.host==='string'&&c.host.length<160)return {type:'enterHome',host:c.host as string|undefined};break
    case 'decorate':if(HOME_STYLES.includes(c.style as HomeStyle)&&typeof c.open==='boolean')return {type:'decorate',style:c.style as HomeStyle,open:c.open};break
    case 'buyLand':if(coordinate(c.x)&&coordinate(c.y))return {type:'buyLand',x:Number(c.x),y:Number(c.y)};break
    case 'offerLand':if(coordinate(c.x)&&coordinate(c.y)&&Number.isSafeInteger(c.amount)&&Number(c.amount)>0&&Number(c.amount)<=1e9)return {type:'offerLand',x:Number(c.x),y:Number(c.y),amount:Number(c.amount)};break
    case 'respondOffer':if(typeof c.id==='string'&&/^[a-f0-9-]{36}$/i.test(c.id)&&['accept','reject','cancel'].includes(String(c.decision)))return {type:'respondOffer',id:c.id,decision:c.decision as 'accept'|'reject'|'cancel'};break
    case 'gesture':if(typeof c.recipient==='string'&&c.recipient.length<160&&['wave','chat','high-five'].includes(String(c.gesture)))return {type:'gesture',recipient:c.recipient,gesture:c.gesture as 'wave'|'chat'|'high-five'};break

    case 'setProfile': {const profile=parseProfile(c.profile);if(profile)return {type:'setProfile',profile};break}
    case 'tick':case 'cancel':case 'upgrade':case 'ration':return {type:c.type}
    case 'startAction':if(typeof c.kind==='string'&&['eat','snack','rest','sleep','socialize','unwind','work','focus','hermit'].includes(c.kind))return {type:'startAction',kind:c.kind as ActionKind};break
    case 'travel':if(Number.isInteger(c.zone)&&Number(c.zone)>=0&&Number(c.zone)<=5)return {type:'travel',zone:c.zone as ZoneId};break
    case 'claimQuest':if(typeof c.id==='string'&&c.id.length<64)return {type:'claimQuest',id:c.id};break
    case 'startJob':if(c.kind==='validator')return {type:'startJob',kind:'validator'};if(c.kind==='grifter'&&(c.prediction==='up'||c.prediction==='down'))return {type:'startJob',kind:'grifter',prediction:c.prediction};break
    case 'clickBlock':if(Number.isInteger(c.index)&&Number(c.index)>=0&&Number(c.index)<33&&Number.isSafeInteger(c.sessionId))return {type:'clickBlock',index:Number(c.index),sessionId:Number(c.sessionId)};break
    // Client gas samples and registration flags are never accepted by the authority.
    case 'resolveGrifter':return {type:'tick'}
  }
  throw new HttpError(400,'Unsupported or invalid command')
}
