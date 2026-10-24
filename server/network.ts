import {isPlayChain,MONAD_TESTNET_ID,type PlayChainId} from '../src/game/networks'
import {HttpError,type Request} from './http'
export function requestChain(req:Request,input:Record<string,unknown>={}):PlayChainId{
 const raw=req.method==='POST'?input.chainId:new URL(req.url??'','http://localhost').searchParams.get('chainId')
 if(raw===undefined||raw===null)return MONAD_TESTNET_ID
 if((typeof raw!=='string'&&typeof raw!=='number')||!/^\d+$/.test(String(raw))||!isPlayChain(Number(raw)))throw new HttpError(400,'Choose Monad Testnet or Monad Mainnet.')
 return Number(raw) as PlayChainId
}
export const sameRealm=(a:string,b:string)=>a.split(':').slice(0,2).join(':')===b.split(':').slice(0,2).join(':')
