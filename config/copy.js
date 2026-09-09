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
  // unlock wording (v11): "Unlock game: Dots" for a game, "Unlock: Dash" for a mode or length
  unlock:'Unlock: {name}', unlockGame:'Unlock game: {name}', unlockPractice:'Unlock: Practice from',
};
// what an achievement opens, as a line under it
export const UNLOCK_WORD = { wheel:'unlocks the colour wheel', bg:'unlocks {bg} background', snd:'unlocks {v} sounds', item:'unlocks {word}' };
export const ITEM_WORD = { sq:'target colour', lead:'lead colour', cut:'cut piece colour', bg:'background', snd:'sound pack', scale:'scale', wheel:'colour wheel' };
export const BG_NAME = { stars:'stars', grid:'grid', rain:'rain', orbs:'orbs' };
// v13: Stretch is Pro (11.1); the Unlocks line says what the tier is for (11.2); Author (11.3) is Aiden's own records, placeholders until the final build
export const TIERS = { unlock:['Unlocks','Earned along the way — every one opens something new.'], pro:['Pro','harder. bragging rights, a few unlock things'], author:['Author','beat the numbers Aiden set. placeholders until the final build'], secret:['Secret','they exist. what earns them is not written down'] };
// the progress rules' own wording: length locks without a rule, the practice row, the Author rows
export const PROGRESS = { finishOne:'finish one {game} {prev}', finishA:'finish a {game} {prev}', streak:'Streak', practiceFrom:'Practice from', beat:'Beat Aiden — {rec}', none:'—' };

// the one-liner under the ghost demo, the first time a mode is played
export const INTRO = {
  // v14 (6.5, carried from v13 5.1): Two says one thing and nothing under it
  'quick-tap:two':  ['Tap the box when it lights up.',''],
  'quick-tap:four': ['Tap the white pad.','four of them now'],
  'dots:blind':     ['Tap the dot where it lands.','anywhere on the screen'],
  'dots:lead':      ['Tap the dot where it lands.','the red ring shows the next spot'],
  'hold:grow':      ['Watch it grow. Tap and hold until yours matches.','the outline stays — match its area'],
  'hold:cut':       ['Draw a line through the shape.','cut off the share it asks for'],
  'sequence:solo':  ['Copy the notes.','then it is your turn · one more each round'],
  'timing:stopwatch':['Tap to stop the timer.','on the target · the clock fades at 1.5s'],
  'timing:hidden':  ['Tap when the ball reaches the marker.','it goes behind the wall first'],
  // v15 (3.5): an early tap no longer gives you the attempt back — it costs 400ms and spends it. The old sub-line
  // ("you start that one again") described the behaviour this build removed and would have taught the wrong thing
  'reaction:flash': ['Tap the moment it goes white.','tap early and it costs you 400ms'],
  'reaction:nogo':  ['Tap only the shape you were told.','three wrong taps end the run · the rule changes'],
  'spot:count':     ['Count the shape you were shown.','the rest are decoys · three mistakes end it'],
  'spot:find':      ['Find the shape you were shown.','the crowd grows every round'],
};
// verdicts: tiered by a per-game quality 0..1 (progress/rules.js QUALITY) — five steps, worst first
export const VERDICTS = {
  'quick-tap':['Warming up. Go again.','Solid. Now stop looking, start moving.','Quick. The next tier is close.','Sharp. Very sharp.','That is not normal. Keep it.'],
  'dots':['Finding the screen. Go again.','Landing them. Faster now.','Quick hands.','Sharp. Very sharp.','Radar. That is not normal.'],
  'hold':['Nowhere near. Feel the rate, not the shape.','Close-ish. Trust the count.','Good eye.','Machine-adjacent.','That is not normal. Keep it.'],
  'hold:cut':['Way off. Look at the whole shape first.','Getting there. Think in halves.','Good eye.','Surgical.','That is not normal. Keep it.'],
  'sequence':['Short memory. Go again.','Building. Say it out loud.','Long memory.','Very long memory.','That is not normal. Keep it.'],
  'timing':['Way off. Count it out loud.','Getting the rhythm.','Good clock.','Very good clock.','That is not normal. Keep it.'],
  'reaction':['Asleep. Go again.','Awake.','Quick.','Very quick.','That is not normal. Keep it.'],
  'spot:count':['Guessing. Slow down.','Half of them. Look at the whole screen.','Good eye.','Nearly all of them.','That is not normal. Keep it.'],
  'spot:find':['Slow. Scan, do not stare.','Finding them.','Quick eye.','Very quick eye.','That is not normal. Keep it.'],
};
// the verdicts that are not a tier
export const VERDICT = { nogoFail:'Three wrong taps. Run over — go again.', fail:'Run over — go again.', nothing:'Nothing landed. That was a choice.', moreMisses:'More misses than hits. You know what you did.',
  draw:'A draw. Nobody gets to blame anybody.', took:'Player {n} took it{how}. No excuses.', practice:'Practice. Nothing counted — go for real when it feels right.' };

// the menu, the pick sheet, the lock box
// v14 (build 20): 3.2 made every requirement name its own game, so the card's own {game} said it twice — "9 hits, no misses,
// in a Quick Tap Dash · Quick Tap → Quick Tap · Four". The requirement carries the game now; the card just points at what it opens
/* v15 (2.2): two labels, not one. The card has always shown the next thing in the UNLOCK chain while calling itself
   "Next achievement" — unlocks outrank achievements everywhere the next thing is surfaced, so the card says which it is.
   `nextAch` is only ever reached once the whole chain is finished (progress.js nextGoal). */
export const MENU = { note:'play one run · the rest opens', next:'<em>Next unlock</em><span>{need} → {name}</span>', nextAch:'<em>Next achievement</em><span>{need} → {name}</span>' };
/* v15 (2.4): the Unlocks screen — the chain on its own page, split off from Achievements. Everything that OPENS something
   lives here; Achievements keeps the rest. What sits behind keys 2 and 3 is register #372 and is not decided, so the key
   line below says only what is true today. */
export const UNLOCKS_SCREEN = { title:'unlocks', hint:'tap a locked row to see what it takes',
  lede:'Everything that opens something. The chain first — each game and mode earned in the one before it — then every length of every mode.',
  games:'Games and modes', lens:'Lengths', keys:'The key', done:'open', locked:'locked',
  keyLine:'The first key is earned here. Beat a clearance bar once in a solo run and it is cleared for good — the key screen has all thirty-one.' };
export const SHEET = { mode:'Mode', toUnlock:'To unlock: {need}', tileUnlock:'to unlock: {need}', locked:'locked', noRun:'no run yet', best:'best', closest:'closest',
  practiceFrom:'practice from', off:'off', pracLocked:'locked · 8 notes in 7 keys',
  // v15 (4.5): Sequence versus asks for two things — the keys (the length row) and how many notes it opens with. The second
  // one sits in the row Practice from already uses, so the sheet gains no new furniture (L9)
  opens:'open with', notes:'notes',
  // v14 (7.1): the result screen's button is Try again until something is changed, and only then does it become Go
  go:'Go', tryAgain:'Try again', goVersus:'Go · versus', goEach:'Go · {n}s each', goPass:'Go · pass & play', passTitle:' · pass & play', versusTitle:' · versus',
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
  devRuns:' · {r} runs on record · ', devSup:'supporter ON', devFree:'free tier · ads on' };
// v14 (8.9): the `customise · {game} · colours are per game` line at the top is gone — the game chips and the group labels
// under the preview say both, and the eyebrow was the first thing on a screen that did not need an introduction
export const CUSTOM = { music:'Music · {game}', preview:'Preview', lockLine:'Locked · {name} — {how} · <u>show me</u>', wheel:'{word} · {game} · drag to pick' };
// v14 (8.1): a row whose requirement is a SET of things says which are left, not just how far along the bar is.
// v14 (8.5): a secret row shows its own `hint` where an ordinary row shows `how`; `stretch` is the fallback for one without
export const ACH_SCREEN = { all:'All', done:'done', secret:'secret', hidden:'???', progress:' · {p}% of the way there', stretch:'A stretch past the stretch. You will know.', inGame:' · in {game}', left:' · still to play: {names}' };

/* the key (build 22, v14 §9.2–9.7). A second progression system, not a picture of the first: seven roots growing inward
   as clearance bars are cleared. "clearance bar", never "minimum bar" — nineteen of the thirty-one are ceilings (C.7) */
export const KEY = { title:'the key', hint:'tap a game · solo runs only',
  lede:'Beat a clearance bar once in a solo run and it is cleared for good. A root grows by the share of that game’s own combinations cleared.',
  count:'{done} of {total} cleared', whole:'the key is whole', root:'{done}/{total}',
  cleared:'cleared', open:'not yet', floor:'{bar} or more', ceil:'{bar} or less',
  advance:'{game} · {name} cleared', toast:'Key · {game} · {name} cleared',
  none:'no bar set', mismatch:'{n} combination(s) have no clearance bar: {keys}',
  conf:{ high:'anchored', med:'reasoned', low:'judgement' } };

// the engines' own words
export const SEQ = { copy:'copy the notes', yourTurn:'your turn', whoTurn:'{who} · your turn', watch:'round {n} · watch', round:'round {n}',
  compose:'tap in a tune · up to 8 notes', composeHud:'{who} · compose · up to 8', composeN:'{who} · {n} of 8', listen:'listen · then copy it', listenHud:'{who} · listen',
  wins:'{who} wins', draw:'draw', practice:' · practice', pass:' · pass & play', comp:' · versus', hud:'{n} keys{tail}', missNote:'on a missed note', longer:'on the longer copy', notes:'{n} notes',
  // v15 (4.5): versus is lives-based. Compose — tap in a tune, the other copies, longest copy wins — is retired with it
  vsHud:'{who} · {a} – {b} lives', vsLives:'{n} lives each', vsOut:'{who} is out', vsRound:'round {n} · {k} notes', vsLost:'on lives', vsLives2:'{n} lives' };
// v14 (6.11 / 6.12): the shape you grow is drawn centre-top on every round, the same one you are told about, so nothing has to
// say where it is. "same area · your shape is top right" is gone
export const ESTIMATE = { watchDiff:'watch · then hold your shape to the same area', watch:'watch', sameArea:'same area', sameShape:'same shape · it has been turned', hold:'tap and hold',
  money:'on the money', close:'close', closeCut:'close!', much:'too much', little:'too little', target:'target', yours:'yours', piece:'piece', px:'px²', targetPx:'target {n} px²', targetShare:'target {n}%', off:' off',
  missed:'the line missed the shape · <b>{share}%</b> again', drag:'tap and drag a line to cut the shape', draw:'tap and draw a line', shareTarget:'<small>target</small>',
  hudStreak:'Round {n} · {tot}% of 100%', hudSet:'Round {n} of {s}', diff:' · different shape', same:' · same shape' };
export const TIMING = { target:'target', stop:'tap to stop the timer', marker:'tap when the ball has reached the marker', late:'late', early:'early', dead:'dead on', close:'close',
  // v15 (3.8): `budS` is gone. The Stopwatch Streak budget changes with the round (25s, 30s past round 10), so the engine
  // derives the text from the number it is actually playing — a literal here could only ever be a second, drifting copy
  over:'{bud} reached · run over', hudStreak:'attempt {n} · {tot} of {bud}', hudSet:'{n} / {s}', budPx:'100px',
  // v14 (6.18): what the game has asked for so far, against what it will have asked for by the end of the Set
  askedSet:'{tot}s of {all}s asked', asked:'{tot}s asked' };
// v14: the budgets are the engine's constants now, not numbers baked into a string — a Flash Streak spends what is over 250ms
// against 500ms (L5 / B.1), a Go / No-go Streak what is over 300ms against 1000ms (6.2 / L5). A wrong tap ADDS 150ms to a Go /
// No-go Set average (A.2) and SPENDS 300ms of a Streak budget (B.2): two currencies, two numbers, not to be harmonised (B.3)
export const REACTION = { wait:'wait for it', tap:'TAP', slow:'too slow', early:'too early', noTap:'no tap', reached:'{bud}ms reached', ms:' ms', quick:'quick', good:'good', slowWord:'slow',
  again:'try again · attempt {n}{of}', of:' of {s}', takes:'Player {n} takes it', tappedEarly:'Player {n} tapped early', draw:'draw', wins:'Player {n} wins',
  ruleTap:['tap','only','the'], ruleNow:['now','only','the'], wrong:'wrong tap · {n} of 3', wrongS:'wrong tap', three:'three wrong taps', over:'run over',
  hudVs:'round {n} · best of {s}', hudNogoStreak:'shape {n} · {over} of {bud}ms', hudNogo:'{n} / {s} · {w} of 3 wrong', hudStreak:'attempt {n} · {over} of {bud}ms', hudSet:'{n} / {s}',
  // v15 (3.5 / 3.6): the result reads down — what you did, what it is measured against, the difference, then where the run stands
  baseline:'baseline {n} ms', runTotal:'total {n} of {bud} ms', runAvg:'average {n} ms', earlyTap:'tapped early', earlyCost:'the attempt is spent' };
export const SPOT = { count:['count','the'], find:['find','the'], howMany:'how many?', right:'right · 0 off', said:'you said {k} · {off} off', of5:' · {off} of 5', over:' · run over',
  of10:'{t}s of 10s', total:'total {t}s', pen:' · incl. +{pen}s for wrong taps', fast:' · under the 0.5s leeway · −{n}s', tie:'both right · a tie', faster:'both right · Player {n} was faster', had:'Player {n} had it', nobody:'nobody had it',
  // v15 (4.6): Find versus. Each player hunts their OWN shape in the same crowd — the shapes on the field are all one colour,
  // as they have to be, so the rule bar is where the colours say whose is whose
  vsBar:'find yours', vsRound:'round {n} · first to {t}', vsTook:'Player {n} found theirs', vsMiss:'not either one', vsHow:'first to {t} rounds',
  draw:'draw', wins:'Player {n} wins', hudFindStreak:'Round {n} · {tot}s of 10s', hudFind:'Round {n} of {s} · {tot}s', hudTwo:'round {n} / {s}', hudCountStreak:'Round {n} · {off} of 5 off', hudCount:'Round {n} of {s} · {off} off', over10:'{a}–{b} over {s} rounds' };
