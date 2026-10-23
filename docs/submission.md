# Chain World — submission answers

## Project name
Chain World

## Tagline
Your Chog. Your home. Your story.

## Short description
A browser life simulator where your Chog NFT anchors a persistent household. Build a home, care for your companion, meet neighbours and explore five blockchain cities whose living costs respond to live network gas.

## Project description
Chain World turns NFT ownership into a playable everyday life. You control a human resident alongside a separate Chog companion in an illustrated isometric world. Original NFT traits seed the resident's appearance; the source collection's rarity tier determines a new verified household's starting land, funds and furnishings.

Walk around obstacles to use furniture, rest, eat or work. Buy, place, rotate, store and sell furnishings; extend the home while preserving accessible routes. Visit enterable cafés, workplaces and parks, build persistent NPC friendships, and take timed tram journeys between cities themed around Monad, Ethereum, Base, Arbitrum and Polygon. Live gas observations feed bounded game prices rather than an ERC20 exchange rate.

In shared play, identity and progress are keyed to the NFT rather than its current wallet. Players can visit open homes, purchase available adjacent land and make escrowed offers for occupied parcels. A server-authoritative Neon ledger validates ownership, commands, balances and property changes. The unofficial Test Chog faucet and household registry are live on Monad Testnet; full onchain currency and land settlement remain future work.

## Problem and motivation
NFTs often stop at ownership and display. Chain World gives a collectible an ongoing place in a game: a companion, a household, property and a story that follows the token. Familiar life-simulation actions make blockchain identity approachable, while gas-linked city prices connect daily play to live network conditions.

## What makes it different
The NFT owns the household identity. A change of wallet does not create a fresh character or reset the token's progress. Authentic source metadata and rarity tiers shape the starting estate; physical movement, editable furniture, needs, relationships and travel make that identity playable. Five real gas feeds influence one bounded game economy.

## How it was built / technologies
React, TypeScript, Vite and Tailwind power the interface; Phaser renders the isometric world and characters. wagmi, viem and ConnectKit handle Monad Testnet wallet and contract interactions. Solidity contracts implement the source-mapped test NFT faucet and transfer-aware registry. Node API functions and Neon PostgreSQL provide signed wallet sessions, ownership checks, serialized gameplay and transactional property/escrow operations. Vercel hosts the deployed frontend and bundled APIs.

All 1,969 original Chog metadata records were acquired through their onchain tokenURI mappings at a recorded Monad mainnet snapshot. Hashes and Merkle proofs verify the source mapping. The art combines authentic Chog portraits with generated painted environment and human assets; provenance and prompts are documented in the repository.

## Challenges
Preserving authentic NFT identity required resolving shuffled tokenURI filenames and separating original rarity tiers from computed trait-frequency ranks. Physical furniture use needed collision-aware routing, usable approach positions and consistent sprite anchors. Shared gameplay needed server-side command validation, owner checks, atomic balances and property operations, plus migrations that preserve existing progress without repeating starter grants. Production hosting required bundling Node API functions so their runtime imports and source manifest were included.

## Accomplishments and validation
The deployed app supports wallet-free preview and verified NFT play with a live test faucet and registry. Verification includes 52 unit tests, 14 Solidity tests, 13 browser scenarios, a complete 1,969-token household audit, real Neon concurrency/escrow checks and a signed production NFT/session/game/neighbourhood smoke check. The demo uses actual browser footage captured from the public app with an English male voiceover.

## What's next
Deploy and connect the actual game currency and onchain land settlement; validate the full two-wallet visual visiting and NFT-transfer flow; expand Chog animation coverage, city geography, structural building tools and human relationships.

## Links and contact
- Website: https://chainworld-chog.vercel.app
- Repository: https://github.com/dotmantissa/chainworld
- Contact: negativemantissa@gmail.com
- Network: Monad Testnet, chain ID 10143
- Test NFT faucet: 0x9fcC2FB7487A3530809f45DFD9bb419EA2E0aF17
- Household registry: 0xA4aB8dbc0b3213C2d80af677bD7B4b5f259BdD0f

## Demo files
- Video: `C:\Users\enwer\Videos\ChainWorld-Demo.mp4`
- Banner: `C:\Users\enwer\Videos\ChainWorld-Banner.png`
- Copy-ready answers: `C:\Users\enwer\Videos\ChainWorld-Submission-Answers.txt`
- Narration: `C:\Users\enwer\Videos\ChainWorld-Demo-Transcript.txt`

Upload the MP4 to the submission platform or your video host and use the resulting public URL for any video-link field. No public video URL is claimed here.
