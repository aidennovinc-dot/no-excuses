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
  **`CHEST_STING` — the music**, a resolution phrase from that key's theme, ending on the reveal; a note is semitones over the theme's root × 2.
  Every note is 700ms or longer with an attack of 40ms or more, and every note above C5 lasts 1200ms or more (gated).
  · **Games — Roots, 3.2s** (guess: it borrows the theme of the key it reveals): the ch[3] chord for 1.6s, resolving to ch[0] at 1.4s, a lead
    on 24 then 26 semitones (784 → 880 Hz, 1.2s and 1.8s).
  · **Key — Roots, 4.0s:** a 98 Hz drone under ch[2] → ch[3] → ch[0], a lead on 24 then 26.
  · **Pro — Frost, 5.0s:** three Frost chords an octave down, 1.8s each (ch[6] → ch[7] → ch[0]), a lead falling 440 → 392 → 370 Hz.
  · **Thorns — Thorn, 6.0s:** an E2 drone growing over 3s, two lowpassed sawtooth chords — ch[7] at 1.2s, then the tonic landing on the split
    at 3.1s — and one long B4 (494 Hz, 2.8s).
  **`CHEST_READY_FX`** is the map's quiet two-note rise the first time a chest is painted ready — D3 then A3, gain .03 against the unlock's .085.
  **`Music.hush(on)` ducks the bed FULLY under a ceremony** (`HUSH`: 0.08s down, 0.4s back on the tap) — a flag as well as a ramp, so a bed
  built mid-ceremony starts silent. **The levels are not measured:** `_smoke/loudness.mjs` renders tracks, not effects, and these gains were set
  beside `unlockFx` and the verdict sounds by eye. That is the first thing to re-tune on the phone.
