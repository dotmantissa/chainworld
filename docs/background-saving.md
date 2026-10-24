# Background saving and responsive play

The previous shared controller marked every request as globally pending, including its five-second clock writes. Scenes and controls treated that flag as an input lock and the resident displayed “Just a moment…” while waiting for network/database work. Browser-only play also serialized its entire snapshot into localStorage inside every update handler.

The controller now separates presentation, command synchronization and storage:

- The pure game reducer projects queued choices immediately. Movement, object selection, cancellation and the six-action queue remain usable during a save. Projection is provisional; it never becomes a trusted server balance or uploaded game snapshot.
- One FIFO sends commands with the latest acknowledged revision. Only unsent consecutive walk destinations coalesce. Once a request has been sent, its contents and idempotency key stay stable through ambiguous-response retries.
- A revision conflict refreshes the canonical snapshot and rebases queued commands, with a bounded retry. Rejected actions roll back to the confirmed snapshot. Ownership/session rejection clears pending choices. Temporary failures retain the outbox and retry with backoff; a small save status and retry button stay below the world.
- The per-wallet/NFT outbox contains intents, never credentials or a client-authoritative balance. Session storage permits replay after reload using the same request IDs. If session storage is unavailable, in-memory retries still work while the page remains open.
- Browser-only snapshots and the small outbox journal coalesce into deferred idle work. Page hide, hidden visibility and controller cleanup flush the latest pending value. localStorage itself remains synchronous; it is moved outside the immediate input/render path.
- Movement and validator clicks use the server's cached gas observations (up to five minutes, then the nominal baseline). Economic commands and periodic synchronization still refresh observations. Published registry hydration runs on entry/read, rather than on every write. Both live NFT ownership checks, server time, revision locking, atomic commits and server-calculated charges remain in place.
- Neighborhood polling depends on actual context changes, rather than restarting with every projected clock/movement update.

The in-world bubble is reserved for physical activity. Background synchronization never adds a waiting message above the resident. Shared updates may reconcile a provisional route, price, resource or completion time with the authority; the save status distinguishes pending choices from acknowledged ones.

Verification includes simulated slow writes while walking/queuing/cancelling in Chromium, lost-response retries with stable IDs, no compounded debit, conflict rebasing, economic rejection rollback, ownership denial, malformed outbox recovery, deferred write coalescing/lifecycle flush and isolated server-route tests proving the direct-input RPC policy without bypassing ownership checks. These are local/mocked checks; they do not claim a fresh live Neon/wallet deployment test.
