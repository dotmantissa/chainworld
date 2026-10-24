import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {createNewGameState} from '../src/game/gameEngine'
import {ensureHousehold} from '../src/game/household'
const mocked=vi.hoisted(()=>({sql:vi.fn(),owner:vi.fn(),quotes:vi.fn(),cached:vi.fn(),state:{} as Record<string,unknown>}))
vi.mock('../server/db',()=>({db:()=>mocked.sql}))
vi.mock('../server/session',()=>({authenticated:async()=> '0x1111111111111111111111111111111111111111'}))
vi.mock('../server/chain',()=>({collection:()=> '0x2222222222222222222222222222222222222222',chainClient:{readContract:mocked.owner},nftAbi:[],tokenMetadata:vi.fn()}))
vi.mock('../src/game/zones',async importOriginal=>{const real=await importOriginal<typeof import('../src/game/zones')>();return {...real,getAllZoneGwei:mocked.quotes,cachedZoneGwei:mocked.cached}})
import handler from '../server/game'

beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv('REGISTRY_V2_ADDRESS','0x3333333333333333333333333333333333333333');vi.stubEnv('APP_ORIGIN','http://localhost:5175')
 const state=ensureHousehold(createNewGameState('0x1111111111111111111111111111111111111111',0,[],0,{now:Date.now(),chainId:0,collection:'preview'}));state.appearance={...state.appearance,schemaVersion:2,sourceImage:'/test.webp'};mocked.state=state as unknown as Record<string,unknown>
 mocked.owner.mockResolvedValue('0x1111111111111111111111111111111111111111');mocked.quotes.mockResolvedValue([]);mocked.cached.mockReturnValue([])
 mocked.sql.mockImplementation(async(strings:TemplateStringsArray,...values:unknown[])=>{
  const query=strings.join('?')
  if(query.includes('SELECT state,revision,EXISTS'))return [{state:mocked.state,revision:0,estate_ready:true,repeated:false}]
  if(query.includes('cw_commit_home'))return [{outcome:'committed',state:JSON.parse(String(values[2])),revision:1}]
  throw new Error('Unexpected database query in isolated fixture')
 })
})
afterEach(()=>vi.unstubAllEnvs())
async function post(command:unknown){
 const response={statusCode:0,setHeader:vi.fn(),end:vi.fn()}
 await handler({method:'POST',url:'/api/game',headers:{origin:'http://localhost:5175'},body:{tokenId:0,command,revision:0,requestId:crypto.randomUUID()}} as never,response as never)
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
