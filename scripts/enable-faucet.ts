import {readFile,mkdir} from 'node:fs/promises'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {createPublicClient,createWalletClient,defineChain,encodeDeployData,formatEther,getContractAddress,http,isAddress,keccak256,type Abi,type Address,type Hex} from 'viem'
import {privateKeyToAccount} from 'viem/accounts'
import {serverFetch} from '../server/httpClient'
import {sourceManifest} from '../server/sourceManifest'
import {atomicPrivateJson,configureDeployment,SetupError,verifyDeployment} from './lib/faucetSetup'
const execute=promisify(execFile)
const chain=defineChain({id:10143,name:'Monad Testnet',nativeCurrency:{name:'MON',symbol:'MON',decimals:18},rpcUrls:{default:{http:['https://testnet-rpc.monad.xyz']}}})
const rpc=process.env.MONAD_TESTNET_RPC_URL??'https://testnet-rpc.monad.xyz'
const client=createPublicClient({chain,transport:http(rpc,{fetchFn:serverFetch,timeout:30000,retryCount:2})})
interface Artifact {abi:Abi;bytecode:{object:Hex}}
interface Transaction {address:Address;nonce:number;hash:Hex;raw:Hex;confirmed?:boolean}
interface Journal {version:1;root:Hex;deployer:Address;collection?:Transaction;registry?:Transaction;completed?:boolean}
const journalPath=process.env.FAUCET_DEPLOYMENT_JOURNAL??'.local-tools/faucet-deployment.json'
const activationPaths={env:process.env.FAUCET_ENV_PATH??'.env',record:process.env.FAUCET_DEPLOYMENT_RECORD??'data/deployments/faucet-monad-testnet.json'}
const activate=(deployment:Parameters<typeof configureDeployment>[0])=>configureDeployment(deployment,activationPaths)
async function compile() {
  try{await execute(process.execPath,['node_modules/@foundry-rs/forge/bin.mjs','build'],{maxBuffer:2_000_000})}
  catch{throw new SetupError('Contract compilation failed. Run npm run contracts:build to inspect compiler diagnostics.')}
}
async function artifact(name:string):Promise<Artifact>{return JSON.parse(await readFile(`contracts/out/${name}.sol/${name}.json`,'utf8')) as Artifact}
async function main(){
  const manifest=await sourceManifest()
  console.log(`Verified ${manifest.claims.length} source Chogs; manifest ${manifest.root}`)
  if(await client.getChainId()!==10143)throw new SetupError('RPC is not Monad Testnet (10143). No transaction was signed.')
  const configure=process.argv.includes('--configure'),check=process.argv.includes('--check')
  const argument=(name:string)=>{const at=process.argv.indexOf(name);return at<0?undefined:process.argv[at+1]}
  const configuredCollection=argument('--collection')??process.env.FAUCET_ADDRESS
  const configuredRegistry=argument('--registry')??process.env.REGISTRY_V2_ADDRESS
  if(configure||check){
    if(!configuredCollection||!isAddress(configuredCollection)||!configuredRegistry||!isAddress(configuredRegistry)) {
      if(check){console.log('Faucet inactive: deployed collection and V2 registry addresses are not configured.');return}
      throw new SetupError('Provide --collection and --registry with the already-deployed addresses.')
    }
    await verifyDeployment(client,manifest,configuredCollection,configuredRegistry)
    if(configure)await activate({version:1,chainId:10143,manifestRoot:manifest.root,supply:manifest.claims.length,collection:configuredCollection,registry:configuredRegistry})
    console.log(`Verified faucet ${configuredCollection}; registry ${configuredRegistry}${configure?'; local server/browser configuration activated':''}.`)
    return
  }
  await compile()
  // Existing successfully configured deployments are verified and reused, never redeployed accidentally.
  if(configuredCollection&&isAddress(configuredCollection)&&configuredRegistry&&isAddress(configuredRegistry)){
    await verifyDeployment(client,manifest,configuredCollection,configuredRegistry)
    await activate({version:1,chainId:10143,manifestRoot:manifest.root,supply:manifest.claims.length,collection:configuredCollection,registry:configuredRegistry})
    console.log('Existing verified faucet and registry are enabled.');return
  }
  const secret=process.env.DEPLOYER_PRIVATE_KEY??process.env.PRIVATE_KEY
  const accountName=argument('--account')??process.env.DEPLOYER_ACCOUNT
  if(!secret&&accountName){
    const passwordFile=process.env.DEPLOYER_PASSWORD_FILE
    if(!passwordFile)throw new SetupError('Set DEPLOYER_PASSWORD_FILE to the local keystore password file. Keep its contents out of chat.')
    if(!/^[a-zA-Z0-9_-]{1,64}$/.test(accountName))throw new SetupError('Use a named Foundry keystore account.')
    console.log('Deploying the verified faucet and V2 registry using the configured Foundry keystore…')
    try{
      await execute(process.execPath,['node_modules/@foundry-rs/forge/bin.mjs','script','contracts/script/DeployWorld.s.sol:DeployWorld','--rpc-url',rpc,'--account',accountName,'--password-file',passwordFile,'--broadcast'],{
        env:{...process.env,DEPLOY_TEST_CHOG:'true',MANIFEST_ROOT:manifest.root,MANIFEST_SUPPLY:String(manifest.claims.length)},maxBuffer:5_000_000,
      })
    }catch{throw new SetupError('Foundry deployment did not complete. Inspect its local broadcast records before resuming; no configuration was activated.')}
    const run=JSON.parse(await readFile('broadcast/DeployWorld.s.sol/10143/run-latest.json','utf8')) as {transactions:{contractName:string;contractAddress:Address;hash:Hex}[]}
    const nft=run.transactions.find(t=>t.contractName==='ChainWorldTestChog'),registry=run.transactions.find(t=>t.contractName==='ChainWorldRegistry')
    if(!nft||!registry)throw new SetupError('The deployment record does not contain both required contracts.')
    await verifyDeployment(client,manifest,nft.contractAddress,registry.contractAddress)
    await activate({version:1,chainId:10143,manifestRoot:manifest.root,supply:manifest.claims.length,collection:nft.contractAddress,registry:registry.contractAddress,collectionTransaction:nft.hash,registryTransaction:registry.hash})
    console.log(`Faucet enabled: ${nft.contractAddress}; registry ${registry.contractAddress}.`);return
  }
  if(!secret||!/^0x[0-9a-f]{64}$/i.test(secret))throw new SetupError('No deployment signer configured. Set DEPLOYER_PRIVATE_KEY in the ignored .env, or DEPLOYER_ACCOUNT and DEPLOYER_PASSWORD_FILE for a funded Foundry keystore. Never paste a key into chat.')
  const account=privateKeyToAccount(secret as Hex),wallet=createWalletClient({account,chain,transport:http(rpc,{fetchFn:serverFetch,timeout:30000,retryCount:0})})
  await mkdir('.local-tools',{recursive:true})
  let journal:Journal
  try{journal=JSON.parse(await readFile(journalPath,'utf8')) as Journal}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;journal={version:1,root:manifest.root,deployer:account.address};await atomicPrivateJson(journalPath,journal)}
  if(journal.root!==manifest.root||journal.deployer.toLowerCase()!==account.address.toLowerCase())throw new SetupError('The deployment journal belongs to another source manifest or signer. Review it before starting a different deployment.')
  let balance=await client.getBalance({address:account.address})
  console.log(`Deployment wallet ${account.address}; available ${formatEther(balance)} test MON`)
  if(balance===0n&&process.argv.includes('--wait')){
    console.log('Waiting for testnet funding; checking every 20 seconds…')
    const deadline=Date.now()+60*60*1000
    while(balance===0n&&Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,20000));balance=await client.getBalance({address:account.address}).catch(()=>0n)}
    if(balance>0n)console.log(`Funding detected: ${formatEther(balance)} test MON. Continuing deployment…`)
  }
  if(balance===0n)throw new SetupError(`Fund ${account.address} with Monad Testnet MON, then rerun faucet:enable. No transaction has been submitted.`)
  async function deploy(kind:'collection'|'registry',data:Hex):Promise<Transaction>{
    let tx=journal[kind]
    if(tx){
      if(keccak256(tx.raw)!==tx.hash)throw new SetupError('Deployment journal transaction hash mismatch')
      const code=await client.getCode({address:tx.address})
      if(code&&code!=='0x'){tx.confirmed=true;await atomicPrivateJson(journalPath,journal);return tx}
    }else{
      const nonce=await client.getTransactionCount({address:account.address,blockTag:'pending'})
      const [gas,quotedPrice]=await Promise.all([client.estimateGas({account:account.address,data}),client.getGasPrice()])
      const gasPrice=quotedPrice*12n/10n
      const request=await wallet.prepareTransactionRequest({account,data,nonce,gas,gasPrice,type:'legacy'})
      const maximum=request.gas*(request.maxFeePerGas??request.gasPrice??0n)
      if(await client.getBalance({address:account.address})<maximum)throw new SetupError(`Fund deployment wallet ${account.address} with at least ${formatEther(maximum)} test MON for the ${kind} transaction, then rerun. Existing deployments are reused.`)
      const raw=await wallet.signTransaction(request),hash=keccak256(raw)
      tx={address:getContractAddress({from:account.address,nonce:BigInt(nonce)}),nonce,raw,hash}
      journal[kind]=tx
      // Save the exact signed hash BEFORE sending; retries rebroadcast the same transaction.
      await atomicPrivateJson(journalPath,journal)
    }
    console.log(`Submitting ${kind} deployment ${tx.hash}`)
    let receipt=await client.getTransactionReceipt({hash:tx.hash}).catch(()=>null)
    if(!receipt){
      try{await wallet.sendRawTransaction({serializedTransaction:tx.raw})}
      catch{
        const code=await client.getCode({address:tx.address})
        if(!code||code==='0x')throw new SetupError(`Broadcast was interrupted. Rerun to resume the same ${kind} transaction ${tx.hash}; no new nonce will be allocated.`)
      }
      receipt=await client.waitForTransactionReceipt({hash:tx.hash,timeout:180000,pollingInterval:2000})
    }
    if(receipt.status!=='success'||receipt.contractAddress?.toLowerCase()!==tx.address.toLowerCase())throw new SetupError(`${kind} deployment reverted or returned an unexpected address; configuration was not activated.`)
    tx.confirmed=true;await atomicPrivateJson(journalPath,journal)
    console.log(`${kind} deployed: ${tx.address}`);return tx
  }
  const nftArtifact=await artifact('ChainWorldTestChog'),registryArtifact=await artifact('ChainWorldRegistry')
  const nft=await deploy('collection',encodeDeployData({abi:nftArtifact.abi,bytecode:nftArtifact.bytecode.object,args:[manifest.root,BigInt(manifest.claims.length)]}))
  const registry=await deploy('registry',encodeDeployData({abi:registryArtifact.abi,bytecode:registryArtifact.bytecode.object,args:[nft.address]}))
  await verifyDeployment(client,manifest,nft.address,registry.address)
  await activate({version:1,chainId:10143,manifestRoot:manifest.root,supply:manifest.claims.length,collection:nft.address,registry:registry.address,deployer:account.address,collectionTransaction:nft.hash,registryTransaction:registry.hash})
  journal.completed=true;await atomicPrivateJson(journalPath,journal)
  console.log(`Faucet enabled: ${nft.address}; V2 registry: ${registry.address}. Vite reloads the local configuration automatically.`)
}
main().catch(error=>{console.error(error instanceof SetupError?error.message:`Faucet setup failed (${error instanceof Error?error.name:'request error'}). No unchecked configuration was activated; rerun after checking connectivity and local signer settings.`);process.exitCode=1})
