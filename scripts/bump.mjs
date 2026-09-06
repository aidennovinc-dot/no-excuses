/* No Excuses — bump the build (A6).   npm run bump -- 16
 * With a number: rewrites BUILD in config/build.js. Then, always: writes the three places in index.html (the hint line
 * under the title, <div id="build">, the update-check constant) and version.json from config/build.js. Fails loudly if
 * any of the three is not found exactly once — a mismatch between the constant and version.json pins the green
 * "new build" bar on every phone forever. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfgPath = path.join(root, 'config', 'build.js');
const arg = process.argv[2];
if (arg !== undefined) {
  if (!/^\d+$/.test(arg)) { console.error('usage: npm run bump -- <build number>'); process.exit(2); }
  const src = fs.readFileSync(cfgPath, 'utf8');
  const out = src.replace(/export const BUILD = \d+;/, `export const BUILD = ${arg};`);
  if (out === src && !src.includes(`export const BUILD = ${arg};`)) { console.error('config/build.js: no `export const BUILD = N;` line to rewrite'); process.exit(2); }
  fs.writeFileSync(cfgPath, out);
}
const { BUILD, LABEL } = await import(pathToFileURL(cfgPath).href + '?t=' + Date.now());
const now = new Date();
const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'june', 'july', 'aug', 'sept', 'oct', 'nov', 'dec'];
const date = `${now.getDate()} ${MON[now.getMonth()]} ${now.getFullYear()}`;
const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

// exactly one replacement per place, or stop
function once(src, re, to, what) {
  const m = src.match(new RegExp(re.source, re.flags + 'g'));
  if (!m || m.length !== 1) { console.error(`index.html: expected exactly one ${what}, found ${m ? m.length : 0}`); process.exit(1); }
  return src.replace(re, to);
}
const htmlPath = path.join(root, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
html = once(html, /<div class="hint">build \d+ · [^<]*<\/div>/, `<div class="hint">build ${BUILD} · ${LABEL} · ${date}</div>`, 'hint line under the title');
html = once(html, /<div id="build">build \d+<\/div>/, `<div id="build">build ${BUILD}</div>`, '<div id="build">');
html = once(html, /const BUILD="\d+";/, `const BUILD="${BUILD}";`, 'update-check constant');
fs.writeFileSync(htmlPath, html);
fs.writeFileSync(path.join(root, 'version.json'), `{"build": "${BUILD}", "date": "${iso}"}`);
console.log(`build ${BUILD} · ${LABEL} · ${date} → config/build.js, index.html ×3, version.json`);
