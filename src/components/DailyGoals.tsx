import type {GameState} from '../game/types'
import type {Command} from '../game/gameEngine'
import {DAILY_GOALS,todaysGoals,newDaily} from '../game/dailyGoals'
export default function DailyGoals({state:s,dispatch,pending}:{state:GameState;dispatch(c:Command):void;pending:boolean}){
 const daily=s.daily??newDaily(s.lastSaved)
 return <section className="panel daily-goals space-y-3"><p className="eyebrow">A LITTLE PURPOSE TODAY</p><h2>Today’s little goals</h2><p className="muted">Three goals for your household. New goals at 00:00 UTC; each reward can be claimed once per day.</p>{todaysGoals(s).map(id=>{const goal=DAILY_GOALS[id],claimed=daily.claimed.includes(id);return <div className="quest-row" key={id}><div><strong>{goal.name}</strong><p className="muted">{goal.description}</p><small>{Math.min(goal.target,daily.counts[id])}/{goal.target}</small></div><button disabled={pending||claimed||daily.counts[id]<goal.target} onClick={()=>dispatch({type:'claimDaily',id})}>{claimed?'Claimed today':`Claim ${goal.name.toLowerCase()} · ${goal.reward} gCHOG`}</button></div>})}</section>
}
