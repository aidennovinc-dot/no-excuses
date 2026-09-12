# No Excuses — progression: the chain, the key, the earn path

**Moved out of `CLAUDE.md` 2026-09-12 (batch 14, S.1), text verbatim as of build 30.** The two progression systems and
why they share nothing, clearance bars, the derived contributor count, the three key tiers and the percentage, the key
interlude on the result screen, the `live:1` rule, the goal line, and the rule that an earn is written the moment it
fires. **Read it before touching `progress.js`, `progress/`, `config/unlocks.js`, `config/key-bars.js`,
`config/keys.js`, `ui/screens/key.js`, `ui/screens/progress.js` or `liveCheck` in `run/run.js`.** Edit in place.

The L6 and L10 text with its amendment history is in `RULES-HISTORY.md` → Locked decisions; the `config/` inventory
(`unlocks.js`, `achievements.js`, `key-bars.js`, `keys.js`) in the same file under Structure.

## The rules, in full

- **There are TWO progression systems and they share nothing but a screen** (v14 9.2, build 22). The **unlock chain**
  (`config/unlocks.js`, L6) is sequential and gates which games are playable. **The key** (`progress/key.js`,
  `config/key-bars.js`) is concurrent, gates nothing, and every unlocked game feeds it independently. Never describe
  one in terms of the other — that mistake is what sank mock-up option C.
- **A clearance bar is a one-off threshold, not a score to hold.** Beat it once in a solo run and that combination is
  cleared for good; re-clearing does nothing and plays nothing. Pass & play, versus, practice and challenge-link runs
  never contribute (9.4, consistent with L10). **Call them clearance bars, never "minimum bars"** (C.7) — eight of them
  are ceilings, so "minimum" is wrong for a quarter of them.
- **The key's contributor list is built from the config, never listed — AND SO IS ITS COUNT (v17 B.9, build 28).**
  `GAMES` × modes × `GC(g,d).lens` — a game with a `SET_COPY` row contributes Set and Streak per mode, a timed game
  contributes its lengths, Sequence its key counts. **Thirty since build 28**, and the number is never written down:
  B.9 dropped Sequence · 5 keys and found the old 31 spelled out in the gate, in the Unlocks screen's prose and in the
  review catalogue's mock-up. A new mode joins the key with one row in `config/key-bars.js` and no code change. The gate
  fails on a literal count in `progress/key.js`, `ui/screens/key.js`, `ui/screens/unlocks.js` or `ui/screens/menu.js`,
  and on any combination without a bar or any bar without a combination.

- **A `live:1` TEST MUST ONLY EVER BECOME MORE TRUE (build 23 v15 2.5, enforced v17 B.6 at build 28).** The rule was
  already written down; nine achievements were not obeying it. `misses === 0` and `hits === 0` are claims about a WHOLE
  run and both go false on the next tap, so the flag banked them from a partial run that had not earned them. The same
  error in the chain is what made "7 hits, no misses" announce and then quietly un-announce. **Every "N hits, no misses"
  rung is N IN A ROW** — `row` on the timed record, a miss resets it — because that is the only reading a live test can
  make honestly halfway through a run.
- **There are THREE keys and they are difficulty TIERS over the same combinations** (v15 5.3 / A.1, build 26):
  key 1 the clearance bars, key 2 a pro tier, key 3 the author's times. No fourth dimension, no per-bar stacking.
  **Keys 2 and 3 are a shell** — `shell:true` in `config/keys.js` — because register #372 has not decided what is behind
  them and **A.2 forbids any build deriving a bar**. **Key 1 carries a PERCENTAGE since build 28 (§A.6)** — `keyPct()` in
  `progress/key.js`, `floor(100 × Σ credit / N)` over the same walk, cleared = 1, never played = 0, anything else capped
  at 0.9 of its share. It reads best scores, so it only ever goes up, and it is on the keys screen and the menu as
  `19 of 30 · 74%`. Keys 2 and 3 get their own from the same function the day #372 is answered, and show nothing before
  chest 1 (A.1) — they say so on screen rather than showing an invented target. The three glyphs get more elaborate as
  the tier gets harder, and that is the whole of "progressively more intense" — there is no second scale to keep in step
  with it.
- **A key unlock interrupts the result screen (v15 5.1, build 26)** and is not a toast any more. `ui/screens/result.js`
  fades, takes the input lock, and asks with `show('s-key', {advance, auto})`; `ui/screens/key.js` plays the segment with
  the game's whole root lit behind it and answers with a `key:done` event. Neither screen imports the other (A4). The
  lock is `lock()` in `ui/actions.js` and it has to be there: `pointer-events:none` would still leave the bare-ground
  tap reaching `onClick` and going Back.

- **One mechanism pins a goal at the top of a run, not two.** A clearance-bar row (5.2), the Next card's achievement
  (2.2) and the lock box's Try to unlock all go through `goWhere` -> `pendingAim` -> the `#goal` line. **An aim the player
  asked for outranks `goalFor`'s automatic offer** (build 26) — it used to lose whenever that combination also carried an
  unearned unlock, which made "pin it as a running goal" quietly show something else.

## The earn path

**An earn is written the moment it fires, never when a screen gets round to it (build 23, v15 2.5).** This was silent data
loss: `checkUnlocks` and `checkAch` used to run inside the result screen's ad-break callback, so an achievement earned on a
run the player left — quit mid-run, or walked away on the ad — was never in the store. Now `run/run.js` banks all three
(`checkUnlocks`, `checkAch`, `checkKey`) before it emits `run:finish`, and hands the lists down on the event; the result
screen only shows them. Mid-run, **`live:1` means the same thing on an achievement as it does on an unlock** — the row's
test can only become more true as the run goes on, so `liveCheck` banks and toasts it at once. Rows without the flag are
totals, averages and "no wrong taps" claims about a whole run, and still wait for the finish. `abort()` runs one last
`liveCheck` over the engine's own `result()` so the round that just landed is banked before the quit. The gate asserts all
of it, statically and by quitting a run mid-flight and reading storage back.

## Build 32 (v18 §B.15–§B.27, 2026-09-12): the tier is an argument

- **Three tiers per row, and the SHELL IS DERIVED (B.27).** `config/key-bars.js` rows carry `bar` (key 1), `pro` and
  `author`, the same unit and direction each; `barOf(c, tier)` in `progress/key.js` is the one read, `skey(key, tier)` the
  one store key (`'g:d:s'`, `'g:d:s|pro'`, `'g:d:s|author'`, one map). `isShell(tier)` is "any row of the column is null" —
  `config/keys.js` carries no flag any more — and a shell tier counts nothing, shows nothing, clears nothing. A.2 stands:
  Pro and Author start EMPTY and Aiden fills them on the review catalogue's key section (three inputs a row, saving
  `{bars:{clear,pro,author}}` to `bars/current`); Cowork ports the columns (#371). The day a column is full the tier counts,
  with no code change. Tiers 2 and 3 also count nothing before chest 1 (A.1 / A.2): the chest hands the map over, and a
  bar banked quietly before it would make the reveal arrive part-done. `checkKey` tries every open, non-shell tier lowest
  first, banks every fresh clear, and returns the lowest one — the ring the interlude draws.
- **The FRONT number (B.15 / B.16 / B.17).** The menu says `67% complete` (A.6.5 amended); `frontPct()` is key 1's own
  percentage until `prefs.pro` is set, then `30 + floor(0.7 × keyPct(tier).pct)` for the tier stepped into. Stepping in is
  offered on the opened chest ("Would you like to progress to Pro?") with the warning that the front stops showing 100%
  and cannot be undone; Not now leaves the opened chest as the way back to the question. Fresh game clears `prefs.pro`.
- **Three achievement sets (B.25).** `keyAch()` generates 24 rows — `key_<tier>_<game>` "clear every <game> bar on <key>"
  and `key_<tier>_all` for the whole key — from the same walk. None is `live:1` (whole-set claims). `run/run.js` banks the
  key BEFORE it asks achievements, and asks `checkKeyAch` beside `checkAch`; `progress.js` cannot import `progress/key.js`,
  so screens read the key rows from there. `authorAch()`, `authorRatio()` and `AUTHOR_RECORDS` are retired: the Author
  KEY is that idea, and A.5 (captured once, then frozen) now applies to the `author` column.
- **The radar (B.24).** `radarOf(g)`: before chest 1 one rung — the best ratio against key 1's bar, capped at 1; after
  chest 1 three rungs at thirds, a shell tier a dashed rung at no value that no axis can climb past, and a score past the
  Author time pushes on to `RADAR_PAST` (1.15) with a flame.
- **The chests (B.19 / B.20).** Chest n needs key n whole. `ui/screens/pick.js` places chests 2 and 3 in a column under
  chest 1 (hidden before chest 1, A.1), a ready chest asks before it opens, the opening is build 29's extended (the key
  drops into the lock, 1.6s), and the keys screen plays a whole-key moment once per tier (`prefs.keyWhole`). Each game
  tile's outline fills with its KEY-1 fraction (B.18, `gameKey(g).frac`, `KEYFILL` lilac).
