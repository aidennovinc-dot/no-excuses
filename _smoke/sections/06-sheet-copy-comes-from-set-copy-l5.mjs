// ---- 2b. the Set and Streak lines on every sheet come from the one table (L5 / v14 section 5) ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { GAMES, section, ok, bad, root, page, openSheet, named } from '../lib/gate.mjs';

export const SECTION = ["sheet copy comes from SET_COPY (L5)"];

export async function run() {
  const { SET_COPY, GAMES: TABLE, SET_LIMIT } = await import(pathToFileURL(path.join(root, 'config', 'games.js')).href);
  /* ---- v31 (60.22, build 60): A MODE LINE IS ONE SHORT LINE ----
     Aiden: "one short line, about 40 characters maximum". Three of them had grown scoring fine print — Flash's 1000ms rule,
     Go / No-go's missed target and wrong tap, Find's half-second — and two more (Stopwatch and Hidden) were already over the
     limit without anyone noticing. A pick sheet says what the mode is and how it is won; the rules are in the review
     catalogue's "Scoring, in full" section, generated from the config so they cannot drift. This is the guard the item asks
     for, and it is measured on EVERY line rather than on the three that were named. */
  { const long60 = [];
    for (const key of Object.keys(SET_COPY)) for (const f of ['set', 'streak']) {
      const v = SET_COPY[key][f]; if (typeof v === 'string' && v.length > SET_LIMIT) long60.push(key + '.' + f + ' = ' + v.length + ' — "' + v + '"'); }
    const longest = Math.max(...Object.keys(SET_COPY).flatMap(k => [SET_COPY[k].set.length, SET_COPY[k].streak.length]));
    (long60.length === 0 && SET_LIMIT === 40)
      ? ok(`60.22 every mode line on every pick sheet is one short line — ${Object.keys(SET_COPY).length * 2} lines, the longest ${longest} characters against a ${SET_LIMIT} limit; the scoring rules that used to be on three of them are in the catalogue's "Scoring, in full" section`)
      : bad('60.22 a mode line is over the limit', JSON.stringify(long60)); }
  for (const key of Object.keys(SET_COPY)) {
    const [g, d] = key.split(':'); const mi = TABLE[g].modes.indexOf(d); const want = SET_COPY[key];
    await openSheet(g, mi, 0);
    const rows = await page.evaluate(() => [...document.querySelectorAll('#time-row .tbtn')].map(b => ({ name: b.querySelector('b').textContent.trim(), sub: (b.querySelector('.lsub') || { textContent: '' }).textContent.trim() })));
    (rows.length === 2 && rows[0].name === 'Set' && rows[0].sub === want.set && rows[1].name === 'Streak' && rows[1].sub === want.streak)
      ? ok(`${key} \u2014 "${want.set}" / "${want.streak}"`)
      : bad(`${key} sheet copy comes from SET_COPY`, JSON.stringify(rows));
  }
}
