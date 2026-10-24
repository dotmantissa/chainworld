# Monad Testnet and Mainnet play

Click **Connect wallet to play**, then choose **Play on testnet** or **Play on Mainnet** before connecting. Already-connected players can select a network from the same welcome flow. The wallet is asked to switch when needed; cancelling leaves the game closed. The active household displays its network.

| Mode | NFT requirement | Entry behavior |
| --- | --- | --- |
| Monad Testnet, 10143 | Existing source-mapped Test Chog collection | Existing free Test Chog claim, gas confirmation, ownership verification and signed login remain. Returning owners do not claim again. |
| Monad Mainnet, 143 | Original Chog Genesis, `0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763` | Connect its current owner, verify the original token and sign in. No Test Chog faucet or Testnet registry is offered. Nonowners see the collection requirement. |

Mainnet network settings follow [Monad's official network information](https://docs.monad.xyz/developer-essentials/network-information). Original collection identity/metadata is also checked by read-only RPC, rather than assuming that a copied Test Chog token ID identifies the same mainnet NFT.

Mainnet reads `balanceOf`, enumeration where available, `ownerOf` and `tokenURI` on the original collection. If enumeration is unavailable, an owned token ID can be entered. Metadata uses the verified original snapshot only when that token ID and its current onchain IPFS URI match; otherwise the existing validated metadata fetcher applies. Server-side verified rarity also checks original ID, current URI and metadata hash. The Testnet faucet mapping remains separate and is never called on Mainnet, including during retry.

## Separate worlds and authority

Each household remains keyed by chain, collection and token ID. Mainnet homes, funds, materials, workshop upgrades, daily delivery receipts, jobs and inventory are separate from Testnet. No Testnet progression is imported. NFT transfers retain that NFT's existing household rather than granting it another starter package.

Login challenges include chain and collection. Challenges and sessions are stored per chain, and Mainnet uses `cw_session_143`; existing Testnet `cw_session` cookies remain compatible. A proof or cookie from one network cannot authenticate the other. Game and neighborhood requests carry the selected chain; unsupported chains are rejected and the server chooses the collection/RPC itself. Both ownership reads remain on the selected chain. Client snapshots must also match the selected chain, collection, token and wallet.

Land parcels have a generated `realm` derived from their authoritative NFT identity. The parcel primary key includes it, allowing equivalent coordinates in different worlds. Allocation, offers, visits, gestures, neighborhood reads and public-object reservations are scoped to that realm. Cross-network interactions are rejected before property or balance changes. Pending commands and browser outboxes retain their existing NFT/network keys; late responses cannot replace a different network's active household.

The game still uses its existing internal gCHOG ledger. This addition does not deploy mainnet currency/land contracts, mint a mainnet NFT or connect game balances to the real CHOG ERC20.

## Migration and deployment

Run `npm run db:migrate` with the intended database environment before publishing the new API. It adds per-chain challenge/session fields and a composite parcel key, then replaces the realm-aware SQL functions in the same transaction. Existing sessions default to Testnet; existing household JSON, balances, furniture and parcel ownership remain intact. Existing public object holds are given a realm prefix. The migration is idempotent.

`CHOG_ADDRESS`, `VITE_CHOG_ADDRESS`, faucet and registry settings continue to describe **Testnet only**. Mainnet uses the pinned original Chog collection; `MONAD_MAINNET_RPC_URL` can override the official public RPC for the server. Production must retain the existing database secret and public Testnet configuration. No new chain transaction or contract deployment is needed.

## Verification

`npm run households:audit` checks all 1,969 source households on both networks (3,938 initial states), conserved budgets, reachable showers, layouts and art hashes. Dedicated database checks use temporary identities and a reserved district, cleaned up afterward. `scripts/test-network-api.ts` exercises real signed per-chain sessions, cross-chain/replayed proof rejection, cookie isolation, invalid-chain rejection and original mainnet ownership denial without a chain transaction. New browser checks cover both choices, nonowners, actual Mainnet NFT hook/URI lookup and retry, separate balances/stock, mismatched snapshots and late-response isolation. Existing Testnet gameplay tests retain their original actions after selecting Testnet.

Production verification also checks the published JavaScript and all six character hashes, both anonymous network gates, real signed Testnet entry, Mainnet wallet switching/nonowner gating, and Testnet session reuse after switching back. A separate signed API check verifies both network cookies and replay/cross-chain rejection against the deployed service. These checks submit no chain transactions; the available live wallet has no Mainnet Chog, so a positive Mainnet-holder playthrough is covered by automated mocks rather than a live holder session.
