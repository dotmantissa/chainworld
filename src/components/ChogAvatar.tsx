import { useId } from 'react'
import type { CharacterAppearance, RarityTier } from '../game/types'
import { metadataUrls } from '../game/metadata'

export function traitColor(value:string,fallback:string):string {
  const colors:Record<string,string>={black:'#252138',white:'#f7efda',cream:'#eadebd',purple:'#59318b',pink:'#ec8cbd',blue:'#3e78bf',green:'#6b9e70',red:'#b95161',orange:'#d89752',yellow:'#e8c35b',gold:'#cda84e',brown:'#795a47',gray:'#8e939b',grey:'#8e939b',teal:'#4c9898',navy:'#31436b'}
  const word=value.toLowerCase().split(/[\s_-]+/).find(word=>word in colors)
  return word?colors[word]:fallback
}
interface Props { appearance:CharacterAppearance; tier:RarityTier; size?:number; animated?:boolean; portrait?:boolean }
export default function ChogAvatar({appearance:a,tier,size=100,animated=false,portrait=true}:Props) {
  const id=useId().replace(/:/g,'')
  const body=a.bodyColor||'#40206c',shirt=traitColor(a.bodyTrait??'',a.clothesType==='none'?body:'#565471'),hat=traitColor(a.headTrait??'','#75509c')
  const rawEyes=(a.eyeTrait??a.eyeType).toLowerCase(),rawHead=(a.headTrait??a.hatType).toLowerCase()
  const clothed=!!a.bodyTrait&&!/^(none|naked|bare|origin)$/i.test(a.bodyTrait)
  const cap=/cap|mcga|hat|beanie|bucket|crown|helmet|wizard|cowboy/.test(rawHead)
  const glasses=/glass|shade|btc|sunglass|pixel/.test(rawEyes)
  const frameColor=({genesis:'#d6b765',legendary:'#cfac66',rare:'#a188c4',uncommon:'#7e9ebd',common:'#b3b2a3',floor:'#b3b2a3'})[tier]
  return <div className="chog-avatar" style={{width:size,height:size,flexShrink:0,borderRadius:18,overflow:'hidden',boxShadow:`0 0 0 2px ${frameColor}`,animation:animated?'glow-pulse 3s ease-in-out infinite':undefined}}>
    {portrait&&a.sourceImage?<img alt={a.sourceName??'Original Chog NFT'} src={metadataUrls(a.sourceImage)[0]} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={event=>{const img=event.currentTarget;const urls=metadataUrls(a.sourceImage!);const next=Number(img.dataset.gateway??0)+1;if(next<urls.length){img.dataset.gateway=String(next);img.src=urls[next]}}}/>:<svg viewBox="0 0 120 140" width={size} height={size} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Resident interpreted from original NFT traits">
      <defs>
        <radialGradient id={`${id}body`} cx="35%" cy="20%" r="85%"><stop stopColor={body}/><stop offset="1" stopColor="#1b1032"/></radialGradient>
        <radialGradient id={`${id}face`} cx="35%" cy="30%" r="80%"><stop stopColor="#fff8d9"/><stop offset="1" stopColor="#c7bb91"/></radialGradient>
        <linearGradient id={`${id}shirt`} x2=".6" y2="1"><stop stopColor={shirt}/><stop offset="1" stopColor={shirt} stopOpacity=".55"/></linearGradient>
      </defs>
      <g fill={`url(#${id}body)`} stroke="#211239" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M30 54 7 22 40 36 37 6 62 30 76 10 82 38 112 27 98 57 119 65 96 79 112 95 83 97 75 116 58 102 37 112 34 95 7 96 20 77 1 65Z"/>
        <path d="M36 88Q59 76 82 88L92 123 72 130 62 107 53 129 31 126Z"/>
      </g>
      {clothed&&<path d="M35 91Q61 83 84 91L88 110Q60 122 32 111Z" fill={`url(#${id}shirt)`} stroke="#30243a" strokeWidth="1"/>}
      <path d="M33 108 28 126 38 130 44 112M83 108 91 126 82 130 76 113" fill={body}/>
      <g fill="#e775ad" stroke="#9d3f7d" strokeWidth="1"><path d="M29 123Q20 129 24 133L29 131 32 135 36 132 40 135 46 131 41 125Z"/><path d="M78 125 74 132 80 136 84 132 89 135 92 131 97 133Q100 128 90 123Z"/></g>
      <ellipse cx="60" cy="65" rx="39" ry="32" fill={`url(#${id}face)`} stroke="#31213c" strokeWidth="1.4"/>
      <path d="M38 39 43 29 49 37 54 27 59 36 64 26 68 37 74 31 79 41" fill="#fff9de"/>
      {glasses?<g fill={/btc/.test(rawEyes)?'#e6a840':'#22253b'} stroke="#2b2038" strokeWidth="2"><rect x="28" y="53" width="28" height="19" rx="7"/><rect x="65" y="53" width="28" height="19" rx="7"/><path d="M56 59H65"/>{/btc/.test(rawEyes)&&<g fill="#fff8dd" stroke="none" fontSize="13" textAnchor="middle"><text x="42" y="67">₿</text><text x="79" y="67">₿</text></g>}</g>:<g fill="#171220"><ellipse cx="43" cy="61" rx="10" ry="12"/><ellipse cx="78" cy="61" rx="10" ry="12"/><g fill="white"><ellipse cx="46" cy="56" rx="3" ry="4"/><ellipse cx="81" cy="56" rx="3" ry="4"/></g>{/angry/.test(rawEyes)&&<path d="m31 47 22 5m14 0 22-5" stroke="#3a2840" strokeWidth="3"/>}</g>}
      <g fill="#e775ad" opacity=".9"><ellipse cx="31" cy="74" rx="12" ry="5"/><ellipse cx="90" cy="74" rx="12" ry="5"/></g>
      <ellipse cx="60" cy="74" rx="8" ry="4.5" fill="#e783b8" stroke="#af4d89"/><path d="M56 75v1m8-1v1" stroke="#753960" strokeWidth="2"/>
      <path d={/smile|grin/.test(a.mouthTrait??'')?'M49 85Q60 95 73 84':'M48 87Q60 81 73 87'} fill="none" stroke="#594351" strokeWidth="1.5" strokeLinecap="round"/>
      {cap&&<g fill={hat} stroke="#352344" strokeWidth="1.4"><path d="M30 43Q32 14 61 18 90 17 92 44Z"/><path d="M23 43Q57 34 99 45L94 50Q55 44 25 49Z"/></g>}
      {a.accessoryType==='chain'&&<path d="M41 97Q60 113 80 97" fill="none" stroke="#e3bf63" strokeWidth="3"/>}
      {a.accessoryType==='earring'&&<circle cx="22" cy="77" r="4" fill="none" stroke="#e3bf63" strokeWidth="2"/>}
    </svg>}
  </div>
}
