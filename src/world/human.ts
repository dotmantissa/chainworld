import type {GameState,CharacterAppearance} from '../game/types'
import type {ResidentProfile} from '../game/residentProfile'
import {seedOf} from '../game/housing'
export interface HumanLook {skin:string;shadow:string;hair:string;shirt:string;trousers:string;eyes:string;longHair:boolean;glasses:boolean;female:boolean}
export function humanLook(a:CharacterAppearance,profile:ResidentProfile,identity=''):HumanLook{
 const seed=seedOf(`${identity}:${a.sourceImage??''}:${a.headTrait}:${a.bodyTrait}:${a.eyeTrait}`),skins=[['#f8d8bc','#dfad91'],['#e7b48c','#c38b68'],['#bb835f','#986345'],['#8d5a40','#6c4032']]
 const skin=skins[seed%skins.length],hair=['#3d2945','#74463b','#27364a','#b17949','#676199'][seed%5],shirts=['#927bc7','#7aafae','#d9879b','#719cba','#ceaa63']
 return {skin:skin[0],shadow:skin[1],hair,shirt:shirts[(seed>>>4)%5],trousers:'#3e445d',eyes:['#5f448a','#34657b','#754b39'][seed%3],longHair:profile.gender==='female'||profile.gender!=='male'&&seed%2===0,glasses:/glass|vr|btc|shade/i.test(a.eyeTrait??''),female:profile.gender==='female'}
}
export function humanSvg(look:HumanLook,frame=0):string{
 const l=look,sit=frame===4,sleep=frame===5,back=frame===2,side=frame===1||frame===3,flip=frame===3,leg=sit?104:126,body=sit?68:64
 const figure=`<g stroke="#343044" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
 <ellipse cx="48" cy="151" rx="23" ry="5" fill="#433853" opacity=".14" stroke="none"/>
 ${l.longHair?`<path d="M25 32Q24 7 48 6T71 34L76 87Q49 101 20 82Z" fill="${l.hair}"/>`:''}
 <path d="M35 ${body+39}L34 ${leg+17} 30 ${leg+25} 45 ${leg+25} 48 ${body+44} 52 ${leg+25} 67 ${leg+25} 61 ${leg+17} 60 ${body+39}Z" fill="${l.trousers}"/>
 <path d="M31 ${leg+23}H45V${leg+28}H27Q25 ${leg+24} 31 ${leg+23}M52 ${leg+23}H65L70 ${leg+28}H52Z" fill="#f6e8dc"/>
 <path d="M33 ${body}Q48 ${body-6} 64 ${body}L68 ${body+41}Q48 ${body+47} 28 ${body+41}Z" fill="${l.shirt}"/>
 <path d="M35 ${body+29}Q48 ${body+38} 66 ${body+31}L68 ${body+41}Q46 ${body+47} 28 ${body+41}Z" fill="#343044" opacity=".12" stroke="none"/>
 <path d="M33 ${body+3}L24 ${body+29} 28 ${body+45}Q32 ${body+49} 35 ${body+43}L32 ${body+29} 40 ${body+11}M62 ${body+3}L72 ${body+29} 69 ${body+45}Q65 ${body+49} 63 ${body+43}L65 ${body+28} 56 ${body+11}" fill="${l.skin}"/>
 <path d="M41 51V${body+2}Q48 ${body+10} 55 ${body+2}V51" fill="${l.shadow}"/>
 <path d="M25 29Q25 11 48 11T71 29L68 46Q64 61 48 64 32 59 28 45Z" fill="${l.skin}"/>
 <path d="M25 35Q18 6 45 5 73 2 74 30L68 44 64 23 56 30 54 19 43 31 40 22 29 43Z" fill="${l.hair}"/>
 ${!back?`<g transform="translate(${side?5:0} 0)"><path d="M32 39Q37 34 43 39M52 39Q58 34 64 39" fill="none" stroke-width="2"/>${sleep?'<path d="M33 43Q38 47 43 43M53 43Q58 47 63 43" fill="none"/>':`<ellipse cx="38" cy="44" rx="4" ry="6" fill="white"/><ellipse cx="58" cy="44" rx="4" ry="6" fill="white"/><ellipse cx="39" cy="45" rx="2.5" ry="4" fill="${l.eyes}"/><ellipse cx="59" cy="45" rx="2.5" ry="4" fill="${l.eyes}"/><circle cx="40" cy="43" r="1.2" fill="white" stroke="none"/><circle cx="60" cy="43" r="1.2" fill="white" stroke="none"/>`}<path d="M44 54Q48 57 53 53" fill="none" stroke="#ae6c68"/><ellipse cx="30" cy="50" rx="4" ry="2" fill="#e8a2a1" stroke="none" opacity=".5"/><ellipse cx="66" cy="50" rx="4" ry="2" fill="#e8a2a1" stroke="none" opacity=".5"/>${l.glasses?'<rect x="29" y="38" width="17" height="13" rx="4" fill="none"/><rect x="50" y="38" width="17" height="13" rx="4" fill="none"/><path d="M46 43H50"/>':''}</g>`:`<path d="M27 29Q48 9 70 29L66 54Q48 63 29 50Z" fill="${l.hair}"/>`}
 <path d="M32 17Q42 9 54 13" stroke="white" opacity=".17" fill="none" stroke-width="3"/>
 </g>`
 return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="160" viewBox="0 0 96 160"><g transform="${sleep?'translate(120 20) rotate(72) scale(.8)':flip?'translate(96 0) scale(-1 1)':''}">${figure}</g></svg>`
}
export function humanFor(s:Pick<GameState,'appearance'|'profile'|'collection'|'tokenId'>,frame=0):string{return humanSvg(humanLook(s.appearance,s.profile,`${s.collection}:${s.tokenId}`),frame)}
