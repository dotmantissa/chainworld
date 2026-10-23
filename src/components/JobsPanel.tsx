import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { GameState } from '../game/types'
import { blockIsValid, type Command } from '../game/gameEngine'
import { getZoneGwei } from '../game/zones'
interface Props { gameState: GameState; dispatch(c: Command): void }
export default function JobsPanel({gameState:s,dispatch}:Props) {
  const [quoteBusy,setQuoteBusy]=useState(false)
  const [error,setError]=useState('')
  const mounted=useRef(true)
  const latest=useRef(s);useLayoutEffect(()=>{latest.current=s},[s])
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])
  const job=s.job
  const [now,setNow]=useState(Date.now)
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),100);return()=>clearInterval(timer)},[])
  const predict=async(prediction:'up'|'down')=>{
    if(quoteBusy)return
    setQuoteBusy(true);setError('')
    const identity=`${s.walletAddress}:${s.tokenId}:${s.currentZone}`
    const q=await getZoneGwei(s.currentZone,true)
    if(!mounted.current)return
    setQuoteBusy(false)
    const current=latest.current
    if(identity!==`${current.walletAddress}:${current.tokenId}:${current.currentZone}`)return
    if(q.stale||q.wei===null){setError('Live EVM gas is unavailable here. Try another district or job.');return}
    dispatch({type:'startJob',kind:'grifter',openingWei:q.wei,openingAt:q.fetchedAt,prediction})
  }
  const busy=!!(s.action||job)
  return <section className="panel space-y-4">
    <div><h2>Make a living</h2><p className="muted">Jobs consume 10 energy. Rewards include XP and reputation.</p></div>
    <article className="job-card">
      <h3>Block Validator</h3><p className="muted">20 seconds. Tap valid green blocks; avoid invalid red blocks.</p>
      {job?.kind==='validator'?<>
        <p>Score {job.score} · {Math.max(0,Math.ceil((job.endsAt-now)/1000))}s left</p>
        <div className="grid grid-cols-4 gap-2 min-h-16">{Array.from({length:33},(_,i)=>i).filter(i=>now>=job.startedAt+i*600&&now<job.startedAt+i*600+1500&&!job.clicked.includes(i)).map(i=><button key={i} className={blockIsValid(job.seed,i)?'valid-block':'invalid-block'} aria-label={blockIsValid(job.seed,i)?'Validate block':'Invalid block'} onClick={()=>dispatch({type:'clickBlock',sessionId:job.id,index:i})}>{blockIsValid(job.seed,i)?'✓':'×'}</button>)}</div>
      </>:<button className="primary" disabled={busy||(s.cooldowns.validator??0)>now} onClick={()=>dispatch({type:'startJob',kind:'validator'})}>{(s.cooldowns.validator??0)>now?`Ready in ${Math.ceil((s.cooldowns.validator-now)/1000)}s`:'Start validating'}</button>}
    </article>
    <article className="job-card"><h3>Gwei Grifter</h3><p className="muted">Predict the next fresh gas quote after 10 seconds. Ties preserve your streak and pay nothing. Streak: {s.streak}.</p>
      {job?.kind==='grifter'?<p>Watching gas… {Math.max(0,Math.ceil((job.endsAt-now)/1000))}s</p>:<div className="flex gap-2"><button disabled={busy||quoteBusy} onClick={()=>void predict('up')}>↑ Higher</button><button disabled={busy||quoteBusy} onClick={()=>void predict('down')}>↓ Lower</button></div>}
      {error&&<p role="alert">{error}</p>}
    </article>
    <article className="job-card"><h3>Liquidity Hermit</h3><p className="muted">Earn every full minute. Continues across tabs and reloads; offline earnings stop after 30 minutes.</p><button disabled={busy} onClick={()=>dispatch({type:'startAction',kind:'hermit'})}>Provide liquidity</button></article>
    {(busy)&&<button onClick={()=>dispatch({type:'cancel'})}>Cancel activity</button>}
  </section>
}
