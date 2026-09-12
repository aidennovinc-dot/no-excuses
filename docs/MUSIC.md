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
