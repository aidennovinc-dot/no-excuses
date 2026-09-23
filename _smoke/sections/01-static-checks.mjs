
// ---- 0. static: one build number (A6), config/ is data only (A2) ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, names, section, check, ok, bad, root, read, strip, at, page, named } from '../lib/gate.mjs';

export const SECTION = ["static checks"];

export async function run() {
  const { BUILD } = await import(pathToFileURL(path.join(root, 'config', 'build.js')).href);
  const html = read('index.html'); const vj = JSON.parse(read('version.json'));
  // v18 (S.2, batch 14): the two places a person reads wear `v0.N`; the constant and version.json stay the bare integer (A6)
  /* v29 (item 7, build 55): TWO PLACES, NOT THREE. The update-check constant went with the inline script it lived in — the poll is
     core/platform.js now and imports BUILD from config/build.js, so A6's one place has one fewer copy to keep in step. */
  const places = [html.match(/<div class="hint">v0\.(\d+) ·/)?.[1], html.match(/<div id="build">v0\.(\d+)<\/div>/)?.[1], String(vj.build)];
  places.every(p => p === String(BUILD)) ? ok(`A6 build ${BUILD} in config/build.js = index.html ×2 = version.json (both visible as v0.${BUILD})`) : bad('A6 one build number', JSON.stringify(places) + ' vs config ' + BUILD);
  !/const BUILD="\d+";/.test(html) ? ok('A6 no fourth copy of the build number in index.html') : bad('A6 the update-check constant is back in index.html');
  const oldForm = html.match(/<div class="hint">build \d+ ·|<div id="build">build \d+</g) || [];
  /* DELETED at build 55 (v29 item 7): the half of this check that spelled `'v0.'+j.build` in index.html. The update bar's text is
     written in core/platform.js now, and CLAUDE.md:204 says a source-text check that fails on a refactor is deleted, not re-spelled. */
  (!oldForm.length) ? ok('S.2 v0.N on screen — the hint line and #build; no `build N` form left') : bad('S.2 v0.N on screen', oldForm.join(' | '));
  const cfg = fs.readdirSync(path.join(root, 'config')).filter(f => f.endsWith('.js'));
  const dirty = cfg.filter(f => /\bimport\b|=>|\bfunction\b/.test(strip(read('config', f))));
  dirty.length ? bad('A2 config/ is data only', dirty.join(', ')) : ok(`A2 config/ is data only (${cfg.length} files: no imports, no functions)`);
  /* v16 (§1) — THE MUSIC DATA. Three options for every game, each with its own voicing AND its own rhythm: Aiden's
     complaint was that seven tracks of the same arrangement at different speeds all sounded the same, so "three options"
     that shared a wave set and a step pattern would be the same mistake three times over. The check is deliberately
     about SHAPE, not taste — two options of one game must differ in the set of waves they use or in the set of patterns
     they play, and every game must have all three. */
  {
    const AU = await import(pathToFileURL(path.join(root, 'config', 'audio.js')).href);
    const G7 = ['quick-tap', 'dots', 'hold', 'sequence', 'timing', 'reaction', 'spot'];
    const ROLES = ['pad', 'stab', 'arp', 'lead', 'bass', 'sub', 'drone'];
    const miss = [], same = [], badv = [];
    // build 30: TRACK_OPTS is one list per GAME and the ids are names, so the shape of this check moved with the data
    for (const g of G7) { const os = AU.TRACK_OPTS[g] || [];
      if (os.length !== 3) miss.push(g + ' has ' + os.length + ' options');
      for (const o of os) if (!AU.TRACKS[g + ':' + o]) miss.push(g + ':' + o);
      if (!os.includes(AU.TRACK_PICK[g])) miss.push(g + ' picks ' + AU.TRACK_PICK[g] + ', which is not one of its options'); }
    for (const [k, t] of Object.entries(AU.TRACKS)) {
      if (!t.ch || !t.ch.length || !t.bass || !t.bass.length || !t.voices || !t.voices.length) badv.push(k + ' (empty)');
      for (const v of t.voices || []) {
        if (!ROLES.includes(v.v)) badv.push(k + ' role ' + v.v);
        if (v.v === 'lead' && !(v.seq || []).length) badv.push(k + ' lead with no melody');
      }
    }
    const sig = t => [[...new Set(t.voices.map(v => v.w))].sort().join('+'), [...new Set(t.voices.map(v => v.pat || 'x'))].sort().join('|') + '@' + (t.beats || 4)];
    for (const g of G7) { const os = AU.TRACK_OPTS[g] || [];
      const ss = os.map(o => AU.TRACKS[g + ':' + o]).filter(Boolean).map(sig);
      for (let i = 0; i < ss.length; i++) for (let j = i + 1; j < ss.length; j++)
        if (ss[i][0] === ss[j][0] && ss[i][1] === ss[j][1]) same.push(g + ' ' + os[i] + '/' + os[j]);
    }
    // build 30 (B.31): the key loops are the three THEMES now, not key:1..3
    // AMENDED at build 42 (v23 L.7a): the three themes are theme:key / theme:pro / theme:thorns; the build-30 three stay one build, retired, for the A/B
    const extra = ['menu', ...Object.values(AU.KEY_THEMES || {}), 'key:roots', 'key:frost', 'key:thorn'].filter(k => !AU.TRACKS[k]).concat(Object.keys(AU.KEY_THEMES || {}).length === 3 ? [] : ['KEY_THEMES']);
    if (miss.length || badv.length) bad('§1.1 three playable options per game', [...miss, ...badv].join(', '));
    else if (same.length) bad('§1.1 the three options are different music', 'same voicing and rhythm: ' + same.join(', '));
    else if (extra.length) bad('§1.2 / §1.3 the menu loop and one per key', 'missing: ' + extra.join(', '));
    else ok(`§1 ${Object.keys(AU.TRACKS).length} tracks — 3 per game with different waves or rhythms, plus the menu and three keys`);
    // Quick Tap · a is the build-26 loop note for note. It is the quality bar Aiden named, so it must be IN the set, not replaced
    const qa = AU.TRACKS['quick-tap:held'], want = JSON.stringify({ root: 110, bpm: 126, ch: [[0, 7, 12, 16], [5, 12, 17, 21], [3, 10, 15, 19], [7, 14, 19, 22]], bass: [0, 5, 3, 7] });
    const got = JSON.stringify({ root: qa.root, bpm: qa.bpm, ch: qa.ch, bass: qa.bass });
    const shape = qa.voices.length === 2 && qa.voices[0].v === 'pad' && qa.voices[0].w === 'triangle' && qa.voices[1].v === 'bass' && qa.voices[1].w === 'sine' && (qa.beats || 4) === 4;
    (got === want && shape) ? ok('§1.1 Quick Tap · Held is the build-26 loop unchanged — the quality bar is one of its three')
      : bad('§1.1 Quick Tap keeps its current loop as an option', got);
    // build 30 (B.30): the track a game is set to must exist, and so must the flow layer B.27 rides over it
    { const missPick = G7.filter(g => !AU.TRACKS[g + ':' + AU.TRACK_PICK[g]]);
      const setsBad = Object.keys(AU.SET_SECS || {}).filter(k => !(AU.SET_SECS[k] > 0));
      const flowOk = AU.FLOW_STEM && AU.FLOW_STEM.vol > 0 && (AU.FLOW_STEM.voices || []).length;
      (!missPick.length && !setsBad.length && flowOk)
        ? ok(`B.30 every game's picked track exists (${G7.map(g => AU.TRACK_PICK[g]).join(', ')}), ${Object.keys(AU.SET_SECS).length} Set lengths, and the flow layer is at vol ${AU.FLOW_STEM.vol}`)
        : bad('B.30 the picked tracks, the Set lengths and the flow layer', JSON.stringify({ missPick, setsBad, flowOk }));
    }
    // no percussion: the one rule the old module had that was right, and the reason the roles list has no noise in it
    ROLES.includes('noise') ? bad('§1 no percussion in the music') : ok('§1 no percussion role exists — rhythm is plucks, stabs, rests and bar lengths');
  }
  /* v16 (1.6): an unlock has its own sound and it is not the achievement's. The achievement path must still be Snd.click:
     Aiden's line was "achievements currently sound great as is", so this asserts what did NOT change as well. */
  {
    const t = read('ui', 'toast.js');
    const good = /cls==='ok'\?Snd\.unlockFx\(\):Snd\.click\(\)/.test(t.replace(/\s+/g, ''));
    good ? ok('1.6 an unlock toast plays Snd.unlockFx, an achievement toast still plays Snd.click')
         : bad('1.6 the unlock sound is its own', 'ui/toast.js does not pick unlockFx for an ok toast');
  }
  // v16 (§5 / A.3): the intro carries ONE line. Every row is a single-element array — the sub-line is gone from the data
  {
    const CP = await import(pathToFileURL(path.join(root, 'config', 'copy.js')).href);
    const subs = Object.entries(CP.INTRO).filter(([, v]) => v.length > 1 && v[1]);
    subs.length ? bad('§5 the intro sub-line is gone', subs.map(([k]) => k).join(', '))
      : ok(`§5 all ${Object.keys(CP.INTRO).length} intro rows are one line, and INTRO_READY carries the "Ready?" gate`);
  }
  // build 17 (A3): an engine's imports name only _shared, core, config or core.js. sel, prefs, audio, the run and the other engines reach it through ctx, or not at all
  const engines = fs.readdirSync(path.join(root, 'games'), { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('_')).map(d => `games/${d.name}/index.js`).concat(fs.readdirSync(path.join(root, 'games', '_shared')).map(f => `games/_shared/${f}`));
  const stray = [];
  for (const f of engines) { const shared = f.startsWith('games/_shared/'); const src = strip(read(f)); for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) { const p = m[1]; const okPath = shared ? /^(\.\/[\w.-]+\.js$|\.\.\/\.\.\/(core\/|config\/|core\.js$))/.test(p) : /^\.\.\/(_shared\/|\.\.\/(core\/|config\/|core\.js$))/.test(p); if (!okPath) stray.push(`${f} → ${p}`); } }
  stray.length ? bad('A3 engines import only _shared / core / config', stray.join(', ')) : ok(`A3 engines import only _shared / core / config (${engines.length} files)`);
  // v14 C.1 / C.2 / C.3 (L5, build 22): Flash spends what is over 150ms of 500; a Go / No-go Streak spends what is over 150ms
  // of 1000 and 200ms a wrong tap, while its SET still ADDS 150ms a wrong tap. Two currencies — the gate holds them apart so
  // nobody harmonises them. C.4: the Streak has no wrong-tap run-ender, so the `wrong>=3` test must stay inside a !streak() branch
  { const rx = read('games', 'reaction', 'index.js');
    const num = k => { const m = rx.match(new RegExp(k + ':\\s*(\\d+)')); return m ? +m[1] : null; };
    // AMENDED at build 32 (v19 C.5 / C.6, L5): the Go / No-go gate is 180 and its Streak budget 3000; the wrong-tap costs did not move
    // AMENDED at build 44 (v24 F.1, L5 amended at Aiden's direct request): Flash's Streak budget is 1000
    const want = { FLASH_FREE: 150, FLASH_BUD: 1000, NOGO_FREE: 180, NOGO_BUD: 3000, NOGO_WRONG_SET: 150, NOGO_WRONG_STREAK: 200 };
    const got = Object.fromEntries(Object.keys(want).map(k => [k, num(k)]));
    const wrong = Object.keys(want).filter(k => got[k] !== want[k]);
    wrong.length ? bad('L5 the Reaction budgets', wrong.map(k => `${k}=${got[k]} want ${want[k]}`).join(', ')) : ok('L5 Flash 1000/150 (v24 F.1), Go / No-go 3000 over the 180ms gate (v19 C.5 / C.6), wrong tap 200 in a Streak and 150 in a Set (v14 C.1–C.3)');
    /(this\.NOGO_WRONG_SET|NOGO_WRONG_STREAK)/.test(rx) && !/this\.NOGO_WRONG\b/.test(rx) ? ok('B.3 no bare NOGO_WRONG left to blur the two currencies') : bad('B.3 the two wrong-tap costs are separate constants');
    /* C.4 retired the three-wrong-taps ending for a STREAK at build 22; v18 (B.1c, L5) retires it for the Set and for a
       pass & play turn too, so the right assertion is now that there is no such test anywhere. A wrong tap is only a
       millisecond penalty — 150 on a Set's average, 200 out of a Streak's budget — and the two are still separate. */
    const enders = [...rx.matchAll(/[^\n]*wrong\s*>=\s*3[^\n]*/g)].map(m => m[0].trim()).filter(l => !/^(\/\/|\*|\/\*)/.test(l));
    (!enders.length && !/nogoEnd\(true\)/.test(rx)) ? ok('C.4 / B.1c no wrong-tap run-ender survives in either length — a wrong tap is only what it costs')
      : bad('B.1c the three-wrong-taps run-ender is retired outright', enders.join(' | ')); }
  // build 18 (A4): a screen never imports another screen or an engine; the run never imports a screen. They talk through core/events.js
  const screens = fs.readdirSync(path.join(root, 'ui', 'screens')).filter(f => f.endsWith('.js') && f !== 'index.js').map(f => `ui/screens/${f}`);
  const cross = [];
  for (const f of screens) { const src = strip(read(f)); for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) { if (/^\.\/|\/games\/(?!registry)/.test(m[1])) cross.push(`${f} → ${m[1]}`); } }
  { const src = strip(read('run', 'run.js')); for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) if (/screens\//.test(m[1])) cross.push(`run/run.js → ${m[1]}`); }
  cross.length ? bad('A4 screens and the run talk by events, not imports', cross.join(', ')) : ok(`A4 no screen imports a screen or an engine, the run imports no screen (${screens.length} screens)`);
  /* ---- v29 (items 7 / 15 / 16, build 55): S4, S7, A8 and one name per achievement ---- */
  {
    const CSP = "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'";
    const meta = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
    (meta && meta[1] === CSP) ? ok('S4 index.html carries the Content-Security-Policy ARCHITECTURE.md has claimed since build 14 — and it is the S4 value') : bad('S4 the CSP meta', meta ? meta[1] : 'no meta at all');
    const inline = html.replace(/<!--[\s\S]*?-->/g, '').match(/<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/g) || [];
    !inline.length ? ok("S4 no inline <script> left in index.html — `script-src` falls to `default-src 'self'`, which refuses one") : bad('S4 an inline script would be refused by the CSP', inline.length + ' left');
    /* core/platform.js reads location.search at module load (CHAL), so it cannot be imported in node — the two facts about it are
       read off the source the way A2-A4's boundaries are, and the page drives the poll itself in the section below. */
    const PLSRC = strip(read('core', 'platform.js'));
    (/export \{[^}]*\bupdatePoll\b/.test(PLSRC) && /location\.protocol!=='https:'/.test(PLSRC) && /TARGET==='native'/.test(PLSRC))
      ? ok('S7 the update poll is core/platform.js, gated to https: and out of the native shell') : bad('S7 the update poll', 'not in platform.js, or not gated');
    /* A8 / A3 import boundary (the CLAUDE.md:204 exception): eleven direct navigator.vibrate calls across six engines are one
       platform.haptic() now. iOS WebKit implements none of the Vibration API, so this is where the Capacitor plugin lands. */
    const HAPT = ['games/_shared/timed.js', 'games/_shared/versus.js', 'games/estimate/index.js', 'games/sequence/index.js', 'games/timing/index.js', 'games/reaction/index.js', 'games/spot/index.js'];
    const direct = [...HAPT, 'run/run.js', 'run/input.js'].filter(f => /navigator\.vibrate/.test(strip(read(...f.split('/')))));
    const routed = HAPT.filter(f => /haptic\s*\}\s*from\s*"[^"]*core\/platform\.js"/.test(read(...f.split('/'))));
    (/export \{[^}]*\bhaptic\b/.test(PLSRC) && !direct.length && routed.length === HAPT.length)
      ? ok(`A8 one haptic: core/platform.js haptic(), imported by all ${HAPT.length} engines that buzz, and no navigator.vibrate left in games/ or run/`)
      : bad('A8 one haptic', JSON.stringify({ direct, routed: routed.length }));
    const AC55 = await import(pathToFileURL(path.join(root, 'config', 'achievements.js')).href);
    const nm = AC55.ACH.map(a => a.name).concat(Object.values(AC55.KEY_ROSTER).flatMap(r => ['clear', 'pro', 'author'].map(t => r[t] && r[t].name).filter(Boolean)));
    const dup = [...new Set(nm.filter((n, i) => nm.indexOf(n) !== i))];
    !dup.length ? ok(`v29 item 16 every achievement name is its own — ${nm.length} rows across ACH and KEY_ROSTER, no two alike`) : bad('two achievements with one name', dup.join(', '));
  }
  /* ---- A10 (build 61): THE RULES FILE HAS A BUDGET. site/CLAUDE.md is read at the start of every session; it was trimmed from 58KB on
     2026-09-12 and had grown back to 86KB by build 60. Over 40KB fails: move the full text of a rule to docs/RULES-HISTORY.md and keep
     its one line — never delete a sentence. The gate's own time budget is the runner's (lib/parallel.mjs), not a check here. */
  { const kb = fs.statSync(path.join(root, 'CLAUDE.md')).size / 1024;
    kb <= 40 ? ok(`A10 CLAUDE.md is ${kb.toFixed(1)}KB, inside its 40KB budget`) : bad('A10 CLAUDE.md is over its 40KB budget', `${kb.toFixed(1)}KB — move rules' full text to docs/RULES-HISTORY.md and keep one line each`); }
}
