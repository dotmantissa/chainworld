import {residentArtwork,type ResidentArtwork} from './residentArtwork'
import {svgDataUri} from './svg'
import Phaser from 'phaser'
import type { ActionKind, GameState } from '../game/types'
import { ACTIONS, type Command } from '../game/gameEngine'
import { furnitureFor, type FurnitureKind } from './interactions'
import { findPath, fromIso, iso, OBJECTS, type Tile } from './navigation'
export type JobRequest=Extract<Command,{type:'startJob'}>
type Task={action:ActionKind}|{command:JobRequest}
const taskFurniture=(task:Task):FurnitureKind=>'action'in task?furnitureFor(task.action):'work'
const taskLabel=(task:Task)=>'action'in task?ACTIONS[task.action].label:task.command.kind==='validator'?'Block Validator':'Gwei Grifter'
export interface RoomBridge {
  state():GameState
  pending():boolean
  dialogOpen():boolean
  dispatch(c:Command):void
  onObjectSelect(kind:FurnitureKind):void
  onQueue(labels:string[]):void
  onMessage(text:string):void
  avatarSvg:string
}
export class RoomScene extends Phaser.Scene {
  private artwork:ResidentArtwork|null=null
  private resident!:Phaser.GameObjects.Container
  private feet!:Phaser.GameObjects.Graphics
  private face!:Phaser.GameObjects.Image
  private prop!:Phaser.GameObjects.Graphics
  private bubble!:Phaser.GameObjects.Text
  private tile:Tile={x:3,y:3}
  private route:Tile[]=[]
  private pendingTask:Task|null=null
  private queue:Task[]=[]
  private moving=false
  private destroyed=false
  private roomTier=-1
  private roomStyle=''
  private plate!:Phaser.GameObjects.Image
  private pose:FurnitureKind|null=null
  private rug!:Phaser.GameObjects.Graphics
  private selectedRing!:Phaser.GameObjects.Graphics
  private foregrounds=new Map<FurnitureKind,Phaser.GameObjects.Image>()
  constructor(private bridge:RoomBridge){super('home');this.artwork=residentArtwork(bridge.state())}
  preload(){
    this.load.image('room','/art/home-room.webp')
    this.load.image('preview-sheet',this.artwork?.path??'/art/chog-resident-v2.webp')
    this.load.image('preview-sleep','/art/chog-sleep-v2.webp')
    for(const key of ['bed','kitchen','workstation','social'])this.load.image(key,`/art/${key}.webp`)
    this.load.svg('chog-face',svgDataUri(this.bridge.avatarSvg),{width:128,height:128})
  }
  create(){
    this.plate=this.add.image(400,250,'room').setDisplaySize(800,500).setDepth(-1000)
    this.rug=this.add.graphics().setDepth(-100)
    this.selectedRing=this.add.graphics().setDepth(-50)
    for(const o of OBJECTS){
      const p=iso(o.tile),texture=this.textures.get(o.texture).getSourceImage() as HTMLImageElement
      const sprite=this.add.image(p.x,p.y,o.texture).setOrigin(0.5,o.anchorY).setDisplaySize(o.width,o.width*texture.height/texture.width).setDepth(p.y)
      sprite.setInteractive({pixelPerfect:true,alphaTolerance:40,useHandCursor:true}).on('pointerdown',(pointer:Phaser.Input.Pointer,_x:number,_y:number,event:Phaser.Types.Input.EventData)=>{
        if(this.bridge.dialogOpen()||pointer.event.target!==this.game.canvas)return
        event.stopPropagation();this.bridge.onObjectSelect(o.kind)
      })
      const label=this.add.text(p.x,p.y+32,o.label,{fontFamily:'sans-serif',fontSize:'11px',color:'#fff9ef',backgroundColor:'#4c453bd9',padding:{x:8,y:4}}).setOrigin(0.5,0).setDepth(1000).setAlpha(0)
      sprite.on('pointerover',()=>{label.setAlpha(1);sprite.setTint(0xfff4dc)})
      sprite.on('pointerout',()=>{label.setAlpha(0);sprite.clearTint()})
      // Chair fronts occlude the resident's lower body while sitting.
      if(o.kind==='work'||o.kind==='socialize'||o.kind==='rest'){
        const fraction=o.kind==='work'?0.65:o.kind==='rest'?0.38:0.66
        const front=this.add.image(p.x,p.y,o.texture).setOrigin(0.5,o.anchorY).setDisplaySize(o.width,o.width*texture.height/texture.width)
          .setCrop(0,texture.height*fraction,texture.width,texture.height*(1-fraction)).setDepth(p.y+(o.kind==='rest'?4:2)).setVisible(false)
        this.foregrounds.set(o.kind,front)
      }
    }
    const p=iso(this.tile)
    this.resident=this.add.container(p.x,p.y).setDepth(p.y+1)
    this.feet=this.add.graphics();this.resident.add(this.feet)
    if(this.artwork!==null){
      const sheet=this.textures.get('preview-sheet'),source=sheet.getSourceImage() as HTMLImageElement,w=source.width/this.artwork!.columns,h=source.height/this.artwork!.rows
      for(let i=0;i<this.artwork!.frames;i++)sheet.add(i,0,(i%this.artwork!.columns)*w,Math.floor(i/this.artwork!.columns)*h,w,h)
      this.face=this.add.image(0,0,'preview-sheet',0).setDisplaySize(84,84).setOrigin(0.5,0.94)
    }else this.face=this.add.image(0,-35,'chog-face').setDisplaySize(56,56)
    this.resident.add(this.face)
    this.prop=this.add.graphics();this.resident.add(this.prop)
    this.bubble=this.add.text(0,-100,'',{fontFamily:'sans-serif',fontSize:'12px',color:'#4e3b5b',backgroundColor:'#fff8e8',padding:{x:9,y:6},align:'center'}).setOrigin(0.5,1)
    this.resident.add(this.bubble)
    const state=this.bridge.state(),active=state.action?furnitureFor(state.action.kind):state.job?'work':null
    if(active){const object=OBJECTS.find(o=>o.kind===active)!;this.tile=object.approach;const p=iso(this.tile);this.resident.setPosition(p.x,p.y)}
    this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{
      if(this.bridge.dialogOpen()||pointer.event.target!==this.game.canvas)return
      if(this.bridge.state().action||this.bridge.state().job||this.bridge.pending()||this.moving||this.pose)return
      this.queue=[];this.pendingTask=null;this.reportQueue()
      this.route=findPath(this.tile,fromIso(pointer.worldX,pointer.worldY))??[]
    })
    this.events.once('shutdown',()=>{this.destroyed=true;this.queue=[];this.route=[];this.tweens.killAll()})
  }
  request(kind:ActionKind){this.enqueue({action:kind})}
  requestJob(command:JobRequest){this.enqueue({command})}
  private enqueue(task:Task){
    if(this.queue.length+(this.pendingTask?1:0)>=3){this.bridge.onMessage('Your action queue is full (3).');return}
    this.queue.push(task);this.reportQueue()
    const target=OBJECTS.find(o=>o.kind===taskFurniture(task))!
    const p=iso(target.approach);this.selectedRing.clear().lineStyle(2,0xe7c778,0.8).strokeEllipse(p.x,p.y,52,24)
  }
  cancel(){
    this.queue=[];this.pendingTask=null;this.route=[];this.selectedRing?.clear();this.reportQueue();this.bridge.dispatch({type:'cancel'})
  }
  private reportQueue(){this.bridge.onQueue([...(this.pendingTask?[taskLabel(this.pendingTask)]:[]),...this.queue.map(taskLabel)])}
  private faceToward(target:Tile){
    const dx=target.x-this.tile.x,dy=target.y-this.tile.y
    if(this.artwork!==null)this.face.setFrame(Math.abs(dx)>Math.abs(dy)?dx>0?0:2:dy>0?1:3)
    else this.face.setFlipX(dx<0||dy>0)
  }
  private enterPose(family:FurnitureKind){
    this.pose=family;this.route=[];this.moving=true
    const object=OBJECTS.find(o=>o.kind===family)!,p=iso(object.tile),approach=iso(object.approach)
    this.tile=object.approach;this.faceToward(object.tile)
    let x=approach.x,y=approach.y
    if(family==='rest'){x=p.x+26;y=p.y-90}
    if(family==='work'){x=p.x-25;y=p.y-18}
    if(family==='socialize'){x=p.x-20;y=p.y+2}
    const preview=this.artwork!==null
    this.face.setDisplaySize(preview?84:56,preview&&(family==='work'||family==='socialize')?72:preview?84:56)
    if(preview&&family==='rest')this.face.setTexture(this.artwork?.sleepFrame!==undefined?'preview-sheet':'preview-sleep',this.artwork?.sleepFrame).setOrigin(0.5,0.5).setDisplaySize(115,115).setCrop()
    if(preview&&family==='work')this.face.setFrame(this.artwork?.seatedFrame??3)
    if(preview&&family==='socialize')this.face.setFrame(0)
    this.tweens.add({targets:this.resident,x,y,duration:450,ease:'Sine.easeInOut',onComplete:()=>{
      this.moving=false;this.resident.setDepth(family==='rest'?p.y+3:family==='work'||family==='socialize'?p.y+1:y+1)
      this.foregrounds.get(family)?.setVisible(true)
    }})
  }
  private leavePose(){
    this.pose=null;this.moving=true;this.face.setCrop();this.face.setRotation(0)
    const preview=this.artwork!==null
    if(preview)this.face.setTexture('preview-sheet',0).setOrigin(0.5,0.94)
    this.face.setDisplaySize(preview?84:56,preview?84:56)
    for(const front of this.foregrounds.values())front.setVisible(false)
    const p=iso(this.tile)
    this.tweens.add({targets:this.resident,x:p.x,y:p.y,duration:350,ease:'Sine.easeInOut',onComplete:()=>{this.moving=false;this.resident.setDepth(p.y+1)}})
  }
  update(time:number){
    if(this.destroyed||!this.resident)return
    const s=this.bridge.state(),busy=this.bridge.pending()
    this.input.enabled=!this.bridge.dialogOpen()
    const active=s.action?furnitureFor(s.action.kind):s.job?'work':null
    if(active&&!this.pose&&!this.moving)this.enterPose(active)
    if(!active&&this.pose&&!this.moving)this.leavePose()
    if(this.roomTier!==s.meters.housingTier||this.roomStyle!==s.home?.style){
      this.roomStyle=s.home?.style??'linen'
      const tints:Record<string,number>={linen:0xffffff,sage:0xe0ebd9,lavender:0xede2f5,terracotta:0xf5deca,midnight:0xb9c6d9}
      this.plate.setTint(tints[this.roomStyle]??0xffffff)
      this.roomTier=s.meters.housingTier;this.rug.clear()
      if(this.roomTier>0){
        this.rug.fillStyle([0xc7b696,0xc5b392,0xb8bea3,0xa6ac9d,0xbda78a,0xd2c0a2][this.roomTier],0.55)
        this.rug.fillPoints([{x:400,y:280},{x:500,y:329},{x:400,y:378},{x:300,y:329}],true)
        this.rug.lineStyle(1,0xf4ead5,0.2)
        for(let i=0;i<18;i++)this.rug.lineBetween(400-i*5.2,280+i*2.55,500-i*5.2,329+i*2.55)
      }
    }
    if(!active&&!this.pose&&!busy&&!this.pendingTask&&!this.moving&&!this.route.length&&this.queue.length){
      this.pendingTask=this.queue.shift()!
      const target=OBJECTS.find(o=>o.kind===taskFurniture(this.pendingTask!))!.approach
      const path=findPath(this.tile,target)
      if(path===null){this.bridge.onMessage('That object is unreachable.');this.pendingTask=null}else this.route=path
      this.reportQueue()
    }
    if(!active&&!this.pose&&!busy&&!this.moving&&this.route.length){
      const next=this.route.shift()!,p=iso(next);this.moving=true;this.faceToward(next)
      this.tweens.add({targets:this.resident,x:p.x,y:p.y,duration:230,onUpdate:()=>this.resident.setDepth(this.resident.y+1),onComplete:()=>{this.tile=next;this.moving=false}})
    }
    if(!active&&!this.pose&&!busy&&!this.moving&&!this.route.length&&this.pendingTask){
      const task=this.pendingTask;this.pendingTask=null;this.reportQueue()
      this.bridge.dispatch('action'in task?{type:'startAction',kind:task.action}:task.command)
    }
    const bob=this.moving?Math.sin(time/60)*2:Math.sin(time/400)*(this.pose?0.45:1.2)
    this.face.y=(this.artwork?0:-35)+bob
    this.feet.clear();this.prop.clear()
    if(!this.pose)this.feet.fillStyle(0x42334e,0.2).fillEllipse(0,2,42,17)
    if(!this.artwork&&this.pose!=='rest'){
      this.feet.fillStyle(Phaser.Display.Color.HexStringToColor(s.appearance.bodyColor).color)
      this.feet.fillEllipse(-12,-8+(this.moving?bob:0),15,14);this.feet.fillEllipse(12,-8-(this.moving?bob:0),15,14)
    }
    if(this.pose==='eat'){
      const bite=Math.sin(time/250)*4
      this.prop.fillStyle(0xf2eadc).fillEllipse(12,-24,14,5)
      this.prop.fillStyle(0xcca060).fillCircle(13,-29-bite,3)
    }
    if(this.pose==='socialize'&&s.action?.kind==='socialize'){
      this.prop.fillStyle(0x333341).fillRoundedRect(18,-46,6,12,2)
      this.prop.fillStyle(0xa6c9b8).fillRect(19,-44,4,7)
    }
    if(this.pose==='socialize'&&s.action?.kind==='unwind'){
      this.prop.fillStyle(0x776a4c).fillRect(-12,-32,26,15)
      this.prop.fillStyle(0xf1e4c7).fillRect(-10,-30,10,11).fillRect(2,-30,10,11)
    }
    if(this.pose==='work'){
      const tap=Math.sin(time/100)*1.2
      this.prop.fillStyle(0x55b86b).fillEllipse(15,-35+tap,6,4).fillEllipse(25,-35-tap,6,4)
    }
    if(!this.pendingTask&&!this.queue.length&&!this.route.length)this.selectedRing.clear()
    const action=s.action?.kind
    const labels:Record<ActionKind,string>={eat:'Enjoying a meal',snack:'Just a little bite',rest:'Resting…',sleep:'Z z z',socialize:'Hey, neighbor!',unwind:'One more chapter…',work:'Getting things done',focus:'In the zone…',hermit:'Providing liquidity…'}
    this.bubble.setText(action?labels[action]:s.job?'On the clock':this.pendingTask?'On my way!':'').setVisible(!!(action||s.job||this.pendingTask))
    this.bubble.y=this.pose==='rest'?-85:-100
    this.face.rotation=this.pose==='rest'?(this.artwork?0:0.75):this.pose==='work'?Math.sin(time/150)*0.015:this.pose==='eat'?Math.sin(time/250)*0.025:0
  }
}
