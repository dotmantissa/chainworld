> Current proposed direction: [Households, Chog pets and a playable living world](life-simulation-architecture.md). The user has clarified that the controlled player is a human and the Chog NFT is their separate pet and household/economic anchor, with anime-inspired graphics. That plan supersedes the player-as-Chog design below and specifies physical object use, real housing/build tools, city venues, travel and relationships. This file remains a historical design record.

> Implemented baseline, 2026-10-23: The complete 1,969-token source snapshot is acquired. Five EVM city identities, basic physical neighborhoods, profile settings and shared property/social mechanics exist. See [current implementation status](implementation-status.md) and [source provenance](chog-source.md). The Test Chog faucet and V2 registry are deployed and configured on Monad Testnet. The newer plan explicitly distinguishes those foundations from the deeper simulation still to build.

# Chain World — proposed design, engine plan and decision gates

Historical design recorded 2026-10-21. Implementation was explicitly authorized on 2026-10-22; see [implementation status](implementation-status.md) for current delivery and remaining dependencies.

Original planning status: Reviewed against commit `4387afb`. The deadline is in two days; the exact submission time is unconfirmed. Nothing in this document authorizes implementation. The user will explicitly ask when building should start.

## Product requirements established by the user

- A Sims-inspired blockchain life simulator with an actual inhabited world, animated characters, usable objects and meaningful routines.
- The Chog NFT is the central character and economic identity, not just an access pass. Rarity entirely determines starting living conditions, property and standard of living. Characters derive strictly from NFT traits.
- Living costs respond to live gas conditions in the blockchain district the resident occupies.
- Create our own Chog spinoff on Monad Testnet, preserving the original collection's details/traits. An onsite NFT faucet makes the test collection claimable before signup.
- Source collection: `0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763` on Monad mainnet. The current repository's different testnet NFT is not the proposed new collection.
- Remove all inherited template attribution and associated frontend/docs artifacts, after planning is agreed and implementation is requested.
- Agree on all gates before building. No gameplay, contract, cleanup or deployment implementation yet.

Visual direction: the user accepted the recommendation of 2.5D: animated 2D characters in an isometric world. Their first reference establishes a playful illustrated interface with strong outlines, substantial buttons, expressive icons and soft colors, without copying its layout or seasonal decorations. The second reference suggests expressive, painterly character rendering with dramatic lighting. Its accompanying message ends at “However,” so the character-art constraint remains incomplete. Preserve Chog anatomy and real traits; do not infer that the reference authorizes human replacement characters.

## Repository audit: implemented versus complete

| System | What exists | What remains |
| --- | --- | --- |
| App/wallet | React, Vite, Tailwind, wagmi, ConnectKit, injected wallet | Faucet onboarding, reliable session/account transitions and errors |
| Identity | Testnet balance/first-token/tokenURI hook | New collection integration, validated metadata, cancellation, explicit ownership/selection states |
| Character | Keyword mapping and layered SVG head portrait | Actual trait catalog, full-body resident, directional animation, movement and interaction |
| Rarity | Keyword estimate with token-ID variance | Collection-wide scoring; current formula cannot reach Genesis rank 1–50: its minimum is 59 |
| Needs/time | Hunger/social decay helpers and local saves | A continuously settled simulation, energy/rest, recovery and bounded offline behavior |
| Economy | gCHOG, food, travel, starting funds | Single ledger, correct modifier application, spending/progression and NFT-bound ownership |
| Jobs | Three minigame/idle components | Hermit actually credits balance; fair gas samples; persistent sessions/cooldowns; safe completion |
| Housing | Tier labels, rarity initialization, downgrade logic | Visible properties, furniture utility, earned upgrades and safe insolvency recovery |
| Districts/gas | Six district definitions, four EVM RPC feeds | Reliable stale/precision handling, per-chain normalization, earned unlocks, honest Solana labeling |
| Events | Seven templates and date selection | Correct targets, timing/status, boundary settlement and once-only effects |
| Registry | Deployed ownership gate, registration, zone/snapshot writes | New immutable constructor target; transfer semantics; no occupied-lot overwrite; correct snapshot ranges |
| Map/social | 36 lot readers and visit toast | Assigned lot hydration, pagination, actual profiles, snapshot freshness and meaningful visits |
| Progression | Reputation initial value and Legend check | Reputation income, quests, XP, achievements, attainable goals |
| Holder bonus | Mainnet balance hook and badge descriptions | Correct network/transport and implemented promises; resolve conflict with rarity-only starting life |
| Docs/tooling | Build/deploy scripts, Vercel config, metadata | Portable setup, real tests, repaired README and removal of template scaffolding |

Critical source findings:

1. `gameEngine.ts` and `GameHUD.tsx`: saves reset the decay timestamp without reliably settling elapsed time. Remaining in one district does not continuously apply decay. An asynchronous gas result can overwrite newer gameplay with captured state.
2. `JobsPanel.tsx`: income modifiers are applied before and inside `earnGChog`. Hermit only updates component display. Grifter's 10-second round reuses a 60-second cache and treats an unchanged quote as “up.” Cooldowns and sessions reset when components unmount.
3. `types.ts`/engine: `gChog` and the mutable funds meter diverge. Saves are unvalidated JSON without migration. Gameplay rules are duplicated in components rather than dispatched through one engine.
4. `traitMapper.ts`: social gains can be negative; abilities are partly names without behavior; rarity cannot improve despite unlock copy implying it can.
5. Events are browser-date-based, not block-timestamp-seeded, expire after the first two UTC hours and still display Active. One generic multiplier incorrectly affects costs and earnings alike.
6. NFT loading assumes enumeration, rejects token zero through truthiness checks, fails to cancel stale metadata and can persist an invented default character after metadata failure.
7. Registration only changes a local flag; `registeredLot` remains null. Registration reads, receipt event decoding and error recovery are missing. Zone/snapshot writes are not integrated.
8. The registry's 37th registration overwrites lot 0 while prior mappings remain. NFT transfers can produce duplicate wallet registrations; later writes do not recheck ownership. A uint8 snapshot cannot represent reputation 500.
9. Mainnet holder reads use chain ID 41455 while config has only testnet 10143 and Ethereum 1. Actual Monad mainnet is 143, as confirmed by [official Monad sources](https://github.com/monad-developers).

## Verified evidence and unresolved dependencies

Read-only mainnet RPC checks confirmed chain ID 143, deployed code for the source collection, and supply 1,969. ERC-165 reports metadata support and no enumeration support; the original collection cannot be assumed to support the current first-owned-token flow. Enumeration is optional in [ERC-721](https://eips.ethereum.org/EIPS/eip-721).

`tokenURI(1)` returns `ipfs://bafybeid4ybujnscdipkno7ps5utqelp5ry5ryreqhay3zhgk3a6x4jruqu/1462.json`. Do not assume original token IDs equal metadata filenames. Four public IPFS gateways returned HTTP 403 in this environment. Actual trait names/values, images and full rarity data remain unverified. That is a data gate, not grounds to invent traits or claim canonical rarity.

The old testnet NFT and registry have code, but their full behavior was not validated. All chain requests were read-only: no signing, deployment or minting occurred.

Local baseline: node_modules, Bun and Forge are absent. `npm run typecheck` failed with `tsc: not found`; `npm run build` failed with `vite: not found`. Standalone solc is 0.8.37 instead of configured 0.8.28. No runtime/build/contract pass is claimed. Contract test directories contain placeholders. The check script invokes auto-fixing lint, so a read-only validation command is needed. Legacy deployment scripts use hardcoded sandbox paths and one undeclared package import.

## Gates to agree before any implementation

| Gate | Proposed decision | Status / closure evidence |
| --- | --- | --- |
| G0 — Submission scope | One convincing home slice; one complete care/work/upgrade loop before extra content | Proposed; exact deadline and feature cuts need agreement |
| G1 — Identity | Own clearly labeled testnet spinoff and onsite faucet | Concept confirmed; name/symbol and claim details pending |
| G2 — Source fidelity | Versioned original metadata snapshot, token mapping, images and reproducible rarity | Blocked on authentic data retrieval/validation |
| G3 — Faucet economics | One lifetime claim per wallet; transferable; one copy of each of 1,969 originals; free mint with player-paid test MON gas | Proposed; finite versus repeatable faucet needs agreement |
| G4 — NFT economy | Character, property, balance, career and reputation are per NFT; earned progress should follow transfers | Centrality confirmed; transfer/persistence policy pending |
| G5 — Authority | Server-validated, token-bound progression for a durable shared economy; local preview isolated | Neon supplied by user; schema, authority API and session checks implemented and verified |
| G6 — Art/gameplay | Phaser isometric scene; React wallet/HUD; expressive Chog sprites, tangible objects and readable animation | 2.5D accepted; incomplete second-reference caveat and device priority pending |
| G7 — Rules | Three core needs, recoverable failure, one ledger, bounded gas costs, quests and meaningful upgrades | Draft rules below; exact balance pending |
| G8 — Shared world | New token-bound registry with pages of 36; readable profiles; live multiplayer presence later | Proposed; required social depth pending |
| G9 — Release | Verified claim-to-upgrade demo, honest limitations, working saves and accurate docs | Proposed acceptance checklist below |
| G10 — Start | Begin after the user explicitly asks | Authorized 2026-10-22: aggressive implementation requested |

## NFT collection and onsite faucet

Obtain verified source token IDs and resolve every tokenURI; do not infer IDs from supply. Validate the full metadata corpus and preserve raw attributes alongside canonical forms. Produce a public manifest containing original collection/chain/token, URI, canonical attributes, image reference, content hash, snapshot block and scoring version. Resolve whether original art is reused in the test NFT or only traits are preserved with new artwork.

Recommended working identity: `ChainWorldTestChog` / `CWCHOG`, clearly described as an unofficial testnet game asset. Our contract can deliberately implement enumeration for owned-token selection. Preserve a fixed source mapping and immutable metadata reference for the release.

Proposed claim policy: one lifetime faucet mint per wallet; receiving/transferring a token does not reset claim eligibility. Cap supply at 1,969, one test counterpart per original, assigned through a published shuffled permutation. This preserves the source rarity distribution. It is inspectable assignment, not secure randomness; one-wallet limits are not Sybil resistance. A repeatable testing faucet or additional editions would need a distinct economy/reset policy.

No NFT price is charged; users need test MON for gas unless sponsorship is separately agreed. Show sold out, already claimed, no gas, wallet rejection, pending/replaced receipt and metadata failure distinctly. Persist pending transaction identity through refresh and refetch ownership after confirmation. The claim page must be reachable before the NFT gate.

Contract review includes claim state before receiver callbacks, duplicate claims, supply exhaustion, rejection of accidental payment, exact original-to-copy metadata association and transfers. Mainnet original ownership is not required for the proposed public test faucet unless the user changes that gate.

## Rarity, traits and NFT-centered economics

Use full-collection trait frequencies, not keywords. Proposed score: sum `-log2(valueFrequency / collectionSize)` over normalized categories, including explicit absence where relevant. Equal trait sets share a score/rank; token-ID variation cannot change economic class. Version the method and label it as the game's rarity calculation unless an authenticated official ranking is adopted.

Proposed classes retain current bands: Genesis 1–50, Legendary 51–200, Rare 201–500, Uncommon 501–900, Common 901–1400, Floor 1401–1969. The class label Genesis needs approval because it is also part of the original collection name.

The NFT owns the economic identity; the wallet controls it. Every source/sink, house upgrade, career reward and reputation award references that collection/token ID. Switching wallets must not create new starting grants for the same NFT in an authoritative economy. Different NFTs must not share one wallet balance. Do not add a tradeable currency token just to represent the game balance.

Rarity alone establishes the initial property package. Actual traits establish appearance, personality, career fit and bounded utility modifiers. Earned play improves later life without changing source NFT rarity. Optional external-token holder badges stay cosmetic by default; financial starting bonuses would violate the rarity-only brief.

Draft starting packages, subject to balance agreement:

| Class | gCHOG | Home tier / property | Starting access |
| --- | --- | --- | --- |
| Floor | 100 | 0, sheltered nook/bedroll/basic essentials | Monad |
| Common | 200 | 1, shared dorm/simple desk | Monad |
| Uncommon | 400 | 2, compact flat/kitchen corner | Monad, Base |
| Rare | 800 | 3, apartment/better furnishings | Monad, Base, Arbitrum |
| Legendary | 1,600 | 4, villa/premium fixtures | All except Void |
| Genesis | 3,200 | 5, penthouse/top furnishings | All six |

Every class retains access to food, rest, social contact and starter work. Rarity creates different circumstances rather than permanent inability to play. Sanctuary/return access is available to everyone regardless of prestige unlocks.

Canonicalize real attributes and hash that trait set for stable character variation. No refreshed random stats, fabricated traits or token-ID rarity noise. Review an actual trait-to-art/stat/ability table once metadata is available. Preserve raw traits in the profile; unsupported art traits receive a neutral rendering with a visible trait record. Social gain must never become negative because of a mapping accident.

For ongoing utility, traits should influence job aptitude, endurance/need decay, social effectiveness and meaningful action options. Each advertised special ability needs an implemented rule and bounded effect. NFT utility must remain apparent after signup through the resident's behavior, home and economy.

## 2.5D presentation and animation gate

Recommendation: Phaser for the world, React for wallet/faucet/HUD and panels. Phaser provides [sprite animation](https://docs.phaser.io/phaser/concepts/animations) and [scene lifecycle management](https://docs.phaser.io/phaser/concepts/scenes); the game still needs our own routing, action rules, assets and animation direction. Keep simulation logic independent of both frameworks.

Use an isometric tile grid with explicit walkability, furniture footprints, approach tiles and depth anchors. A resident walks around solid objects rather than sliding through them. A small A* or breadth-first route finder is sufficient; physics is unnecessary for room navigation. Correct foreground occlusion, foot placement and interaction orientation matter more than room size.

Required resident states: idle, walking in four directions, turning, eating, resting/sleeping, working and socializing. Use readable silhouettes, contact shadows and subtle motion. Detailed painterly portraits can accompany simpler animated sprites that preserve the same anatomy/palette/traits. Do not promise film-level rendering for gameplay assets within two days.

Required game feel: click/tap ground to move; highlight/select objects; show action affordance and inability reason; character approaches, faces object and performs the visible action; progress and outcome match the actual simulation. Sound cues, thought bubbles and restrained particles support feedback. Animation callbacks cannot authorize money rewards.

First art gate after implementation is requested: one real trait-derived Chog walking and using one object in a representative room. Approve its look and motion before expanding furniture, housing variants or districts. Target smooth desktop rendering and a usable reduced-effects mobile mode; measure performance rather than promising a frame rate on unknown devices.

Full 3D adds modeling, rigging, skinning, lighting and camera work that would displace the playable loop. Later 3D remains possible because rules/data stay renderer-independent.

## Core simulation and object mechanics

Initial needs: hunger, energy and social, each 0–100; reputation 0–500; housing tier 0–5; one integer gCHOG balance. Funds display derives from the ledger. Health/comfort can be derived status rather than more meters initially. Hygiene, inventory/build mode and complex relationships follow later.

Proposed four interactive objects:

| Object | Action | Draft cost/duration | Result |
| --- | --- | --- | --- |
| Fridge/food station | Eat | 20 gCHOG; 6 real seconds | +35 hunger |
| Bed/bedroll | Rest | Free; 10 real seconds | +40 energy |
| Workstation | Work | Energy/session requirements | Starts a real job session |
| Phone/social spot | Socialize | Free; 8 real seconds; cooldown | +15 base social with bounded charisma effect |

Action state machine: requested → validated → pathing → approaching → interacting → completed/canceled. Reserve the interaction point; charge a consumable only once the interaction actually starts. Unreachable furniture cannot charge or complete. Queue at most three actions. Cancel before start without cost; cancel after consuming an item without a refund. Work cancellation grants no completion reward.

Basic autonomy may choose free rest/social care while idle and the queue is empty. It never spends currency, travels or starts paid work automatically. Player commands take priority at safe interruption points. Scene remounts, account changes and canceled actions release reservations and reject late completion callbacks.

Proposed clock: 1 real minute = 10 simulated minutes, so a simulated day is 144 real minutes. Action/job durations are explicit real seconds; continuous upkeep/need decay use simulated time through one conversion function. Draft hourly decay: hunger −4, energy −3, social −2, bounded by endurance. Reputation does not passively decay in the first release.

Low hunger plus low social applies Degen Spiral at 0.4× earnings. Low energy sends the resident to free rest before demanding work. No permanent death, NFT destruction or debt spiral. At zero funds, upkeep stops at zero. A cooldown-limited basic ration is available when hunger and funds are critically low. No offline eviction in the first release.

Draft offline policy: settle at most 8 real hours of absence; cap charged upkeep at 25% of departure balance; bound passive work earnings to 30 minutes; show the settlement on return. These protections need approval alongside economy balance. A server-authoritative edition uses server time, not browser time.

## Engine architecture and persistence

Pure TypeScript rules with injected time, gas observations, verified identity and seeded challenge inputs. Engine code contains no RPC/localStorage calls, React state setters, toasts or uncontrolled randomness. Renderers and services emit commands, not whole-state replacements.

Modules: model/content definitions; simulation/command reducer; economy/ledger; needs/modifiers; jobs; progression/quests; world/pathfinding/objects; events; persistence/migrations; NFT/oracle/registry services; React dispatcher; Phaser scenes. One serialized action pipeline owns state changes.

State groups: identity (chain/collection/token/source manifest/traits/rarity); resident/stats/appearance; housing/objects; needs; balance/ledger; career/XP/reputation/unlocks; action queue/active session; job IDs/cooldowns/samples; event/quest claim IDs; simulation timestamp; save schema/rules version/revision; confirmed chain registration and pending tx identity. Token IDs remain bigint at chain boundaries and decimal strings in JSON.

Command execution: verify session/identity → settle elapsed time → validate current preconditions → atomically debit/start → complete/reward once → apply progression → enforce invariants → persist revision → notify/render. Reject duplicate command IDs, old revisions and stale callbacks. Each earning source, quest and event has a stable settlement ID.

Separate `lastSimulatedAt` from `savedAt`. Settle before every economic command, travel, save checkpoint and focus return. Split time at job completion, needs thresholds, event transitions and rate/district changes. Preserve fixed-point remainders so frequent updates do not alter totals. Never apply current gas/event rates retroactively as though historical data were known.

Critical authority decision: localStorage cannot carry a durable economy across devices or NFT owners and cannot prevent grant/reward edits. Recommended durable path is an authenticated API and database with token-keyed state, server time, current ownership checks, command IDs, expected revisions and atomic transactions. Wallet login uses replay-resistant nonces; transfer revokes the prior owner's command authority. No wallet secret belongs in VITE variables.

That backend adds scope and deployment dependencies. A local prototype remains possible only with explicit agreement that progression is device-local and untrusted; it would not fully deliver the recommended transfer-following economy. Publishing a self-reported on-chain balance does not make it validated. Valuable rewards/trading/leaderboards require an authority model beyond honest clients.

Validate saves, preserve backups, version rules and migrate old `chainworld_v1_*` state deliberately. Old collection saves cannot silently attach to new faucet NFTs. Address multi-tab writers, quota errors, corrupted data and backward clocks. An authoritative backend is the source of truth; local caches render progress and queue eligible input without silently minting offline rewards.

## Gas, districts, work and progression

For EVM districts, retain raw quotes in wei and normalize each against its own reference quote into a congestion ratio. Raw MON/ETH gas values are not comparable USD living costs. Clamp pressure, proposed 0.5–3×, and disclose any baseline fallback. Daily upkeep is zone base × pressure × housing factor × rarity factor × applicable cost event, with reviewed overall caps. UI and engine use the same quote breakdown.

Keep existing draft zone bases: Monad 10, Ethereum 80, Base 25, Arbitrum 20, Solana 15, Void 0 gCHOG per simulated day. Four EVM feeds can be live. Solana is not measured in gwei: initially label it simulated/baseline and disable gas predictions there. Void has no upkeep or work income. Travel is in-game; all game writes remain on Monad Testnet, without bridging to visit themed districts.

Shared 60-second oracle queries need source IDs/timestamps, request deduplication, timeout/backoff and precise low-fee values. Stale data retains its original observation time. Draft stale threshold is 2 minutes; after 10 minutes use a disclosed baseline. Grifter requires a genuinely new observation, not a cache hit.

Work uses one reward function applying profession/trait, district, mood and eligible event modifiers exactly once, rounding once at final credit. Display actual credited amount. Draft jobs:

- Validator: retain 20-second challenge; cap base reward at 80; energy −10; cooldown 30 seconds. Persistent session deadline and once-only accepted block/completion IDs.
- Grifter: predict up/down against a distinct quote at least 60 seconds later; unchanged quotes are a push; stale/error cancels without payout/loss. Lock source/session; cap streak effects. Optional for submission if fair samples are unreliable.
- Hermit: explicit passive work session, draft base 2 gCHOG per real minute, no parallel active work, accrual through settlement and offline cap. Component mounting is irrelevant to earnings.

Server authority cannot automatically prove a browser minigame score is honest. Safest first economy uses bounded, elapsed-time-validated wages; skill score affects presentation or noncompetitive achievements until result validation is specified. Do not accept arbitrary client-submitted payout amounts.

Upgrades belong to the NFT. Draft next-tier prices: 300/600/1,200/2,400/4,800 and reputation requirements 60/90/130/180/240. Initial rarity-granted tiers bypass earlier purchases. Upgrade space/furniture visibly, without deleting essential care objects. Earned access: Base at rep 75, Arbitrum 100, Solana 150, Ethereum 200; rarity-granted access remains valid. Safe return/escape is always free.

Onboarding: inspect NFT/rarity → enter matching home → complete work → eat/rest/socialize → register lot → inspect neighbor → earn an upgrade/unlock. Award bounded one-time quest/reputation rewards with persistent IDs. Legend at 400 must have an attainable path and only advertise implemented utility. Repeatable social clicks cannot infinitely mint reputation.

Events use typed effects: Gas War affects upkeep; Airdrop affects work; Parade affects Monad social gain; ETH Surge affects Ethereum upkeep; Speed Demon affects Monad work. Shared time windows and accurate Active/Upcoming/Ended labels replace the generic multiplier. Destructive Rug Pull and the unimplemented NFT Flipper bonus are deferred by default. Event effects never change original NFT rarity.

## Registry and shared-world gate

The current immutable registry targets the old NFT and needs replacement for our collection. Proposed replacement binds a registration/lot to token ID, rechecks current ownership for writes and never overwrites occupied land. Allocate monotonically increasing lot IDs, displayed in pages of 36; use wider types than uint8. NFT transfer gives the new owner control of the same lot.

Expose registration existence, lot/page, district and profile snapshot with timestamps and typed errors. Reputation needs uint16. Reconcile registration from chain after receipts/reload, rather than trusting local success flags. Batch/read pages with explicit loading/error states. Preserve old deployment history; migration of old wallet-bound lots is a separate reviewed decision.

Clicking a lot opens a real profile with source NFT, rarity, home, district and snapshot freshness. Player-published snapshots are explicitly informational unless validated by the agreed authority. No claimed live presence, visit buff or multiplayer state without implementing it. Chat, live visitors inside houses, trading and cooperative play are later scope unless chosen over other release features.

## Frontend/docs cleanup inventory

The visible watermark was already removed in HEAD. Remaining runtime artifacts include `main.tsx` imports of tracing/console capture, `config.ts` chain-registration tracing, global fetch/provider/console patches, parent-frame messages and template globals. Remove those modules and all consumers after implementation is authorized, rather than merely changing comments.

Review/remove unused template `onchain-money.ts`, `onchain-wait.ts`, and `onchain-facts.ts` after replacing remaining deployment-tool consumers. Replace legacy self/Compass deployment and ABI scripts with a portable project-owned Monad Testnet path. Rename package the template package, remove unused SDKs, regenerate the lockfile, remove obsolete absolute aliases and unnecessary polyfills, and add read-only checks.

Repair README code fences, escaped token labels, network/contract tables and overclaims. Document actual faucet access, local/shared authority, setup, gameplay and limitations. Remove inherited platform attribution and generator directions across all first-party docs, scripts/config and generated output, including planning notes if they preserve that attribution. Retain factual deployment history without obsolete machine-specific paths.

Acceptance: scoped source/docs/lock/config/output searches find no inherited attribution, host links, message IDs or globals; browser runtime no longer patches/forwards through the template bridge; wallet connection and writes still work. Do not delete unrelated names such as Arbitrum.

## Delivery order and two-day feasibility

Gate agreement and an explicit start request precede these work blocks. Data access, art and authority choices determine the actual estimate. The full original vision is not a credible two-day deliverable; a coherent vertical slice is.

1. Resolve metadata/media/rarity feasibility and choose backend/local authority before spending the asset budget. Establish a portable build and remove inherited scaffolding.
2. Define token manifest, test NFT/faucet and replacement registry, with focused local contract tests. Prepare reviewable deploy/config artifacts before release decisions.
3. Implement engine and state authority, then verify time, money, identity, transfer behavior and persistence.
4. Prove one trait-derived resident walking and using an object in the chosen art style. Approve scene look/animation before scaling assets.
5. Complete work → care → spending → visible upgrade with one home layout whose furnishings vary by rarity. Restore optional jobs only after this loop works.
6. Integrate gas/district choices, map registration and real profile reads. Add only scoped events and quests that can be verified.
7. Freeze features with at least eight hours left for integrated tests, browser/device checks, documentation, demo recording and release recovery.

If scope slips, cut extra jobs, external-holder badges, destructive events, extra district scenes, furniture variations and elaborate autonomy. Preserve the NFT faucet, authentic rarity, animated resident/object interactions, a correct economy, safe registry and recoverable saves. Requiring a durable server-backed economy consumes part of the content budget; agree which features move later.

## Verification and acceptance

Required focused tests: claim/supply/transfer safety; token uniqueness and player 37 preserving prior lots; prior owner denied after transfer; metadata mapping and reproducible ranks; rewards once; atomic spending; elapsed-time segmentation; no decay forgiveness; stale callback rejection; job remount/refresh; fresh gas/tie cases; event boundaries; valid save migration and identity separation.

Scene checks: reachable objects, collision/depth correctness, directional animation, no foot sliding, clean interaction cancellation, responsive click/tap feedback, legible HUD and usable mobile/keyboard alternatives. Economy checks: every rarity can recover, no hidden permanent lockout, upgrades reachable through play, gCHOG remains NFT-associated and actually credits/debits correctly.

Release checks: clean dependency install, production build, typecheck, read-only lint, focused game tests, Forge build/tests, actual faucet/registration receipt smoke, account/chain transfer scenarios, no inherited frontend/docs artifacts, and no secrets in browser output. Record source/contract tests separately from deployed verification.

Demo acceptance: claim/select NFT → inspect real traits/rarity → enter corresponding home → move to an object and perform its visible action → complete work → care for needs → register/locate lot → inspect a neighbor → buy an earned improvement → reload without lost progress. Aim for an understandable 5–10-minute first loop.

## Questions still open

Economy authority/persistence; progression transfer and NFT selection; finite versus repeatable faucet; exact economic goal/progression ceiling; required social depth; desktop/mobile priority; exact deadline; original-art reuse versus trait-preserving new art; and the unfinished “However” in the second character-art reference. Defaults in this document remain proposals until agreed. Building remains explicitly unauthorized.
