# No Excuses — web prototype

Small games of pure skill for the phone. This is the HTML prototype served from GitHub Pages so one fixed URL always carries the latest build; the native iOS build comes later, once feel is proven.

- `index.html` — the whole game, single file. Build number top of the file and in `version.json`; bump both together.
- `version.json` — the page polls this and offers a reload when a newer build is up.
- `manifest.webmanifest` + icons — installs to the iOS home screen (Share → Add to Home Screen).

Source workspace: `F:\Claude Directory\03_Personal\quick-tap\` (spec, feature list, dated prototypes).
