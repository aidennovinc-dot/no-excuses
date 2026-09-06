/* No Excuses — the progression map for Cowork's review (build 14). Puppeteer-core port of ../_review/scripts/progression.mjs.
   Reads the tables straight from the running modules (GAMES, UNLOCKS, LEN_RULES, ACH, TIERS …), writes
   ../_review/_build/progression.json, then ../_review/progression.html from ../_review/scripts/progression.template.html.
   Not published from here — Cowork publishes the page.   npm run review */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../server.mjs';
import { launch } from '../chrome.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const REVIEW = path.resolve(here, '../../../_review');
const SCRIPTS = path.join(REVIEW, 'scripts');
const BUILD = path.join(REVIEW, '_build');
fs.mkdirSync(BUILD, { recursive: true });

const srv = await serve();
const BASE = process.argv[2] || srv.base;
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' }); await new Promise(r => setTimeout(r, 800));
const data = await page.evaluate(async () => {
  // build 16: the tables are data in config/ — read them from there; ACH still comes hydrated from progress.js so `hasProgress` is real
  const P = await import('./progress.js'); const R = await import('./games/registry.js'); const G = await import('./config/games.js'); const U = await import('./config/unlocks.js'); const C = await import('./config/copy.js');
  const STREAK = G.STREAK;
  const games = Object.fromEntries(Object.entries(R.GAMES).map(([k, g]) => [k, { name: g.name, modes: g.modes, lens: g.lens.map(s => s === STREAK ? 'streak' : s), lower: !!g.lower, versus: !!g.versus,
    modeText: Object.fromEntries(g.modes.map(d => [d, g[d]])), lenNames: g.lenNames || null, lenSubs: g.lenSubs || null, per: g.per ? Object.fromEntries(Object.entries(g.per).map(([d, p]) => [d, { lens: (p.lens || []).map(s => s === STREAK ? 'streak' : s), lenSubs: p.lenSubs || null }])) : null }]));
  const unlocks = P.UNLOCKS.map(u => ({ key: u.key, need: u.need, where: { ...u.where, s: u.where.s === STREAK ? 'streak' : u.where.s }, live: !!u.live }));
  const lenRules = Object.fromEntries(Object.entries(U.LEN_RULES).map(([g, rules]) => [g, rules.map((r, i) => r ? r.replace('{prev}', G.LEN_NAME?.[R.GAMES[g].lens[i - 1]] || 'previous length') : null)]));
  const ach = P.ACH.map(a => ({ id: a.id, g: a.g, tier: a.tier, name: a.name, how: a.how, unlocks: a.unlocks || null, at: a.at ? { ...a.at, s: a.at.s === STREAK ? 'streak' : a.at.s } : null, hasProgress: !!a.progress }));
  return { games, unlocks, lenRules, ach, tiers: C.TIERS, modeName: G.MODE_NAME, lenName: G.LEN_NAME, itemWord: C.ITEM_WORD, bgName: C.BG_NAME, streakCfg: G.STREAK_CFG && Object.keys(G.STREAK_CFG) };
});
await browser.close(); srv.close();
const json = path.join(BUILD, 'progression.json');
fs.writeFileSync(json, JSON.stringify(data, null, 1)); console.log('wrote', json, '·', data.ach.length, 'achievements,', data.unlocks.length, 'unlocks');

// ---- build the page: ../_review/scripts/build-progression.mjs, inlined ----
const d = JSON.stringify(data).replace(/<\//g, '<\\/');
const tpl = fs.readFileSync(path.join(SCRIPTS, 'progression.template.html'), 'utf8');
const out = path.join(REVIEW, 'progression.html');
fs.writeFileSync(out, tpl.replace('__DATA__', d)); console.log('wrote', out);
