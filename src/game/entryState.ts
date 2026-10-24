import {createNewGameState} from './gameEngine'
import {loadGameState,type StorageLike} from './persistence'
import {ensureHousehold,freshHousehold} from './household'
import type {SourcePreview} from '../components/CollectionGallery'
/** Read at entry, rather than retaining the landing page's old snapshot across exits. */
export function openPreview(source:SourcePreview|null=null,storage?:StorageLike){
 const initial=source?createNewGameState('preview',source.token.tokenId,source.token.metadata.attributes,0,{chainId:0,collection:'source-preview',rank:source.rank}):createNewGameState('preview',0,[],0,{chainId:0,collection:'preview'})
 if(source)initial.appearance={...initial.appearance,sourceImage:source.token.metadata.image,sourceName:source.token.metadata.name}
 const loaded=loadGameState({...freshHousehold(initial),lastMessage:source?'Original NFT preview. This does not claim or own the NFT.':'Welcome home. You and your Chog have a little world to explore.'},storage)
 return {...loaded,state:ensureHousehold(loaded.state)}
}
