# Vercel deployment

Production app: https://chainworld-chog.vercel.app. Project `chainworld-chog`, Node 22 API runtime.

The production app uses Vite static output plus standalone bundled functions for `/api/session`, `/api/game` and `/api/neighborhood`. A source deployment initially omitted runtime imports; the prebuilt output bundles each API with esbuild and includes `public/faucet-manifest.json` within each function. Client routes fall back to `index.html`.

Configure the project's public `VITE_*` settings and server-side NFT/registry/Neon settings from `.env.example`. Keep `DATABASE_URL` sensitive and server-side. `APP_ORIGIN` must match `https://chainworld-chog.vercel.app`. Never upload deployment signing keys, development authentication bypasses or local proxy settings.

Prepare and deploy using authenticated Vercel CLI access:

```sh
npm ci
vercel pull --yes --environment=production
npm run typecheck
node --env-file=.vercel/.env.production.local node_modules/vite/bin/vite.js build
node scripts/build-vercel.mjs
vercel deploy --prebuilt --prod --yes
```

`scripts/build-vercel.mjs` clears stale build output and writes fresh Vercel Build Output API files beneath ignored `.vercel/output`. Use Node 22.12 or newer; production public settings from the pulled environment take precedence over local settings. `.vercelignore` excludes local tooling, signing/environment files, task notes and contract/data/test sources from source uploads; the public faucet manifest is included explicitly in the bundled API output.

Verified on production: homepage 200; unauthenticated session 401; wallet challenge 200 with the allowed production origin; signed wallet session, existing NFT ownership, verified source manifest/tier, persisted game state and neighborhood reads. The current app requires wallet connection, Test Chog ownership and a signed session; the old wallet-free recording describes a superseded build. Full multi-wallet visual visiting and NFT-transfer validation remains open.


For production prebuilt publication, pull the linked production settings with `vercel pull --yes --environment=production`, build using its public `VITE_*` values, then run `node scripts/build-vercel.mjs`. Sensitive environment placeholders returned by pull must never be sent as deployment overrides; the functions use existing Vercel runtime secrets. The obsolete `VITE_SHARED_WORLD` setting no longer changes access: every build requires the authenticated service. Prebuilt artifacts include the complete character assets and bundled server economy code.
