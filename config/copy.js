/* No Excuses — every user-facing string (build 16, refactor stage 2). DATA ONLY (A2).
   `{name}` placeholders are filled by T() in core.js. Markup inside a string here is trusted (S1: it is config, not
   player data); anything player-typed is escaped by the caller before it is interpolated. Grouped by where it shows. */

// the two players (v11 / L4) — the span class carries the colour, so v14 (4.1) drops the colour word beside the name
export const PLAYER = { who:'Player {n}' };
/* v31 (60.23, build 60): the player picker's four words, spelled ONCE. L3's two steps were written out in index.html for the pick
   sheet and again as a string in ui/screens/result.js, which is how the two drifted apart; ui/players.js is the one component now
   and this is the one place the words live. */
export const PLAYERS = { solo:'solo', friend:'with a friend', pass:'pass &amp; play', versus:'versus' };

export const TOAST = {
  devOpenOn:'Everything open · modes and cosmetics', devOpenOff:'Progression back on · only what you earned',
  supOn:'Supporter ON · no ads, all cosmetics, pro length', supOff:'Free tier · ads back on',
  fresh:'Fresh game · runs, unlocks, achievements and intros wiped',
  // v29 (item 4, build 55): the phone went to sleep mid-run. The run is over and nothing was banked; this is said on RETURN, not into a dark screen
  runLost:'Run cancelled · the phone locked, so nothing was counted',
  // build 38 (#426): the columns carry generated placeholders now, so the test fill only ever finds EMPTY cells to fill
  barsOn:'Test fill · empty Pro / Author bars derived in memory, never saved, gone on reload', barsOff:'Test fill off · the cells it filled are empty again',
  barsNone:'Nothing to fill · every Pro and Author bar has a number (placeholders since build 38)',
  /* v28 (item 5, build 53): ONE FULL NAME FOR THE PRACTICE-FROM UNLOCK. `Practice from` read as a sentence cut in half wherever it
     was printed — the Game unlocks row, the title screen's Next unlock box, this toast and the sheet's locked chip. PROGRESS.practiceFrom
     below is the one spelling and every one of them composes off it. */
  pracLocked:'Locked · {name} · 8 notes in 7 keys', locked:'Locked · {name}',
  supAlready:'Already a supporter · thank you', supLater:'Purchases arrive in the app build · About → testing → supporter to try it',
  achievement:'Achievement · {name}', copied:'Copied · paste it anywhere',
  mig11:'Build 11 · {n} old Estimate / Timing / Reaction / Count run{s} retired — the scoring changed',
  // v18 (B.2 / B.4): Stopwatch · Set became a total and Hidden became milliseconds, so records in the old units go
  mig31:'Build 31 · {n} old Timing run{s} retired — Stopwatch · Set is a total now and Hidden is in milliseconds',
  // v19 (C.5 / C.6): Go / No-go scores over the 180ms gate and its Streak counts targets, so records in the old units go
  mig32:'Build 32 · {n} old Go / No-go run{s} retired — every tap scores over the 180ms gate now and a Streak counts targets',
  // unlock wording (v11): "Unlock game: Dots" for a game, "Unlock: Dash" for a mode or length
  unlock:'Unlock: {name}', unlockGame:'Unlock game: {name}',
  // v21 (G.8, build 37): Testing's per-key switches (S5). v23 (L.8f, build 40): per CHEST now — four of them — and the meter field
  // v26 (items 7 / 12, build 48): Testing plays forward the way play does, and backs out every chest after the one it resets
  devReach:'{key} · ready · played forward the way a player gets there', devReachOpen:'{key} · already open · reset it to play it again',
  devKeyReset:'{key} · reset · it and every chest after it shut, their keys cleared',
  devModesReset:'Games chest · reset · every mode locked again, every chest shut',
  devMeterSet:'Meter at {n}% · bars cleared and chests opened to get there',
  // v23 (L.11a, build 40): Customise waits for the Games chest
  // v24 (A.1 / B.2, build 43): the Games chest opens from the MAP now (Keys waits for it too), so both locked lines say where to go
  cusLocked:'Open the Games chest first<small>unlock every game mode, then tap the chest on the map</small>',
  keysLocked:'Open the Games chest first<small>unlock every game mode, then tap the chest on the map</small>',
};
// what an achievement opens, as a line under it
export const UNLOCK_WORD = { wheel:'unlocks the colour wheel', bg:'unlocks {bg} background', snd:'unlocks {v} sounds', item:'unlocks {word}' };
export const ITEM_WORD = { sq:'target colour', lead:'lead colour', cut:'cut piece colour', bg:'background', snd:'sound pack', scale:'scale', wheel:'colour wheel' };
export const BG_NAME = { stars:'stars', grid:'grid', rain:'rain', orbs:'orbs', lantern:'lantern', circuit:'circuit', thorn:'thorn' };
// v13: Stretch is Pro (11.1); the Unlocks line says what the tier is for (11.2); Author (11.3) is Aiden's own records, placeholders until the final build
/* v17 (B.11): the first tier was called UNLOCKS and its line promised "every one opens something new". Six of its
   seventeen rows opened nothing at all — Clean · Sprint · Two, Pinpoint · Blind, Dead on, Under 200, Eight, Spotter — and
   the six that did opened a COLOUR, which is not a game, a mode, a length or a chest. So the word said one thing on the
   Achievements screen and another on the Unlocks screen two menu items above it. B.11 settles which is which: an unlock
   opens something you could not play before and lives in config/unlocks.js; everything here is a mark on something you
   already have, and a few of them happen to come with a colour. The tier id moved with the name (`earned`). */
/* v28 (item 1, build 53): SECRET SITS BELOW EVERY OTHER TIER. This object's key order IS the order the Achievements tab draws its groups in
   (ui/screens/progress.js walks Object.keys), so moving `secret` to the end moves it under Earned, Pro and the three key sets in every filter
   — Aiden's reason: they were getting in the way of the ones you can chase. It also loses its red: a Secret row and its heading are drawn like
   a locked ordinary row now, which is L.2's rule (white until earned, green once, never red) finally applied to the one group that broke it. */
export const TIERS = { earned:['Earned','Picked up as you play. Some come with a colour, a background or a sound pack.'], pro:['Pro','harder. bragging rights, a few unlock things'],
  // v18 (B.25, build 32): three sets tied to the keys — one row per game per key and one for the whole key. The second
  // and third sets are not shown before chest 1 (A.1); ui/screens/progress.js filters them on tierOpen
  // v24 (D.2, build 44): each key set now opens with one row on every clearance bar — 30 of them — before a game's set and the whole key
  key1:['Skill key','one on every clearance bar, then a game, then all of them'], key2:['Pro key','the same, at the Pro bars'], key3:['Author key','the same, against the author'],
  secret:['Secret','they exist. what earns them is not written down'] };
export const KEY_ACH = { game:'{game} · {key}', gameHow:'Clear every {game} bar on {key}', whole:'{key} · whole', wholeHow:'Clear every bar on {key}', shut:'on {key} · revealed by an earlier chest' };
// the progress rules' own wording: length locks without a rule, the practice row, the Author rows
export const PROGRESS = { finishOne:'finish one {game} {prev}', finishA:'finish a {game} {prev}', streak:'Streak', practiceFrom:'Practice from a later note', beat:'Beat Aiden — {rec}', none:'—' };

// the one-liner under the ghost demo, the first time a mode is played
/* v16 (§5 / A.3): ONE LINE, and nothing under it. The subtitle is gone from every row — it is the second line Aiden
   called too much information, and anything that needs one does not belong on an intro screen. The word-by-word reveal
   went with it (run/run.js). The line itself STAYS: he asked for it on 2026-09-04 and again on 2026-09-05, and it is
   what teaches the rule. Cowork's earlier idea of moving the rule into the 3-2-1 top strip is superseded and not built. */
/* The Verdict Desk (Aiden, 2026-09-13; built at build 35 from _review/2026-09-13_personal_verdict-desk-edits.md): twelve of
   the thirteen lines are his words now. Quick Tap · Two keeps the line it had — he did not change it. */
export const INTRO = {
  'quick-tap:two':  ['Tap the box when it lights up.'],
  'quick-tap:four': ['Four buttons this time!'],
  'dots:blind':     ['Tap as many dots as you can.'],
  'dots:lead':      ['Tap the dot.  The outline leads the way.'],
  'hold:grow':      ['Grow your shape to match the area.'],
  'hold:cut':       ['Cut the shape to the target %.'],
  'sequence:solo':  ['Copy the notes.  How far can you get?'],
  'timing:stopwatch':['Stop the watch at the target time.'],
  'timing:hidden':  ['Tap the ball when it reaches the outline.'],
  'reaction:flash': ['Test your reaction time.'],
  'reaction:nogo':  ['Tap only when you see your shape.'],
  'spot:count':     ['Count how many of your shape appears.'],
  'spot:find':      ['Quickly find and tap your shape.'],
};
// v16 (A.3): the first run of each GAME ends its intro here instead of dropping straight into the 3-2-1 — one tap, once
export const INTRO_READY = { ready:'Ready?', tap:'tap to begin' };
// verdicts: tiered by a per-game quality 0..1 (progress/rules.js QUALITY) — five steps, worst first
/* v17 (B.25, build 29): the five-line VERDICTS table moved to config/verdicts.js, with the thresholds that pick one
   beside it — four tiers now, five lines each, a colour and a sound per tier. What is left here is the handful of
   verdicts that are NOT a tier: a run that ended badly enough to have its own sentence, and the two-player lines. */
// the verdicts that are not a tier
// v18 (B.1c): `nogoFail` is retired with the three-wrong-taps ender — a Go / No-go run cannot end early any more
export const VERDICT = { fail:'Run over — go again.', nothing:'Nothing landed. That was a choice.', moreMisses:'More misses than hits. You know what you did.',
  draw:'A draw. Nobody gets to blame anybody.', took:'Player {n} took it{how}. No excuses.', practice:'Practice. Nothing counted — go for real when it feels right.' };

// the menu, the pick sheet, the lock box
// v14 (build 20): 3.2 made every requirement name its own game, so the card's own {game} said it twice — "9 hits, no misses,
// in a Quick Tap Dash · Quick Tap → Quick Tap · Four". The requirement carries the game now; the card just points at what it opens
/* v15 (2.2): two labels, not one. The card has always shown the next thing in the UNLOCK chain while calling itself
   "Next achievement" — unlocks outrank achievements everywhere the next thing is surfaced, so the card says which it is.
   `nextAch` is only ever reached once the whole chain is finished (progress.js nextGoal). */
/* v17 (B.20, build 29): `note` is gone. "play one run · the rest opens" sat under a menu whose every other item was
   already struck through — the strikes say it, and the first run un-strikes them one at a time (v15 6.2). */
// v23 (L.11a, build 40): `cusNeed` sits under the crossed-out Customise row until the Games chest opens
// v24 (A.1, build 43): `keysNeed` sits under the crossed-out Keys row until the Games chest opens — the Customise treatment
export const MENU = { next:'<em>Next unlock</em><span>{need} → {name}</span>', nextAch:'<em>Next achievement</em><span>{need} → {name}</span>', cusNeed:'open the Games chest', keysNeed:'open the Games chest' };
/* v15 (2.4): the Unlocks screen — the chain on its own page, split off from Achievements. Everything that OPENS something
   lives here; Achievements keeps the rest. What sits behind keys 2 and 3 is register #372 and is not decided, so the key
   line below says only what is true today. */
// v28 (item 4, build 53): `hint` and `lede` retired with the grey helper text — PROGRESS_SCREEN.count is the one line on this tab now
export const UNLOCKS_SCREEN = { title:'unlocks',
  games:'Games and modes', lens:'Lengths', keys:'Skill key', done:'open', locked:'locked',
  // v17 (B.9): the number is a placeholder now. The count moved when Sequence lost 5 keys and it will move again the next
  // time a mode is added, and a written-out "thirty-one" is exactly the second copy of a fact L6 forbids everywhere else
  keyLine:'The first key is earned here. Beat a clearance bar once in a solo run and it is cleared for good — the key screen has all {n}.' };
/* v18 (B.31, build 33): THREE tabs on one menu item. Unlocks and Achievements were split at build 23 (v15 2.4) because
   they are different things — an unlock opens something, an achievement marks something you already have — and that
   distinction is worth keeping; two menu rows for it was not, so build 29 made them tabs. Build 33 brings Customise in
   beside them: nearly every cosmetic in it is opened by an achievement one tab across. Unlocks becomes GAME unlocks,
   which says what it holds (the games, modes and lengths that gate play) and what it does not (a cosmetic, whose
   requirement stays on the Achievements tab — so no requirement is written twice on a screen that now shows all three).
   The order is unchanged and so is the reason for it: unlocks outrank achievements (2.2). The screen remembers which
   tab was last open, per profile. L6 is quoted: "the Unlocks screen" is the Game unlocks tab now. */
/* v23 (L.4, build 39): Customise is its own menu row again (v21 G.6) and the middle tab is the LIST of what can be earned
   there — CUSTOMISE UNLOCKS (guess; "Rewards" retired because it does not say unlock). A cosmetic's requirement is on that
   tab and nowhere else. `culGroup` heads its groups, one per Customise row a payout lands in (guess on the words). */
export const PROGRESS_SCREEN = { title:'progress', unl:'Game unlocks', cul:'Customise unlocks', ach:'Achievements',
  /* v28 (item 4, build 53): `unlHint`, `culHint`, `achHint` and `culLocked` are RETIRED — four lines of grey helper text saying what tapping a
     row does, on a screen made of rows. One line replaces all of them, per tab: how much of that tab is unlocked. On Achievements the total
     leaves Secret out until one has been found (R1) — the line may never say how many secrets there are. */
  count:'{done} of {total} unlocked',
  keyLocked:'open the Games chest',
  /* v29 Section A (58.3, build 58): the six tabs' own words. `needs` heads the two-or-one requirement rows at the top of a
     chest tab; `needKey` / `needModes` / `needGaunt` are those rows, and `met` / `todo` the state each wears (L.2: white
     until met, green once, never red). `shut` is what a chest tab shows in place of its rows while the tier that fills it
     has not been revealed — A.1's rule that existence shows and NUMBERS do not. `extras` is the Achievements tab's own
     line, now that it holds only what fits nowhere else. `whole` heads the one row that is the key entire. */
  needs:'To open it', needKey:'{key} — every bar cleared', needModes:'Every game and mode — {open} of {total}',
  needGaunt:'{name} — finish one run', met:'done', todo:'not yet',
  shut:'Revealed when the chest before it opens', whole:'The key entire',
  extras:'Added extras', gauntBest:'best {n}%',
  culGroup:{ sq:'Target colours', lead:'Lead colours', cut:'Cut pieces', bg:'Backgrounds', snd:'Tap sounds', scale:'Scales', rate:'Taps per second', wheel:'Colour wheel' } };
/* v17 (B.23 / B.24, build 29): the game-select grid says what order the games open in, and where that order ENDS.
   The chest needs key 1 — every clearance bar cleared — and A.1 forbids anything about pro or author appearing before
   it is opened, so a locked chest says what it takes in key-1 terms and an opened one says only what it gave. */
/* v23 (L.10 / L.11, build 40): FOUR chests, named by what opens them and never numbered — Games, Key, Pro, Thorns. The Games chest
   REPLACES v21 G.3's gate, so "unlock all games first" is retired with the gate symbol: the Games chest's locked line is the chain's
   own count (L.10c). Every chest after it keeps "open the previous chest" (G.1), and once the one before it is open a locked chest
   reads the meter and the figure it opens at (L.8a — every surface reads the meter). An opened chest's own line is plain; what it
   GAVE is CHEST_WORDS below, the column beside it. Placeholder wording, one line each to change.
   v26 (item 12, build 48): a key chest that is not ready says WHAT OPENS IT, IN WORDS, with no percentage — whether the chest ahead of it is
   shut or not — so `chestMeter` ("203% · opens at 300%") is retired. `chestEarn` is one line per chest (Aiden: "Earn the Pro key", "Earn the
   Author key"). The Games chest keeps its count of modes.
   v26 (Aiden's answers after build 48, built for build 49): not "Earn the key" — THE FIRST KEY IS THE SKILL KEY, beside the Pro key and the Author
   key, whose wording stays as it is. The name is `name` in config/keys.js; this line, the Games chest's word and the two headers above follow it. */
/* v27 (item 4, build 51): THE CHESTS ARE GAMES / SKILL / PRO / AUTHOR, and `chest` here is THE ONE SOURCE — the only place in config/ any of the
   four names is spelled. "Skill chest" became SKILL chest (it is the Skill key that opens it, item 3) and "Author chest" became AUTHOR chest (the
   Author key). R2: a chest matches the key that opens it, in name as well as in colour and design. Lantern, Circuit and Thorn stay the names of
   each key's BACKGROUND and MUSIC and are never shown as a key or a chest. The ids do not move — `key` and `thorns` are store keys (core/store.js
   v4 → v5) and config ids, and renaming them would retire every saved profile's chests for a copy change.
   Everything a player or the catalogue can read comes from here: the map's tiles (ui/screens/pick.js fills them, so index.html carries no name),
   the ceremony's line, the Keys screen, Customise, Testing, the Messages list (ui/screens/about.js composes it from `chestNeed`), the Gauntlet toast (`chestOpenIt`) and the
   catalogue's chest cards. The gate drives the map and the Messages list and reads the names back off the page. */
export const GRID = { chest:{ games:'Games chest', key:'Skill chest', pro:'Pro chest', thorns:'Author chest' },
  // what a line that has to NAME a chest says — one template, filled with `chest` above, so no second spelling of a name exists anywhere
  chestNeed:'the {chest}', chestOpenIt:'Open the {chest}',
  chestModes:'unlock every game · {open} of {total}', chestModesToast:'Unlock every game first<small>{open} of {total} modes unlocked</small>',
  chestEarn:{ key:'Earn the Skill key', pro:'Earn the Pro key', thorns:'Earn the Author key' }, chestOpen:'tap to open', chestOpened:'opened', tba:'tba',
  chestPrev:'open the previous chest', chestPrevToast:'Open the previous chest first',
  /* v29 Section A (58.2, build 58): a chest that wants TWO things lists both and ticks each as it is met — the key it
     already named, and a finished Gauntlet. One line per requirement, joined by a newline (the tile's `::after` is
     `white-space:pre-line`), so the tile says what is left rather than only what is missing first. A chest whose chest
     ahead is still shut keeps "open the previous chest" and says nothing about either (A.1 / G.1, untouched). */
  chestTick:'✓ {line}', chestTodo:'· {line}', chestGaunt:'Finish {name}',
  /* v30 (59.6, build 59): what a chest tile says when its KEY is in hand and its Gauntlet is not. 58.2 had the tile list both
     requirements and tick each, which on the Author chest wrapped to four lines and ran over the chest drawing and its red
     strike. The tile carries ONE line now, following the state, so it always fits; this is the second of the three. */
  chestGauntWield:'Finish {name} to wield it',
  chestGauntToast:'Finish {name} first' };
/* v23 (L.11c, build 40): WHAT EACH CHEST GIVES, one entry per chest and a line per word, so Aiden can rewrite them on the next Desk.
   An opened chest shows them as a plain column to its right (L.11b animates them in build 41); nothing shows beside a chest that is
   not open. `tba` marks a placeholder reward — the 2026-09-10 cosmetic set and hard Gauntlet, reopened by L.11 — and none of these
   is a tap target yet (L.11b). §M.3 went unanswered, so this is the recommended set (guess): Author has waited for the Pro chest since
   build 38, so the Skill chest says PRO KEY rather than "PRO · AUTHOR REVEALED" and the Pro chest carries AUTHOR KEY; the Games chest
   also names THE KEY, because opening it is what reveals key 1 (L.10a). */
/* v23 (L.11b, build 41): EACH WORD IS A TAP TARGET to the thing it names — `to` is where: a screen id, `key:<n>` for that key's tab, or
   `soon` for a reward that is not built yet (Gauntlet, #382; the Pro and Thorns placeholders), which says so in a toast (guess). */
/* v25 (items 6 / 7 / 15, build 46): EVERY WORD NOW CARRIES ITS SYMBOL — `sym`, an id in SYMBOLS (config/chests.js). The same drawing pops
   out of the chest as it opens (item 6), stands beside the word here on the map (item 7) and sits in the congratulations card's row
   (item 22), so the player connects the three. Item 15 adds the key backgrounds: finishing a key makes its chest ready, so the chest that
   key opens is the one that gives its background away — the Skill chest the Lantern's, the Pro chest the Circuit's, the Author chest the
   Thorn's, each landing in Customise (`ITEMS.bg` in config/theme.js, locked on keyFinished since build 43). SKY is a placeholder word like
   every other on this list — one line each to change. */
/* v26 (items 5 / 13, build 49): THE GAUNTLETS ARE TILES NOW. The Skill chest gives GAUNTLET and the Pro chest GAUNTLET II, and each word goes to its tile
   on the map (`tile:<id>`, config/chests.js GAUNTLETS). The Author chest's "hard Gauntlet" is gone with the 2026-09-10 plan it came from, so its reward
   is open again. Every chest ALSO gives the About video it opens — that word is not listed here: ui/chest.js reads its title off config/messages.js, so
   renaming a slot renames it in the pop-out, on the map and on the card at once. */
export const CHEST_WORDS = {
  games:[{ w:'CUSTOMISE', sym:'palette', to:'s-custom' }, { w:'SKILL KEY', sym:'key', to:'key:0' }],
  key:[{ gaunt:'g1', sym:'gauntlet', to:'tile:g1' }, { w:'PRO KEY', sym:'keypro', to:'key:1' }, { w:'LANTERN SKY', sym:'bg-lantern', to:'s-custom' }],
  pro:[{ w:'AUTHOR KEY', sym:'keyauthor', to:'key:2' }, { gaunt:'g2', sym:'gauntlet2', to:'tile:g2' }, { w:'COSMETIC SET', sym:'cosmetic', tba:1, to:'soon' }, { w:'CIRCUIT SKY', sym:'bg-circuit', to:'s-custom' }],
  thorns:[{ w:'THORN SKY', sym:'bg-thorn', to:'s-custom' }] };
/* v26 (item 13, build 49): the two Gauntlet tiles and their placeholder screen — a title, "Coming soon" and Back, nothing else, because what a Gauntlet
   is gets designed separately. `need` is what a locked tile says, and its tap (guess on the words) */
/* v27 (items 2 / 4, build 51): a Gauntlet tile is INVISIBLE until its chest has opened (R1 — a secret shows nothing at all), so `need` is no longer
   on the map. It is kept for the toast a tap on a tile can still raise while a chest is being opened, and it names its chest through GRID.chestOpenIt
   rather than spelling one: `chest` is the id, filled at the callsite. */
/* v28 (item 10, build 53): GAUNTLET MINI AND GAUNTLET MEGA. Aiden dictated "from Gauntlet Mini and Gauntlet Mega" and it is read as "to"
   — confirmed in the outcome. This object is the ONE spelling of either name: the map tiles, the chest word that brings each one in, the
   Messages rows and their video titles, the placeholder screen and Testing all compose off it. The ids g1 / g2 do NOT move — they are store
   keys (prefs.gauntSeen) and a saved profile must not reset. `msgTitle` in progress/key.js is how a message row spells its Gauntlet. */
/* v29 (items 11 / 18, build 56): THE GAUNTLETS ARE REAL RUNS. `soon` stays for a Gauntlet with no roster; `intro` is the one
   first-play line each gets, the way every game has one (INTRO below). The score is a percentage of the bar, so 100 means the
   run matched it and there is no ceiling above that. */
/* v29 Section A (57.9, build 57): AIDEN'S OWN COPY, AND THE COUNT COMES OFF THE ROSTER. `intro` carries `{n}` — the number of
   STEPS in that Gauntlet's roster, filled by ui/screens/gauntlet.js — so the "8" cannot drift from the run the way a typed
   number would. `oneWay` is RETIRED: "nothing under the list on either". `go` is ENTER THE GAUNTLET on both (he said it of
   Mini; Cowork's reading is both). `roundsEach` / `roundsPair` / `modePair` are 57.9's one-row Estimate: its two plays are
   one step of the run and one spoke on the web, so they are ONE row — "2 rounds each" on Mini, "7 + 10 rounds" on Mega. */
export const GAUNTLET = { name:{ g1:'Gauntlet Mini', g2:'Gauntlet Mega' }, msgTitle:'The {name}', toast:'{need} first', soon:'Coming soon',
  intro:{ g1:'{n} short games back to back. No retries, one final score.', g2:'{n} full length games back to back. Do you have what it takes?' },
  go:'Enter the Gauntlet', again:'Again, from game one',
  /* v29 Section A (58.2, build 58): a FINISHED Gauntlet is marked on its own map tile — a tick, and its best score under
     it — because finishing one is now what opens the next chest and the map is where a player looks to see what is left. */
  done:'best {n}%',
  pct:'{n}%', noBar:'—', board:'Your best', barLine:'100% is the bar. Past it is past the bar.',
  /* v30 (59.12d, build 59): THE WORKING, on the row. Aiden: "I don't know how I got 310%." Each row now shows what he scored and the
     bar it was measured against, so a figure can never again be unexplainable. `cap` marks a row the 150 ceiling caught, because a
     capped row is the one place the arithmetic on screen would otherwise not reach the percentage beside it. */
  work:'{you} · bar {bar}', workCap:'{you} · bar {bar} · capped at {cap}%',
  /* and what the bar IS, said once under the list rather than assumed. The Author column is #426 placeholders until Aiden plays his
     own numbers in (#371), so the screen says so rather than presenting a guess as his. */
  barTier:'Bars: the Author column, provisional until Aiden plays his own in.',
  round:'1 round', rounds:'{n} rounds', roundsEach:'{n} rounds each', roundsPair:'{a} + {b} rounds', modePair:'{a} + {b}' };
// v23 (L.11b, build 41): what a word whose reward is not built yet says when tapped (guess)
export const CHEST_SOON = '{w}<small>not built yet · a later build</small>';
export const SHEET = { mode:'Mode', toUnlock:'To unlock: {need}', tileUnlock:'to unlock: {need}', locked:'locked', noRun:'no run yet', best:'best', closest:'closest',
  practiceFrom:'practice from', off:'off', pracLocked:'locked · 8 notes in 7 keys',
  // v15 (4.5): Sequence versus asks for two things — the keys (the length row) and how many notes it opens with. The second
  // one sits in the row Practice from already uses, so the sheet gains no new furniture (L9)
  opens:'open with', notes:'notes',
  // v14 (7.1): the result screen's button is Try again until something is changed, and only then does it become Go
  // v15 (6.5, build 26): goEach ('Go · {n}s each') and goPass ('Go · pass & play') are retired — a pass & play Go says just Go
  // v21 (F.5, build 35): and so does versus — goVersus ('Go · versus', GO VERSUS on screen) is retired the same way
  go:'Go', tryAgain:'Try again', passTitle:' · pass & play', versusTitle:' · versus',
  chalScored:'A friend scored ', chalBeat:' — beat it', chalSent:'A friend sent you this one' };
export const LOCK = { text:'{name}<b>To unlock: {need}</b>' };
// v14 (4.2): the sub-copy under the two-player picture is gone — no "take turns on one phone", no "{n} seconds each", no grey
// line under Pass and Play. The phones carry the player labels instead (4.3 / 4.5). Versus keeps one line, because 4.14 changed what wins
// v15 (4.5 / 4.6): Sequence versus is lives, not Compose, and Spot · Find has a versus line for the first time
export const VS_LINE = { sequence:'{n} lives each · the pattern grows a note a round · last one playing wins', reaction:'first to tap after the flash wins the round · early tap loses it', spot:'two shapes, one each · first to find theirs takes the round', lead:'first to {t} · or lead by {n}' };

// the run's HUD and the versus / pass & play screens
// v24 (D.1, build 44): `keyGoal` is the goal line when the chain has nothing for this run — the combination's nearest key requirement
export const HUD = { goal:'<i>goal · <b>{need}</b></i><u>unlocks {name}</u>', aim:'<i>goal · <b>{aim}</b></i>', keyGoal:'<i>goal · <b>{need}</b></i><u>{name} · {key}</u>', goalHit:'✓ ', best:'best {score}', versus:'versus', pass:'pass & play',
  vsLead:'first to {t} · or lead by {n}', vsQt:'tap your white square', vsDots:'squares vs circles · wrong shape gives them the point', level:'level', lead:'{who} +{n}',
  draw:'draw', wins:'Player {n} wins', byLead:'by {n}', onClock:'on the clock', skipIn:'skip in {n}', skip:'skip' };
// v14 (4.7 / 4.9): the game name sits in its usual place at the top, whose turn it is is the biggest thing on the screen, and
// player 2 is told what there is to beat — the score, and the pace behind it where the game has one
export const PASS = { eyebrow:'{game} · pass & play', up:'your turn', hand:'hand the phone over', beat:'to beat', rate:'{n}/s' };
/* v15 (§4, build 25): the words the SHARED pass & play uses — the games that alternate inside one run rather than playing
   two whole runs with the hand-over screen between. One set for all of them, so Estimate, Timing and Reaction cannot drift
   apart the way three copies of the same card would */
export const TWO = { ready:'hand the phone over<br>tap when ready', hud:'{who} · turn {n} of {s}',
  lowest:'on the lower score', highest:'on the higher score' };
// v15 (3.8 answer, build 25): a Streak's score IS the round it reached, and it used to sit there as a bare number. It says
// so now — the retune in 3.8 is unmeasured play, and the only way to report whether it runs long is to read the round off
// the result screen. `word` is the mode's own scoreWord (rounds, or shapes on Go / No-go)
export const RESULT = { streakUnit:'<span class="unit">{word} reached</span>',
  practice:'practice', fail:'run over', best:'new best', pass:'pass & play', versus:'versus', dash:'—', lowerMark:'<span class="dn">▼</span>',
  rank:'rank <b>{n}</b> of 10 · {name}', outside:'outside the top 10 · {name}', you:'you', practiceNote:'practice · nothing recorded', twoNote:'two players · nothing recorded',
  top:'top 10 · {where}', closestFirst:' · closest first', noRuns:'No runs here yet.', peak:'peak', notes:'{n} notes' };
export const BOARD = { rank:'rank', score:'score', date:'date', lowerMark:' ▼' };
export const SHARE = { text:'{name} scored {score}{rate} on No Excuses · {where}. Beat it: {url}', someone:'Someone' };

// About, Customise, Achievements
export const ABOUT = { tier:['No ads, ever.','Every colour, background and sound pack open from day one, plus the colour wheel.','A star on your profile.'],
  supTitleOn:'Supporter · thank you', supTitleOff:'Support · A$1.99 · once', supTextOn:'Thank you — it keeps this going.', supTextOff:'A one-off, if you want to back it.',
  devOpen:'open everything is ON · every mode and cosmetic available', devProg:'progression ON · {u} of {nu} modes earned · {a} of {na} achievements',
  devRuns:' · {r} runs on record · ', devSup:'supporter ON', devFree:'free tier · ads on',
  // v18 (B.26, build 32): a button per animation, dev only (S5). Each plays the real animation with nothing stored
  // v21 (F.2, build 35): the audio context read out live — its state, how many times it has been rebuilt, the last thing that happened
  // v22 (§J.1, build 36): the clock beside the state — the state is the value that lied. STOPPED is a running state with a still clock
  devAudio:'audio · {state} · clock {clock} · context {gen}{why}', devClock:'+{dt}s in {wall}s', devClockStopped:'+0.000s in {wall}s · STOPPED', devClockWait:'measuring',
  devAnim:'animations · nothing is stored', devKeyIn:'key arrival', devSeg:'segment advance', devWhole:'key complete', devChest:'chest {n} opening',
  // v23 (L.8f, build 40): the meter as the app reads it right now, and whether Testing's override is what it is reading
  // v28 (item 9, build 53): Testing is the one screen that works in the RAW meter (three bands of 100); everywhere a player looks it is meterPct(), 0–100
  devMeter:'meter · {n} of {max} raw · {pct}% shown · read off what is stored',
  /* build 33: Send feedback, the beta channel's missing half. GitHub Pages was already the way a tester gets the build;
     what was missing was the way back. It is a mailto and nothing more — no form, no endpoint, no third party — with
     the build, the device and the last run filled in, because those are the three things a bug report is useless
     without and the three a tester will not think to include. The body is pre-filled; what they write is their own. */
  fb:'Send feedback', fbTo:'info@somethingstrange.com.au', fbSubject:'No Excuses {build} — feedback',
  fbBody:'What happened:\n\n\nWhat you expected:\n\n\n---\nBuild {build} · {when}\n{device}\nLast run: {run}',
  fbNoRun:'none yet' };
// v14 (8.9): the `customise · {game} · colours are per game` line at the top is gone — the game chips and the group labels
// under the preview say both, and the eyebrow was the first thing on a screen that did not need an introduction
/* v17 (B.32): the two music rows. `track` is the per-game choice, `menu` the front-of-app loop's own switch. A locked
   track row says NOTHING about what opens it — A.1 forbids the pro and author tiers appearing anywhere before chest 1,
   and "a plain padlock, no tier text" is the whole of the requirement. */
/* v18 (B.28, build 33): one music row, called Music, and it is the track. `music` / `track` / `preview` are gone with
   the three controls they labelled — the row is the track's own name and a tap plays it. `lockLine` is B.30's line,
   which now sits under the row it is about instead of over it. */
export const CUSTOM = { menu:'Menu music', lockLine:'Locked · {name} — {how} · <u>show me</u>', wheel:'{word} · {game} · drag to pick',
  /* v28 (items 2 / 3, build 53): the Everywhere row is gone — `perGame`, `openChest` and `themeOn` went with it. The Music row holds the key
     tracks now, and a locked one names the KEY that opens it (config/keys.js `name` — Skill key / Pro / Author, item 3), not its chest. There is
     no "show me" on that line: a key is not an achievement row and there is nothing on Progress to show. */
  lockPlain:'Locked · {how}' };
// v14 (8.1): a row whose requirement is a SET of things says which are left, not just how far along the bar is.
// v14 (8.5): a secret row shows its own `hint` where an ordinary row shows `how`; `stretch` is the fallback for one without
export const ACH_SCREEN = { all:'All', done:'done', secret:'secret', hidden:'???', progress:' · {p}% of the way there', stretch:'A stretch past the stretch. You will know.', inGame:' · in {game}', left:' · still to play: {names}' };

/* the key (build 22, v14 §9.2–9.7). A second progression system, not a picture of the first: seven roots growing inward
   as clearance bars are cleared. "clearance bar", never "minimum bar" — nineteen of the thirty-one are ceilings (C.7) */
export const KEY = { title:'the key', hint:'tap a game · solo runs only',
  lede:'Beat a clearance bar once in a solo run and it is cleared for good. A root grows by the share of that game’s own combinations cleared.',
  // v17 (§A.6.5 / A.6.7): the cleared count and the percentage together — the count is what a player acts on, the
  // percentage is what makes it move. It replaces the bare "0 of 31" line here and the same line goes on the menu
  // v26 (item 9, build 48): "1 of 30" and nothing else — each key's card carries its own percentage and the menu the total, so the line under the
  // key printed a second figure beside the card's ("3%" on the card, "1 of 30 · 103%" under it). One figure per thing, all off the same store
  count:'{done} of {total}', whole:'the key is whole', root:'{done}/{total}',
  // v18 (B.15, amending A.6.5): the FRONT of the app says the percentage alone — "67% complete" — and the cleared count
  // stays on the keys screen. (B.17's re-base at Pro is retired at build 40 — the number is the meter, progress/key.js meter())
  // v23 (L.8a, build 40): the percentage is the METER — "142% complete" — and a chest waiting to be opened says so. v26 (item 9, build 48):
  // 0–300, the three keys, and this is the one place the total is printed
  menu:'{pct}% complete', menuReady:'{pct}% · the {chest} is ready',
  cleared:'cleared', open:'not yet', floor:'{bar} or more', ceil:'{bar} or less',
  advance:'{game} · {name} cleared', toast:'Key · {game} · {name} cleared',
  none:'no bar set', mismatch:'{n} combination(s) have no clearance bar: {keys}',
  // v24 (E, build 44): `set` is a number Aiden set by hand — every key 1 bar and the twelve Quick Tap and Dots Pro bars
  conf:{ set:'set by Aiden', high:'anchored', med:'reasoned', low:'judgement' },
  /* v15 (§5, build 26). The menu item is Keys, plural (5.3): three tiers over the same thirty-one combinations (A.1),
     each with its own symbol, its locked state and a % while it is under 100. Tiers 2 and 3 are a shell — #372 — and
     `soon` is what they say instead of a target nobody has set (A.2 forbids a build deriving one). */
  keys:'keys', pct:'{n}%', locked:'locked', unlocked:'unlocked', pick:'tap a key',
  // v23 (L.7b, build 42): the button at the foot of a key screen whose chest is open, and what it reads once that theme is every run's music
  setMusic:'SET THIS MUSIC', musicOn:'PLAYING EVERYWHERE',
  faked:'Every number on this key is a PLACEHOLDER, derived from key 1 for testing. Not set by hand, never saved, gone on reload.',
  /* build 38 (#426, A.2 amended): both columns carry GENERATED placeholders, and a generated number on screen says so.
     `soon` is what a tier says if a column ever has an empty cell again */
  soon:'Not set yet. At least one bar on this key has no number — not a placeholder, and not one set by hand.',
  // 5.2: a clearance-bar row is a way IN. Tapping it starts that combination with the bar pinned at the top of the run,
  // through the same goal line an unlock uses (2.2) — one mechanism, not two
  aim:'{name} · {want}', rowGo:'tap a row to go and try it',
  // v18 (B.20, build 32): the key is whole. v23 (L.12, build 40): and the key itself is the way to its chest (guess on the words)
  complete:'{key} is whole', completeSub:'tap the key to go to its chest', completeOpen:'tap the key to see what its chest gave',
  /* v23 (L.8b, build 40): "Open the chest?" and "Would you like to progress to {key}?" are RETIRED with the double confirmation, and so
     are B.19's "needs {key}" lines — a chest reads the meter now. A chest opens on the key screen by itself; `opened` is what it says */
  opened:'{chest} opened',
  /* v24 (C.1, build 43): the key screen never opens a chest by itself any more — the key is tapped, it ASKS, then it opens. A deliberate
     trigger, not batch 16's retired mid-flow step (both stand). `completeReady` is the hint under a whole key whose chest is waiting;
     `quietReady` is the quiet screen's line once every mode is unlocked (guess on the words) */
  /* v29 Section A (58.2, build 58): a whole key whose chest ALSO wants a finished Gauntlet. Before 58.2 the only two
     states a whole key could be in were "its chest is waiting" and "its chest is open"; now there is a third, and the
     hint has to name the thing standing between the two rather than saying "tap the key to go to its chest" and sending
     the player to a chest that will not open. The tap still goes to the map, where the Gauntlet's own tile is. */
  completeGaunt:'{name} first · tap the key to find it',
  /* v30 (59.6, build 59): THE GAUNTLET REQUIREMENT LIVES ON THE KEY NOW. Aiden, on the Author chest's tile running over its own
     drawing: "let's just do earn the author key. And maybe instead of having the gauntlet there, we should say in the key, it
     only can be wielded by the mega gauntlet or something like that." This is that line, on the Keys screen, standing from the
     moment the tier is open rather than only once the key is whole. The Gauntlet's NAME comes from GAUNTLET.name, which is the
     one place either is spelled (v28 item 10), so "the Mega Gauntlet" of his dictation reads "Gauntlet Mega" here. */
  wield:'Only {name} can wield it.',
  ask:'Open the {chest}?', askYes:'Open', askNo:'Not yet',
  /* v30 (59.14, build 59): "TAP TO OPEN" — not "tap the KEY to open". Aiden tapped beside the key and landed on the home page:
     "really wherever the user clicks it should just take them to the chest because that's going to be what they want to do and it
     only happens once. So let's do that for all keys." The wording follows the rule rather than describing the old target. */
  completeReady:'tap to open the {chest}',
  quietReady:'Every game mode is unlocked. Tap the key to open the Games chest.',
  // v23 (L.6, build 41): the ceremony holds on this until it is tapped — it is not skippable before it
  tapOn:'tap to continue',
  /* v23 (L.10a, build 40): before the Games chest the key screen shows only the modes count, the meter and the four chests (guess on the words) */
  // v26 (item 9, build 48): no percentage on this screen's bottom line either — before the Games chest the meter is 0 by construction
  quiet:'Unlock every game mode and the Games chest opens the key.', quietCount:'{open} of {total} modes',
  gamesChest:'open the Games chest', gamesToast:'Open the Games chest first — every game mode unlocked opens it',
  // v21 (G.2 / v20 D.7, build 37): all three keys are on the strip from the start. A locked one is crossed out with what opens
  // it underneath — the locked-mode pattern, SHEET.toUnlock around this — and nothing about its numbers (v17 A.1, narrowed)
  prevChest:'open the previous chest', lockedToast:'Open the previous chest first — this key’s numbers stay hidden until then' };

// the engines' own words
export const SEQ = { copy:'copy the notes', yourTurn:'your turn', whoTurn:'{who} · your turn', watch:'round {n} · watch', round:'round {n}',
  compose:'tap in a tune · up to 8 notes', composeHud:'{who} · compose · up to 8', composeN:'{who} · {n} of 8', listen:'listen · then copy it', listenHud:'{who} · listen',
  wins:'{who} wins', draw:'draw', practice:' · practice', pass:' · pass & play', comp:' · versus', hud:'{n} keys{tail}', missNote:'on a missed note', longer:'on the longer copy', notes:'{n} notes',
  // v15 (4.5): versus is lives-based. Compose — tap in a tune, the other copies, longest copy wins — is retired with it
  vsHud:'{who} · {a} – {b} lives', vsLives:'{n} lives each', vsOut:'{who} is out', vsRound:'round {n} · {k} notes', vsLost:'on lives', vsLives2:'{n} lives' };
// v14 (6.11 / 6.12): the shape you grow is drawn centre-top on every round, the same one you are told about, so nothing has to
// say where it is. "same area · your shape is top right" is gone
// v17 (B.3): `watchDiff`, `watch`, `sameArea` and `sameShape` are retired. They were the footer line #hlbl carried on
// every round — and "same shape · it has been turned" is the one Aiden named. The dashed target outline stays over the
// reveal (v15 3.3) and says the same thing without words; `hold` and `drag` keep the one instruction that is actionable
export const ESTIMATE = { hold:'tap and hold',
  money:'on the money', close:'close', closeCut:'close!', much:'too much', little:'too little', target:'target', yours:'yours', piece:'piece', px:'px²', targetPx:'target {n} px²', targetShare:'target {n}%', off:' off',
  missed:'the line missed the shape · <b>{share}%</b> again', drag:'tap and drag a line to cut the shape', draw:'tap and draw a line', shareTarget:'<small>target</small>',
  hudStreak:'Round {n} · {tot}% of 100%', hudSet:'Round {n} of {s}', diff:' · different shape', same:' · same shape' };
/* v31 (60.4 / 60.12 / 60.18, build 60): the allowance-Streak round screen's own words, spelled ONCE for the three games that
   have one — Estimate · Grow, Timing · Hidden and Reaction · Flash. games/_shared/hud.js draws the block; this is what it says. */
export const ALLOWANCE = { freeEach:'{n}{u} free each round' };
export const TIMING = { target:'target', stop:'tap to stop the timer', marker:'tap when the ball has reached the marker', late:'late', early:'early', dead:'dead on', close:'close',
  // v15 (3.8): `budS` is gone. The Stopwatch Streak budget changes with the round (25s, 30s past round 10), so the engine
  // derives the text from the number it is actually playing — a literal here could only ever be a second, drifting copy
  /* v17 (B.1): a Stopwatch Streak carries TWO running totals, both in seconds, both climbing — the budget line (seconds
     OFF, against the budget) and the baseline on the target card (seconds the game has ASKED FOR). Measured 2026-09-11 at
     attempt 7: "21.71s of 25.00s" beside "26.90s asked". Neither number was wrong; nothing on screen said which was which,
     and the bigger of the two is the one that does not end the run. Both say what they are measuring now. */
  /* v18 (B.3d): `hudAttempt` is what a Stopwatch Streak's line says now — the attempt, and nothing else. `spentOf` is
     what the big number above it says instead of the round it had already been told: the seconds spent out of the
     budget, which is the running-total rule (B.13) stated once rather than twice. Hidden keeps `hudStreak`.
     v18 (B.4): `budPx` is retired — Hidden's budget is milliseconds now and the engine derives the text from the number,
     the same correction v15 3.8 made to the Stopwatch budget. `msU` is the unit, shared with the Hidden score.
     v18 (B.3d / B.2): `asked` is retired with the Streak line it belonged to; `askedSet` is back on the Set. */
  over:'{bud} reached · run over', hudStreak:'attempt {n} · {tot} spent of {bud}', hudAttempt:'attempt {n}', hudSet:'{n} / {s}',
  spentOf:'{tot} / {bud}s', msU:'ms',
  // v14 (6.18): what the game has asked for so far, against what it will have asked for by the end of the Set
  askedSet:'{tot}s of {all}s asked' };
// v14: the budgets are the engine's constants now, not numbers baked into a string — a Flash Streak spends what is over 250ms
// against 500ms (L5 / B.1), a Go / No-go Streak what is over 300ms against 1000ms (6.2 / L5). A wrong tap ADDS 150ms to a Go /
// No-go Set average (A.2) and SPENDS 300ms of a Streak budget (B.2): two currencies, two numbers, not to be harmonised (B.3)
/* v18 (B.6): `slow`, `again` and `of` are retired with the Flash Set's retake — "too slow · try again · attempt 2 of 5"
   threw the attempt away, so a Set measured only the attempts you happened to be quick on. A slow one scores FLASH_MAX
   and counts.
   v18 (B.1c): `wrong` ("wrong tap · {n} of 3") and `three` are retired with the three-wrong-taps run-ender. Every wrong
   tap is `wrongS` now, in both lengths, with what it cost under it — the cost is the whole of the penalty (L5).
   v18 (B.1b): `hudNogo` counts the ROUND and the correct taps inside it, not shapes and a tally of a dead ender. */
export const REACTION = { wait:'wait for it', tap:'TAP', early:'too early', noTap:'no tap', reached:'{bud}ms reached', ms:' ms', quick:'quick', good:'good', slowWord:'slow',
  takes:'Player {n} takes it', tappedEarly:'Player {n} tapped early', draw:'draw', wins:'Player {n} wins',
  ruleTap:['tap','only','the'], ruleNow:['now','only','the'], wrongS:'wrong tap', over:'run over',
  hudVs:'round {n} · best of {s}', hudNogoStreak:'round {n} · {over} of {bud}ms', hudNogo:'round {n} of {s} · {h} of {p}', hudStreak:'attempt {n} · {over} of {bud}ms', hudSet:'{n} / {s}',
  // v15 (3.5 / 3.6): the result reads down — what you did, what it is measured against, the difference, then where the run stands
  baseline:'baseline {n} ms', runTotal:'total {n} of {bud} ms', runAvg:'average {n} ms', earlyTap:'tapped early', earlyCost:'the attempt is spent',
  // v24 (F.3, build 44): Go / No-go's running counter in a Set — targets answered of the Set's fifteen (NOGO_COUNTER)
  nogoCount:'{h}/{t}' };
// v24 (F.6, build 44): the Count Streak's budget is COUNT_BUDGET in config/games.js, so the two lines that name it take {bud}
export const SPOT = { count:['count','the'], find:['find','the'], howMany:'how many?', right:'right · 0 off', said:'you said {k} · {off} off', of5:' · {off} of {bud}', over:' · run over',
  of10:'{t}s of 10s', total:'total {t}s', pen:' · incl. +{pen}s for wrong taps', fast:' · under the 0.5s leeway · −{n}s', tie:'both right · a tie', faster:'both right · Player {n} was faster', had:'Player {n} had it', nobody:'nobody had it',
  // v15 (4.6): Find versus. Each player hunts their OWN shape in the same crowd — the shapes on the field are all one colour,
  // as they have to be, so the rule bar is where the colours say whose is whose
  vsBar:'find yours', vsRound:'round {n} · first to {t}', vsTook:'Player {n} found theirs', vsMiss:'not either one', vsHow:'first to {t} rounds',
  draw:'draw', wins:'Player {n} wins', hudFindStreak:'Round {n} · {tot}s of 10s', hudFind:'Round {n} of {s} · {tot}s', hudTwo:'round {n} / {s}', hudCountStreak:'Round {n} · {off} of {bud} off', hudCount:'Round {n} of {s} · {off} off', over10:'{a}–{b} over {s} rounds' };

/* ---------- v25 (item 22, build 46): THE CONGRATULATIONS CARD ----------
   The last step of the shared reveal (ui/reveal.js), never over the top of the animation: a title in that chest's or key's own colour, up to
   three lines of WHAT YOU DID, a row of WHAT YOU GOT (the item 6 symbols with their titles), one line of WHAT'S NEXT, and a Continue button
   that only becomes tappable after about a second (REVEAL.cardGo in config/chests.js) so a tap left over from the animation cannot close it
   unseen. No sound of its own — the reveal's last chord is still ringing. Item 23 adds `msg` when the unlock opens a message from Aiden.
   Placeholder wording, one line each to change (guess). */
/* v26 (item 8, build 49): SHORTER AND CELEBRATORY. A big "Congratulations" in the chest's own colour, ONE "You …" line saying what the player did —
   one per chest, here, so Aiden can rewrite each on the board — and ONE line of what's next, phrased as a challenge. No "what you got" (the rewards
   have just flown out of the chest), no "what's next" heading, no percentage. `{total}` is the number of game modes. Then item 5's video button and
   Continue. The chest names stay Games, Key, Pro and Thorns (GRID.chest). */
export const CARD = {
  title:'Congratulations',
  you:{ games:'You unlocked all {total} game modes!', key:'You cleared every bar on the Skill key!', pro:'You cleared every bar on the Pro key!', thorns:'You cleared every bar on the Author key!' },
  next:'Next: can you open the {chest}?', nDone:'Every chest is open. That is all of it.',
  go:'Continue',
  // item 5: the video this chest opened in About, as a button
  msg:'A message from Aiden' };

/* ---------- v25 (item 23, build 46): THE ABOUT SCREEN'S MESSAGES ----------
   Eight slots, in unlock order (config/messages.js). An unlocked slot with a file plays inside the screen on a tap, captions on; an unlocked
   slot with no file yet shows the "video coming soon" frame; a locked one shows what opens it and nothing about what is in it (A.1's shape).
   Aiden records the clips and they drop in by filling a file name in — no code change (his decision, 2026-09-16). */
export const MSG = { title:'messages', lede:'Short messages from Aiden, as you go.',
  locked:'opens with {need}', soon:'video coming soon', play:'play', watched:'watched', count:'{done} of {total}',
  /* v27 (item 4, build 51): what a locked row says, composed from the slot's own `by` rather than written out per row. No chest, Gauntlet or game
     name is spelled twice — a chest fills `locked` with GRID.chestNeed × GRID.chest, and the three below take their own names the same way.
     v27 (item 8, build 52): FOUR KINDS OF LOCK, so four lines. `keyNeed` is gone with the three key rows it was written for.
     `lockedPaid` is Aiden's own sentence from item 8 ("Opens when you support the game"), lower-cased to sit in a column of lower-case lines. */
  lockedRun:'opens when you finish a {game} · {len}', lockedGaunt:'opens when you play {name}', lockedPaid:'opens when you support the game',
  noFile:'Not recorded yet — this slot is waiting for its clip.', capOff:'captions', capOn:'captions on',
  /* v27 (items 9 / 10, build 52): THE SHARED VIDEO PLAYER (ui/video.js). `close` is the line in dim grey at the foot of the screen — the whole of how
     the player is dismissed, because item 9 wants nothing over the picture and no knobs; a tap on the picture itself pauses and plays. */
  close:'tap outside to close',
  // v29 (item 10, build 55): a clip that will not load says so. It used to be a silent black rectangle with an empty caption strip and an
  // outline that never lit - a missing file, a 404 or an iOS NotAllowedError all looked identical, and identical to a clip with no sound.
  unavailable:'Video unavailable — tap outside to close',
  // v26 (item 5, build 49): how a video reads among a chest's rewards — its slot's own title. Add a word here ("Video: {title}") and every chest says it
  reward:'{title}',
  /* v30 (59.3, build 59): AND THE TITLE IS IN QUOTATION MARKS. Aiden on the Games chest's third reward: "You've seen them all!" read as a tab
     label or a sentence rather than the name of a video — "let's just put it in quotations so it's obvious, as that is the video name". The
     marks are DATA here and the wrapping happens at render time (`quoted()` in ui/chest.js), so no title string in config/messages.js carries
     punctuation it does not own and a slot renamed there needs no second edit. Typographic, not the straight ASCII pair. */
  quote:['“','”'] };
