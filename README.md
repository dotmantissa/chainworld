# Chain World

A browser life simulator on Monad Testnet. Play a human resident with a separate Chog pet, build a home, visit five blockchain cities and form friendships. The Chog NFT owns the household's identity, property, balance and progression.

The current build implements the human/pet household, editable modular homes, physical object interactions, enterable city venues, timed travel and persistent NPC friendships described in the [life-simulation architecture](docs/life-simulation-architecture.md). See [implementation status](docs/implementation-status.md) for verified behavior and remaining work. Graphics use NFT-derived painted characters, original realistic furniture and city assets, with layouts and collision driven by saved game geometry. The [realism direction](docs/realism-direction.md) records the material, room and physical-interaction improvements guided by the supplied references.

## Run locally

Use Node.js 22.12 or newer.

```bash
npm ci
cp .env.example .env
# Set DATABASE_URL for a Neon PostgreSQL database.
npm run db:migrate
npm run dev
```

Open **http://localhost:5175** and choose **Explore a local preview**. The preview requires no wallet or database and uses the supplied purple spiky Chog reference. Use **Explore the collection** to browse the original 1,969 Chogs and try a specific NFT locally. It saves locally and is separate from NFT progression.

For shared NFT play, set `VITE_SHARED_WORLD=true`, connect an injected wallet on Monad Testnet, click **Claim free Test Chog**, confirm the gas transaction, then choose **Verify wallet & enter**. The newly minted Chog is selected automatically. Choose a human name and sex/gender during signup; NFT traits seed the character’s presentation. Existing owners can select their NFT, including token 0, and sign the login challenge. The backend reads original traits, checks current NFT ownership, and stores progression by chain, collection and token. It never accepts a client balance, reward, clock or gas quote as authority. Keep `DATABASE_URL` server-side. Set `APP_ORIGIN` to the exact public origin when hosting.

Set `VITE_SHARED_WORLD=false` for a browser-only prototype. These local saves do not synchronize across devices and are never imported into the authoritative economy.

## Play

Saving runs in the background. In shared play, movement and choices project immediately while a serialized command queue reconciles them with the server; a small status below the world shows unsaved choices or connection recovery. Routine saves never lock the room or add a waiting bubble above the resident. Local snapshots are batched into idle work and flushed when leaving the page. See [background saving](docs/background-saving.md) for retry, rollback and authority details.

Start with **Explore a local preview**. There is nothing to configure before playing. Follow the suggested next step above the room, click a need meter for matching care, or select furniture directly. **Household**, **Build & buy**, and **Travel & neighbors** open optional tools. Household includes resident/pet care, skills, pantry and rewards; kitchen actions also link directly to supplies, and desk actions link to advanced jobs.

- Click the floor to walk, or focus the world and use **WASD**. Click another floor tile to redirect an ordinary walk. Press **E** for nearby object/service choices. Route dots, a destination ring and furniture hover labels show what your resident can do. Active object use can be queued or cancelled.
- Zoom with the mouse wheel, trackpad pinch, touch pinch or **+ / −** controls in homes, streets and the world map. Drag to pan; **Pan** mode makes every drag/tap a camera gesture. Arrow controls/keys pan, **+ / −** zoom, and **0 / Center** refits the home or follows your resident outdoors. House labels stay above roofs, readable and clickable while zooming.
- Click/tap furniture to open its action dialog, or use the corresponding controls below the room. Opening a dialog costs nothing.
- The human walks around furniture and walls before acting. The separate Chog follows on walkable routes. Beds support rest and sleep; kitchens support meals and snacks; the workstation supports shifts, projects and liquidity work; the reading nook supports calls and quiet reading.
- Desks and sofas use sitting poses, beds use a lying sleeping pose, and kitchens/bookcases use standing interactions. Up to six future actions can be queued. Canceling before an interaction starts costs nothing; consumed resources are not refunded.
- Choose **Household → Customize resident** to set a name, sex/gender and optional pronouns. These are editable. Sex/gender selects the human presentation family and never changes the Chog, rarity or household wealth.
- Choose **Leave home & explore** for timed, collision-aware street walking. Select a café, coworking club, park, tram station, home or resident to choose an interaction. City services require the resident to reach them.
- In shared play, visit open homes, wave/chat/high-five nearby online residents, purchase adjacent available parcels, or fund an offer to their owner. Accepting transfers land and pays its seller atomically; rejecting/canceling refunds held funds once. Home parcels and estate connectivity are protected.
- Open **Build & buy** to purchase, place, move, rotate, store or sell furniture; add partitions and doors; and extend usable floor within owned land capacity. Placement preserves reachable floors and object access. Set the interior palette and visitor access in **Build & buy**.
- Enter cafés, workplaces and parks from their entrances. Meet each city’s local NPCs and build persistent friendships through conversations. Park benches support free reading and social recovery.
- Use **Travel** to walk to the tram station and board a timed trip. Trips survive reload and charge once. Your Chog and household identity travel together; your home stays where you built it.
- Work earns gCHOG, XP and reputation. Claim completed milestones and spend earnings on home upgrades. Better beds restore more energy.
- Jobs include a timed Block Validator challenge, fresh-quote Gwei Grifter predictions, and Liquidity Hermit income. Sessions and cooldowns survive tabs/reloads. Tied or unavailable gas observations pay nothing.
- Hunger, energy and social decay continuously. One real minute is ten game minutes. Zero funds never destroys a home; rest, social care, Sanctuary and travel home remain free. Emergency rations help residents with critically low food and funds.
- Offline settlement is capped at eight real hours, upkeep at 25% of departure funds, and passive earnings at 30 minutes (also limited by energy).

## Latest localhost features

The current local build adds six human needs, sink washing and sofa relaxation; a real pantry with groceries, cooking, fresh leftovers and learned skills; three rewarded household projects; a saved six-action queue with reorder/remove controls and optional free-care autonomy; timed NPC hangouts, consumable meal gifts and daily goals; and room detection from walls/doors. These additions and the subsequent playability/UX pass have not been pushed or deployed. See the [playability audit](docs/playability-audit.md) for findings, implemented changes and remaining animation/release work.

Build & buy also offers an **Oak washbasin** and **Rain shower**. These are real placed fixtures with collision, approach routes, hygiene recovery and reload persistence. New basic care is quicker (washing 3s, rest 4s, shower 5s), while old in-progress timers keep their original completion time.

Choose **Household → Skills & pantry** to order ingredients, start a project and review learned skills. Select a placed kitchen to cook or eat its prepared meals, a desk to practice coding, or a sofa to sketch. Queue choices while busy; waiting actions survive reload. **Free care autonomy** only uses free activities at home. It never cooks, earns money, purchases goods or accepts trades.

Get to know an NPC before choosing **Spend time together**. A home-cooked gift consumes an actual prepared meal. Three daily household goals reset at 00:00 UTC and pay once per selected goal. In **Build & buy → Walls & doors**, partitions define rooms and door openings keep their routes connected; the floor plan and room summary show the actual geometry.

## Identity, rarity and test faucet

The live unofficial Test Chog faucet is [`0x9fcC2FB7487A3530809f45DFD9bb419EA2E0aF17`](https://testnet.monadexplorer.com/address/0x9fcC2FB7487A3530809f45DFD9bb419EA2E0aF17) on Monad Testnet, chain 10143. `.env.example` includes its matching browser/server settings. The historical legacy collection `0x32A325b0640594377D0708Ca9081c93da95e1908` remains the code fallback when no collection is configured. Original collection: `0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763` on Monad mainnet, chain 143.

All 1,969 original metadata records were fetched from contract tokenURI mappings at Monad mainnet block **115722652**. The original IDs are 1–1969; filenames are shuffled (token 1 references `1462.json`). The source, all 13 trait categories, hashes, rarity ranks and proofs are committed in the generated artifacts. Run `npm run metadata:audit` to reproduce every hash and proof. See [source provenance](docs/chog-source.md).

Chog pets retain authentic portraits and raw traits; Skin controls color and Body controls clothing. The reference and original token 1 have detailed directional pet sprites; other Chogs use a trait-based interpretation. Humans are separate, with NFT-seeded choices across six painted identities and four clothing palettes, plus standing, walking, sitting and sleeping poses. New verified households use the original metadata **Tier** for starting funds, furniture and land. Cash plus initial furniture value shares one move-in budget; Common homes can start empty. Existing households keep their earned assets without another grant. Shared verified rarity is assigned only after the configured source-mapped faucet and manifest root match. Legacy unverified test NFTs still receive a labeled basic package.

`ChainWorldTestChog.sol` implements an **unofficial testnet spinoff**, one lifetime claim per wallet, transferable enumerated tokens, a maximum supply of 1,969, and exact original-token/URI mapping committed by an immutable Merkle root. Assignment is deterministic; it is not secure randomness or Sybil protection. Claims require test MON for network gas.

To refresh the source or validate an independently supplied source:

```bash
npm run metadata:fetch
npm run metadata:audit
npm run metadata:validate -- path/to/source-manifest.json
```

The source schema is `SourceManifest` in `src/game/rarity.ts`: version 1, chain 143, original collection address, snapshot block, scoring `trait-frequency-v1`, and all 1,969 unique tokens with their actual on-chain URI, metadata, and SHA-256 of `JSON.stringify(metadata)`. The validator verifies URIs at the snapshot block, fetches original metadata, checks hashes, computes tie-preserving trait-frequency ranks, and writes `public/faucet-manifest.json`. `--offline` generates a nonverified artifact for inspection only; the live faucet UI rejects it.

The live deployment is recorded in [faucet-monad-testnet.json](data/deployments/faucet-monad-testnet.json). Run `npm run faucet:check` to verify its onchain root, supply, original chain/collection and registry linkage. The server and browser load the verified local source metadata only after its root, original token association and exact tokenURI match the contract. This lets a new claimant enter even if external JSON gateways are unavailable. The server verifies the metadata hash before assigning a verified rank. External $CHOG holdings do not alter starting wealth or housing.

## Cities and the property ledger

| City | Blockchain | Infrastructure |
| --- | --- | --- |
| Monhattan | Monad | Parallel Perk, validator works, violet trams |
| Gwei York | Ethereum | Expensive Espresso, prestige offices, Central Gwei Park |
| Basedford | Base | Based & Breakfast, builder studios, waterfront gardens |
| Arbiquerque | Arbitrum | Trader cafés, optimistic accounts, courtyards |
| Polygone-on-Sea | Polygon | Maker market, mosaic gardens, seaside transport |

All five read mainnet gas; NFTs and registration currently use Monad Testnet. Sanctuary is a free recovery space. Meals, upgrades, fares, land and upkeep use a bounded per-chain gas-to-gCHOG game index. Baselines normalize native-chain gas units; this is a game exchange rule, not a quoted ERC20 market price. Unavailable quotes use a visible nominal baseline; stale observations retain their timestamp.

Shared parcels, offers, presence and social events currently use Neon transactions. `ChainWorldLand.sol` separately implements NFT-bound onchain parcels, rarity proofs, signed price quotes, ERC20 offer escrow/refunds and connected-estate checks. It is tested but **not deployed or connected as the current property authority**. Activation requires the actual currency contract, an operator quote signer, deployment and event indexing. Editable furniture, partitions/doors and floor extensions are implemented. Exact parcel-shaped building footprints, multiple floors, full human relationship simulation and complete Chog trait animation coverage remain future work.

## Registry and deployment

The live V2 registry is [`0xA4aB8dbc0b3213C2d80af677bD7B4b5f259BdD0f`](https://testnet.monadexplorer.com/address/0xA4aB8dbc0b3213C2d80af677bD7B4b5f259BdD0f), linked to the source-mapped faucet. The historical V1 registry is `0x6706b660883ce7f209eb5ea61a6114a1cac41a97`. It is **not compatible** with the new source/ABI. The frontend only enables the replacement when `VITE_REGISTRY_V2_ADDRESS` is set; set matching `REGISTRY_V2_ADDRESS` on the backend.

V2 lots belong to NFTs, allocate monotonically beyond the first 36, resolve current ownership after transfer, paginate in groups of 36, and support reputation up to 500. Profile snapshots published on chain are explicitly owner-reported display data, separate from server progression.

```bash
npm run contracts:build
npm run contracts:test
# Simulate using a configured Foundry account. No transaction is broadcast:
node node_modules/@foundry-rs/forge/bin.mjs script contracts/script/DeployWorld.s.sol:DeployWorld \
  --rpc-url https://testnet-rpc.monad.xyz --account YOUR_KEYSTORE_NAME
```

For a new deployment, configure a funded signer locally in the ignored `.env` (`DEPLOYER_PRIVATE_KEY`), then run `npm run faucet:enable`. The command verifies the complete source, deploys on chain 10143, verifies both contracts and atomically sets all six browser/server addresses. With a local signing key, its ignored mode-600 transaction journal lets an interrupted deployment resume with the same signed transactions. `-- --wait` waits for funding. A configured verified deployment is reused. A Foundry keystore can instead use `-- --account NAME` with `DEPLOYER_PASSWORD_FILE` configured locally.

To activate an existing deployment without signing, run:

```bash
npm run faucet:configure -- --collection 0x9fcC2FB7487A3530809f45DFD9bb419EA2E0aF17 --registry 0xA4aB8dbc0b3213C2d80af677bD7B4b5f259BdD0f
npm run faucet:check
```

The lower-level Foundry script also supports `DEPLOY_TEST_CHOG=true`, `MANIFEST_ROOT`, `MANIFEST_SUPPLY`, and an explicit `--broadcast`. Otherwise it uses `CHOG_ADDRESS`. Keep signer material out of frontend variables and source control.

Vercel configuration serves the Vite frontend and Node API routes in `api/`. Configure the server variables plus build-time `VITE_*` variables in the hosting environment. The shared API uses Neon's HTTPS driver and atomic database functions; it works without a permanent server process. Schema migration is an explicit setup step, not part of every build.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run contracts:test
npm run build
npm run metadata:audit
npm run test:world-database  # requires migrated Neon; escrow/races/social checks
npm run test:database  # requires .env and migrated Neon database
npm run test:api       # requires running local server and Neon
npm run test:browser   # requires Playwright Chromium and system libraries
```

The database check creates and removes isolated verification rows. It tests concurrent writes and replay protection. The API check uses a temporary in-memory signing key for login/logout tests and never submits a blockchain transaction.

Events use deterministic UTC two-hour slots. Costs, work income and social effects are scoped independently. Gas observations cache for 60 seconds and retain exact wei values for prediction jobs.

See [implementation status](docs/implementation-status.md) for release dependencies and [art prompts](docs/art-prompts.md) for original/generated asset provenance. Play the deployed app at **https://chainworld-chog.vercel.app**; local preview is **http://localhost:5175**. The faucet and V2 registry are deployed on Monad Testnet. Production NFT/session/game/neighborhood reads passed a signed ownership smoke check; onchain land settlement remains pending. See [submission answers](docs/submission.md) and [Vercel deployment](docs/vercel-deployment.md).
