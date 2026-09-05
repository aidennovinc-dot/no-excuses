# No Excuses — web prototype

Small games of pure skill for the phone. This is the HTML prototype served from GitHub Pages so one fixed URL always carries the latest build; the native iOS build comes later, once feel is proven.

- `index.html` — the shell: markup, CSS, and one `<script type="module" src="./boot.js">`.
- `boot.js` — the entry point. `core.js`, `games/registry.js`, `progress.js`, `audio.js`, `menu.js`,
  `engine-core.js`, `app.js` and one file per game under `games/`. No bundler; Pages serves the modules directly.
- The build number lives in three places in `index.html` and in `version.json` — bump all four together. See `CLAUDE.md`.
- `version.json` — the page polls this and offers a reload when a newer build is up.
- `manifest.webmanifest` + icons — installs to the iOS home screen (Share → Add to Home Screen).

Source workspace: `F:\Claude Directory\03_Personal\quick-tap\` (spec, feature list, dated prototypes).
