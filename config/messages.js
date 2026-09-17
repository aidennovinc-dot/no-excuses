/* No Excuses — the eight video messages on the About screen (v25 item 23, build 46). DATA ONLY (A2).

   Aiden's decision, 2026-09-16: HE RECORDS THE CLIPS AND THEY DROP IN HERE. A slot is a row of data, so a clip arrives by filling in
   `file` (and `cc`) and nothing else changes — no code, no markup, no build step. Until then the slot shows its title, whether it is
   open or still locked, and the "video coming soon" frame.

   The order is the order they unlock in, and it is the progression's own order: the intro is open from the first load, then the four
   chests and the three keys interleaved as they actually arrive — Games chest, Lantern whole, Skill chest, Circuit whole, Pro chest,
   Thorn whole, Author chest. `by` is what opens the slot and it is ONE of two shapes, never both:
     { chest:'games' }   the chest of that id being opened  (progress/key.js chestOpen)
     { key:'clear' }     that key tier being finished       (progress/key.js keyFinished)
   Nothing else is a lock, so ui/screens/about.js has one test and the congratulations card (item 22) asks the same one.
   v27 (item 4, build 51): A LOCKED ROW'S WORDS ARE NO LONGER WRITTEN HERE. `need` was a literal per row — "the Skill chest", "a whole Lantern
   key" — and it was a second spelling of a name config/copy.js already owns, which is how three rows were still calling the backgrounds keys
   after the 2026-09-16 naming rule. ui/screens/about.js composes the line from `by` instead: GRID.chestNeed with GRID.chest for a chest,
   MSG.keyNeed with the tier's own `name` in config/keys.js for a key. One name, one place (item 4), and it is never a number (v17 A.1).

   `file` is a path under `video/` and `cc` a WebVTT track beside it. CAPTIONS ON EVERY CLIP: many people play on silent and Apple
   checks for it (item 23), so a clip with no `cc` is a clip that is not finished. A slot plays INSIDE the screen — iPhones will not
   start a video with sound unaided, so every one is tap-to-play and none of them autoplays or goes full screen.
   Keep a clip 30–60s, 720p, roughly 5–10 MB: GitHub Pages caps one file at 100 MB and the site at about 1 GB.
   Aiden can merge two slots later by deleting one row — the list is the screen. */
/* v27 (item 4, build 51): the three key rows called the BACKGROUNDS keys — "The Lantern is whole" — which the 2026-09-16 naming rule already
   forbade and item 4 repeats: Lantern, Circuit and Thorn are the names of a key's background and its music, never of a key or a chest. Each now
   names its key. Item 8 (build 52) replaces this whole list with a new line-up of eight and drops these three rows; the titles are corrected here
   so build 51 does not go on the phone still calling a background a key. */
export const MESSAGES = [
  { id: 'intro', title: 'Welcome', by: null, file: '', cc: '' },
  { id: 'modes', title: 'Every game is open', by: { chest: 'games' }, file: '', cc: '' },
  { id: 'lantern', title: 'The Skill key is whole', by: { key: 'clear' }, file: '', cc: '' },
  { id: 'keychest', title: 'Into the Pro tier', by: { chest: 'key' }, file: '', cc: '' },
  { id: 'circuit', title: 'The Pro key is whole', by: { key: 'pro' }, file: '', cc: '' },
  { id: 'prochest', title: 'Against the author', by: { chest: 'pro' }, file: '', cc: '' },
  { id: 'thorn', title: 'The Author key is whole', by: { key: 'author' }, file: '', cc: '' },
  { id: 'thornschest', title: 'The last one', by: { chest: 'thorns' }, file: '', cc: '' },
];
