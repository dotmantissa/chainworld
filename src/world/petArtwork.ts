import type Phaser from 'phaser'
import type {GameState} from '../game/types'
import {residentArtwork} from './residentArtwork'
import {svgDataUri} from './svg'
export function loadPetArtwork(scene:Phaser.Scene,state:Pick<GameState,'appearance'|'chainId'>,fallback:string):string{
 const art=residentArtwork(state),key=art?`pet:${art.path}`:'chog-pet-fallback'
 if(!scene.textures.exists(key)){
  if(art)scene.load.spritesheet(key,art.path,{frameWidth:512,frameHeight:512})
  else scene.load.svg(key,svgDataUri(fallback),{width:144,height:168})
 }
 return key
}
export function setPetPose(image:Phaser.GameObjects.Image,key:string,frame=0){const detailed=key.startsWith('pet:');image.setTexture(key,detailed?frame:undefined).setOrigin(.5,detailed?.86:.94).setDisplaySize(detailed?49:32,detailed?49:37)}
