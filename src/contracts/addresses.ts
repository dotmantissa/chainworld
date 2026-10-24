import {MAINNET_CHOG,MONAD_MAINNET_ID,MONAD_TESTNET_ID,type PlayChainId} from '../game/networks'
export {MONAD_MAINNET_ID,MONAD_TESTNET_ID}
import { isAddress } from 'viem'
const optionalAddress = (v: string | undefined) => v && isAddress(v) ? v : undefined
export const CHOG_CONTRACT = optionalAddress(import.meta.env.VITE_CHOG_ADDRESS) ?? '0x32A325b0640594377D0708Ca9081c93da95e1908'
// Intentionally separate from VITE_REGISTRY_ADDRESS, which points at the incompatible legacy contract.
export const REGISTRY_ADDRESS = optionalAddress(import.meta.env.VITE_REGISTRY_V2_ADDRESS)
export const FAUCET_ADDRESS = optionalAddress(import.meta.env.VITE_FAUCET_ADDRESS)
export const collectionFor=(chainId:PlayChainId)=>chainId===MONAD_MAINNET_ID?MAINNET_CHOG:CHOG_CONTRACT
