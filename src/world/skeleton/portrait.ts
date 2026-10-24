import {prepareCharacterArt} from './characterAssets'
import {Scene,OrthographicCamera,WebGLRenderer,AmbientLight,DirectionalLight} from 'three'
import {HumanRig,rigIdentity} from './HumanRig'
import type {GameState} from '../../game/types'
const cache=new Map<string,string>()
export async function skeletalPortrait(s:Pick<GameState,'appearance'|'profile'|'collection'|'tokenId'>){
 await prepareCharacterArt()
 const identity=rigIdentity(s),key=`${identity.seed}:${identity.gender}`,cached=cache.get(key);if(cached)return cached
 const renderer=new WebGLRenderer({alpha:true,antialias:true}),scene=new Scene(),camera=new OrthographicCamera(-.36,.36,.54,-.54,.1,20),rig=new HumanRig(identity);renderer.setSize(256,384);camera.position.set(2,1.9,5);camera.lookAt(0,1.35,0);scene.add(new AmbientLight(0xffffff,2));const light=new DirectionalLight(0xffeed7,3);light.position.set(-3,6,5);scene.add(light);scene.add(rig.root);rig.pose('idle',0);renderer.render(scene,camera);const data=renderer.domElement.toDataURL('image/png');rig.dispose();renderer.dispose();renderer.forceContextLoss();cache.set(key,data);if(cache.size>20)cache.delete(cache.keys().next().value!);return data
}
