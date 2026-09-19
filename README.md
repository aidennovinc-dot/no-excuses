# No Excuses — web prototype

Small games of pure skill for the phone. This is the HTML prototype served from GitHub Pages so one fixed URL always carries the latest build; the native iOS build comes later, once feel is proven.

- `index.html` — the shell: markup, the S4 Content-Security-Policy meta, one `<link>` to `styles/app.css` and one `<script type="module" src="./boot.js">`. No inline script.
- `boot.js` — the entry point. Everything else has registered itself by the time it runs.
- The tree: `core.js` (the shared leaf), `audio.js`, `progress.js`, `config/` (data only), `core/`, `progress/`, `run/`, `ui/` + `ui/screens/`, `games/` (one folder per game plus `_shared/` and `registry.js`), `styles/`, `fonts/`, `video/`, `_smoke/` (the gate), `scripts/`, `docs/`. No bundler; Pages serves the modules directly. The full map with what each file is for: `ARCHITECTURE.md`.
- The build number lives in ONE place — `config/build.js`. `npm run bump -- N` writes it into the two places in `index.html` a person reads and into `version.json`; never hand-edit any of them. See `CLAUDE.md`.
- `version.json` — `core/platform.js` polls this on `https:` outside the native shell and offers a reload when a newer build is up.
- `manifest.webmanifest` + icons — installs to the iOS home screen (Share → Add to Home Screen).

Commands: `npm test` (the gate, ~40 minutes, run once before every push), `npm run bump -- N`, `npm run native` (the Capacitor tree), `npm run placeholders` (the key-bar generator), `npm run review` (the catalogue; needs `../_review/`).

Source workspace: `F:\Claude Directory\03_Personal\quick-tap\` (spec, feature list, dated prototypes).
