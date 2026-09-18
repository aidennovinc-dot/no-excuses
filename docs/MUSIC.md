# No Excuses — music and sound

**Moved out of `CLAUDE.md` 2026-09-12 (batch 14, S.1), text verbatim as of build 30.** The arrangement engine, the
levels and the form, the run-length arc and the long form, the finish ramp and the end cadence, the flow layer, the
versus stems, Sequence's duck, the loudness measure and the two sounds the gate holds apart. **Read it before touching
`audio.js`, `config/audio.js`, `_smoke/loudness.mjs` or any `Snd.*` call.** Edit in place.

The `config/audio.js` inventory (SCALES · TRACKS · TRACK_OPTS · TRACK_PICK · STEMS · SET_SECS · DUCK · FLOW_* ·
VERDICT_FX) is in the `config/` paragraph of `RULES-HISTORY.md` → Structure, and `audio.js`'s line in the file map there.

## The rules, in full

- **Music is an ARRANGEMENT, not seven numbers (v16 §1, build 27).** A track in `config/audio.js` carries `voices` —
  each with its own wave, its own step pattern across one bar, and a role (`pad` `stab` `arp` `lead` `bass` `sub`
  `drone`) — plus `beats`, the bar length, and since build 30 `per` `form` `vol` on the track and `lv` `lpv` `lp` `q`
  `hold` `ct` on a voice. `audio.js` schedules exactly what the data says and knows nothing else about any track.
  **Three options per game, keyed `'<game>:<name>'` — the ids are NAMES since build 30 (v17 B.30)**, because they are
  the row in Customise and "Tide / Glass / Breath" is the only version of that row worth reading. `TRACK_OPTS` is
  one list per game, `TRACK_PICK` is what a fresh profile plays, and `prefs.track[game]` is what this player chose.
  **Since build 33 (v18 B.28) that row is the WHOLE of Customise's music.** It was four controls — on / off, a Preview
  button, which track, a second Preview button — for a thing Aiden names in one word: the label is `Music`, the buttons
  are the tracks, and a tap plays one. Locked, the row is the single track this game is set to, behind a padlock and
  saying nothing about what opens it (A.1); it still previews, because hearing what you have is not the reward. **The
  per-game on / off switch went with the row** — `musicOn(g)` is still read by `Music.start` and a profile that stored
  `false` for a game before build 33 is still silent there with no way back, which is logged in `UNVERIFIED.md` and is
  the open question on the item. The menu loop keeps its own on / off row.
  **BUILD 54 (v29 item 4): THE MENU PLAYS WHATEVER WAS PICKED, KEY THEME OR GAME TRACK.** `menuTrack()` in `audio.js` resolves
  `prefs.menuTrack` — the resolved TRACKS id written by Customise's Music row and by a key screen's SET THIS MUSIC, in the same breath as
  `everywhere`. A key theme still goes through `everywhere()`, so one whose key is not earned can never play there; a game's track is taken as
  given once `TRACKS` still has it; nothing picked falls back to the menu's own loop. **A RUN is unchanged** — `pickRun` reads `everywhere`
  and never this, so a game screen still plays that game's track.
  **A preview cuts what is playing (v18 B.29, build 33).** `loop()` schedules a bar at a time, so clearing the interval
  left the outgoing track ringing over the incoming one — "both playing gets confusing". `cut()` retires the bed's gain
  node and the stem and flow nodes with it, and `run()` and `stop()` both call it, so no two tracks can overlap
  anywhere: the menu loop, a preview and a run's own track each get a clean bed.
  **Quick Tap · Held is the build-26 loop note for note** — it is the quality bar Aiden named, so it is in the running
  rather than replaced, and the gate asserts it. Two options of one game may not share a wave set and a pattern set:
  "three options" that differ only in speed or pitch is the complaint batch 12 answered.
  **Still no percussion.** A drum is indistinguishable from a tap on a game where the tap is the whole interaction —
  rhythm comes from plucks, stabs, rests and odd bar lengths. There is no `noise` role and the gate says so.
  **A TRACK'S LEVEL IS MEASURED, NEVER JUDGED BY EAR (build 30).** No Claude Code session has an audio device, so
  `vol` on Waltz, on Quick Tap's two alternates and on the flow layer all came out of `_smoke/loudness.mjs` — an offline
  render, 220 Hz high-passed, loudest 4-second window, reported in dBFS. Re-run it when a gain changes; every track now
  sits inside about 3 dB of every other.
- **MUSIC IS ARRANGED TO THE LENGTH OF THE RUN (v17 B.29, build 30).** `form` is one written pass. A run whose length
  is known — a timed length, or a Set through `SET_SECS` — plays that pass **once across the run**, its level strings
  mapped onto it and a run-shaped envelope under it (55% at the start, full by two thirds through). An open-ended run —
  a Streak, Sequence — plays the long form instead: the same pass with the level strings walking **out of phase** with
  it, which is how three minutes of music comes out of sixteen bars of data. **The chord progression is never stretched
  or skipped** to fit — compressing a four-chord loop into five seconds plays chords 0, 1 and 3, which is a mangled
  progression, not a short arrangement. The gate holds every open-ended form to 180 seconds before an exact repeat.
- **The front of the app has music too, and the finish ramp is MUSIC ONLY.** One `menu` loop, played on every screen
  that is not the game layer; one loop per key tier — **`key:roots` / `key:frost` / `key:thorn` since build 30 (B.31),
  named for the theme, never by number** — asked for by `ui/screens/key.js` as the tier changes.
  **A run with a CLOCK lands its cadence on the finish (v17 B.28, build 30):** from the first bar line inside the last
  five seconds the bars shrink geometrically, scaled so the final bar ENDS exactly on the clock. A round-based run keeps
  build 27's `R.fin`, 0..1 — a Set over its final round, a Streak once its own budget is 80% spent — and **`audio.js` is
  its only reader; A.1 is explicit that no gameplay speeds up**. **Sequence gets no ramp: it has neither a clock nor a
  budget**, and it answers no `fin()` at all rather than a special case being written for it. A round-based engine
  overrides `fin()`; `roundEngine` gives the default and the two helpers, and **Estimate spells both out because it is
  the one engine not built on `roundEngine`**.
  **The end cadence is in the track's key (B.30)** — it was always in A whatever was playing. The track leaves its root
  and its quality in `endTune` and `Snd.end()` transposes to it, minor third where the first chord is minor, tonic
  chord under the last note; with no track it is the sound it always was.
- **FLOW STATE IS ONE NUMBER WITH TWO CONSUMERS (v17 B.27, build 30).** The engine answers `tps()` — its own taps a
  second over the last 1.5s, deliberately not the rate bar's reading, which has two modes (v14 6.7) — `run/run.js`
  smooths it (rise 0.8s, fall 1.6s) into `R.flow` and `--flow`, and audio.js swells the hum with the same number. The
  light and the sound therefore arrive together by construction rather than by two timers agreeing. **Solo Quick Tap
  and Dots only: the glow is light blue, which is Player 2 (L4)**, and it is presentation only (L10).
  **Sequence ducks its bed to 40% while a key rings (B.30)** — both halves, the pattern and the copy, because both go
  through `Snd.note`. The pitch half of that complaint is fixed in the data: the three Sequence tracks use only C and G
  and stay under the keys' own C4.
- **The versus stems are presentation (v16 §1.4).** `STEMS` is one pair for every game — they take the round's own
  root, tempo, bar and chords so they line up, and only the voicing is theirs. Each rides its own gain node and the gain
  follows `R.vsP[p]`, that player's proximity to the win condition. **L10 is untouched by it:** nothing in a two-player
  run advances a key, a bar, an unlock or an achievement, and `vsP` is read in `liveCheck` *above* the two-player return
  precisely because it is the one thing about a versus run that has to cross that line.
- **An unlock has its own sound; the achievement sound is not to be changed.** `Snd.unlockFx()` on an `'ok'` toast,
  `Snd.click()` on an achievement — Aiden's line was that achievements already sound right. The gate asserts both, so
  "made the unlock bigger" and "moved the achievement" cannot look the same.
- **A CHEST HAS ITS OWN SOUNDS, AND NONE OF THEM IS THE UNLOCK OR THE ACHIEVEMENT (v23 §L.6 / §L.9c / §L.10d, build 41).** All in
  `config/audio.js`, all presentation (L10), **none heard by anyone yet** — no audio device (UNVERIFIED.md). `Snd.chest(id)` schedules a
  chest's effects and its sting in one pass on the audio clock, so the sounds and the ceremony's named steps share one clock; the effects
  follow the tap sound pack like every effect, the sting follows the menu music switch. The gate holds the four effect sets apart from each
  other, from `unlockFx`'s rising triad and from every verdict. `Snd.chestPlan(id)` hands the review catalogue the same events flat.
  **`CHEST_FX` — the effects**, following the steps. Anything short is under 300 Hz, because a short high note reads as a tap.
  · **Games (3s):** seven low clicks 150ms apart as the tiles un-cross (triangle 330→262 Hz, 60ms); a glide as the path draws (sine 196→392 Hz,
    700ms); a thump on the lid (110→82 Hz); a G major chord, 392 / 493.9 / 587.3 Hz, 1s.
  · **Key (4s):** eight low chimes 220ms apart as the bars assemble (sine, G3 up to G4, 420ms each); a click (square 150→110 Hz, 45ms,
    lowpassed) and the turn (triangle 140→70 Hz, 300ms); a swell on the lid (98→196 Hz, 800ms); a held fifth as the light spills (392 / 587 Hz, 1.3s).
  · **Pro (5s):** a building rumble (sawtooth 55→70 Hz, 1.7s, lowpass 300); four cracks 400ms apart from 1.2s (square 240→90 Hz, 90ms); the
    burst (a 90→40 Hz drop with D and A, 293.7 / 440 Hz, 1s); four rising notes as the cosmetics scatter (587→880 Hz, 700–900ms each).
  · **Thorns (6s):** near-silence; a sub-bass that grows from 0.3s (sine 41.2 Hz, 2.8s, 2.4s attack); `CHEST_NOISE`, the ONE noise in the app —
    a hard cut on the split at 2.7s (180ms, highpass 1.2 kHz), an effect and not a music role, so the tracks still have none; a swell as it
    widens (82.4→164.8 Hz, 1.6s).
  **`CHEST_STING` — the music. SINCE BUILD 43 (v24 C.7) IT IS THE KEY'S THEME ITSELF, not a phrase written beside it.** Build 41's four were
  hand-written chords on each theme's root; Aiden liked the Pro chest and wanted its music closer to the Pro key's own track, so the rule is now
  that a sting is `{track, voices?, cut, tail}`: `stingOf()` in `audio.js` plays the theme from its first bar through `bars()` — the key screen's
  own arrangement engine, so no second copy exists to drift — up to `cut` seconds, `voices` narrowing which of its voices come in. A note still
  sounding at the cut rings on `STING_RING` (0.45s) and stops; one that would then break the theme rule is left out, never clipped short. Then
  `tail` lands the tonic on the reveal (a tail note is semitones over the theme's root × 2). Held to the THEME's rule (gated): nothing under
  700ms or attacked under 40ms at 300 Hz or above, nothing above C5 under 1200ms — a theme's bass pulse and low arp are short by design and sit
  under 300 Hz. Escalating Games → Key → Pro → Thorns in length, notes a second and voices (gated):
  · **Games — key 1's theme, melody and chord only, cut at 2.2s**, tonic and a high G: 10 notes over 3.5s.
  · **Key — the whole of key 1's theme, cut at 3.0s**, the drone and the tonic with an A over it: 26 notes over 4.45s.
  · **Pro — the whole Pro theme, cut at 3.6s** — its melody, answer, bass pulse and arp — then the D chord an octave down: 42 notes over 5.1s.
  · **Thorns — the whole Thorns theme, cut at 4.2s**, then the E drone, a sawtooth tonic and the B over it: 59 notes over 6.0s.
- **EARNING A KEY HAS ITS OWN SOUND (v24 C.5, build 43).** `KEY_EARN_FX` in `config/audio.js`, the sting note shape, one per tier from that key's
  theme; `Snd.keyEarn(tier)` plays it on the key screen's earn moment and `Snd.keyEarnPlan(tier)` hands the board the same events. An EFFECT: it
  follows the tap-sound switch like `unlockFx`, and it is not `unlockFx`, `click` or a chest's (gated). Key 1 a warm rising chord over its drone
  (6 notes, 2.8s); Pro a driving bass pulse under a climbing arp, the melody and its answer, then the chord (14, 3.8s); Author the E drone, a
  sawtooth swell on the dark chord, a low figure circling under it, then the tonic with the melody over it (15, 4.7s). Theme rule, gated. Not
  heard (UNVERIFIED.md), and the levels are set beside the chest effects by eye, not measured.
  **`CHEST_READY_FX`** is the map's quiet two-note rise the first time a chest is painted ready — D3 then A3, gain .03 against the unlock's .085.
  **`Music.hush(on)` ducks the bed FULLY under a ceremony** (`HUSH`: 0.08s down, 0.4s back on the tap) — a flag as well as a ramp, so a bed
  built mid-ceremony starts silent. **The levels are not measured:** `_smoke/loudness.mjs` renders tracks, not effects, and these gains were set
  beside `unlockFx` and the verdict sounds by eye. That is the first thing to re-tune on the phone.
- **AMENDED AT BUILD 52** (Aiden: "even more epic for the pro", "epic super duper" for the author) — Pro grew to 28 notes and Author to 47 — and
  **AMENDED AGAIN AT BUILD 54 (v29 item 3): THE LENGTHS ARE 2.39 / 3.00 / 4.00s.** Aiden played build 53's 2.39 / 4.10 / 6.70 and asked for
  roughly 2.4 / 3.0 / 4.0. Nothing was deleted and no wave or gain moved — every cut is at the TAIL, and it is made by bringing the closing
  gestures FORWARD rather than shortening them, **because the theme rule is a floor**: nothing under 700ms above 300 Hz, nothing above C5 under
  1200ms, so a high voice cannot be trimmed to fit and has to arrive earlier. Pro's final chord moved from 2.20/2.45 to 1.80 and its low
  resolution from 2.90 to 2.30; Author's final tonic moved from 4.60 to 2.80, its dark-chord answer and closing sub to 3.30, and its third
  low-figure walk steps 3.25 · 3.50 · 3.75 into the ending instead of trailing off after it. `KEY_EARN` in `config/keys.js` follows, because
  the music IS the clock (v28 item 15) — so the whole of the shortening lands on `rise`, and the assemblies do not move.
- **BUILD 49 — THE SOUND NOTES FROM THE BUILD 46 BOARD (v26 §B1) AND THE UNLOCK EXPERIENCE (items 2, 6).** All in `config/audio.js`; nobody has heard any of
  it (UNVERIFIED.md). Aiden's words are the brief; what was built:
  · **Title (`TITLE_FX`)** "more spacey and wooshy and slightly longer": each ~40% longer with a slower swell, and a pair of quiet sines a few hertz apart
    gliding up over the low sweep — the beating between them is the space.
  · **Count-up whoosh** "about 7 very similar versions played at random": `WHOOSH_VARIANTS`, [pitch ×, length ×], none more than 6% / 8% off;
    `Snd.whoosh(ms, f0, f1, v)` draws one at random, or version `v` when asked (the catalogue plays each).
  · **Sigh** is held — off the sound pack row, Grand tour no longer earns it, the achievement is still to be chosen — and its miss starts at 520 Hz
    (it was 240 → 50 Hz, "too low-pitched to hear").
  · **Skill chest opening** "much closer to the first key's theme": the assemble chimes are the theme's first two chords arpeggiated (G · D · G · A,
    F · C · F · G over its root × 2), the spill is its opening chord held, and the sting runs to 3.3s of the theme before it lands.
  · **Pro chest opening** "far more epic": a doubled detuned rumble over a sub, a low hit under each crack, a riser into the burst, the burst a deeper
    boom under a five-note sawtooth D major with the octave, a five-note climb to D6 and a long shimmer; the sting runs to 3.9s and lands on seven notes.
  · **Thorn earned** "better, with more sounds": build 43's five layers plus a sub pulse on every second, a filtered sawtooth rising out of the dark chord,
    the low figure answered again, three high bells held to the theme rule, and the dark chord's answer to close — 29 notes.
  · **The result sounds** climb: Meh. unchanged (Aiden: good); Good. a rising major third G4 → B4 (it was a semitone that never landed, "too sad");
    Great! is build 45's Amazing! note for note; Amazing! is four notes, E5 G5 C6 E6 with an E7 shimmer, ending highest. Every one has bass under it.
  · **A round's sound** is `ROUND_FX`, its own list: one note shorter than the result's, with bass under it (Aiden: "all end-of-run sounds should be one
    note more than their end-of-round sound"), still played × `ROUND_VERDICT` shorter and quieter.
  · **End of run** did play on top of the tier: the result screen came up 250ms after the finish and played its tier at once, over the last three of
    End of run's four notes. `Snd.endLeft()` answers how long until it has landed (1.06s after it starts) and `ui/screens/result.js` waits that long.
  · **The map (`MAP_FX`)**: a Gauntlet tile's own sound (a thud and two inharmonic rings); a game or Gauntlet newly open arriving on the map plays its
    sound off its arrival animation; a result toast that unlocks a whole game is followed `MAP_ON_UNLOCK_MS` later by that game's sound.
  · **A reward leaving a chest** (`POP_FX`, `Snd.pop(i)`): a short low bubble with a quiet click, a step higher each time; it lands with `Snd.gift(i)`.
    Both are scheduled off that reward's own flight animation.
  Left alone, as asked: every sound Aiden marked good, great, amazing, nice or perfect.
- **THE KEY THEMES ARE REWRITTEN, AND ANY ONE OF THEM CAN BE EVERY RUN'S MUSIC (v23 §L.7, build 42).** `theme:key` / `theme:pro` /
  `theme:thorns` in `config/audio.js`. The build-30 `key:roots` / `key:frost` / `key:thorn` stay ONE build as `retired:42` so the review board
  can A/B them; nothing in the app plays them, and the next build drops them. None of this has been heard (UNVERIFIED.md).
  **The complaint was measured before anything was written.** Roots' melody entered 1.4s into a 5.7s bar, with its bass silent for 4 bars
  and its top pad for 8; Frost's arp was silent for 10s and its melody for 38s; Thorn's filters opened from shut over 32s and its melody
  waited 32s. So the rewrite is in the ARRANGEMENT, and each key keeps its root and chords. That also keeps all four chest stings resolving
  into the theme they were cut from: `CHEST_STING[].track` points at the new ids, and no note moved.
  **What every theme is written to (all gated).** In its motif on the first step. Every voice sounds in bar 1 at 70% or more of its level and
  at full gain inside a beat: no intro, no fade-up, no build. No level or filter string rests or drops under 60%, so no voice drops out at a
  loop point. The form is whole chord cycles. Nothing under 700ms above 300 Hz and nothing above C5 under 1200ms (batch 12, the sting rule).
  The long form passes 180s.
  **The escalation is in the writing, not in the gain.**
  · **Key, 88 bpm on G:** one melody over a held chord, a drone and a slow bass — 4.8 notes a second.
  · **Pro, 112 bpm on D:** a chord a bar, the melody plus a second voice answering it off the beat, a bass pulse and a low arp — 9.8.
  · **Thorns, 76 bpm on E:** detuned sawtooth pads with their filters moving, a sawtooth bass, an arp both ways, the melody and its answer
    — 11.1, and the lowest root.
  Every melody is 16 bars: 8, then a variation. `vol` 0.57 / 0.58 / 0.76 comes from `_smoke/loudness.mjs`: at 1.0 the three rendered
  −35.1 / −35.3 / −37.6 dB, and the game tracks sit between −39.4 and −41.2.
  **ONE SETTING, `prefs.everywhere` — 'game' | 'key' | 'pro' | 'thorns'** (store v6, `up6`). `KEY_THEMES` maps a chest id to its theme.
  `music` in `config/keys.js` names the chest each key's theme waits for: the chest that key opens when it is whole (L.12). `everywhere()` in
  `core/store.js` is the only read, and a theme whose chest is shut reads as 'game', so a locked theme is never applied, whichever route
  stored it. SET THIS MUSIC at the foot of a key screen and Customise's Everywhere row both write it (A4).
  **`Music.start` resolves it once, in `pickRun(g)`, before `shapeFor`.** So a theme playing as run music gets every rule a game's track
  gets, and none of those rules knows about themes: the arc on a clock or a Set (B.29), the last five seconds (B.28), the versus stems
  (1.4), the flow hum on solo Quick Tap and Dots (B.27), Sequence's duck (keyed on the game, not the track) and the end cadence in the
  theme's key. **The menu loop does not read the setting (guess, L.7d — WRONG, and settled the other way at build 53 for a key theme and at build 54 for a game track: see `menuTrack()` above).** **`FLOW_AT` stays 2.7:** L.7d says "above 3.0 taps/s", but 2.7 is
  Aiden's own number (v18 B.9) and the note does not quote it.
  **A key's screen plays its theme once its TIER is open — AMENDED at build 43 (v24 C.2 / C.3).** Build 42 waited for the chest the key OPENS
  (guess: "a locked key has no theme to hear"), which put the menu loop on the Pro tab until Pro was finished and on the Author tab until Author
  was — the two themes Aiden reported as lost. Key 1 kept its theme only because its Skill chest was already open. The themes themselves were
  never broken. Only the quiet screen before the Games chest plays the menu loop now; SET THIS MUSIC still waits for the chest, as a reward. **`audio.js`'s screen-change timer no longer touches the key screen.** The router emits `screen:change` before `onShow`, so
  since build 30 the timer asked for Roots 900ms after `key.js` had asked for the tab's own loop, and arriving on the Pro or Author tab
  heard Roots within a second. **`Music.probe()` reports `track`, `arc`, `arcBars`, `stems`, `flow` and `fin`**, which is what the gate
  reads to prove a theme is under the run rules.
