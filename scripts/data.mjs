/* No Excuses — THE DATA-ONLY FAST LANE (build 62, 61.28). A tool, not the app: nothing the app loads imports this file.

     npm run data              validate, run only the gate sections that read the changed data files, bump, commit, push, log
     npm run data -- --dry     the same checks, and stop before the bump: nothing is written, committed or pushed

   WHY. Aiden's reviews are mostly numbers and words now — author times, bar numbers, achievement names and lines. A full build for one
   of those cost hours of ceremony. A diff that touches ONLY the data files below goes through here in minutes; anything else is a
   normal build (site/CLAUDE.md → Data-only fast lane), and this says so in one line and stops.

   WHAT "SAFE" MEANS HERE. The gate checks read bar values and achievement names from config/, never a copy of them (build 62), so a data
   edit never needs a test edit. The exceptions are the locked decisions that pin a value on purpose (L1's title words, L2's lengths, L9's
   "Mode"): those checks stay, and a data edit that breaks one fails here like anywhere else. */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T0 = Date.now(), DRY = process.argv.includes('--dry');
// THE DATA FILES — the whole lane is this list. Adding a file here is a rule change (site/CLAUDE.md), not a convenience.
export const DATA = ['config/key-bars.js', 'config/achievements.js', 'config/copy.js', 'config/verdicts.js'];
const sh = c => execSync(c, { cwd: ROOT, encoding: 'utf8' }).trim();
const stop = why => { console.log('DATA BUILD REFUSED — ' + why); process.exit(1); };
const secs = ms => (ms / 1000).toFixed(0) + 's';

/* 1. THE DIFF. Everything not yet on origin/main, committed or not. Any file outside DATA and it is a normal build. */
let base = 'HEAD'; try { sh('git fetch -q origin main'); base = sh('git merge-base HEAD origin/main'); } catch (e) {}
const changed = [...new Set(sh(`git diff --name-only ${base}`).split('\n').concat(sh('git ls-files --others --exclude-standard').split('\n')).filter(Boolean))];
if (!changed.length) stop('nothing has changed since origin/main');
const other = changed.filter(f => !DATA.includes(f));
if (other.length) stop(`${other[0]}${other.length > 1 ? ` and ${other.length - 1} more` : ''} is outside the data files — this is a normal build`);

/* 2. VALIDATE. Each file imports clean; the bars are complete and in order; every achievement that unlocks something has a name. */
const load = async f => { try { return await import(pathToFileURL(path.join(ROOT, f)).href + '?t=' + T0); } catch (e) { stop(`${f} does not load: ${String(e.message).split('\n')[0]}`); } };
const mods = {}; for (const f of DATA) mods[f] = await load(f);
{ const B = mods['config/key-bars.js'].KEY_BARS; if (!B || typeof B !== 'object') stop('config/key-bars.js has no KEY_BARS');
  for (const [k, r] of Object.entries(B)) {
    if (!r || typeof r.id !== 'string' || !['higher', 'lower'].includes(r.dir) || typeof r.unit !== 'string') stop(`bar ${k} is missing its id, dir or unit`);
    const tiers = [['bar', r.bar], ['pro', r.pro], ['author', r.author]].filter(([, v]) => v !== null && v !== undefined);
    for (const [t, v] of tiers) if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) stop(`bar ${k} ${t} is not a number (${v})`);
    for (let i = 1; i < tiers.length; i++) { const [pt, pv] = tiers[i - 1], [t, v] = tiers[i];
      if (r.dir === 'higher' ? !(v > pv) : !(v < pv)) stop(`bar ${k}: ${t} ${v} is not harder than ${pt} ${pv} (${r.dir} is better)`); } } }
{ const A = mods['config/achievements.js']; const rows = (A.ACH || []).concat(Object.values(A.KEY_ROSTER || {}).flatMap(r => Object.values(r || {})));
  const bad = rows.find(a => a && a.unlocks && !(typeof a.name === 'string' && a.name.trim()));
  if (bad) stop(`achievement ${bad.id || '?'} unlocks ${bad.unlocks.join(' ')} and has no name`);
  const names = rows.filter(a => a && a.name).map(a => a.name.trim().toLowerCase()), dup = names.find((n, i) => names.indexOf(n) !== i);
  if (dup) stop(`two achievements are both called "${dup}"`); }
/* the review copy of the bars (../_review/key-bars.json) is written by the placeholders tool, and the gate checks the two agree — so a hand edit
   of key-bars.js brings it up to date here. The tool must find nothing else to do: a bar edit that leaves it work is refused. */
if (changed.includes('config/key-bars.js') && fs.existsSync(path.join(ROOT, '..', '_review'))) { const f = path.join(ROOT, 'config', 'key-bars.js'), before = fs.readFileSync(f, 'utf8');
  try { execSync('node scripts/placeholders.mjs', { cwd: ROOT, stdio: 'ignore' }); } catch (e) { stop('npm run placeholders failed on the new bars'); }
  if (fs.readFileSync(f, 'utf8') !== before) { fs.writeFileSync(f, before); stop('npm run placeholders wanted to change config/key-bars.js — set a number with npm run placeholders -- --set'); } }
console.log(`validated ${DATA.filter(f => changed.includes(f)).join(', ')} · ${changed.length} file${changed.length > 1 ? 's' : ''} changed`);

/* 3. ONLY THE GATE SECTIONS THAT READ THOSE FILES, plus the static checks. A section reads a file when its own source names it. */
const { SECTIONS } = await import(pathToFileURL(path.join(ROOT, '_smoke', 'sections', 'index.mjs')).href);
const short = n => n.split(/ - | — | \(|,/)[0].trim();
const want = new Set(['static checks']);
for (const s of SECTIONS) { const src = fs.readFileSync(path.join(ROOT, '_smoke', 'sections', s.file), 'utf8');
  if (changed.some(f => src.includes(path.basename(f)))) want.add(short(s.names[0])); }
const tg = Date.now();
const gate = spawnSync(process.execPath, ['_smoke/smoke.mjs', '--only', [...want].join(','), '--bail'], { cwd: ROOT, stdio: 'inherit' });
if (gate.status !== 0) stop(`the gate failed in the ${want.size} sections that read the data — nothing bumped, nothing pushed`);
const gateMs = Date.now() - tg;
if (DRY) { console.log(`DRY RUN — ${want.size} sections passed in ${secs(gateMs)}; nothing bumped, committed or pushed (${secs(Date.now() - T0)})`); process.exit(0); }

/* 4. BUMP, COMMIT, PUSH — then three lines at the foot of the newest FEEDBACK file */
const { BUILD } = await import(pathToFileURL(path.join(ROOT, 'config', 'build.js')).href);
const next = BUILD + 1;
execSync(`node scripts/bump.mjs ${next}`, { cwd: ROOT, stdio: 'inherit' });
sh('git add -A'); execSync(`git commit -q -m "data build ${next} - ${changed.map(f => path.basename(f)).join(', ')}"`, { cwd: ROOT, stdio: 'inherit' });
const commit = sh('git rev-parse --short HEAD'); execSync('git push -q origin HEAD:main', { cwd: ROOT, stdio: 'inherit' });
const RV = path.join(ROOT, '..', '_review'); let fb = null;
try { fb = fs.readdirSync(RV).filter(f => /^FEEDBACK-v\d+\.md$/.test(f)).sort((a, b) => +b.match(/\d+/)[0] - +a.match(/\d+/)[0])[0]; } catch (e) {}
const total = Date.now() - T0, stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
const lines = [``, `**DATA BUILD v0.${next}** (${stamp} UTC) — ${changed.join(', ')}: validated (bars in order, customisation names present).`,
  `Gate: ${want.size} sections that read those files, passed in ${secs(gateMs)}. Pushed \`${commit}\`.`, `Paste to pushed: ${secs(total)}.`];
if (fb) fs.appendFileSync(path.join(RV, fb), lines.join('\n') + '\n');
console.log(lines.slice(1).join('\n') + (fb ? `\n→ appended to _review/${fb}` : ''));
