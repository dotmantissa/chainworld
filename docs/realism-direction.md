# Reference-driven realism — 24 October 2026

The three user-supplied screenshots establish direction: connected cutaway rooms, ordinary residential scale, readable wood/fabric/stone/metal, soft lighting and a resident visibly occupying a bed, seat, kitchen or bathroom fixture. Their pixels, exact layouts and commercial game objects are not included in Chainworld.

This pass keeps the existing 2.5D renderer and NFT-derived human/Chog identities. It adds original 3D-rendered raster furniture to the interactive room, catalogue and object system:

| Asset | Physical behavior |
| --- | --- |
| Oak bed with linen, pillows and sage duvet | Rest/sleep; lying pose and duvet foreground, quiet Z markers |
| Sage kitchen, stone worktop, brass tap, hob and oven | Meals/cooking/washing; front approach with sink/hob positions and water/steam/food props |
| Fabric sofa | Sitting, reading, calls, relaxation and sketching |
| Walnut desk and chair | Seated shifts, focused work, programming and liquidity; warm screen/lamp accents |
| Oak washbasin | Purchasable 1×1 fixture; free sink washing; no cooking actions |
| Glass rain shower | Purchasable 2×2 fixture; approach, enter, shower water, glass foreground; hygiene and comfort recovery |

The room gains a grounded foundation/lot edge, soft contact shading and tiled wet areas derived from real objects/room geometry. Partitions draw along the same edges used by collision, with thickness, baseboards and door frames. Near walls fade for visibility. Seats, beds and showers ease into their use positions. The activity marker shows the actual action; it has no connection to saving. Original art remains available, and placed geometry, purchases and existing NFT move-in budgets are preserved.

Basic care now uses: snack 2s, meal 4s, rest 4s, sleep 20s, call 4s, reading 8s, washing 3s, relaxation 5s and shower 5s. Work, prediction/validator challenges, cooking and skill practice keep their established timers and rewards. Recognized older in-progress care timers retain their original end timestamps across reload instead of discarding a paid action or granting an extra reward.

The six generated WebP assets live in `public/art/realism/`; exact prompts, dimensions, SHA-256 hashes and built-in tool provenance are in [prompts.json](../public/art/realism/prompts.json). [realism-manifest.json](../src/world/realism-manifest.json) supplies runtime dimensions. The built-in imagegen tool generated each asset independently from text; browser canvas encoding resized and encoded the results while retaining alpha. Raw generated PNGs remain in the image tool output directory. No image-generation API key or external generation CLI was used.

Current limits: characters still use directional pose art and procedural animation. Free-rotating 3D cameras, skeletal hand/limb animation, blanket cloth simulation, changing clothes and complete bathroom/privacy simulation need a larger renderer/animation pass. This delivery improves the existing playable scene and actual object interactions; it does not claim to reproduce a full 3D life-simulation engine.

## Verification

99 unit tests, types/lint and the final production build pass. All 28 browser scenarios were verified across the full run and focused rechecks, including a response deliberately held open during movement/queue/cancellation. The first full run had one scene-start timeout under simultaneous build load; the unchanged mobile case passed alone and again in the final save/mobile checks. Purchasable fixtures and use/reload, old-timer restoration, physical approach/partition geometry and sleep/shower layers are covered. Final desktop, mobile, bed and shower screenshots were inspected; all six production asset hashes match their prompt manifest. This pass was committed locally with no push, deployment or live database/contract writes.
