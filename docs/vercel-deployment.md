# Vercel deployment

Production app: https://chainworld-chog.vercel.app. Project `chainworld-chog`, Node 22 API runtime.

The production app uses Vite static output plus standalone bundled functions for `/api/session`, `/api/game` and `/api/neighborhood`. A source deployment initially omitted runtime imports; the prebuilt output bundles each API with esbuild and includes `public/faucet-manifest.json` within each function. Client routes fall back to `index.html`.

Configure the project's public `VITE_*` settings and server-side NFT/registry/Neon settings from `.env.example`. Keep `DATABASE_URL` sensitive and server-side. `APP_ORIGIN` must match `https://chainworld-chog.vercel.app`. Never upload deployment signing keys, development authentication bypasses or local proxy settings.

Prepare and deploy using authenticated Vercel CLI access:

```sh
npm ci
npm run deploy:prepare
vercel deploy --prebuilt --prod
```

`deploy:prepare` builds the frontend and writes Vercel Build Output API files beneath ignored `.vercel/output`. `.vercelignore` excludes local tooling, signing/environment files, task notes and contract/data/test sources from source uploads; the public faucet manifest is included explicitly in the bundled API output.

Verified on production: homepage 200; unauthenticated session 401; wallet challenge 200 with the allowed production origin; signed wallet session, existing NFT ownership, verified source manifest/tier, persisted game state and neighborhood reads. The recording uses the deployed wallet-free preview. Full multi-wallet visual visiting and NFT-transfer validation remains open.
