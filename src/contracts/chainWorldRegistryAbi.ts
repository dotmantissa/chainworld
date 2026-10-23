import { parseAbi } from 'viem'
// V2 only. Never use the historical V1 deployment with this ABI.
export const CHAIN_WORLD_REGISTRY_ABI = parseAbi([
  'function chogContract() view returns (address)',
  'function register(uint256 tokenId)',
  'function setZone(uint256 tokenId, uint8 zone)',
  'function saveMeterSnapshot(uint256 tokenId, uint16[6] meters)',
  'function isRegistered(uint256 tokenId) view returns (bool)',
  'function tokenLot(uint256 tokenId) view returns (uint256)',
  'function getLot(uint256 lotId) view returns (address owner, uint256 tokenId)',
  'function getLots(uint256 start, uint256 count) view returns (address[] owners, uint256[] tokenIds)',
  'function getPlayer(uint256 tokenId) view returns (bool registered, uint256 lot, uint8 zone, uint16[6] meters, uint256 updatedAt)',
  'function totalRegistered() view returns (uint256)',
  'event Registered(address indexed player, uint256 indexed tokenId, uint256 lotId)',
])
export const FAUCET_ABI = parseAbi([
  'function sourceCollection() view returns(address)',
  'function sourceChainId() view returns(uint256)',
  'function claim(uint256 originalId, string originalURI, bytes32[] proof)',
  'function hasClaimed(address) view returns (bool)',
  'function totalSupply() view returns (uint256)',
  'function maxSupply() view returns (uint256)',
  'function manifestRoot() view returns (bytes32)',
  'function sourceTokenId(uint256) view returns (uint256)',
  'event Claimed(address indexed player,uint256 indexed tokenId,uint256 indexed originalTokenId)',
])
