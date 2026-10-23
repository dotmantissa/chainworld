import {humanFor} from '../world/human'
import type {GameState} from '../game/types'
export default function HumanAvatar({state,size=110}:{state:Pick<GameState,'appearance'|'profile'|'collection'|'tokenId'>;size?:number}){return <div className="human-avatar" role="img" aria-label={`${state.profile.name||'Your human character'} · ${state.profile.gender}`} style={{height:size,width:size*.7}} dangerouslySetInnerHTML={{__html:humanFor(state)}}/>}
