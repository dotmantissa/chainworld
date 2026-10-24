# Resident character art

Residents now use authored continuous body, face and hair topology, replacing the earlier assembled primitive mesh. Male/female presentation families and four hairstyles share the existing 26-bone skeleton. NFT identity seeds skin, hair, outfit colors, hairstyle and subtle facial width; editable presentation selects a body family. Humans remain separate from the original Chog pet and its authentic NFT portrait.

The room, street, NPCs, online visitors and household portrait use the same compiled meshes. Vertex weights animate the torso, limbs, fingers and jaw through every existing action. Shoes and casual garment surfaces are compiled into the body. GPU and no-WebGL2 CPU render paths use the same geometry, preserving collision, object positioning, camera behavior, action blending, reduced motion and shower privacy. No separate painted standing avatar substitutes for the animated resident.

These are stylized isometric characters. The finished mesh pass does not add cloth simulation, removable clothing, facial dialogue capture or a freely rotating 3D world camera.

## Source and license

The base bodies and hair are adapted from **Quaternius, Universal Base Characters, Standard FREE edition**, distributed under **CC0 1.0 Universal**. The original license text (line endings/trailing whitespace normalized) is preserved at [`public/art/characters/CC0-LICENSE.txt`](../public/art/characters/CC0-LICENSE.txt).

- [Author's pack page](https://quaternius.com/packs/universalbasecharacters.html)
- [Author's official download page](https://quaternius.itch.io/universal-base-characters)
- [CC0 dedication](https://creativecommons.org/publicdomain/zero/1.0/)

The official free archive acquired on 24 October 2026 has SHA-256 `fdbf1804c90dfc1ea03e992bff7da2dfd1a79318e13270a660180f9308455f40`. The paid Source edition was not used. No Sims assets or screenshot pixels are included.

## Compilation and integrity

`scripts/compile-character-art.ts` loads the source glTF bodies and four hairstyles with Three's GLTFLoader, samples source texture color at vertex UVs, retargets weighted bind geometry to the game's skeleton, adjusts the casual silhouette and adds rounded shoes. Female-source hairstyles use their own head pivot. All manipulation is mechanical mesh/texture processing; the source archive stays outside version control.

To rebuild, extract `Superhero_Male_FullBody.gltf`, `Superhero_Female_FullBody.gltf` and their buffers/textures from `Base Characters/Godot - UE` into `.local-tools/characters/bodies`. Extract `Hair_SimpleParted`, `Hair_Long`, `Hair_Buns`, `Hair_Buzzed` and their buffers/textures into `.local-tools/characters/hair`. Put the pack's license at `.local-tools/characters/LICENSE.txt`. Run `npx tsx scripts/compile-character-art.ts` with Chromium's system libraries available. The compiler writes the six binaries and manifest; the original author's source is required only for rebuilding.

The checked-in output is about 1.06 MB across six local files. The compact format records signed quantized positions/normals, color/material tags, four bone indices/weights and indexed triangles. `src/world/skeleton/character-manifest.json` records exact sizes, vertex/triangle counts and SHA-256 hashes. `npm run households:audit` verifies all six hashes alongside source-household invariants. The production smoke also checks the real built renderer, bathing and public interiors.

The landing hero at `public/art/entry/home-v1.webp` is a capture of the actual game using these assets, resized/encoded to WebP. It is not a reference-game screenshot or an unimplemented concept rendering.
