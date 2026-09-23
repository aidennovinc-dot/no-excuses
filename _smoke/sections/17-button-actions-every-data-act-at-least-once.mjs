// ---- 7. every button action once (build 15: ui/actions.js dispatches on data-act) ----
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { own, BASE, errors, sleep, close, section, ok, bad, at, page, onScreen, inGame, setStorage, getJSON, OPEN_PREFS, up, driveToResult, openSheet } from '../lib/gate.mjs';

export const SECTION = ["button actions (every data-act at least once)"];

export async function run() {
  const seen = new Set();
  const tap = async (sel, label) => {
    const before = errors.length;
    const act = await page.evaluate(s => { const b = document.querySelector(s); if (!b) return null; b.click(); return b.dataset.act || '(none)'; }, sel);
    await sleep(250);
    if (act === null) { bad(label || sel, 'no such button'); return null; }
    seen.add(act);
    if (errors.length > before) bad(`${label || sel} [${act}]`, errors.slice(before).join(' | '));
    return act;
  };
  // everything open, name set, on the menu
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  await setStorage({ 'ne.prefs': { ...OPEN_PREFS, name: 'AIDEN' } });
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
  // customise: swatch, wheel + done, sound pack, scale (Sequence), the music row, game chip, lock line.
  // AMENDED at build 39 (v23 L.4a): Customise is its own menu row again, so the walk opens it straight off the menu
  await tap('[data-go="s-custom"]', 'customise'); await sleep(300);
  await tap('#c-sq button:nth-child(2)', 'customise · target colour');
  await tap('#c-sq button[data-v="wheel"]', 'customise · colour wheel'); await tap('#wheel-done');
  await tap('#c-bg button:nth-child(2)', 'customise · background');
  await tap('#c-snd button:nth-child(2)', 'customise · sound pack'); await tap('#c-snd button:nth-child(1)', 'customise · sound pack back');
  await tap('#pv-g [data-v="sequence"]', 'customise · game chip');
  await tap('#c-scale button:nth-child(2)', 'customise · scale');
  // build 33 (B.28): ONE music row and it is the track — no on / off, no Preview button. A tap on a track plays it
  await tap('#c-track button:nth-child(2)', 'customise · track'); await tap('#c-track button:nth-child(1)', 'customise · track back');
  await tap('#c-menumusic button:nth-child(2)', 'customise · menu music off'); await tap('#c-menumusic button:nth-child(1)', 'customise · menu music on');
  // build 33 (B.30): the locked line is under its own group now, not one line under the preview
  await tap('#lk-sq', 'customise · lock line');
  await sleep(400); await tap('#s-custom .back', 'customise · back');
  // scores: game, mode, length chips
  await tap('[data-go="s-board"]'); await tap('#bd-g [data-v="dots"]', 'board · game chip'); await tap('#bd-d [data-v="lead"]', 'board · mode chip'); await tap('#bd-s [data-v="15"]', 'board · length chip');
  await sleep(400); await tap('#s-board .back', 'board · back');
  // unlocks (build 23, v15 2.4): its own menu item now, above Achievements. The key row is the one that leads somewhere
  // with a single Back, which is why it is the row this taps
  await tap('[data-go="s-prog"]'); await sleep(300);
  await tap('#chest-list .urow.key', 'unlocks · the key row'); await sleep(400);
  (await onScreen()) === 's-key' ? ok('the Unlocks screen\'s key row opens the key') : bad('unlocks · key row', 'on ' + (await onScreen()));
  await tap('#s-key .back', 'key · back'); await sleep(300);
  // achievements: filter chip, a row that jumps to a sheet (Quick Tap · Clean · Sprint · Four)
  await tap('[data-go="s-prog"]'); await tap('#prog-tabs [data-tab="cul"]', 'progress · customise unlocks tab'); await tap('#prog-tabs [data-tab="ach"]', 'progress · achievements tab'); await tap('#ach-g [data-v="quick-tap"]', 'achievements · filter chip');
  // 58.3: the per-game filter inside a chest tab is its own action, and the Skill chest tab is where the key rows live now
  await tap('#prog-tabs [data-tab="c-key"]', 'progress · skill chest tab'); await tap('#chest-g [data-v="dots"]', 'skill chest · filter chip'); await sleep(300);
  // back to Achievements, filtered as it was, for the row walk below
  await tap('#prog-tabs [data-tab="ach"]'); await sleep(300); await tap('#ach-g [data-v="quick-tap"]'); await sleep(300);
  // AMENDED at build 58 (58.3): `qt_bclean5` is a key-1 roster row and lives on the Skill chest tab now; Committed is Quick Tap, pays out nothing, and jumps
  await tap('#ach-qt_sab', 'achievements · jump row');   // AMENDED at build 39 (v23 L.4c): Clean · Sprint · Four pays out a colour, so it is on Customise unlocks await sleep(300);
  (await onScreen()) === 's-pick' ? ok('achievement row jumps to its pick sheet') : bad('achievement row jumps to its pick sheet', 'on ' + (await onScreen()));
  await tap('#lvl-back', 'sheet · mode back'); await tap('#diff-row .choice:nth-child(2)', 'sheet · mode');
  await tap('#prac-row [data-prac]', 'sheet · practice from'); await tap('#grid', 'sheet · grid');
  // v17 (B.24, build 29): the chest is a control on the grid like any other. Locked here, so it says what it takes
  await tap('.chest', 'game select · chest'); await sleep(200);
  await sleep(500); await tap('#s-pick .back', 'grid · back');
  // about: support. v14 (8.10): the dev switches live on their own screen now, one menu item below About
  await tap('[data-go="s-about"]'); await tap('#support', 'about · support');
  // v25 (item 23, build 46): the eight message slots. The first is open with no clip yet; a later one is locked and says what opens it
  await tap('#msglist .msgrow[data-msg="games"]', 'about · a message');
  await tap('#msglist .msgrow[data-msg="thanks"]', 'about · a locked message');
  // v27 (items 9 / 10, build 52): the shared player's two controls — a tap on the picture pauses and plays, a tap outside closes
  await sleep(700); await tap('#vplay .vframe', 'about · the player, pause');
  await tap('#vplay .vback', 'about · the player, close'); await sleep(700);
  await sleep(400); await tap('#s-about .back', 'about · back');
  await tap('[data-go="s-testing"]'); await tap('#dev-sup', 'testing · supporter on'); await tap('#dev-sup', 'testing · supporter off');
  await tap('#dev-open', 'testing · progression on'); await tap('#dev-open', 'testing · everything open');
  await tap('#dev-story', 'testing · replay the intro'); await sleep(300);
  (await page.evaluate(() => !!document.querySelector('#s-menu.story'))) ? ok('replay the intro shows the title sequence') : bad('replay the intro', 'on ' + (await onScreen()));
  await page.evaluate(() => document.body.click()); await sleep(400);
  // the full stop, three taps
  for (let i = 0; i < 3; i++) await tap('#egg', 'egg');
  const egg = (await getJSON('ne')).ach;
  egg && egg.egg ? ok('three taps on the full stop earn Excuses') : bad('three taps on the full stop earn Excuses', JSON.stringify(egg));
  // fresh profile: a locked tile opens the lock box, Try to unlock starts the run with the goal line up; the Next card does the same
  await setStorage({ 'ne.prefs': { story: 1, gridSeen: 1, played: 1, snd: 'off', musicG: {} } });
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
  await tap('[data-go="s-pick"]'); await tap('.tile[data-game="dots"]', 'locked tile');
  const boxOn = await page.evaluate(() => document.getElementById('lockwrap').classList.contains('on'));
  boxOn ? ok('a locked tile opens the lock box') : bad('a locked tile opens the lock box');
  await tap('#lock-no', 'lock box · not now'); await tap('.tile[data-game="dots"]', 'locked tile again'); await tap('#lock-go', 'lock box · try to unlock'); await sleep(600);
  const goal = await page.evaluate(() => ({ game: document.getElementById('game').classList.contains('on'), goal: document.getElementById('goal').textContent.trim() }));
  (goal.game && /35 hits/.test(goal.goal)) ? ok(`try to unlock starts the run with its goal: "${goal.goal}"`) : bad('try to unlock starts the run with its goal', JSON.stringify(goal));
  await tap('#quit', 'quit'); await sleep(300);
  await tap('#s-pick .back'); await sleep(300); await tap('#nextup', 'next achievement card'); await sleep(600);
  (await inGame()) ? ok('the Next achievement card starts its run') : bad('the Next achievement card starts its run', 'on ' + (await onScreen()));
  await tap('#quit');
  // the result screen's chips, again, share (clipboard fallback → toast), back
  await setStorage({ 'ne.prefs': OPEN_PREFS }); await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
  await openSheet('quick-tap', 0, 0); await tap('#go-btn'); await driveToResult('quick-tap', 'run for the result chips', 30000);
  // v31 (60.23, build 60): the player rows are ui/players.js's on BOTH screens now, so they are selected the same way on both
  await tap('#over-chips [data-v="four"]', 'result · mode chip'); await tap('#over-chips2 [data-v="15"]', 'result · length chip'); await tap('#over-vs [data-p="f"]', 'result · with a friend'); await tap('#over-vs [data-p2="1"]', 'result · pass & play'); await tap('#over-vs [data-p="0"]', 'result · solo');
  await tap('#share', 'result · share'); await tap('#over-back', 'result · back'); await sleep(300);
  (await onScreen()) === 's-pick' ? ok('result back opens the pick sheet') : bad('result back opens the pick sheet', 'on ' + (await onScreen()));
  await tap('#time-row .tbtn:nth-child(2)', 'sheet · length'); await tap('#vs-wrap [data-p="f"]', 'sheet · with a friend'); await tap('#vs-wrap [data-p2="1"]', 'sheet · pass & play'); await tap('#vs-wrap [data-p="0"]', 'sheet · solo');
  // build 18: the chips are one act per screen, and the overlays (lock box, Next card, the full stop) are acts too
  const expected = ['go', 'back', 'game', 'diff', 'time', 'vs', 'vs2', 'lvl-back', 'go-btn', 'quit', 'over-back', 'share', 'chip-bd', 'chip-pv', 'chip-ach', 'chip-over', 'item', 'pvlock', 'ach', 'unl', 'chip-chest', 'prac', 'dev-open', 'dev-sup', 'dev-story', 'support', 'wheel-done', 'lock-no', 'lock-go', 'nextup', 'egg', 'ptab', 'chest', 'msg'];
  const missing = expected.filter(a => !seen.has(a));
  missing.length ? bad('every data-act driven once', 'not driven: ' + missing.join(', ')) : ok(`every data-act driven once (${expected.length}) — not covered: again, pass-go, to-games, seqdone, praclock, dev-fresh, adskip, toast, cere-tap, reveal-go, reveal-msg (the reveal's three are driven in the build 46 section)`);
}
