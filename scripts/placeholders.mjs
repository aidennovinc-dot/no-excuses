/* No Excuses — Pro and Author PLACEHOLDER bars (build 38, register #426). A tool, not the app: nothing the app loads
   imports this file.

     npm run placeholders                              fill every empty Pro / Author cell, refresh untouched placeholders
     npm run placeholders -- --dry                     print what it would write, write nothing
     npm run placeholders -- --check                   write nothing; exit 1 if either file is not what this would write
     npm run placeholders -- --set qt-two-5 pro 15     a REAL number: set that cell and drop that cell's marker (#371)
     npm run placeholders -- --clear                   take every untouched placeholder back out (both tiers shells again)

   A.2, AMENDED 2026-09-14 (#426 — Aiden asked for it directly, and that is what amends it). A.2 said no build may derive a
   bar and Aiden sets every one by hand. A build MAY now generate a PLACEHOLDER, if it is marked as one and is replaceable a
   row at a time. It may still NEVER set a real bar or silently correct one. Here that is four rules, and the gate holds all four:
     1. `bar` — key 1 — is read, never written: not rounded, not re-derived, not "corrected".
     2. A Pro or Author cell is written only when it is EMPTY (null), or when it still carries this tool's marker AND still
        holds exactly the value that marker says was written. Anything else is a person's number and is left byte for byte,
        marker and all. From the moment someone changes a placeholder it is manual data: no later run regenerates it, rounds
        it, corrects it or re-derives it from `bar`.
     3. The marker is `placeholder:{ pro:{ v, conf:'low', basis }, author:{ … } }` on the row. `v` is what was written, so a
        number changed in place stops matching and belongs to whoever changed it. progress/key.js isPlaceholder() reads the
        marker by the same test, so the tool and the app can never disagree about which numbers are generated.
     4. `--set` is the only way this writes a number that is not a placeholder, and it writes exactly the number it is given.
   config/ stays literal data (A2): this edits the TEXT of config/key-bars.js — every comment, the layout and every byte it
   has no business with come out as they went in — and copies the result into ../_review/key-bars.json.

   THE SCHEME (#426): a floor (dir 'higher') × 1.15 for Pro and × 1.30 for Author; a ceiling (dir 'lower') × 0.80 and × 0.65.
   Rounded to the row's own precision — whole numbers for hits, rounds, targets and miscounts, one decimal for % and seconds,
   the nearest 10 for milliseconds. THEN THE FLOORS, because a flat multiplier walks a ceiling past what a person can do.
   Nothing reaction-timed asks for faster than 180ms of genuine reaction on a touchscreen; and a Timing or Estimate Set is
   never asked to beat Aiden's own Amazing! ceiling for ONE round (ROUND_AT[0], config/verdicts.js) held every round — an
   error that cannot usefully approach zero. A clamped cell says so in its basis. Every tier ends strictly harder than the one
   below it, and a row that cannot be both harder and at or above its floor is refused out loud rather than written. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BARS_JS = path.join(ROOT, 'config', 'key-bars.js');
const REVIEW_JSON = path.join(ROOT, '..', '_review', 'key-bars.json');

export const MULT = { higher: { pro: 1.15, author: 1.30 }, lower: { pro: 0.80, author: 0.65 } };
export const TIERS = ['pro', 'author'];
const TIER_NAME = { pro: 'Pro', author: 'Author' };
const PAD = ' '.repeat(18);   // lines the Author marker up under the Pro one: `    placeholder:{ `
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);

/* ---------- the numbers ---------- */
// the precision a row already uses, read off its own unit
export function stepOf(unit) { const u = String(unit || '');
  if (/^ms\b/.test(u)) return 10;
  if (u.includes('%') || /^s\b/.test(u)) return 0.1;
  return 1; }
export function roundTo(x, step) { const n = Math.round(+(x / step).toFixed(6));
  return step === 0.1 ? +(n / 10).toFixed(1) : n * step; }
// is a strictly harder than b, in the row's own direction (C.7 — read from the row, never assumed)
const harder = (dir, a, b) => dir === 'lower' ? a < b : a > b;
// the floor a CEILING may not be walked past. A floor row (more is better) has no physical limit for a multiplier to cross
export function floorOf(key, row, ROUND_AT) { if (row.dir !== 'lower') return null;
  const [g, d, s] = key.split(':'), gd = `${g}:${d}`, rounds = +s, r = (ROUND_AT || {})[gd];
  if (gd === 'reaction:flash') return { at: 180, why: 'no faster than 180ms of genuine reaction on a touchscreen' };
  if (gd === 'reaction:nogo') return { at: 0, why: 'no faster than 180ms of genuine reaction; this Set already reads ms over the 180ms gate' };
  if (!r || !(rounds > 0)) return null;
  if (g === 'timing') return { at: roundTo(r[0] * rounds, stepOf(row.unit)), why: `a Set never beats Aiden’s own Amazing! round (${r[0]}) held for all ${rounds} rounds` };
  if (g === 'hold') return { at: r[0], why: `an average never beats Aiden’s own Amazing! round (${r[0]}% off) held every round` };
  return null; }

// the two placeholders a row would get. `real` carries a person's number, which a generated tier above it must still beat
export function derive(key, row, ROUND_AT, real = {}) {
  if (!MULT[row.dir]) throw new Error(`${key}: dir must be 'higher' or 'lower', not ${JSON.stringify(row.dir)}`);
  if (typeof row.bar !== 'number' || !Number.isFinite(row.bar)) throw new Error(`${key}: key 1 has no number to derive from`);
  const step = stepOf(row.unit), fl = floorOf(key, row, ROUND_AT), out = {};
  let below = row.bar, belowName = 'key 1';
  for (const t of TIERS) { const m = MULT[row.dir][t], raw = row.bar * m, rounded = roundTo(raw, step); let v = rounded; const notes = [];
    if (fl && v < fl.at) { v = fl.at; notes.push(`CLAMPED to ${v}: ${fl.why}`); }
    if (!harder(row.dir, v, below)) { const n = roundTo(row.dir === 'lower' ? below - step : below + step, step);
      if (fl && n < fl.at) throw new Error(`${key} · ${t}: cannot be harder than ${belowName} (${below}) and stay at or above its floor ${fl.at} — ${fl.why}`);
      v = n; notes.push(`stepped to ${v} to stay harder than ${belowName} (${below})`); }
    const basis = `PLACEHOLDER generated for #426: key 1 (${row.bar}) × ${m.toFixed(2)} = ${+raw.toFixed(4)}, rounded to ${rounded}`
      + (notes.length ? '; ' + notes.join('; ') : '') + '. Not Aiden’s number, awaiting his (#371).';
    out[t] = { v, raw, m, clamped: notes.some(n => n.startsWith('CLAMPED')), basis };
    const mine = typeof real[t] === 'number';
    below = mine ? real[t] : v; belowName = mine ? `Aiden’s ${TIER_NAME[t]}` : TIER_NAME[t]; }
  return out; }

/* ---------- reading the file as text ---------- */
// the index after a string or a comment starting at i, or i itself when there is neither
function skip(src, i) { const c = src[i], n = src[i + 1];
  if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); return e < 0 ? src.length : e + 2; }
  if (c === '/' && n === '/') { const e = src.indexOf('\n', i + 2); return e < 0 ? src.length : e; }
  if (c === "'" || c === '"' || c === '`') { let j = i + 1; while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; j++; } return j + 1; }
  return i; }
// the index one past the `}` that closes the `{` at i
function closeOf(src, i) { let depth = 0;
  for (let j = i; j < src.length;) { const k = skip(src, j); if (k !== j) { j = k; continue; }
    if (src[j] === '{') depth++; else if (src[j] === '}' && --depth === 0) return j + 1;
    j++; }
  throw new Error(`unbalanced braces from offset ${i}`); }
// the top-level fields of the object literal at [open, close): [{ name, from, to }], [from, to) being the value's text
export function fieldsOf(src, open, close) { const out = []; let j = open + 1, depth = 0, cur = null;
  const NAME = /\s*(?:'([^'\\]*)'|([A-Za-z_$][\w$]*))\s*:\s*/y;
  const end = k => { let e = k; while (e > cur.from && /\s/.test(src[e - 1])) e--; cur.to = e; out.push(cur); cur = null; };
  while (j < close - 1) {
    if (depth === 0 && !cur) { NAME.lastIndex = j; const m = NAME.exec(src); if (m) { cur = { name: m[1] ?? m[2], from: j + m[0].length }; j = cur.from; continue; } }
    const k = skip(src, j); if (k !== j) { j = k; continue; }
    const ch = src[j];
    if (depth === 0 && ch === ',' && cur) { end(j); j++; continue; }
    if ('{[('.includes(ch)) depth++; else if ('}])'.includes(ch)) depth--;
    j++; }
  if (cur) end(close - 1);
  return out; }
const byName = list => Object.fromEntries(list.map(f => [f.name, f]));
// every row of KEY_BARS: { key, from, to, obj }, [from, to) being the row's own `{ … }`
export function rowsOf(src) { const head = src.indexOf('export const KEY_BARS = {');
  if (head < 0) throw new Error('config/key-bars.js: no `export const KEY_BARS = {`');
  const open = src.indexOf('{', head), close = closeOf(src, open);
  return fieldsOf(src, open, close).map(f => { const text = src.slice(f.from, f.to);
    if (text[0] !== '{') throw new Error(`KEY_BARS['${f.name}'] is not an object literal`);
    return { key: f.name, from: f.from, to: f.to, obj: Function(`"use strict"; return (${text});`)() }; }); }
const quote = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
function apply(src, edits) { for (const [a, b, t] of edits.slice().sort((x, y) => y[0] - x[0])) src = src.slice(0, a) + t + src.slice(b); return src; }
// a marker counts only while its cell still holds the value it records (rule 3)
export const markerHolds = (row, t) => isObj(row.placeholder) && isObj(row.placeholder[t]) && typeof row[t] === 'number' && row.placeholder[t].v === row[t];

// the row's `placeholder` field, rewritten from `marks` — generated text for our cells, the original bytes for anyone else's
function placeMarks(src, NL, list, marks, edits) { const F = byName(list), tiers = TIERS.filter(t => marks[t] !== undefined);
  const value = tiers.length ? '{ ' + tiers.map(t => `${t}:${marks[t]}`).join(',' + NL + PAD) + ' }' : null;
  if (F.placeholder) {
    if (value === null) { const i = list.indexOf(F.placeholder); edits.push([i ? list[i - 1].to : F.placeholder.from, F.placeholder.to, '']); }
    else if (src.slice(F.placeholder.from, F.placeholder.to) !== value) edits.push([F.placeholder.from, F.placeholder.to, value]);
    return; }
  if (value !== null) { const last = list[list.length - 1]; edits.push([last.to, last.to, ',' + NL + '    placeholder:' + value]); } }

/* ---------- the three writes ---------- */
// fill (the default) or clear. Returns the new text and one report line per cell
export function generate(src, ROUND_AT, mode = 'fill') { const NL = src.includes('\r\n') ? '\r\n' : '\n', edits = [], report = [];
  for (const r of rowsOf(src)) { const row = r.obj, list = fieldsOf(src, r.from, r.to), F = byName(list);
    for (const t of TIERS) if (!F[t]) throw new Error(`${r.key}: no \`${t}\` field — every row carries pro and author (B.27)`);
    const P = F.placeholder ? byName(fieldsOf(src, F.placeholder.from, F.placeholder.to)) : {};
    /* build 44 (FEEDBACK-v24 §E): a marker with `by` came from somewhere else — the Key Unlocks Desk's proposals — and is a
       placeholder (isPlaceholder() still reads it as not Aiden's) but NOT this tool's to rewrite or clear: kept byte for byte.
       derive() only runs when a cell is actually ours, so a row with nothing to write is never refused for a floor it does not need */
    const ours = t => row[t] === null || (markerHolds(row, t) && !row.placeholder[t].by);
    const real = Object.fromEntries(TIERS.filter(t => !ours(t)).map(t => [t, row[t]]));
    const d = mode === 'clear' || !TIERS.some(ours) ? null : derive(r.key, row, ROUND_AT, real);
    const marks = {};
    for (const t of TIERS) { const line = { key: r.key, id: row.id, tier: t, dir: row.dir, unit: row.unit, bar: row.bar };
      if (!ours(t)) { if (P[t]) marks[t] = src.slice(P[t].from, P[t].to); report.push({ ...line, act: 'kept', v: row[t], by: markerHolds(row, t) ? row.placeholder[t].by : '' }); continue; }
      const cellWas = src.slice(F[t].from, F[t].to), cell = mode === 'clear' ? 'null' : String(d[t].v);
      if (cell !== cellWas) edits.push([F[t].from, F[t].to, cell]);
      if (mode === 'clear') { report.push({ ...line, act: row[t] === null ? 'empty' : 'cleared', v: null }); continue; }
      marks[t] = `{ v:${d[t].v}, conf:'low', basis:${quote(d[t].basis)} }`;
      const same = cell === cellWas && P[t] && src.slice(P[t].from, P[t].to) === marks[t];
      report.push({ ...line, act: row[t] === null ? 'filled' : same ? 'unchanged' : 'refreshed', v: d[t].v, raw: d[t].raw, clamped: d[t].clamped, basis: d[t].basis }); }
    placeMarks(src, NL, list, marks, edits); }
  return { out: apply(src, edits), report }; }

// Aiden's real number into one cell (#371). Drops that cell's marker; the other tier's marker is kept byte for byte
export function setCell(src, which, tier, value) {
  if (!TIERS.includes(tier)) throw new Error(`--set writes pro or author only — key 1's \`bar\` is not this tool's to write (A.2)`);
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`--set needs a number, not ${value}`);
  const NL = src.includes('\r\n') ? '\r\n' : '\n';
  const r = rowsOf(src).find(x => x.key === which || x.obj.id === which); if (!r) throw new Error(`no row '${which}' (a key like quick-tap:two:5, or an id like qt-two-5)`);
  const list = fieldsOf(src, r.from, r.to), F = byName(list), P = F.placeholder ? byName(fieldsOf(src, F.placeholder.from, F.placeholder.to)) : {};
  const edits = [[F[tier].from, F[tier].to, String(value)]], marks = {};
  for (const t of TIERS) if (t !== tier && P[t]) marks[t] = src.slice(P[t].from, P[t].to);
  placeMarks(src, NL, list, marks, edits);
  return apply(src, edits); }

// the review copy, in its own shape: pro, author and the placeholder marker beside each combination's bar. The app wins
export function reviewJson(text, rows) { const NL = text.includes('\r\n') ? '\r\n' : '\n', o = JSON.parse(text);
  const byId = Object.fromEntries(rows.map(r => [r.obj.id, r.obj]));
  for (const g of o.games || []) g.combinations = (g.combinations || []).map(c => { const r = byId[c.id]; if (!r) return c;
    // key 1's number, unit, direction and prose are COPIED from the app into this review copy, never the other way
    const FROM_APP = { bar: 'bar', unit: 'unit', direction: 'dir', confidence: 'conf', basis: 'basis' }, out = {};
    for (const [k, v] of Object.entries(c)) { if (k === 'pro' || k === 'author' || k === 'placeholder') continue;
      out[k] = k in FROM_APP ? r[FROM_APP[k]] : v;
      if (k === 'bar') { out.pro = r.pro; out.author = r.author; } }
    const ph = {}; for (const t of TIERS) if (markerHolds(r, t)) ph[t] = { confidence: r.placeholder[t].conf, basis: r.placeholder[t].basis };
    if (Object.keys(ph).length) out.placeholder = ph;
    return out; });
  const top = {};
  for (const [k, v] of Object.entries(o)) { if (k === '_placeholders') continue; top[k] = v;
    if (k === '_direction') top._placeholders = 'Build 38 (#426): every pro and author value carrying a `placeholder` entry was GENERATED from key 1 by site/scripts/placeholders.mjs and is not Aiden’s number. A value without one was set by hand. Replace one with `npm run placeholders -- --set <id> pro|author <n>`.'; }
  if (!('_placeholders' in top)) top._placeholders = o._placeholders;
  return JSON.stringify(top, null, 2).split('\n').join(NL) + (/\n$/.test(text) ? NL : ''); }

/* ---------- the command ---------- */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [flag, ...rest] = process.argv.slice(2);
  const { ROUND_AT } = await import(pathToFileURL(path.join(ROOT, 'config', 'verdicts.js')).href);
  const src = fs.readFileSync(BARS_JS, 'utf8'), json = fs.readFileSync(REVIEW_JSON, 'utf8');
  let out, report = [];
  try {
    if (flag === '--set') { const [which, tier, num] = rest; out = setCell(src, which, tier, Number(num)); }
    else ({ out, report } = generate(src, ROUND_AT, flag === '--clear' ? 'clear' : 'fill'));
  } catch (e) { console.error('placeholders: ' + e.message); process.exit(2); }
  const jsonOut = reviewJson(json, rowsOf(out));
  if (flag === '--check') { const off = [out !== src && 'config/key-bars.js', jsonOut !== json && '../_review/key-bars.json'].filter(Boolean);
    if (off.length) { console.error('placeholders --check: not what the generator writes — ' + off.join(', ') + '. Run npm run placeholders.'); process.exit(1); }
    console.log('placeholders --check: config/key-bars.js and ../_review/key-bars.json are what the generator writes'); process.exit(0); }
  const n = a => report.filter(x => x.act === a).length;
  if (flag === '--dry') for (const x of report) console.log(`  ${x.act.padEnd(9)} ${x.key.padEnd(22)} ${x.tier.padEnd(6)} ${x.dir.padEnd(6)} bar ${String(x.bar).padEnd(6)} → ${x.v}${x.clamped ? '  CLAMPED' : ''}`);
  for (const x of report.filter(x => x.clamped)) console.log(`  clamped  ${x.key} · ${x.tier} → ${x.v}`);
  for (const x of report.filter(x => x.act === 'kept')) console.log(`  kept     ${x.key} · ${x.tier} = ${x.v} (${x.by ? `a ${x.by} proposal, still a placeholder` : "a person's number"})`);
  console.log(`placeholders: ${n('filled')} filled · ${n('refreshed')} refreshed · ${n('unchanged')} unchanged · ${report.filter(x => x.act === 'kept' && !x.by).length} kept as set by hand · ${report.filter(x => x.act === 'kept' && x.by).length} kept as marked proposals` + (flag === '--clear' ? ` · ${n('cleared')} cleared` : ''));
  if (flag === '--dry') { console.log(jsonOut === json ? 'review json: unchanged' : 'review json: would change'); process.exit(0); }
  fs.writeFileSync(BARS_JS, out); fs.writeFileSync(REVIEW_JSON, jsonOut);
  console.log('wrote config/key-bars.js and ../_review/key-bars.json');
}
