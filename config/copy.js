/* No Excuses — every user-facing string (build 16, refactor stage 2). DATA ONLY (A2).
   `{name}` placeholders are filled by T() in core.js. Markup inside a string here is trusted (S1: it is config, not
   player data); anything player-typed is escaped by the caller before it is interpolated. Grouped by where it shows. */

// the two players (v11 / L4) — the span class carries the colour
export const PLAYER = { who:'Player {n} · {col}', red:'red', blue:'blue' };

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
export const PROGRESS = { finishOne:'finish one {prev}', finishA:'finish a {prev}', streak:'Streak', practiceFrom:'Practice from', beat:'Beat Aiden — {rec}', none:'—' };

// the one-liner under the ghost demo, the first time a mode is played
export const INTRO = {
  'quick-tap:two':  ['Tap the box when it lights up.','tap it before it goes out'],
  'quick-tap:four': ['Tap the white pad.','four of them now'],
  'dots:blind':     ['Tap the dot where it lands.','anywhere on the screen'],
  'dots:lead':      ['Tap the dot where it lands.','the red ring shows the next spot'],
  'hold:grow':      ['Watch it grow. Tap and hold until yours matches.','the outline stays — match its area'],
  'hold:cut':       ['Draw a line through the shape.','cut off the share it asks for'],
  'sequence:solo':  ['Copy the notes.','then it is your turn · one more each round'],
  'timing:stopwatch':['Tap to stop the timer.','on the target · the clock fades at 1.5s'],
  'timing:hidden':  ['Tap when the ball reaches the marker.','it goes behind the wall first'],
  'reaction:flash': ['Tap the moment it goes white.','tap early and you start that one again'],
  'reaction:nogo':  ['Tap only the shape you were told.','three wrong taps end the run · the rule changes'],
  'spot:count':     ['Count the shape you were shown.','the rest are decoys · three mistakes end it'],
  'spot:find':      ['One shape is different. Tap it.','the crowd grows every round'],
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
export const MENU = { note:'play one run · the rest opens', next:'<em>Next achievement</em><span>{need} {game} → {name}</span>' };
export const SHEET = { mode:'Mode', toUnlock:'To unlock: {need}', tileUnlock:'to unlock: {need}', locked:'locked', noRun:'no run yet', best:'best', closest:'closest',
  practiceFrom:'practice from', off:'off', pracLocked:'locked · 8 notes in 7 keys',
  go:'Go', goVersus:'Go · versus', goEach:'Go · {n}s each', goPass:'Go · pass & play', passTitle:' · pass & play', versusTitle:' · versus',
  chalScored:'A friend scored ', chalBeat:' — beat it', chalSent:'A friend sent you this one' };
export const LOCK = { text:'{name}<b>To unlock: {need}</b>' };
// the line under the two-player picture (v10 / v11)
export const PASS_LINE = { sequence:'take turns copying · the computer adds a note each time · a miss loses', 'spot:count':'same flash, both answer · 10 rounds · speed wins, 0.35s of leeway',
  timed:'{n} seconds each, then the scores side by side', once:'one run each, then the scores side by side' };
export const VS_LINE = { sequence:'Compose · tap in up to 8 notes, the other copies · then swap', reaction:'first to tap after the flash wins the round · early tap loses it', lead:'first to lead by {n} wins' };

// the run's HUD and the versus / pass & play screens
export const HUD = { goal:'goal · <b>{need}</b> · unlocks {name}', aim:'goal · <b>{aim}</b>', goalHit:'✓ ', best:'best {score}', versus:'versus', pass:'pass & play',
  vsLead:'first to lead by {n}', vsQt:'tap your white square', vsDots:'squares vs circles · wrong shape gives them the point', level:'level', lead:'{who} +{n}',
  draw:'draw', wins:'Player {n} wins', byLead:'by {n}', onClock:'on the clock', skipIn:'skip in {n}', skip:'skip' };
export const PASS = { eyebrow:'{game} · pass & play', up:"{who} · you're up", text:'{who} scored <b>{score}</b>.<br>Hand the phone over.' };
export const RESULT = { practice:'practice', fail:'run over', best:'new best', pass:'pass & play', versus:'versus', dash:'—', lowerMark:'<span class="dn">▼</span>',
  rank:'rank <b>{n}</b> of 10 · {name}', outside:'outside the top 10 · {name}', you:'you', practiceNote:'practice · nothing recorded', twoNote:'two players · nothing recorded',
  top:'top 10 · {where}', closestFirst:' · closest first', noRuns:'No runs here yet.', peak:'peak', notes:'{n} notes' };
export const BOARD = { rank:'rank', score:'score', date:'date', lowerMark:' ▼' };
export const SHARE = { text:'{name} scored {score}{rate} on No Excuses · {where}. Beat it: {url}', someone:'Someone' };

// About, Customise, Achievements
export const ABOUT = { tier:['No ads, ever.','Every colour, background and sound pack open from day one, plus the colour wheel.','A star on your profile.'],
  supTitleOn:'Supporter · thank you', supTitleOff:'Support · A$1.99 · once', supTextOn:'Thank you — it keeps this going.', supTextOff:'A one-off, if you want to back it.',
  devOpen:'open everything is ON · every mode and cosmetic available', devProg:'progression ON · {u} of {nu} modes earned · {a} of {na} achievements',
  devRuns:' · {r} runs on record · ', devSup:'supporter ON', devFree:'free tier · ads on' };
export const CUSTOM = { eyebrow:'customise · {game} · colours are per game', music:'Music · {game}', preview:'Preview', lockLine:'Locked · {name} — {how} · <u>show me</u>', wheel:'{word} · {game} · drag to pick' };
export const ACH_SCREEN = { all:'All', done:'done', secret:'secret', hidden:'???', progress:'You are {p}% of the way to something.', stretch:'A stretch past the stretch. You will know.', inGame:' · in {game}' };

// the engines' own words
export const SEQ = { copy:'copy the notes', yourTurn:'your turn', whoTurn:'{who} · your turn', watch:'round {n} · watch', round:'round {n}',
  compose:'tap in a tune · up to 8 notes', composeHud:'{who} · compose · up to 8', composeN:'{who} · {n} of 8', listen:'listen · then copy it', listenHud:'{who} · listen',
  wins:'{who} wins', draw:'draw', practice:' · practice', pass:' · pass & play', comp:' · compose', hud:'{scale} · {n} keys{tail}', missNote:'on a missed note', longer:'on the longer copy', notes:'{n} notes' };
export const ESTIMATE = { watchDiff:'watch · then hold the shape top right to the same area', watch:'watch', sameArea:'same area · your shape is top right', sameShape:'same shape · it has been turned', hold:'tap and hold',
  money:'on the money', close:'close', closeCut:'close!', much:'too much', little:'too little', target:'target', yours:'yours', piece:'piece', px:'px²', targetPx:'target {n} px²', targetShare:'target {n}%', off:' off',
  missed:'the line missed the shape · <b>{share}%</b> again', drag:'tap and drag a line to cut the shape', draw:'tap and draw a line', shareTarget:'<small>target</small>',
  hudStreak:'Round {n} · {tot}% of 100%', hudSet:'Round {n} of {s}', diff:' · different shape', same:' · same shape' };
export const TIMING = { target:'target', stop:'tap to stop the timer', marker:'tap when the ball has reached the marker', late:'late', early:'early', dead:'dead on', close:'close',
  over:'{bud} reached · run over', hudStreak:'attempt {n} · {tot} of {bud}', hudSet:'{n} / {s}', budS:'2.0s', budPx:'100px' };
export const REACTION = { wait:'wait for it', tap:'TAP', slow:'too slow', early:'too early', noTap:'no tap', reached:' · 500 reached', ms:' ms', quick:'quick', good:'good', slowWord:'slow',
  again:'try again · attempt {n}{of}', of:' of {s}', takes:'Player {n} takes it', tappedEarly:'Player {n} tapped early', draw:'draw', wins:'Player {n} wins',
  ruleTap:['tap','only','the'], ruleNow:['now','only','the'], wrong:'wrong tap · {n} of 3', three:'three wrong taps', over:'run over',
  hudVs:'round {n} · best of {s}', hudNogoStreak:'shape {n} · {w} of 3 wrong', hudNogo:'{n} / {s} · {w} of 3 wrong', hudStreak:'attempt {n} · {over} of 500ms', hudSet:'{n} / {s}' };
export const SPOT = { count:['count','the'], find:['find','the'], howMany:'how many?', right:'right · 0 off', said:'you said {k} · {off} off', of5:' · {off} of 5', over:' · run over',
  of10:'{t}s of 10s', total:'total {t}s', pen:' · incl. +{pen}s for wrong taps', tie:'both right · a tie', faster:'both right · Player {n} was faster', had:'Player {n} had it', nobody:'nobody had it',
  draw:'draw', wins:'Player {n} wins', hudFindStreak:'Round {n} · {tot}s of 10s', hudFind:'Round {n} of {s} · {tot}s', hudTwo:'round {n} / 10', hudCountStreak:'Round {n} · {off} of 5 off', hudCount:'Round {n} of {s} · {off} off', over10:'{a}–{b} over 10 rounds' };
