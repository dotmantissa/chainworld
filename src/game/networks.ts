export const MONAD_TESTNET_ID=10143 as const
export const MONAD_MAINNET_ID=143 as const
export type PlayChainId=typeof MONAD_TESTNET_ID|typeof MONAD_MAINNET_ID
export const MAINNET_CHOG='0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763' as const
export const isPlayChain=(value:unknown):value is PlayChainId=>value===MONAD_TESTNET_ID||value===MONAD_MAINNET_ID
export const networkName=(chainId:number)=>chainId===MONAD_MAINNET_ID?'Monad Mainnet':'Monad Testnet'
export const networkRealm=(chainId:number,collection:string)=>`${chainId}:${collection.toLowerCase()}`
