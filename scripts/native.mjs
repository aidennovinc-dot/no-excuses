/* No Excuses — the native tree (v24 A.3, build 43).   npm run native [-- <out dir>]
 * Testing is on the web build's menu from the first load now, so the App Store build needs a flag nobody has to remember to flip. This
 * writes a copy of the web tree for the native shell (Capacitor, stage 5) with config/build.js TARGET = 'native' — which zeroes
 * BUILD_FLAGS.dev, so the store refuses every dev flag (S5) — and with every [data-dev] element cut out of its index.html, so the
 * unlock-all switches are not in the bundle at all rather than merely hidden. Fails loudly if the flag line is not there exactly once, if
 * no dev element is found, or if one survives. Default output: site/dist/native (git-ignored). The web tree is never touched. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || path.join(root, 'dist', 'native'));
// what the app IS: the shell, its modules, styles, fonts and icons — nothing that drives it (the gate, the scripts, docs, node_modules)
const TREE = ['index.html', 'boot.js', 'core.js', 'audio.js', 'progress.js', 'manifest.webmanifest', 'robots.txt', 'version.json', 'LICENSE',
  'icon-180.png', 'icon-192.png', 'icon-512.png', 'config', 'core', 'fonts', 'games', 'progress', 'run', 'styles', 'ui'];
const fail = m => { console.error('native: ' + m); process.exit(1); };
if (out === root || root.startsWith(out + path.sep)) fail(`refusing to write over the web tree (${out})`);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
for (const p of TREE) { const from = path.join(root, p); if (!fs.existsSync(from)) fail(`missing ${p}`); fs.cpSync(from, path.join(out, p), { recursive: true }); }

// the flag — exactly one line to rewrite, or stop
const cfg = path.join(out, 'config', 'build.js'), src = fs.readFileSync(cfg, 'utf8'), FLAG = /export const TARGET = '[a-z]+';/;
if ((src.match(new RegExp(FLAG.source, 'g')) || []).length !== 1) fail("config/build.js: expected exactly one `export const TARGET = '...';`");
fs.writeFileSync(cfg, src.replace(FLAG, () => "export const TARGET = 'native';"));

// the markup — every element carrying data-dev, whole: the Testing screen, then the menu row and anything else that ever carries it
const htmlPath = path.join(out, 'index.html'); let html = fs.readFileSync(htmlPath, 'utf8'), cut = 0;
html = html.replace(/<section\b[^>]*\sdata-dev[\s>][\s\S]*?<\/section>\s*/g, () => { cut++; return ''; });
html = html.replace(/<(button|div|a)\b[^>]*\sdata-dev[\s>][\s\S]*?<\/\1>\s*/g, () => { cut++; return ''; });
if (!cut) fail('index.html: no [data-dev] element found to strip');
if (/\sdata-dev[\s>=]/.test(html) || /data-act="dev-/.test(html) || /id="s-testing"/.test(html)) fail('index.html: a dev element survived the strip');
fs.writeFileSync(htmlPath, html);
console.log(`native tree -> ${out}\n  config/build.js TARGET = 'native' (BUILD_FLAGS.dev false)\n  ${cut} [data-dev] element(s) stripped from index.html`);
