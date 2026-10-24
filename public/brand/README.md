# ChainWorld identity

The original mark is a home on an isometric world tile: everyday life and a place the player can build. The doorway remains open into the tile. The plum house and lilac foundation match the game's interface. The mark is authored directly as vector paths, with no third-party artwork or font embedded in it.

`chainworld-mark.svg` is the canonical transparent symbol. The frontend's shared `BrandLogo` component pairs it with the existing lowercase wordmark; narrow game headers show the symbol alone. The loading screen uses the same mark and respects reduced-motion preferences.

`chainworld-icon.svg` adds a cream rounded background for browser tabs. `public/favicon.ico` contains 16, 24, 32, 48, 64, 128 and 256 pixel versions. The PNG variants provide the Apple touch icon (180), app icons (192 and 512), and a separate full-background maskable icon (512). The web manifest supplies the name and icons for a browser-installed ChainWorld app, including its taskbar/dock appearance. The browser's own grouped application icon remains controlled by the operating system.

Regenerate derived assets after editing the canonical mark:

```sh
npx playwright install chromium
node scripts/build-brand-icons.mjs
```

The script uses the project's existing Playwright dependency and writes only the listed logo/icon assets. No service worker or gameplay caching is introduced.
