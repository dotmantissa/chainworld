# Chog workshop economy

Open **Workshop & orders** beneath the needs meters, or **Household → Chog workshop**. This uses the existing household tool rather than adding another main menu.

1. At your own home, buy six materials. The base bundle costs 40 gCHOG, adjusted by the current city's server-observed gas price.
2. With your Chog following and cared for, practice coding at a desk, sketch at a sofa, or cook breakfast at a kitchen. Each session can make one tiny app, original print, or picnic box. The workshop switch lets ordinary practice/cooking continue without making goods.
3. Bring the goods and your Chog to the workplace, library, or café. Deliver the matching daily order and receive gCHOG, XP and bond.
4. Improve the workshop at home. Three levels cost 120, 240 and 360 gCHOG before city adjustments. Each level reduces a materials bundle by 4 gCHOG and adds 5% to order prices and 2 percentage points to the eligible job bonus.

The NFT-derived profession determines the household's specialty: developers/validators make apps, bankers make picnic boxes, and degens make prints. Other professions use a stable seed from the NFT identity and traits. Matching orders pay 20% more. Default unit prices are 64/52/58 gCHOG for apps/prints/boxes. Each order requests one or two goods, seeded by NFT identity and UTC day; the three order types can each pay once per NFT per day, across all cities. Orders reset at midnight UTC while materials, stock and improvements remain.

Production needs a following Chog with hunger ≥40, energy ≥30 and affection ≥40. One material and four Chog energy are consumed when the physical action actually starts, after approaching the furniture. Cancellation keeps no product and does not refund consumed inputs. Successful completion produces once. A picnic box packages the cooked breakfast instead of granting both a saleable box and an edible meal. Ingredients and ordinary action costs still apply. Materials are capped at 80 and stock at 40 per good.

A cared-for, following Chog also improves actual job income: 2 percentage points per ten bond plus 2 per workshop level, capped at 20%. Order rewards include this eligible partnership bonus. The panel shows the current effect, requirements, stock, delivery receipts and prices before purchase.

## Identity and authority

Materials, goods, workshop level, earned totals and daily receipts live in `GameState.chogEconomy`, under the existing chain/collection/token household key. They follow the NFT household when its controller changes. Wallet changes and old-save migration grant no replacement stock, currency or daily receipts. This pass requires no database schema or contract migration: the existing authoritative game-state record and serialized command transaction persist the new fields.

The API accepts only purchase, upgrade, production-toggle and delivery intents. It calculates prices, eligibility, stock consumption and rewards with server time and quotes. Client-supplied prices/rewards/material amounts are ignored. Existing ownership checks, revision locking and request receipts apply. No new remote completion or inventory-upload endpoint exists. Local preview remains a separate browser-only ledger and cannot import funds or inventory into shared play.

The loop uses internal game gCHOG. It does not issue ERC20 tokens or activate onchain settlement. Live NFT transfer, Neon concurrency and multi-wallet play need their existing release checks; local/mocked tests do not establish those deployments.

## Verification

Unit coverage checks paid inputs, physical starts, cancellation, once-only completion, meal nonduplication, venue/companion requirements, repeated delivery rejection, daily reset, save/owner persistence, care/upgrades and parser rejection. The browser scenario purchases supplies, completes real furniture actions, travels to the workplace, delivers, rejects a second payout and reloads the saved receipt. See `tests/chog-economy.test.ts` and `tests/browser/chog-workshop.spec.ts`.
