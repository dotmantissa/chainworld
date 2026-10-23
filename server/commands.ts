import type { ActionKind, ZoneId } from '../src/game/types'
import {ACTIONS} from '../src/game/gameEngine'
import type { Command } from '../src/game/gameEngine'
import { HttpError } from './http'
import { HOME_STYLES, type HomeStyle } from '../src/game/neighborhood'
import { parseProfile } from '../src/game/residentProfile'
import {FURNITURE,type FurnitureType} from '../src/game/housing'
import {GROCERIES,PROJECTS,type Project} from '../src/game/life'
import {DAILY_GOALS,type DailyGoal} from '../src/game/dailyGoals'
import {TOPICS,type Venue} from '../src/game/places'
export function parseCommand(value:unknown):Command {
  if(!value||typeof value!=='object')throw new HttpError(400,'Missing command')
  const c=value as Record<string,unknown>
  const coordinate=(v:unknown)=>Number.isInteger(v)&&Number(v)>=0&&Number(v)<8
  switch(c.type){
    case 'claimDaily':if(typeof c.id==='string'&&Object.prototype.hasOwnProperty.call(DAILY_GOALS,c.id))return {type:'claimDaily',id:c.id as DailyGoal};break
    case 'setAutonomy':if(typeof c.enabled==='boolean')return {type:'setAutonomy',enabled:c.enabled};break
    case 'clearQueue':return {type:'clearQueue'}
    case 'removeIntent':if(Number.isSafeInteger(c.id)&&Number(c.id)>0)return {type:c.type,id:Number(c.id)};break
    case 'reorderIntent':if(Number.isSafeInteger(c.id)&&Number(c.id)>0&&['up','down'].includes(String(c.direction)))return {type:c.type,id:Number(c.id),direction:c.direction as 'up'|'down'};break
    case 'buyGroceries':if(typeof c.pack==='string'&&Object.prototype.hasOwnProperty.call(GROCERIES,c.pack))return {type:'buyGroceries',pack:c.pack as keyof typeof GROCERIES};break
    case 'startProject':case 'claimProject':if(typeof c.id==='string'&&Object.prototype.hasOwnProperty.call(PROJECTS,c.id))return {type:c.type,id:c.id as Project};break
    case 'enterVenue':if(['cafe','work','park'].includes(String(c.venue)))return {type:'enterVenue',venue:c.venue as Venue};break
    case 'talkNpc':if(typeof c.npcId==='string'&&/^npc:[0-4]:(cafe|work|park)$/.test(c.npcId)&&typeof c.topic==='string'&&Object.prototype.hasOwnProperty.call(TOPICS,c.topic))return {type:'talkNpc',npcId:c.npcId,topic:c.topic as keyof typeof TOPICS};break
    case 'moveIndoor':{const t=c.target as Record<string,unknown>|undefined;if(t&&Number.isInteger(t.x)&&Number.isInteger(t.y)&&Number(t.x)>=0&&Number(t.x)<12&&Number(t.y)>=0&&Number(t.y)<12)return {type:'moveIndoor',target:{x:Number(t.x),y:Number(t.y)}};break}
    case 'useObject':case 'enqueueAction':if(typeof c.objectId==='string'&&c.objectId.length<80&&Object.prototype.hasOwnProperty.call(ACTIONS,String(c.kind)))return c.type==='enqueueAction'?{type:'enqueueAction',objectId:c.objectId,kind:c.kind as ActionKind}:{type:'useObject',objectId:c.objectId,kind:c.kind as ActionKind};break
    case 'buyFurniture':case 'moveFurniture':if(Number.isSafeInteger(c.version)&&Number.isInteger(c.x)&&Number.isInteger(c.y)&&Number(c.x)>=0&&Number(c.y)>=0&&Number(c.x)<12&&Number(c.y)<12&&[0,1].includes(Number(c.rotation))){const position={x:Number(c.x),y:Number(c.y),rotation:Number(c.rotation) as 0|1,version:Number(c.version)};if(c.type==='buyFurniture'&&typeof c.furniture==='string'&&Object.prototype.hasOwnProperty.call(FURNITURE,c.furniture))return {type:c.type,furniture:c.furniture as FurnitureType,...position};if(c.type==='moveFurniture'&&typeof c.id==='string'&&c.id.length<80)return {type:c.type,id:c.id,...position}}break
    case 'storeFurniture':case 'sellFurniture':if(typeof c.id==='string'&&c.id.length<80&&Number.isSafeInteger(c.version))return {type:c.type,id:c.id,version:Number(c.version)};break
    case 'expandRoom':if(['x','y'].includes(String(c.axis))&&Number.isSafeInteger(c.version))return {type:c.type,axis:c.axis as 'x'|'y',version:Number(c.version)};break
    case 'editWall':if(Number.isSafeInteger(c.version)&&Number.isInteger(c.x)&&Number.isInteger(c.y)&&Number(c.x)>=0&&Number(c.x)<12&&Number(c.y)>=0&&Number(c.y)<12&&['x','y'].includes(String(c.axis))&&typeof c.door==='boolean'&&typeof c.remove==='boolean')return {type:c.type,x:Number(c.x),y:Number(c.y),axis:c.axis as 'x'|'y',door:c.door,remove:c.remove,version:Number(c.version)};break
    case 'carePet':if(['feed','pet','play','follow'].includes(String(c.kind)))return {type:'carePet',kind:c.kind as 'feed'|'pet'|'play'|'follow'};break
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
    case 'startAction':if(typeof c.kind==='string'&&Object.prototype.hasOwnProperty.call(ACTIONS,c.kind))return {type:'startAction',kind:c.kind as ActionKind};break
    case 'travel':if(Number.isInteger(c.zone)&&Number(c.zone)>=0&&Number(c.zone)<=5)return {type:'travel',zone:c.zone as ZoneId};break
    case 'claimQuest':if(typeof c.id==='string'&&c.id.length<64)return {type:'claimQuest',id:c.id};break
    case 'startJob':if(c.kind==='validator')return {type:'startJob',kind:'validator'};if(c.kind==='grifter'&&(c.prediction==='up'||c.prediction==='down'))return {type:'startJob',kind:'grifter',prediction:c.prediction};break
    case 'clickBlock':if(Number.isInteger(c.index)&&Number(c.index)>=0&&Number(c.index)<33&&Number.isSafeInteger(c.sessionId))return {type:'clickBlock',index:Number(c.index),sessionId:Number(c.sessionId)};break
    // Client gas samples and registration flags are never accepted by the authority.
    case 'resolveGrifter':return {type:'tick'}
  }
  throw new HttpError(400,'Unsupported or invalid command')
}
