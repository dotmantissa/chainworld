# Anime game assets

Generated with the built-in imagegen tool from the prompts in `prompts.json`. The supplied illustrated bedroom was a style reference only; buildings, furnishings, layouts and human identities are original generated game illustrations. These assets are presentation, not NFT provenance or rarity evidence.

`assets/` contains transparent WebP cutouts. `src/world/art-manifest.json` records their URLs/dimensions and grouping. Human frames are front, right walk, back, left walk, sitting and horizontal sleep, twice per female/male/neutral sheet. NFT identity and traits choose a base identity and garment palette; selected sex/gender chooses the family. Palette derivatives change colored garments while preserving warm skin/hair. City derivatives recolor roof accents while preserving masonry and foliage.

The source sheets had inconsistent cell alignment, especially the male sheet. Subjects were extracted by connected alpha components rather than assuming equal cells, with isolated grid artifacts removed and antialiased borders retained. Furniture remains independent of floors and walls; saved geometry controls placement and collision. The original PNG generation artifacts remain in the imagegen artifact store; only optimized runtime cutouts are shipped here.

Outdoor items: bench pair, ornamental tree pair, flower-bed pair, streetlamp pair. Architectural items: window pair, framed-landscape pair, wall-shelf pair, clock pair. The current renderer loads the window and park props; other architectural cutouts are retained for further interactive decoration.

Original Chog NFT portraits and existing reference/token1 pet sprites live separately in `public/art/chog*`. Human art is not original Chog collection artwork. Full trait-specific pet animation coverage remains incomplete.
