/* No Excuses — every user-facing string (build 16, refactor stage 2). DATA ONLY (A2).
   `{name}` placeholders are filled by T() in core.js. Markup inside a string here is trusted (S1: it is config, not
   player data); anything player-typed is escaped by the caller before it is interpolated. Grouped by where it shows. */

// the two players (v11 / L4) — the span class carries the colour, so v14 (4.1) drops the colour word beside the name
export const PLAYER = { who:'Player {n}' };

export const TOAST = {
  devOpenOn:'Everything open · modes and cosmetics', devOpenOff:'Progression back on · only what you earned',
  supOn:'Supporter ON · no ads, all cosmetics, pro length', supOff:'Free tier · ads back on',
  fresh:'Fresh game · runs, unlocks, achievements and intros wiped',
  pracLocked:'Locked · Practice from · 8 notes in 7 keys', locked:'Locked · {name}',
  supAlready:'Already a supporter · thank you', supLater:'Purchases arrive in the app build · About → testing → supporter to try it',
  achievement:'Achievement · {name}', copied:'Copied · paste it anywhere',
  mig11:'Build 11 · {n} old Estimate / Timing / Reaction / Count run{s} retired — the scoring changed',
  // v18 (B.2 / B.4): Stopwatch · Set became a total and Hidden became milliseconds, so records in the old units go
  mig31:'Build 31 · {n} old Timing run{s} retired — Stopwatch · Set is a total now and Hidden is in milliseconds',
  // v19 (C.5 / C.6): Go / No-go scores over the 180ms gate and its Streak counts targets, so records in the old units go
  mig32:'Build 32 · {n} old Go / No-go run{s} retired — every tap scores over the 180ms gate now and a Streak counts targets',
  // unlock wording (v11): "Unlock game: Dots" for a game, "Unlock: Dash" for a mode or length
  unlock:'Unlock: {name}', unlockGame:'Unlock game: {name}', unlockPractice:'Unlock: Practice from',
};
// what an achievement opens, as a line under it
export const UNLOCK_WORD = { wheel:'unlocks the colour wheel', bg:'unlocks {bg} background', snd:'unlocks {v} sounds', item:'unlocks {word}' };
export const ITEM_WORD = { sq:'target colour', lead:'lead colour', cut:'cut piece colour', bg:'background', snd:'sound pack', scale:'scale', wheel:'colour wheel' };
export const BG_NAME = { stars:'stars', grid:'grid', rain:'rain', orbs:'orbs' };
// v13: Stretch is Pro (11.1); the Unlocks line says what the tier is for (11.2); Author (11.3) is Aiden's own records, placeholders until the final build
/* v17 (B.11): the first tier was called UNLOCKS and its line promised "every one opens something new". Six of its
   seventeen rows opened nothing at all — Clean · Sprint · Two, Pinpoint · Blind, Dead on, Under 200, Eight, Spotter — and
   the six that did opened a COLOUR, which is not a game, a mode, a length or a chest. So the word said one thing on the
   Achievements screen and another on the Unlocks screen two menu items above it. B.11 settles which is which: an unlock
   opens something you could not play before and lives in config/unlocks.js; everything here is a mark on something you
   already have, and a few of them happen to come with a colour. The tier id moved with the name (`earned`). */
export const TIERS = { earned:['Earned','Picked up as you play. Some come with a colour, a background or a sound pack.'], pro:['Pro','harder. bragging rights, a few unlock things'], secret:['Secret','they exist. what earns them is not written down'],
  // v18 (B.25, build 32): three sets tied to the keys — one row per game per key and one for the whole key. The second
  // and third sets are not shown before chest 1 (A.1); ui/screens/progress.js filters them on tierOpen
  key1:['The key','clear every clearance bar of a game, then all of them'], key2:['Pro key','the same, at the Pro bars'], key3:['Author key','the same, against the author'] };
export const KEY_ACH = { game:'{game} · {key}', gameHow:'Clear every {game} bar on {key}', whole:'{key} · whole', wholeHow:'Clear every bar on {key}' };
// the progress rules' own wording: length locks without a rule, the practice row, the Author rows
export const PROGRESS = { finishOne:'finish one {game} {prev}', finishA:'finish a {game} {prev}', streak:'Streak', practiceFrom:'Practice from', beat:'Beat Aiden — {rec}', none:'—' };

// the one-liner under the ghost demo, the first time a mode is played
/* v16 (§5 / A.3): ONE LINE, and nothing under it. The subtitle is gone from every row — it is the second line Aiden
   called too much information, and anything that needs one does not belong on an intro screen. The word-by-word reveal
   went with it (run/run.js). The line itself STAYS: he asked for it on 2026-09-04 and again on 2026-09-05, and it is
   what teaches the rule. Cowork's earlier idea of moving the rule into the 3-2-1 top strip is superseded and not built. */
export const INTRO = {
  'quick-tap:two':  ['Tap the box when it lights up.'],
  'quick-tap:four': ['Tap the white pad.'],
  'dots:blind':     ['Tap the dot where it lands.'],
  'dots:lead':      ['Tap the dot where it lands.'],
  'hold:grow':      ['Watch it grow. Tap and hold until yours matches.'],
  'hold:cut':       ['Draw a line through the shape.'],
  'sequence:solo':  ['Copy the notes.'],
  'timing:stopwatch':['Tap to stop the timer.'],
  'timing:hidden':  ['Tap when the ball reaches the marker.'],
  'reaction:flash': ['Tap the moment it goes white.'],
  'reaction:nogo':  ['Tap only the shape you were told.'],
  'spot:count':     ['Count the shape you were shown.'],
  'spot:find':      ['Find the shape you were shown.'],
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
export const MENU = { next:'<em>Next unlock</em><span>{need} → {name}</span>', nextAch:'<em>Next achievement</em><span>{need} → {name}</span>' };
/* v15 (2.4): the Unlocks screen — the chain on its own page, split off from Achievements. Everything that OPENS something
   lives here; Achievements keeps the rest. What sits behind keys 2 and 3 is register #372 and is not decided, so the key
   line below says only what is true today. */
export const UNLOCKS_SCREEN = { title:'unlocks', hint:'tap a locked row to see what it takes',
  lede:'Everything that opens something. The chain first — each game and mode earned in the one before it — then every length of every mode.',
  games:'Games and modes', lens:'Lengths', keys:'The key', done:'open', locked:'locked',
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
export const PROGRESS_SCREEN = { title:'progress', unl:'Game unlocks', cus:'Customise', ach:'Achievements',
  unlHint:'tap a locked row to see what it takes', achHint:'tap one to go play it' };
/* v17 (B.23 / B.24, build 29): the game-select grid says what order the games open in, and where that order ENDS.
   The chest needs key 1 — every clearance bar cleared — and A.1 forbids anything about pro or author appearing before
   it is opened, so a locked chest says what it takes in key-1 terms and an opened one says only what it gave. */
export const GRID = { chest:'Chest', chestLocked:'clear all {n} · {done} so far', chestOpen:'tap to open',
  chestDone:'Gauntlet — coming soon', chestToast:'Chest 1 opened · Gauntlet is not built yet',
  // v18 (B.19, build 32): the second and third chests, seen only once chest 1 is open (A.1). A locked one names its key
  // and nothing else; an opened one says what it gave (A.3: the cosmetic set; A.4: the hard Gauntlet, not built)
  chest2:'Pro chest', chest3:'Author chest', chest2Done:'Cosmetics — every colour and track', chest3Done:'Hard Gauntlet — coming soon',
  chest2Toast:'Pro chest opened · every colour, background and track is yours', chest3Toast:'Author chest opened · the hard Gauntlet is not built yet' };
export const SHEET = { mode:'Mode', toUnlock:'To unlock: {need}', tileUnlock:'to unlock: {need}', locked:'locked', noRun:'no run yet', best:'best', closest:'closest',
  practiceFrom:'practice from', off:'off', pracLocked:'locked · 8 notes in 7 keys',
  // v15 (4.5): Sequence versus asks for two things — the keys (the length row) and how many notes it opens with. The second
  // one sits in the row Practice from already uses, so the sheet gains no new furniture (L9)
  opens:'open with', notes:'notes',
  // v14 (7.1): the result screen's button is Try again until something is changed, and only then does it become Go
  // v15 (6.5, build 26): goEach ('Go · {n}s each') and goPass ('Go · pass & play') are retired — a pass & play Go says just Go
  go:'Go', tryAgain:'Try again', goVersus:'Go · versus', passTitle:' · pass & play', versusTitle:' · versus',
  chalScored:'A friend scored ', chalBeat:' — beat it', chalSent:'A friend sent you this one' };
export const LOCK = { text:'{name}<b>To unlock: {need}</b>' };
// v14 (4.2): the sub-copy under the two-player picture is gone — no "take turns on one phone", no "{n} seconds each", no grey
// line under Pass and Play. The phones carry the player labels instead (4.3 / 4.5). Versus keeps one line, because 4.14 changed what wins
// v15 (4.5 / 4.6): Sequence versus is lives, not Compose, and Spot · Find has a versus line for the first time
export const VS_LINE = { sequence:'{n} lives each · the pattern grows a note a round · last one playing wins', reaction:'first to tap after the flash wins the round · early tap loses it', spot:'two shapes, one each · first to find theirs takes the round', lead:'first to {t} · or lead by {n}' };

// the run's HUD and the versus / pass & play screens
export const HUD = { goal:'<i>goal · <b>{need}</b></i><u>unlocks {name}</u>', aim:'<i>goal · <b>{aim}</b></i>', goalHit:'✓ ', best:'best {score}', versus:'versus', pass:'pass & play',
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
  devAnim:'animations · nothing is stored', devKeyIn:'key arrival', devSeg:'segment advance', devWhole:'key complete', devChest:'chest {n} opening',
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
export const CUSTOM = { menu:'Menu music', lockLine:'Locked · {name} — {how} · <u>show me</u>', wheel:'{word} · {game} · drag to pick' };
// v14 (8.1): a row whose requirement is a SET of things says which are left, not just how far along the bar is.
// v14 (8.5): a secret row shows its own `hint` where an ordinary row shows `how`; `stretch` is the fallback for one without
export const ACH_SCREEN = { all:'All', done:'done', secret:'secret', hidden:'???', progress:' · {p}% of the way there', stretch:'A stretch past the stretch. You will know.', inGame:' · in {game}', left:' · still to play: {names}' };

/* the key (build 22, v14 §9.2–9.7). A second progression system, not a picture of the first: seven roots growing inward
   as clearance bars are cleared. "clearance bar", never "minimum bar" — nineteen of the thirty-one are ceilings (C.7) */
export const KEY = { title:'the key', hint:'tap a game · solo runs only',
  lede:'Beat a clearance bar once in a solo run and it is cleared for good. A root grows by the share of that game’s own combinations cleared.',
  // v17 (§A.6.5 / A.6.7): the cleared count and the percentage together — the count is what a player acts on, the
  // percentage is what makes it move. It replaces the bare "0 of 31" line here and the same line goes on the menu
  count:'{done} of {total} · {pct}%', whole:'the key is whole', root:'{done}/{total}',
  // v18 (B.15, amending A.6.5): the FRONT of the app says the percentage alone — "67% complete" — and the cleared count
  // stays on the keys screen. B.17: once the player steps into Pro the number is re-based (progress/key.js frontPct)
  menu:'{pct}% complete', menuWhole:'the key is whole · open the chest',
  cleared:'cleared', open:'not yet', floor:'{bar} or more', ceil:'{bar} or less',
  advance:'{game} · {name} cleared', toast:'Key · {game} · {name} cleared',
  none:'no bar set', mismatch:'{n} combination(s) have no clearance bar: {keys}',
  conf:{ high:'anchored', med:'reasoned', low:'judgement' },
  /* v15 (§5, build 26). The menu item is Keys, plural (5.3): three tiers over the same thirty-one combinations (A.1),
     each with its own symbol, its locked state and a % while it is under 100. Tiers 2 and 3 are a shell — #372 — and
     `soon` is what they say instead of a target nobody has set (A.2 forbids a build deriving one). */
  keys:'keys', pct:'{n}%', locked:'locked', unlocked:'unlocked', pick:'tap a key',
  soon:'Not set yet. What sits behind this key is still being decided — nothing here is generated, every bar is set by hand.',
  // 5.2: a clearance-bar row is a way IN. Tapping it starts that combination with the bar pinned at the top of the run,
  // through the same goal line an unlock uses (2.2) — one mechanism, not two
  aim:'{name} · {want}', rowGo:'tap a row to go and try it',
  // v18 (B.20 / B.16, build 32): the key is whole — the chest asks before it opens, and the opened chest asks about the next tier
  complete:'{key} is whole', completeSub:'the chest is waiting on game select',
  openAsk:'Open the chest?', openYes:'Open it', openNo:'Not yet',
  proAsk:'Would you like to progress to {key}?', proWarn:'The front of the app will stop showing 100% — it counts {key} from here. This cannot be undone. Are you sure?', proYes:'Yes, on to {key}', proNo:'Not now', proToast:'{key} · the front of the app counts it now',
  // B.19: the locked chests say which key they need and nothing about what is inside
  chestNeeds:'needs {key}', chestGetKey:'get the key to unlock', chestKeyLine:'{key} opens it' };

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
  baseline:'baseline {n} ms', runTotal:'total {n} of {bud} ms', runAvg:'average {n} ms', earlyTap:'tapped early', earlyCost:'the attempt is spent' };
export const SPOT = { count:['count','the'], find:['find','the'], howMany:'how many?', right:'right · 0 off', said:'you said {k} · {off} off', of5:' · {off} of 5', over:' · run over',
  of10:'{t}s of 10s', total:'total {t}s', pen:' · incl. +{pen}s for wrong taps', fast:' · under the 0.5s leeway · −{n}s', tie:'both right · a tie', faster:'both right · Player {n} was faster', had:'Player {n} had it', nobody:'nobody had it',
  // v15 (4.6): Find versus. Each player hunts their OWN shape in the same crowd — the shapes on the field are all one colour,
  // as they have to be, so the rule bar is where the colours say whose is whose
  vsBar:'find yours', vsRound:'round {n} · first to {t}', vsTook:'Player {n} found theirs', vsMiss:'not either one', vsHow:'first to {t} rounds',
  draw:'draw', wins:'Player {n} wins', hudFindStreak:'Round {n} · {tot}s of 10s', hudFind:'Round {n} of {s} · {tot}s', hudTwo:'round {n} / {s}', hudCountStreak:'Round {n} · {off} of 5 off', hudCount:'Round {n} of {s} · {off} off', over10:'{a}–{b} over {s} rounds' };
