/* No Excuses — the eight video messages on the About screen (v25 item 23, build 46). DATA ONLY (A2).

   Aiden's decision, 2026-09-16: HE RECORDS THE CLIPS AND THEY DROP IN HERE. A slot is a row of data, so a clip arrives by filling in
   `file` (and `cc`) and nothing else changes — no code, no markup, no build step. Until then the slot shows its title, whether it is
   open or still locked, and the "video coming soon" frame.

   The order is the order they unlock in, and it is the progression's own order: the intro is open from the first load, then the four
   chests and the three keys interleaved as they actually arrive — Games chest, Lantern whole, Key chest, Circuit whole, Pro chest,
   Thorn whole, Thorns chest. `by` is what opens the slot and it is ONE of two shapes, never both:
     { chest:'games' }   the chest of that id being opened  (progress/key.js chestOpen)
     { key:'clear' }     that key tier being finished       (progress/key.js keyFinished)
   Nothing else is a lock, so ui/screens/about.js has one test and the congratulations card (item 22) asks the same one.
   `need` is what a locked row says instead — the player's words for the lock, never a number (v17 A.1's shape).

   `file` is a path under `video/` and `cc` a WebVTT track beside it. CAPTIONS ON EVERY CLIP: many people play on silent and Apple
   checks for it (item 23), so a clip with no `cc` is a clip that is not finished. A slot plays INSIDE the screen — iPhones will not
   start a video with sound unaided, so every one is tap-to-play and none of them autoplays or goes full screen.
   Keep a clip 30–60s, 720p, roughly 5–10 MB: GitHub Pages caps one file at 100 MB and the site at about 1 GB.
   Aiden can merge two slots later by deleting one row — the list is the screen. */
export const MESSAGES = [
  { id: 'intro', title: 'Welcome', by: null, need: '', file: '', cc: '' },
  { id: 'modes', title: 'Every game is open', by: { chest: 'games' }, need: 'the Games chest', file: '', cc: '' },
  { id: 'lantern', title: 'The Lantern is whole', by: { key: 'clear' }, need: 'a whole Lantern key', file: '', cc: '' },
  { id: 'keychest', title: 'Into the Pro tier', by: { chest: 'key' }, need: 'the Key chest', file: '', cc: '' },
  { id: 'circuit', title: 'The Circuit is whole', by: { key: 'pro' }, need: 'a whole Circuit key', file: '', cc: '' },
  { id: 'prochest', title: 'Against the author', by: { chest: 'pro' }, need: 'the Pro chest', file: '', cc: '' },
  { id: 'thorn', title: 'The Thorn is whole', by: { key: 'author' }, need: 'a whole Thorn key', file: '', cc: '' },
  { id: 'thornschest', title: 'The last one', by: { chest: 'thorns' }, need: 'the Thorns chest', file: '', cc: '' },
];
