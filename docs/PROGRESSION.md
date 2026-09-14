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

## Build 37 (v21 §G.1–§G.4, §G.8; v20 §D.4, §D.7; 2026-09-14): keys and chests

- **What A.1 hides is NUMBERS, not existence (G.1 / G.2 / D.7, narrowing v17 §A.1).** Chests 2 and 3 are on the map from the
  first visit, stacked under chest 1 and locked, each saying "open the previous chest" (`prevOpen(n)` in
  `ui/screens/pick.js`, honouring the dev escapes). All three keys are on the keys screen; before `mapOpen()` Pro and Author
  are crossed out with "To unlock: open the previous chest", carry no percentage and open nothing when tapped. Their rings,
  their bars, the Achievements tab's Pro and Author sets and the radar's extra rungs still arrive with chest 1, exactly as
  before. A chest after the first also waits for the chest before it.
- **THE ONE CROSSING (G.3, amending B.19 / B.20).** Chest 1 waits for every game mode as well as key 1 whole.
  `modesOpen()` beside `mapOpen()` is the whole of it — `modeCount()` from `progress.js`, no challenge-link exception, the dev
  escapes honoured, never a read of `store.unlock`. The grid draws a gate on the connector into chest 1 while it holds,
  the chest reads "unlock all games first · N of M modes", an early tap says so with the count and goes nowhere, and the
  first draw after the last mode opens animates the gate away and stores `prefs.gateOff`. **The chest cannot be stranded:**
  every key-1 bar belongs to a mode the chain reaches without it, and the gate asserts that — anything later put behind chest
  1 (Gauntlet, #382) must never carry a key-1 bar.
- **Retroactive credit (G.4).** `retroBank()` runs when a chest opens: every revealed, non-shell bar is judged against the
  combination's saved best and banked with no toast and no unlock sound; key achievements it completes bank the same way.
  `prefs.retro` marks those store keys so the keys screen wears L8's green on the key button and the rows the first time
  they are on screen, then spends the mark. A live clear is untouched — `checkKey` still hands the result screen its
  interlude. **Caveat:** while Testing's placeholder fill is on, a chest opening banks against derived Pro and Author bars,
  exactly as a live run already does; Testing's per-key reset is the way back.
- **The front percentage says when it rose (D.4).** `prefs.pctSeen[tier]` is the figure last painted for the key the front
  counts; the menu writes it on paint and, when the new figure is higher, walks up from the old one (`core/count.js`, the
  runs' count-up) with a pulse and the count-up's own whoosh. Never down, never with nothing seen before.
- **Testing: a switch and a reset per key (G.8, S5).** `devKeyAll(tier, on)` clears every bar of one key and snapshots what it
  held in `prefs.devKeys`, so off restores it; `devKeyReset(tier)` backs the key out — bars, whole-key moment, chest, the step
  into the tier after it, retro marks, last-seen %, key achievements. Dev only.

## Build 38 (Aiden's answers to build 37, 2026-09-14): Author waits for the Pro chest

- **Each tier opens with its own chest.** Build 37 kept the old reveal — chest 1 opened Pro AND Author — which left the Author
  key reading "open the previous chest" while it opened a chest early. Aiden: Author waits for the Pro chest. `tierOpen(tier)`
  is now `chest n opens tier n+1`, with the two dev escapes, and it is the only read: the key strip crosses Author out until
  chest 2, `checkKey` banks nothing on Author before it, `retroBank` credits Author's already-beaten bars when the Pro chest
  opens (silently, G.4), the Achievements tab shows the Author set only then, and `radarRungs()` draws one rung per open tier
  — one before chest 1, two after it, three after the Pro chest. `mapOpen()` still means "chest 1, or a dev escape" and is
  what Pro's tier reads.

## Build 38 (#426, 2026-09-14): Pro and Author placeholders — A.2 amended

- **A.2, as amended (Aiden asked for it directly):** a build MAY generate a PLACEHOLDER bar, if it is marked as one and
  replaceable a row at a time; it may still NEVER set a real bar or silently correct one. Both columns of
  `config/key-bars.js` are full of them. **`scripts/placeholders.mjs` (`npm run placeholders`) is the only writer:** `bar` ×
  1.15 / × 1.30 on a floor, × 0.80 / × 0.65 on a ceiling, rounded to the row's own precision, then the floors — nothing
  reaction-timed faster than 180ms of genuine reaction (Flash · Set's Author, 170 → 180, is the only clamp), and no Timing or
  Estimate Set tighter than Aiden's own Amazing! round (`ROUND_AT[0]`) held every round. Each tier ends strictly harder than
  the one below; a row that cannot be is refused, not written.
- **The marker is the rule.** `placeholder:{ <tier>:{ v, conf:'low', basis } }` on the row, `v` the number generated. A cell
  is the generator's while it is null or still holds its marker's `v`; anything else is a person's number and is left byte
  for byte, value and marker, so a real number is never regenerated, rounded, corrected or re-derived. `isPlaceholder(c,
  tier)` in `progress/key.js` reads the marker by the same test. `--set <id> pro|author <n>` writes a real number and drops
  that cell's marker; `--check` fails when either file is not the generator's output; `--clear` puts the shells back. `bar`
  is never written by any of it.
- **What a full column switches on — no new mechanism, only build 32–38 code meeting numbers for the first time:** the
  Circuit and Thorn rings (no `.kkey.shell` dimming); `checkKey` banking Pro and Author clears on open tiers (one run can clear
  two or three at once, and the interlude still draws the lowest); `keyPct` and `frontPct` counting after the step into Pro;
  chests 2 and 3 openable once their key is whole; the Pro and Author achievement sets earnable; solid radar rungs and the
  flame; and `retroBank()` finding bars to credit. The key screen says how many numbers on the open tier are placeholders.
- **Retroactive credit when the numbers arrive (Aiden: "yes, silently, once").** A tier already open when its column filled
  never saw a chest open. `retroArrived()` runs at boot and credits every open, non-shell tier whose column differs from
  `prefs.retroCol[tier]` — the column as it stood when last credited, written by every credit including a chest's. A reload
  never credits twice, the next boot does not undo Testing's per-key reset, and replacing a placeholder with a real number
  changes the column and credits once more against it.
- **Testing's "fill pro + author · placeholder" fills EMPTY cells only**, so on the shipped table it finds nothing and says so.

## Build 40 (v23 §L.8 a–c f, §L.10 a–c e, §L.11 a c, §L.12, G.8 extended; 2026-09-14): four chests and the 0–400 meter

- **FOUR CHESTS, NAMED BY WHAT OPENS THEM (L.10) — `config/chests.js`.** Games (every mode in the chain), Key (key 1 whole), Pro (Pro
  whole), Thorns (Author whole), never numbered in code, copy or docs. Strictly sequential (L.10e): `chestState(id)` in
  `progress/key.js` is `open`, `before` (the chest ahead is shut — "open the previous chest", G.1), `ready` or `locked`, and nothing is
  ever ready behind a shut chest (gated across 256 states). **The Games chest replaces v21 G.3's gate** — no gate symbol, no "unlock all
  games first", no `prefs.gateOff`; `modesOpen()` is what opens the Games chest now. `prefs.chests` is `{games, key, pro, thorns}`; store
  v5's `up5` maps `chest1` → Key and Games (G.3 already made chest 1 wait for every mode), `chest2` → Pro, `chest3` → Thorns.
- **Each tier opens with the chest that reveals it** (`CHESTS[].opens`): key 1 with Games, Pro with Key, Author with Pro — `tierOpen()` is
  that one line. **Key 1 is quiet before the Games chest (L.10a, §M.2):** `checkKey` banks nothing on a closed tier, so there is no
  interlude; no tile outline fill; no key-1 achievement set; the Game unlocks tab's key row says "open the Games chest"; and the key
  screen shows only the modes count, the meter and the four chests. Opening the Games chest credits already-beaten key-1 bars silently —
  `retroBank(['clear'])`, G.4 one chest earlier. `retroArrived()` still leaves key 1 alone at boot: its column is Aiden's numbers, never a
  placeholder that arrives. A key-1 clear banked before build 40 stays banked and shows from the Games chest on.
- **ONE METER, 0–400, NEVER RESET (L.8a / L.10b) — `meter()` in `progress/key.js`, and every surface reads it.** Band 1 is modes unlocked
  ÷ modes total, not counting the modes a new profile starts with (`METER.freeStart`, §M.4 — a new profile reads 0%, one mode past it
  8%); bands 2–4 are each key's CLEARED bars ÷ its bars (`METER.partial:false`, §M.1; `true` reads `keyPct()`'s partial credit), each
  only once its chest is open — so the meter cannot pass 100 before Games or 200 before Key, and the gate asserts it with every bar on
  every key banked underneath. It reads: the menu card (`N% complete`, D.4's count-up off one `prefs.meterSeen`), a locked key chest on
  the map (`N% · opens at 200%`, `chestAt(id)`), the key screen's count line (`19 of 30 · 142%`) and the key strip (`bandPct(tier)`, that
  key's own share). `METER.modes:false` would hide band 1 and make it 0–300. **B.15–B.17 retired:** `frontPct()`, the 30/70 re-base,
  `prefs.pro`, `prefs.pctSeen`. `keyPct()` stays, for `METER.partial` and the A.6 checks.
- **THE OPEN HAPPENS ON THE KEY SCREEN, BY ITSELF (L.8b).** A chest tap goes to its key screen (`CHESTS[].screen`); a locked Games chest
  toasts the chain's count and stays put (G.3's "never send you to the keys" kept); a chest behind a shut one says so. When the key screen
  opens with a chest ready, `openChest(id)` runs 600ms in (2.7s if the first-ever arrival is playing): the chest is stored, the tier it
  reveals credited silently, and a plain lid-up banner (`#key-open`) shows the chest's name, its words and the meter counting up from
  `was` to `now` through `core/count.js`, with one `Snd.unlockFx()`. **"Open the chest?" and "Would you like to progress to Pro?" are gone
  with the ask box.** A result-screen interlude whose clear tops a band opens the chest 2.5s in, inside the 3.9s hand-back, so neither
  driver waits any longer and nothing waits for a tap. Opened is opened — the next visit plays nothing.
- **CUSTOMISE WAITS FOR THE GAMES CHEST (L.11a).** The menu row is crossed out with "open the Games chest" under it and refuses the tap;
  the first draw after the chest opens wipes the strike (the menu's own unstrike) and the row is green until Customise is first opened
  (`prefs.cusSeen`, D.5). Meanwhile the defaults apply: `look(k)` / `lookCol(g)` in `core/store.js` give ui/theme.js, audio.js, the
  atmosphere, the run's rate bar and Sequence's scale the defaults while every stored choice is kept — so `opened(id)` lives in the store
  (theme and audio sit below `progress/` in the module graph) and `chestOpen()` in `progress/key.js` is the same function. The Customise
  unlocks tab is not gated and says "open the Games chest to use them" until then; an earned row's tap toasts rather than opening a locked
  screen. Cosmetic achievements still bank, and their items are first-seen green in Customise when it opens (the existing `newMark` —
  nothing marks a cosmetic seen until Customise draws it).
- **WHAT EACH CHEST GIVES, IN WORDS (L.11c) — `CHEST_WORDS` in `config/copy.js`.** A plain column beside an opened chest on the map (the free
  grid cell to its right, to its left where that is taken) and in the key screen's banner; nothing beside a chest that is not open. Games →
  CUSTOMISE, THE KEY; Key → GAUNTLET, PRO KEY; Pro → AUTHOR KEY, COSMETIC SET (tba); Thorns → HARD GAUNTLET (tba) — §M.3's set. Not tap
  targets yet (L.11b is build 41).
- **A WHOLE KEY TAPS THROUGH TO ITS CHEST (L.12).** `keyChest(tier)` — the chest whose `needs` is this tier, once the key is whole and that
  chest is ready or open — puts a hit disc over the hub glyph (`key-chest`); the map opens with that chest scrolled into view and picked
  out. The key screen reads no chest flag of its own (A4).
- **Testing, per chest (L.8f, G.8 extended, S5).** A switch and a reset for each of the four. Games' switch writes every mode row of
  UNLOCKS and snapshots what the store held (`devModesAll` in `progress.js` — nothing in `progress/key.js` may touch `store.unlock`);
  the other three are the old per-key switches on the key that fills each. "Set meter to N%" writes `prefs.devMeter`, which `meter()`
  returns while it is set. The four chest-opening buttons still play build 32's lid swing on the map; build 41 replaces them.
- **The radar keeps key 1's rung before the Games chest (guess)** — it is the Scores screen's picture of a player's best, and with no rung
  it would draw nothing.
