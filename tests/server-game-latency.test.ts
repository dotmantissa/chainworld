import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {createNewGameState} from '../src/game/gameEngine'
import {ensureHousehold} from '../src/game/household'
const mocked=vi.hoisted(()=>({sql:vi.fn(),owner:vi.fn(),mainOwner:vi.fn(),quotes:vi.fn(),cached:vi.fn(),state:{} as Record<string,unknown>}))
vi.mock('../server/db',()=>({db:()=>mocked.sql}))
vi.mock('../server/session',()=>({authenticated:async()=> '0x1111111111111111111111111111111111111111'}))
vi.mock('../server/chain',()=>({collection:(chainId=10143)=>chainId===143?'0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763':'0x2222222222222222222222222222222222222222',chainClient:{readContract:mocked.owner},clientFor:(chainId=10143)=>({readContract:chainId===143?mocked.mainOwner:mocked.owner}),nftAbi:[],tokenMetadata:vi.fn()}))
vi.mock('../src/game/zones',async importOriginal=>{const real=await importOriginal<typeof import('../src/game/zones')>();return {...real,getAllZoneGwei:mocked.quotes,cachedZoneGwei:mocked.cached}})
import handler from '../server/game'

beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv('REGISTRY_V2_ADDRESS','0x3333333333333333333333333333333333333333');vi.stubEnv('APP_ORIGIN','http://localhost:5175')
 const state=ensureHousehold(createNewGameState('0x1111111111111111111111111111111111111111',0,[],0,{now:Date.now(),chainId:0,collection:'preview'}));state.appearance={...state.appearance,schemaVersion:2,sourceImage:'/test.webp'};mocked.state=state as unknown as Record<string,unknown>
 mocked.mainOwner.mockResolvedValue('0x1111111111111111111111111111111111111111');mocked.owner.mockResolvedValue('0x1111111111111111111111111111111111111111');mocked.quotes.mockResolvedValue([]);mocked.cached.mockReturnValue([])
 mocked.sql.mockImplementation(async(strings:TemplateStringsArray,...values:unknown[])=>{
  const query=strings.join('?')
  if(query.includes('SELECT state,revision,EXISTS'))return [{state:mocked.state,revision:0,estate_ready:true,repeated:false}]
  if(query.includes('cw_commit_home'))return [{outcome:'committed',state:JSON.parse(String(values[2])),revision:1}]
  throw new Error('Unexpected database query in isolated fixture')
 })
})
afterEach(()=>vi.unstubAllEnvs())
async function post(command:unknown,chainId=10143,tokenId=0){
 const response={statusCode:0,setHeader:vi.fn(),end:vi.fn()}
 await handler({method:'POST',url:'/api/game',headers:{origin:'http://localhost:5175'},body:{chainId,tokenId,command,revision:0,requestId:crypto.randomUUID()}} as never,response as never)
 return {status:response.statusCode,body:JSON.parse(response.end.mock.calls[0][0])}
}
describe('authoritative direct-input dependencies',()=>{
 it('moves without gas or registry calls while retaining both ownership checks and the atomic commit',async()=>{
  const result=await post({type:'moveIndoor',target:{x:4,y:6}})
  expect(result.status).toBe(200);expect(result.body.state.household.journey.path).toEqual([{x:4,y:6}])
  expect(mocked.quotes).not.toHaveBeenCalled();expect(mocked.cached).toHaveBeenCalledOnce();expect(mocked.owner).toHaveBeenCalledTimes(2)
  expect(mocked.owner.mock.calls.every(([request])=>request.functionName==='ownerOf')).toBe(true);expect(mocked.sql).toHaveBeenCalledTimes(2)
 })
 it('still observes gas for economic commands and denies a transferred NFT before any commit',async()=>{
  await post({type:'buyGroceries',pack:'breakfast'});expect(mocked.quotes).toHaveBeenCalledOnce()
  mocked.sql.mockClear();mocked.owner.mockResolvedValue('0x9999999999999999999999999999999999999999')
  const denied=await post({type:'moveIndoor',target:{x:4,y:6}})
  expect(denied.status).toBe(403);expect(mocked.sql).toHaveBeenCalledTimes(1)
 })
})

describe('authoritative network selection',()=>{
 it('checks both ownership reads on mainnet and commits under its original collection identity',async()=>{
  mocked.state={...mocked.state,chainId:143,collection:'0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763',tokenId:1462};const result=await post({type:'moveIndoor',target:{x:4,y:6}},143,1462);expect(result.status).toBe(200);expect(result.body.state.chainId).toBe(143);expect(mocked.mainOwner).toHaveBeenCalledTimes(2);expect(mocked.owner).not.toHaveBeenCalled();expect(mocked.mainOwner.mock.calls.every(([r])=>r.address==='0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763')).toBe(true);expect(mocked.sql.mock.calls[0][1]).toBe('143:0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763:1462')
 })
 it('rejects unsupported networks before any authority read and blocks cross-network home visits',async()=>{
  expect((await post({type:'tick'},1)).status).toBe(400);expect(mocked.sql).not.toHaveBeenCalled();expect(mocked.owner).not.toHaveBeenCalled();mocked.state={...mocked.state,chainId:143,collection:'0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763',tokenId:1462};expect((await post({type:'enterHome',host:'10143:0x2222222222222222222222222222222222222222:0'},143,1462)).status).toBe(403);expect(mocked.sql).toHaveBeenCalledTimes(1)
 })
 it('does not read or publish the testnet registry when loading mainnet',async()=>{
  mocked.state={...mocked.state,chainId:143,collection:'0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763',tokenId:1462};const response={statusCode:0,setHeader:vi.fn(),end:vi.fn()};await handler({method:'GET',url:'/api/game?chainId=143&tokenId=1462',headers:{}} as never,response as never);expect(response.statusCode).toBe(200);expect(mocked.owner).not.toHaveBeenCalled();expect(mocked.mainOwner.mock.calls.every(([r])=>r.functionName==='ownerOf')).toBe(true)
 })
})
