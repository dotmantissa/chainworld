import {humanArtwork} from '../world/artwork'
import type {GameState} from '../game/types'
export default function HumanAvatar({state,size=110}:{state:Pick<GameState,'appearance'|'profile'|'collection'|'tokenId'>;size?:number}){const asset=humanArtwork(state)[0];return <div className="human-avatar" role="img" aria-label={`${state.profile.name||'Your human character'} · ${state.profile.gender}`} style={{height:size,width:size*.7}}><img src={asset.url} alt="" width={asset.width} height={asset.height} style={{height:size,width:'auto',maxWidth:'100%',objectFit:'contain'}}/></div>}
