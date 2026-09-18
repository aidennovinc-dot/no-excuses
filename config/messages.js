/* No Excuses — the eight video messages on the About screen (v25 item 23, build 46). DATA ONLY (A2).

   Aiden's decision, 2026-09-16: HE RECORDS THE CLIPS AND THEY DROP IN HERE. A slot is a row of data, so a clip arrives by filling in
   `file` (and `cc`) and nothing else changes — no code, no markup, no build step. Until then the slot shows its title, whether it is
   open or still locked, and the "video coming soon" frame.

   ---------- v27 (item 8, build 52): A NEW LINE-UP OF EIGHT, AND FOUR KINDS OF LOCK ----------
   Aiden rewrote the list on 2026-09-18. What changed, row by row, against build 46's set:
     · Welcome no longer opens from the first load — it waits for the player's FIRST QUICK TAP · SPRINT, so the first thing
       the game says is said after the first thing the player does
     · the three "… is whole" key rows are GONE (build 51 had just corrected their titles; item 8 deletes the rows)
     · two GAUNTLET rows arrive, one per Gauntlet, opened by PLAYING that Gauntlet rather than by the chest it came out of
     · the last row is the support thank-you, and it waits for a payment that has gone through — NOT a tap on the support button
   The order is still the order they unlock in, and the four chests still carry the middle of it.

   `by` is what opens the slot, and it is ONE of these shapes, never two:
     { run:{ g, s } }   that combination finished, solo   (progress/key.js, Scores.runs() — a two-player, practice or demo run is not in there, L10)
     { chest:'games' }  that chest opened                 (progress/key.js chestOpen)
     { gauntlet:'g1' }  that Gauntlet played for the first time (progress/key.js, prefs.gauntSeen — written by ui/screens/gauntlet.js)
     { support:1 }      a support payment has gone through (progress/key.js, prefs.paid — THE HOOK IS NAMED AND NOTHING SETS IT YET)
   Nothing else is a lock, so ui/screens/about.js has one test and the congratulations card (item 22) asks the same one.
   `{ key:'…' }` (a key finished) was a fifth shape until build 52 and no row uses it any more, so it is gone from the test as well —
   a config shape nothing reads is the kind of thing that gets re-wired by accident (build 51's lesson, KEY_REVEAL).

   R1 — A SECRET MAY BE KNOWN TO EXIST, NEVER WHAT IT IS. A Gauntlet row is NOT IN THE LIST AT ALL until its Gauntlet has come out of its
   chest: no row, no gap, no "???" — the same rule item 2 put on the Gauntlet tiles themselves. But THE COUNTER STILL READS "N of 8",
   because Aiden is happy for a player to know secrets exist. `msgShown()` in progress/key.js is that test and `MESSAGES.length` is the
   total, so the two can never drift apart. The support row is NOT a secret — it is listed and locked, saying what opens it.

   v27 (item 4, build 51): A LOCKED ROW'S WORDS ARE NOT WRITTEN HERE. `need` was a literal per row and it was a second spelling of a name
   config/copy.js already owns. ui/screens/about.js composes the line from `by` instead — GRID.chestNeed × GRID.chest for a chest,
   MSG.lockedRun for a run, MSG.lockedGaunt × GAUNTLET.name for a Gauntlet, MSG.lockedPaid for the thank-you. One name, one place.

   `file` is a path under `video/` and `cc` a WebVTT track beside it. CAPTIONS ON EVERY CLIP: many people play on silent and Apple
   checks for it (item 23), so a clip with no `cc` is a clip that is not finished. A slot plays in the SHARED PLAYER (ui/video.js, items
   9 / 10) — a 16:9 picture in a drawn frame over the dimmed game, tap outside to close — and never full screen, never autoplaying.
   Keep a clip 30–60s, 720p, roughly 5–10 MB: GitHub Pages caps one file at 100 MB and the site at about 1 GB.
   v27 (item 11, build 52): EVERY SLOT POINTS AT THE TEST CARD until a real clip exists, so Aiden can judge the player's SIZE on his phone
   rather than on eight "video coming soon" frames. `video/test-card.mp4` is 1280×720, 16:9, 8s, and it shows its own dimensions, a
   face-guide box and a safe-area line; `video/test-card.vtt` is two cues, there so the captions strip under the frame can be judged too.
   A real clip replaces both paths on that row and nothing else changes. (This is NOT build 46's `video/test.mp4`, which does not exist and
   is planted by the gate to prove a 404 is survived — two different files, on purpose.) */
export const MESSAGES = [
  { id: 'intro', title: 'Welcome', by: { run: { g: 'quick-tap', s: 5 } }, file: 'video/test-card.mp4', cc: 'video/test-card.vtt' },
  { id: 'games', title: "You've seen them all!", by: { chest: 'games' }, file: 'video/test-card.mp4', cc: 'video/test-card.vtt' },
  { id: 'skill', title: 'The skill chest is open', by: { chest: 'key' }, file: 'video/test-card.mp4', cc: 'video/test-card.vtt' },
  { id: 'pro', title: 'Have you gone pro?', by: { chest: 'pro' }, file: 'video/test-card.mp4', cc: 'video/test-card.vtt' },
  { id: 'author', title: 'Much better than me', by: { chest: 'thorns' }, file: 'video/test-card.mp4', cc: 'video/test-card.vtt' },
  { id: 'g1', gaunt: 'g1', by: { gauntlet: 'g1' }, file: 'video/test-card.mp4', cc: 'video/test-card.vtt' },
  { id: 'g2', gaunt: 'g2', by: { gauntlet: 'g2' }, file: 'video/test-card.mp4', cc: 'video/test-card.vtt' },
  { id: 'thanks', title: 'Massive thank you', by: { support: 1 }, file: 'video/test-card.mp4', cc: 'video/test-card.vtt' },
];

/* ---------- v27 (items 9 / 10, build 52): THE SHARED VIDEO PLAYER ----------
   ONE player for all eight slots (ui/video.js), not a player per row: the frame, the power-on and the power-off are the player's, so a clip
   arriving still changes nothing but a file name — item 10's whole point ("built into the player, not the files").

   THE FRAME (item 9). The clip is 16:9 and the phone STAYS UPRIGHT — nothing rotates and nothing goes full screen. `inset` is how much of each
   screen edge the picture keeps clear, as a percentage, so it is NEVER EDGE TO EDGE and the dimmed game is still visible round it: 8% a side
   gives a picture 84% of the screen's width, and the same 8% caps its height on a wide screen. The outline is a thin white rounded rectangle at
   the SAME 1px the map's tiles and the chests are drawn in, and it GLOWS while the clip is playing in the colour of the chest that unlocked that
   slot (`msgCol()` in ui/chest.js reads it off the slot's own `by`), dim when paused or ended. Title above in the game's spaced capitals,
   captions below, "tap outside to close" (MSG.close) in dim grey at the foot. Nothing is drawn over the picture — no knobs, no antenna, no
   scanlines, and no native control bar either, which is why a tap ON the picture is what pauses and plays it.

   POWER ON AND POWER OFF (item 10), a television switching on. Named steps with their own times, the CEREMONY / KEY_EARN shape, so ui/video.js
   draws a step by its name and nothing else and a re-tune is a number edit here:
     on   outline  the frame's outline draws out of the centre line   ·  line  a white line snaps across its centre  ·  open  the line opens to the picture
     off  close    the picture collapses back to the line             ·  dot   the line shrinks to a dot and goes out  ·  fade  the outline fades last
   Item 10 caps the power-on at 750ms and asks for about 600; the gate fails a total over 750. The soft thunk is VIDEO_FX in config/audio.js,
   fired on `open` going out and on `dot` coming back. Identical for all eight clips, and it happens INSIDE the frame only. */
export const PLAYER = {
  inset: 8,
  on: { ms: 600, steps: [{ name: 'outline', at: 0, ms: 220 }, { name: 'line', at: 200, ms: 130 }, { name: 'open', at: 320, ms: 280 }] },
  off: { ms: 460, steps: [{ name: 'close', at: 0, ms: 200 }, { name: 'dot', at: 180, ms: 140 }, { name: 'fade', at: 300, ms: 160 }] },
};
