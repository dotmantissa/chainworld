# Original Chog source snapshot

The original collection is `0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763` on Monad mainnet (chain 143). Acquisition used `https://rpc.monad.xyz` at fixed block **115722652**. `totalSupply` was 1,969. Tokens 0 and 1,970 reverted; every `ownerOf` and `tokenURI` for IDs 1–1,969 was read at the snapshot. This covers the entire live supply without assuming ERC721Enumerable support.

Metadata filenames are shuffled. Original token 1 maps to `ipfs://bafybeid4ybujnscdipkno7ps5utqelp5ry5ryreqhay3zhgk3a6x4jruqu/1462.json`. Its image is `ipfs://bafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e/1462.webp`. New spinoff token 0 maps to original token 1; a filename is never treated as an original token ID.

JSON was retrieved from the contract's IPFS references via Filebase and Pinata. An interrupted directory tar recovered additional complete records; the importer accepts only expected exact member names and never extracts archive paths. Every downloaded record was validated and fingerprinted using SHA-256 of `JSON.stringify(metadata)`. All original image URIs and trait strings are retained. The source is metadata and artwork references for all 1,969 NFTs; the large original image collection is fetched on demand rather than duplicated in Git.

| Artifact | Contents |
| --- | --- |
| `data/chog/source-manifest.json` | Complete metadata, original token IDs, exact contract URI mappings and hashes |
| `data/chog/trait-catalogue.json` | Every observed value and count in all 13 trait categories |
| `data/chog/audit.json` | Reproduced roots, source hash, rarity bands and snapshot |
| `public/faucet-manifest.json` | Full source plus deterministic spinoff assignments and claim proofs |
| `public/land-rarity-manifest.json` | Original ID / rank proofs for onchain starter estates |

Faucet root: `0xf7b07d0a833c9bf8c0de946d1bfdcadb0169506e9d87e077cf719ca5566be811`.

Land rarity root: `0xa1cc981a704b1da1b4a8ec4d4d1699c0b8acb08345622b1c242aec8edb827ea6`.

The game computes `trait-frequency-v1` over the complete corpus, including explicit category absence and competition ranks for tied scores. Source traits are not rewritten to match this score. The resulting starting bands are 50 Genesis, 150 Legendary, 300 Rare, 400 Uncommon, 500 Common and 569 Floor. This is the game's reproducible rarity model, not a claim to reproduce a marketplace's proprietary rank.

## Reproduce

```bash
npm run metadata:fetch
npm run metadata:audit
# Independently verify an external manifest against its snapshot and fetched IPFS data:
npm run metadata:validate -- data/chog/source-manifest.json
```

Acquisition is read-only. Atomic per-token/checkpoint files are ignored and resumable. Successful records survive individual gateway failures; rerunning fetch retries only missing records. The local audit recomputes every metadata hash, rarity score, faucet proof and land proof. No private key or database credential is part of these files.

## Deployment boundary

The unofficial Monad Testnet spinoff is deployed at `0x9fcC2FB7487A3530809f45DFD9bb419EA2E0aF17`, with V2 registry `0xA4aB8dbc0b3213C2d80af677bD7B4b5f259BdD0f`. Its immutable root matches the source above. Deployment transactions and source identity are recorded in [faucet-monad-testnet.json](../data/deployments/faucet-monad-testnet.json); run `npm run faucet:check` to verify the deployed code/root/supply/original identity and registry linkage. The historical V1 registry remains unchanged. The separate land contract is not deployed.

`ChainWorldLand.sol` additionally requires the real ERC20 currency address, an EIP712 gas-price quote signer, treasury, source-mapped collection address and the land rarity root above. Its separate deployment script is `contracts/script/DeployLand.s.sol`. The current game's parcels and offers remain Neon-authoritative until contract deployment, event indexing and economic settlement are connected. The internal gCHOG ledger is not an already-deployed ERC20.
