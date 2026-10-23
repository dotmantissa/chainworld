import { useState, useEffect, useCallback } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { parseAbi } from 'viem'
import type { ChogMetadata } from '../game/types'
import { faucetEntry,loadFaucetManifest } from '../game/faucet'
import { FAUCET_ABI } from '../contracts/chainWorldRegistryAbi'
import { fetchMetadata, metadataUrls } from '../game/metadata'
import { FAUCET_ADDRESS, CHOG_CONTRACT, MONAD_TESTNET_ID } from '../contracts/addresses'
export { CHOG_CONTRACT, MONAD_TESTNET_ID }
export const ERC721_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function tokenOfOwnerByIndex(address,uint256) view returns (uint256)',
  'function tokenURI(uint256) view returns (string)',
  'function ownerOf(uint256) view returns (address)',
])
export function resolveMetadataUri(uri: string): string {
  return metadataUrls(uri)[0]
}
export function useChogNFT() {
  const { address, chainId } = useAccount()
  const [selected, setSelected] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [loaded,setLoaded]=useState<{key:string;metadata:ChogMetadata|null;error:string|null}|null>(null)
  const isCorrectChain=chainId===MONAD_TESTNET_ID
  const balanceRead=useReadContract({address:CHOG_CONTRACT,abi:ERC721_ABI,functionName:'balanceOf',args:address?[address]:undefined,chainId:MONAD_TESTNET_ID,query:{enabled:!!address&&isCorrectChain,refetchInterval:15000}})
  const balance=balanceRead.data??0n
  const first=useReadContract({address:CHOG_CONTRACT,abi:ERC721_ABI,functionName:'tokenOfOwnerByIndex',args:address?[address,0n]:undefined,chainId:MONAD_TESTNET_ID,query:{enabled:!!address&&isCorrectChain&&balance>0n&&selected==='',refetchInterval:15000,retry:1}})
  let resolved:bigint|undefined
  if(/^\d+$/.test(selected)) {const n=BigInt(selected);if(n<=BigInt(Number.MAX_SAFE_INTEGER))resolved=n}
  else if(selected==='')resolved=first.data
  const tokenId=resolved!==undefined&&resolved<=BigInt(Number.MAX_SAFE_INTEGER)?Number(resolved):null
  const owner=useReadContract({address:CHOG_CONTRACT,abi:ERC721_ABI,functionName:'ownerOf',args:resolved!==undefined?[resolved]:undefined,chainId:MONAD_TESTNET_ID,query:{enabled:resolved!==undefined&&!!address&&isCorrectChain,refetchInterval:10000}})
  const verified=!!address&&isCorrectChain&&owner.data?.toLowerCase()===address.toLowerCase()
  const uri=useReadContract({address:CHOG_CONTRACT,abi:ERC721_ABI,functionName:'tokenURI',args:resolved!==undefined?[resolved]:undefined,chainId:MONAD_TESTNET_ID,query:{enabled:verified}})
  const sourceMapped=!!FAUCET_ADDRESS&&FAUCET_ADDRESS.toLowerCase()===CHOG_CONTRACT.toLowerCase()
  const manifestRoot=useReadContract({address:CHOG_CONTRACT,abi:FAUCET_ABI,functionName:'manifestRoot',chainId:MONAD_TESTNET_ID,query:{enabled:verified&&sourceMapped,staleTime:Infinity}})
  const sourceId=useReadContract({address:CHOG_CONTRACT,abi:FAUCET_ABI,functionName:'sourceTokenId',args:resolved!==undefined?[resolved]:undefined,chainId:MONAD_TESTNET_ID,query:{enabled:verified&&sourceMapped,staleTime:Infinity}})
  const key=`${address?.toLowerCase()}:${resolved}:${uri.data}:${manifestRoot.data}:${sourceId.data}:${attempt}`
  useEffect(()=>{
    if(!verified || !uri.data||sourceMapped&&(manifestRoot.data===undefined||sourceId.data===undefined))return
    const controller=new AbortController()
    void (async()=>{
      try{
        let json:ChogMetadata
        if(sourceMapped&&tokenId!==null){
          const manifest=await loadFaucetManifest(),entry=faucetEntry(manifest,tokenId)
          if(manifestRoot.data!==manifest.root||uri.data!==entry.claim.uri||sourceId.data!==BigInt(entry.claim.originalId))throw new Error('This NFT does not match its verified source assignment.')
          json=entry.source.metadata
        }else json=await fetchMetadata(uri.data!,controller.signal)
        if(!controller.signal.aborted)setLoaded({key,metadata:json,error:null})
      }catch(error){if(!controller.signal.aborted)setLoaded({key,metadata:null,error:error instanceof Error?error.message:'Could not load NFT metadata'})}
    })()
    return()=>controller.abort()
  },[key,verified,uri.data,sourceMapped,tokenId,manifestRoot.data,sourceId.data])
  const metadata=verified&&loaded?.key===key?loaded.metadata:null
  const metaError=loaded?.key===key?loaded.error:null
  const selectionError=selected!==''&&resolved===undefined?'Enter a nonnegative whole token ID within the supported safe-integer range.':null
  const error=selectionError??(balanceRead.error?'Could not read NFT ownership. Retry when the network is available.':owner.error?'This token could not be found.':uri.error?'Could not read the NFT metadata URI.':manifestRoot.error||sourceId.error?'Could not verify the faucet source mapping. Retry NFT loading.':verified&&uri.data===''?'This NFT has no published metadata URI.':owner.data&&!verified&&address?'The selected NFT belongs to a different wallet.':metaError)
  const {refetch:refetchBalance}=balanceRead,{refetch:refetchFirst}=first,{refetch:refetchOwner}=owner,{refetch:refetchUri}=uri,{refetch:refetchRoot}=manifestRoot,{refetch:refetchSource}=sourceId
  const retry=useCallback(()=>{setAttempt(n=>n+1);void refetchBalance();void refetchFirst();void refetchOwner();void refetchUri();void refetchRoot();void refetchSource()},[refetchBalance,refetchFirst,refetchOwner,refetchUri,refetchRoot,refetchSource])
  return {address,isCorrectChain,balance:Number(balance),ownsChog:verified,tokenId,metadata,selected,setSelected,retry,error,
    needsTokenId:balance>0n&&first.isError&&selected==='',
    isLoading:!!address&&isCorrectChain&&(balanceRead.isLoading||(balance>0n&&selected===''&&first.isLoading)||(resolved!==undefined&&owner.isLoading)||(verified&&(uri.isLoading||(!error&&!metadata)))),
  }
}
