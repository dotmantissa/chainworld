import type {GameState} from '../game/types'
import type {Command} from '../game/gameEngine'
import {INGREDIENTS,SKILLS,GROCERIES,PROJECTS,RECIPES,newLife,skillLevel,canShop,type Skill,type Project} from '../game/life'
import {cityPrice} from '../game/zones'

export default function LifePanel({state:s,dispatch,pending,gas}:{state:GameState;dispatch(c:Command):void;pending:boolean;gas?:number|null}){
 const life=s.life??newLife()
 return <div className="life-panels">
  <section className="panel space-y-3"><p className="eyebrow">SOMETHING MADE BY YOU</p><h2>Skills that grow with practice</h2>
   {(Object.keys(SKILLS) as Skill[]).map(skill=><div className="skill-row" key={skill}><strong>{SKILLS[skill]}</strong><span>Level {skillLevel(life.skills[skill])} · {life.skills[skill]} XP</span><progress aria-label={`${SKILLS[skill]} skill progress`} max={30} value={skillLevel(life.skills[skill])===10?30:life.skills[skill]%30}/></div>)}
   <p className="muted">Cook at a kitchen, practice coding at a desk, or sketch on a sofa. Skills stay with your household and never change its original NFT rarity.</p>
  </section>
  <section className="panel space-y-3"><h2>Your pantry</h2><div className="pantry-stock">{INGREDIENTS.map(item=><span key={item}>{item}: <strong>{life.pantry[item]}</strong></span>)}</div>
   {(Object.keys(GROCERIES) as (keyof typeof GROCERIES)[]).map(pack=>{const goods=GROCERIES[pack],price=cityPrice(goods.price,s.currentZone,gas);return <div className="quest-row" key={pack}><div><strong>{goods.label}</strong><p className="muted">{Object.entries(goods.items).map(([name,n])=>`${n} ${name}`).join(' · ')}</p></div><button disabled={pending||!canShop(s)||s.gChog<price} onClick={()=>dispatch({type:'buyGroceries',pack})}>Order {goods.label.toLowerCase()} · {price} gCHOG</button></div>})}
   {!canShop(s)&&<p className="muted">Order from your own home or a café when you finish your activity.</p>}
   <h3>Prepared meals</h3>{!life.meals.length?<p className="muted">Buy groceries, select a kitchen and cook a recipe. Fresh leftovers keep for 30 real minutes.</p>:life.meals.map(meal=><p className="meal-row" key={meal.id}>{RECIPES[meal.recipe].label}<span>{Math.max(1,Math.ceil((meal.expiresAt-s.lastSaved)/60000))} min fresh</span></p>)}
   <p className="preview-note">Ingredients are consumed when cooking begins. Cancelling does not return used food. Eat your prepared meal by selecting the kitchen.</p>
  </section>
  <section className="panel space-y-3"><h2>Little projects</h2>{(Object.keys(PROJECTS) as Project[]).map(id=>{const project=PROJECTS[id],claimed=life.claimed.includes(id),ready=life.progress[id]>=project.target;return <div className="project-card" key={id}><div><strong>{project.name}</strong><p className="muted">{project.description}</p><p>{life.progress[id]}/{project.target} sessions · {project.reward} gCHOG + 25 XP</p></div><button disabled={pending||claimed||!!life.activeProject&&life.activeProject!==id&&!ready} onClick={()=>dispatch({type:ready?'claimProject':'startProject',id})}>{claimed?'Reward claimed':ready?`Claim ${project.name.toLowerCase()} · ${project.reward} gCHOG`:life.activeProject===id?'Project active':`Start ${project.name.toLowerCase()}`}</button></div>})}</section>
 </div>
}
