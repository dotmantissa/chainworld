# Playability audit — 23 October 2026

Scope: onboarding, play screen, movement, furniture, household care, jobs, money, building, progression, travel, NPCs, persistence, accessibility, performance and release readiness. Source review plus a real Chromium preview; no production writes or deployments. Findings describe the starting build; remediation and validation are recorded below.

## Player experience

The game has a working simulation, but exposes its systems like a management dashboard. The player should be able to enter, move, select an object and understand the result without configuring anything. Name, presentation, décor, visitor policy, autonomy, projects and advanced jobs should all be optional.

Baseline at 1440 × 1000: the default page is 2,292 px tall with 38 buttons. Basic actions sit below a 642 px canvas and permanent queue settings. Build, goals, upgrades, visitor policy, character editing, pet controls and NFT details compete with play. A successful existing browser suite establishes functional coverage, not that a first-time player understands the interface.

| Area | Finding and player impact | Priority / acceptance |
| --- | --- | --- |
| First session | No guided first loop; identity/setup and collection concepts compete with getting into play. | P0: preview remains one click; no mandatory new settings; suggest one useful action at a time. |
| HUD / navigation | Five panels plus resident/pet/settings cards; repeated furniture and job entry points. Building appears in the default life panel. | P0: world, compact needs, activity and three tool entry points form the default screen. Everything else opens deliberately. |
| Walking | New floor clicks are rejected during an existing journey; the character faces the final endpoint rather than the current path segment. | P0: redirect an ordinary walk immediately, preserving legal routes and authority. Object approaches and active work remain explicit cancelable commitments. |
| Movement feedback | No route or destination marker, limited gait and no readable object hover. Street pet snaps between tiles. | P0: show path/destination, object labels/highlight, current-segment facing, gait/idle motion and interpolated pet following. Respect reduced motion. |
| Object use | Full illustrated modal obscures the world; broad family buttons may offer actions the actual object cannot perform. Costs and rejection rules live far from the object. | P0: compact choices, actual object capabilities, price/time, clear unavailability and visible work/progress. Optional kitchen supplies and desk challenges link from the relevant object. |
| Needs / recovery | Six needs plus reputation and pet needs are expanded permanently. Needs cannot guide the player to a matching action. | P0: compact actionable needs and lowest-need guidance; keep free recovery and emergency food discoverable. |
| Jobs / money | Three job mechanics sit in a separate panel; validator requires attention there. gCHOG and upkeep are easy to mistake for wallet funds. | P1: normal desk work is obvious; advanced jobs are contextual; surface active validator controls automatically. Keep game-currency wording. |
| Pantry / skills | Groceries, recipes, skills and projects require a separate tab with no kitchen link. | P1: kitchen opens supplies directly; ordinary meals do not require pantry setup. |
| Queue / autonomy | Empty queue permanently presents settings and explanatory text. Cancellation clears waiting actions, which is not obvious. | P1: collapse idle queue; show ordered actions while queued; explain cancel-all and autonomy before opting in. |
| Building | Catalogue, coordinate grid, rotations, walls and expansion share one long panel, separate from the scene. | P1: explicit build tool; no build controls on arrival; costs/invalid placement remain enforced. Direct in-world placement is a further improvement. |
| Travel / venues | Map, street services, city travel and venue entry overlap. Travel panel can remain open after a trip is selected. | P1: world tool groups travel/neighbors; close it when departing so the actual journey stays visible. |
| NPCs / pet | NPC conversations are real, timed and persistent, but NPCs stay anchored and pet care is instant. | P1/P2: contextual social affordances now; walking NPC schedules, richer reactions and staged pet interaction need further animation/simulation work. |
| Progression | Daily goals, milestones and projects compete for attention; rewards require finding their panel. | P1: one first-loop suggestion and visible claimable reward count, with goals available from the household tool. |
| Persistence / errors | Local token-bound saves and authoritative shared play are different modes. Shared polls can delay visible starts; browser save errors must stay visible. | P0: retain errors, cancellation, idempotent engine and server clock; do not claim new shared/live validation from local browser checks. |
| Accessibility / mobile | Canvas is an image role; fallback furniture buttons exist. Large permanent sidebars push care below the fold. | P0: focusable labelled play surface, keyboard walking, accessible matching furniture controls, Escape/close/focus restoration and viewport-fitting tools. |
| Performance | Large Phaser/vendor chunks; snapshots rebuild visuals based on serialized geometry. Existing art has directional poses, not full walk cycles. | P1/P2: retain lazy scene loading; measure production build. Procedural gait improves feedback but does not create anatomical sprite animation. |
| Public release | Current onchain land/currency activation, complete trait animation, multi-floor/parcel-shaped construction and live multi-wallet visits are unfinished. | Release boundary: preserve honest documentation; local UX work does not activate or verify these systems. |

## Intended first loop

Enter preview → click a floor or use WASD → select desk → work a shift → see progress and earnings → claim the first work milestone → select kitchen/bed/Chog or explore. An empty basic home instead points to free city services. A critical need takes priority over work. Every other setting is optional.

## Remediation / verification

- [ ] World-first HUD and optional tools; contextual guidance, actionable needs and accessible alternatives.
- [ ] Responsive legal walk redirection, destination/path feedback, affordances and animated activity.
- [ ] Automated regression for real play flows, mobile fit, keyboard/modal isolation, retargeting and persistence.
- [ ] Production build and source checks; screenshots inspected; measured default-screen reduction.

## Further work after this pass

Full multi-frame human walk/use animation, physical pet care, wandering NPC schedules, direct placement in the rendered room, sound design and a fresh-player usability session remain separate follow-ups. Financial/onchain and multi-wallet release gates require dedicated live-environment verification. No local test should be reported as proving those gates.
