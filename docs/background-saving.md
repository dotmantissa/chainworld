# Background saving and responsive play

The previous shared controller marked every request as globally pending, including its five-second clock writes. Scenes and controls treated that flag as an input lock and the resident displayed “Just a moment…” while waiting for network/database work. Browser-only play also serialized its entire snapshot into localStorage inside every update handler.

The controller now separates presentation, command synchronization and storage:

- The pure game reducer projects queued choices immediately. Movement, object selection, cancellation and the six-action queue remain usable during a save. Projection is provisional; it never becomes a trusted server balance or uploaded game snapshot.
- One FIFO sends commands with the latest acknowledged revision. Only unsent consecutive walk destinations coalesce. Once a request has been sent, its contents and idempotency key stay stable through ambiguous-response retries.
- A revision conflict refreshes the canonical snapshot and rebases queued commands, with a bounded retry. Rejected actions roll back to the confirmed snapshot. Ownership/session rejection clears pending choices. Temporary failures retain the outbox and retry with backoff; a small save status and retry button stay below the world.
- The per-wallet/NFT outbox contains intents, never credentials or a client-authoritative balance. Session storage permits replay after reload using the same request IDs. If session storage is unavailable, in-memory retries still work while the page remains open.
- The small session outbox journal coalesces into deferred idle work. Page hide, hidden visibility and controller cleanup flush the latest pending intents. Browser storage remains synchronous but is moved outside the immediate input/render path. The former browser-only snapshot writer remains a tested utility and is no longer used by playable entry/controller paths.
- Movement and validator clicks use the server's cached gas observations (up to five minutes, then the nominal baseline). Economic commands and periodic synchronization still refresh observations. Published registry hydration runs on entry/read, rather than on every write. Both live NFT ownership checks, server time, revision locking, atomic commits and server-calculated charges remain in place.
- Neighborhood polling depends on actual context changes, rather than restarting with every projected clock/movement update.

The in-world bubble is reserved for physical activity. Background synchronization never adds a waiting message above the resident. Long-suspended projections apply the same offline settlement caps as the authority. Shared updates may reconcile a provisional route, price, resource or completion time with the authority; the save status distinguishes pending choices from acknowledged ones.

Verification includes simulated slow writes while walking/queuing/cancelling in Chromium, lost-response retries with stable IDs, no compounded debit, conflict rebasing, economic rejection rollback, ownership denial, malformed outbox recovery, deferred write coalescing/lifecycle flush and isolated server-route tests proving the direct-input RPC policy without bypassing ownership checks. These are local/mocked checks; they do not claim a fresh live Neon/wallet deployment test.

## Confirmed doorway transitions

Movement remains predicted, but scene boundaries (`leaveHome`, `enterHome`, `enterVenue`, `travel`) are committed after the authoritative response. Previously an optimistic street/venue scene could render before a delayed movement acknowledgment; rebasing then found the server's longer journey still active and briefly restored the prior scene.

The projected queue stops before its first doorway command. That command waits for the acknowledged physical journey/action to finish on the real clock, then crosses once when the response arrives. A small destination-opening status describes this interval; routine save status never locks play. Duplicate navigation and new physical activity are suppressed only during the scene handoff. Confirmed revisions cannot move backward. Rejected entry retains the original scene and shows the error.

The delayed-response browser test records the entire heading history while approaching, leaving home and entering a café: exactly home → street → café, including multiple 1.2-second movement responses. Unit checks cover the wait, rejection and no premature scene projection. These remain mocked transport checks rather than production latency claims.


The wallet-only entry pass removes the browser-only controller and snapshot writer from the playable app. The deferred session outbox remains for authenticated command recovery. HTTP 401/403 now latches authorization loss, rejects further projected commands, clears the old outbox and returns to sign-in; retry opens a fresh verified server household. Legacy browser snapshot parsing is retained for existing migration/unit coverage, but no entry path loads anonymous local progress.
