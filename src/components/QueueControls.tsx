import type {GameState} from '../game/types'
import {ACTIONS,type Command} from '../game/gameEngine'
export default function QueueControls({state:s,dispatch,pending}:{state:GameState;dispatch(c:Command):void;pending:boolean}){
 const queue=s.routine?.queue??[]
 return <section className="queue-panel" aria-label="Resident action queue">
  <div className="queue-header"><strong>Next up · {queue.length}/6</strong><label><input type="checkbox" checked={s.routine?.autonomy??false} disabled={pending} onChange={e=>dispatch({type:'setAutonomy',enabled:e.target.checked})}/> Free care autonomy</label></div>
  <p className="muted">Queue furniture actions while your resident is busy. Autonomy only chooses free care at home; it never cooks, works, buys or trades.</p>
  {queue.length>0&&<><ol aria-label="Waiting actions">{queue.map((q,i)=><li key={q.id}><span>{ACTIONS[q.kind].label}</span><div><button aria-label={`Move waiting action ${i+1} up`} disabled={pending||i===0} onClick={()=>dispatch({type:'reorderIntent',id:q.id,direction:'up'})}>↑</button><button aria-label={`Move waiting action ${i+1} down`} disabled={pending||i===queue.length-1} onClick={()=>dispatch({type:'reorderIntent',id:q.id,direction:'down'})}>↓</button><button aria-label={`Remove waiting action ${i+1}`} disabled={pending} onClick={()=>dispatch({type:'removeIntent',id:q.id})}>×</button></div></li>)}</ol><button disabled={pending} onClick={()=>dispatch({type:'clearQueue'})}>Clear waiting actions</button></>}
 </section>
}
