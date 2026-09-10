/* No Excuses — sound data (build 16, refactor stage 2). DATA ONLY (A2). The code that plays it is audio.js. */
// the scales Sequence plays in
export const SCALES = { penta:{name:'Pentatonic',n:[0,2,4,7,9,12,14]}, chinese:{name:'Chinese',n:[0,2,5,7,9,12,14]}, hijaz:{name:'Hijaz',n:[0,1,4,5,7,8,10]}, blues:{name:'Blues',n:[0,3,5,6,7,10,12]} };

/* MUSIC — build 27 (v16 §1.1). WAS seven tracks of seven numbers each: root, bpm, four chords, four bass notes, played
   by one hard-coded arrangement (a four-note triangle pad held for the bar, a sine bass under it). That is exactly why
   Aiden heard "all the same, just different speed or pitch" — every game WAS the same piece of music transposed.

   A track is now an arrangement. `voices` is the whole of it: each voice has its own WAVE, its own RHYTHM (a step
   pattern across one bar) and its own role, so two options can share a root and a tempo and still be different music.
   Bar length is `beats`, so a track can be in 3, 5 or 6 as easily as in 4. Nothing here is played by a rule outside
   this file — audio.js reads the voices and schedules exactly what they say.

   NO PERCUSSION, still. It is the one rule the old module had that was right: a drum is indistinguishable from a tap
   on a game where the tap is the whole interaction. Rhythm comes from plucks, stabs, rests and odd bar lengths.

   THREE OPTIONS PER GAME, keyed '<game>:a|b|c'. `TRACK_PICK` is the one the app plays; the review catalogue plays all
   three so Aiden can compare them without playing seven games. Quick Tap · a IS the build-26 loop, note for note — it
   is the quality bar he named, so it is in the running rather than replaced.

   Roles, and the octave each starts from (root is the track's own):
     pad    root*2   the chord, held
     stab   root*2   the chord, short
     arp    root*2   one chord note per hit, in `dir` order
     lead   root*2   `seq`, a melody in semitones, one entry per hit, cycling across the whole loop (null = rest)
     bass   root/2   the bar's bass note
     sub    root/4   the bar's bass note, an octave under the bass
     drone  root/2   one note held for the whole bar
   Per voice: `w` wave · `o` octave shift · `pat` the bar's step pattern ('x' loud, 'o' soft, '.' rest) · `sus` note
   length as a fraction of one step · `g` gain · `at` attack as a fraction of the note · `atms` a fixed attack in ms
   · `gl` glide, the end frequency as a ratio of the start · `lead` a gain multiplier for the first chord note. */

export const TRACK_OPTS = ['a', 'b', 'c'];
// which option each game plays in the app. One data edit per game once Aiden has picked off the catalogue
export const TRACK_PICK = { 'quick-tap':'a', 'dots':'a', 'hold':'a', 'sequence':'a', 'timing':'a', 'reaction':'a', 'spot':'a' };

export const TRACKS = {
  /* ---------- Quick Tap — urgent, four on the floor without a floor ---------- */
  // a: the build-26 loop, unchanged. Held triangle chord, sine bass, one chord a bar
  'quick-tap:a':{ name:'Held', root:110, bpm:126, beats:4, ch:[[0,7,12,16],[5,12,17,21],[3,10,15,19],[7,14,19,22]], bass:[0,5,3,7],
    voices:[ { v:'pad', w:'triangle', pat:'x', sus:.98, g:.022, at:.286, lead:1.2 },
             { v:'bass', w:'sine', pat:'x', sus:.9, g:.07, atms:90 } ] },
  // b: sixteenths. A square pluck runs the chord up and down, the bass answers on the off-beats, nothing is held
  'quick-tap:b':{ name:'Runner', root:110, bpm:132, beats:4, ch:[[0,7,12,16],[5,12,17,21],[3,10,15,19],[7,14,19,22]], bass:[0,5,3,7],
    voices:[ { v:'arp', w:'square', dir:'updown', pat:'x.o.x.o.x.o.x.oo', sus:.55, g:.016, at:.02 },
             { v:'bass', w:'triangle', pat:'..x...x...x...x.', sus:.7, g:.05, at:.03 },
             { v:'sub', w:'sine', pat:'x', sus:1, g:.035, at:.2 } ] },
  // c: two chords, wide gaps, a sub that never stops. The room around the taps rather than a track through them
  'quick-tap:c':{ name:'Wide', root:110, bpm:118, beats:4, ch:[[0,7,14],[3,10,17]], bass:[0,3],
    voices:[ { v:'drone', w:'sine', pat:'x', sus:1, g:.05, at:.25 },
             { v:'stab', w:'triangle', pat:'x.....o.', sus:.35, g:.03, at:.04 },
             { v:'lead', w:'sine', pat:'....x..x', seq:[19,null,22,24,null,19], sus:.8, g:.022, at:.1 } ] },

  /* ---------- Dots — bright, moving, always one step ahead of you ---------- */
  // a: in THREE. A triangle arp climbs, a walking bass under it. The waltz is what makes it not Quick Tap
  'dots:a':{ name:'Waltz', root:130.8, bpm:132, beats:3, ch:[[0,4,7,11],[5,9,12,16],[3,7,10,14],[7,11,14,17]], bass:[0,5,3,7],
    voices:[ { v:'arp', w:'triangle', dir:'up', pat:'x.o.o.', sus:.8, g:.02, at:.06 },
             { v:'bass', w:'sine', pat:'x..o..', sus:.9, g:.055, atms:60 } ] },
  // b: a sawtooth line over a soft pad — the only voiced melody in the set, so it is the one that sounds like a tune
  'dots:b':{ name:'Line', root:130.8, bpm:100, beats:4, ch:[[0,4,7,11],[5,9,12,16],[3,7,10,14],[7,11,14,17]], bass:[0,5,3,7],
    voices:[ { v:'pad', w:'sine', pat:'x', sus:.98, g:.014, at:.35 },
             { v:'lead', w:'sawtooth', pat:'x..x.x..', seq:[12,16,19,16,21,19,16,12,14,17,12,null], sus:.7, g:.016, at:.04, gl:1.01 },
             { v:'bass', w:'triangle', pat:'x.......', sus:.85, g:.05, atms:70 } ] },
  // c: staccato squares with the down-beat missing. Rest-heavy on purpose — the gaps are the rhythm
  'dots:c':{ name:'Clip', root:130.8, bpm:124, beats:4, ch:[[0,4,9],[2,7,11],[-3,4,7],[0,5,9]], bass:[0,2,-3,0],
    voices:[ { v:'stab', w:'square', pat:'.x..xx.x', sus:.3, g:.013, at:.015 },
             { v:'bass', w:'sine', pat:'x...x...', sus:.6, g:.055, at:.05 },
             { v:'sub', w:'sine', pat:'x', sus:1, g:.03, at:.3 } ] },

  /* ---------- Estimate (hold) — slow, held, nothing hurrying you ---------- */
  // a: a drone and one bell every other bar. Eight beats to a bar, so it barely moves
  'hold:a':{ name:'Still', root:98, bpm:84, beats:8, ch:[[0,7,12,14],[-2,5,10,12]], bass:[0,-2],
    voices:[ { v:'drone', w:'sine', pat:'x', sus:1, g:.055, at:.3 },
             { v:'pad', w:'triangle', pat:'x', sus:.9, g:.012, at:.45 },
             { v:'lead', w:'sine', pat:'....x...', seq:[24,null,26,null], sus:1.8, g:.02, at:.15 } ] },
  // b: a rocking six. Same root, entirely different feel — the arp never lands on the bar line twice the same way
  'hold:b':{ name:'Rocking', root:98, bpm:96, beats:6, ch:[[0,7,12,16],[-4,3,8,12],[-2,5,10,14]], bass:[0,-4,-2],
    voices:[ { v:'arp', w:'triangle', dir:'updown', pat:'x.o.o.', sus:.9, g:.018, at:.08 },
             { v:'bass', w:'sine', pat:'x.....', sus:.95, g:.05, atms:110 } ] },
  // c: a sawtooth pad, very low and very slow, with a sub that breathes under it
  'hold:c':{ name:'Low', root:98, bpm:60, beats:4, ch:[[0,7,12],[-5,2,7]], bass:[0,-5],
    voices:[ { v:'pad', w:'sawtooth', pat:'x', sus:.97, g:.008, at:.5 },
             { v:'sub', w:'sine', pat:'x...o...', sus:.8, g:.05, at:.3 },
             { v:'stab', w:'sine', pat:'......x.', sus:.5, g:.012, at:.1 } ] },

  /* ---------- Sequence — bells. It is a memory game about notes; the track should be made of them ---------- */
  // a: a sine bell arp, up, with a pad behind it. The closest thing in the set to the game's own key sounds
  'sequence:a':{ name:'Bells', root:146.8, bpm:104, beats:4, ch:[[0,3,7,10],[3,7,10,14],[5,8,12,15],[7,10,14,17]], bass:[0,3,5,7],
    voices:[ { v:'arp', w:'sine', dir:'up', pat:'x..o..x.', sus:1.4, g:.02, at:.02 },
             { v:'pad', w:'triangle', pat:'x', sus:.96, g:.01, at:.4 },
             { v:'bass', w:'sine', pat:'x...', sus:.9, g:.05, atms:80 } ] },
  // b: a square ostinato and no pad at all. Dry, repetitive, slightly nagging — memory under pressure
  'sequence:b':{ name:'Ostinato', root:146.8, bpm:112, beats:4, ch:[[0,3,7],[5,8,12],[3,7,10],[-2,5,10]], bass:[0,5,3,-2],
    voices:[ { v:'arp', w:'square', dir:'down', pat:'x.x..x.x', sus:.4, g:.012, at:.015 },
             { v:'bass', w:'triangle', pat:'x......x', sus:.5, g:.05, at:.04 } ] },
  // c: a drone with one long descending line over it. Nearly empty, so a long pattern has room to be remembered
  'sequence:c':{ name:'Descent', root:146.8, bpm:76, beats:4, ch:[[0,7,12],[-2,5,10],[-4,3,8],[-5,2,7]], bass:[0,-2,-4,-5],
    voices:[ { v:'drone', w:'triangle', pat:'x', sus:1, g:.02, at:.35 },
             { v:'lead', w:'sine', pat:'x...x...', seq:[24,22,19,17,15,12,15,17], sus:1.5, g:.022, at:.08 },
             { v:'sub', w:'sine', pat:'x...', sus:.95, g:.04, at:.25 } ] },

  /* ---------- Timing — the widest and emptiest of the seven. Space is the point ---------- */
  // a: one drone and a swell. There is almost nothing to it, which is what stops it competing with the clock
  'timing:a':{ name:'Open', root:87.3, bpm:72, beats:4, ch:[[0,7,14,19],[-5,2,9,14]], bass:[0,-5],
    voices:[ { v:'drone', w:'sine', pat:'x', sus:1, g:.055, at:.4 },
             { v:'pad', w:'triangle', pat:'x', sus:.95, g:.014, at:.6 } ] },
  // b: three plucked notes a bar and a long silence after them. The silence is the rhythm
  'timing:b':{ name:'Three', root:87.3, bpm:60, beats:4, ch:[[0,5,12,17],[-3,4,11,16]], bass:[0,-3],
    voices:[ { v:'lead', w:'triangle', pat:'x.x.x...', seq:[12,17,19,17,12,10], sus:.9, g:.02, at:.03 },
             { v:'bass', w:'sine', pat:'x.......', sus:.9, g:.055, atms:120 } ] },
  // c: a rolling six with a sub under it — the only Timing option with any momentum, for players who find a a bit dead
  'timing:c':{ name:'Roll', root:87.3, bpm:104, beats:6, ch:[[0,7,12,16],[-5,2,7,12],[-3,4,9,14]], bass:[0,-5,-3],
    voices:[ { v:'arp', w:'triangle', dir:'updown', pat:'x.o.o.', sus:.7, g:.016, at:.04 },
             { v:'sub', w:'sine', pat:'x', sus:1, g:.05, at:.2 } ] },

  /* ---------- Reaction — the fastest of the seven, and the one that should feel wound up ---------- */
  // a: tight square stabs off the beat, bass on the one. Nothing sustains, so nothing masks a flash
  'reaction:a':{ name:'Wound', root:123.5, bpm:138, beats:4, ch:[[0,5,12,19],[2,7,14,21],[0,5,12,17],[-2,5,10,17]], bass:[0,2,0,-2],
    voices:[ { v:'stab', w:'square', pat:'..x...x.', sus:.25, g:.012, at:.01 },
             { v:'bass', w:'sine', pat:'x...', sus:.7, g:.06, at:.04 },
             { v:'sub', w:'sine', pat:'x', sus:1, g:.028, at:.25 } ] },
  // b: a sawtooth arp at sixteenths with a slight glide on every note. Relentless
  'reaction:b':{ name:'Wire', root:123.5, bpm:144, beats:4, ch:[[0,5,12],[2,7,14],[-2,5,10],[0,7,12]], bass:[0,2,-2,0],
    voices:[ { v:'arp', w:'sawtooth', dir:'up', pat:'xoxoxoxoxoxoxoxo', sus:.5, g:.008, at:.01, gl:1.02 },
             { v:'bass', w:'triangle', pat:'x.......', sus:.8, g:.055, at:.03 } ] },
  // c: a pad and a syncopated pluck — the one Reaction option you could leave on without being hurried
  'reaction:c':{ name:'Held breath', root:123.5, bpm:128, beats:4, ch:[[0,4,7,11],[-3,4,9,12]], bass:[0,-3],
    voices:[ { v:'pad', w:'triangle', pat:'x', sus:.97, g:.013, at:.4 },
             { v:'lead', w:'sine', pat:'..x.x..x', seq:[19,21,24,21,19,16], sus:.6, g:.018, at:.03 },
             { v:'bass', w:'sine', pat:'x...', sus:.85, g:.055, atms:90 } ] },

  /* ---------- Spot — searching. Something that wanders without ever arriving ---------- */
  // a: a wandering triangle line over two chords. It never resolves, which is the whole idea
  'spot:a':{ name:'Wander', root:116.5, bpm:96, beats:4, ch:[[0,4,9,14],[2,6,11,16]], bass:[0,2],
    voices:[ { v:'pad', w:'triangle', pat:'x', sus:.97, g:.014, at:.4 },
             { v:'lead', w:'sine', pat:'x..x..x.', seq:[16,19,21,19,23,21,19,16,14,16,19,21], sus:.9, g:.018, at:.05 },
             { v:'bass', w:'sine', pat:'x...', sus:.9, g:.05, atms:90 } ] },
  // b: high sine shimmer over a drone — up and down, never landing. The lightest track in the set
  'spot:b':{ name:'Shimmer', root:116.5, bpm:108, beats:4, ch:[[0,4,9,14,16],[-3,4,7,12,16]], bass:[0,-3],
    voices:[ { v:'arp', w:'sine', dir:'updown', o:1, pat:'x.x.x.x.x.x.', sus:.6, g:.008, at:.02 },
             { v:'drone', w:'sine', pat:'x', sus:1, g:.05, at:.3 } ] },
  // c: FIVE beats to a bar. Nothing else in the game is in five, so it is unmistakably its own piece
  'spot:c':{ name:'Five', root:116.5, bpm:120, beats:5, ch:[[0,4,9],[2,7,11],[-3,4,7]], bass:[0,2,-3],
    voices:[ { v:'stab', w:'square', pat:'x..x.x..x.', sus:.35, g:.011, at:.02 },
             { v:'bass', w:'triangle', pat:'x.........', sus:.6, g:.05, at:.05 },
             { v:'sub', w:'sine', pat:'x', sus:1, g:.03, at:.3 } ] },

  /* ---------- the menu (v16 §1.2) — its own track, not a game's. Calm, slow, no urgency at all ---------- */
  'menu':{ name:'Menu', root:103.8, bpm:80, beats:4, ch:[[0,7,12,16],[-3,4,9,14],[-5,2,7,14],[-1,4,11,16]], bass:[0,-3,-5,-1],
    voices:[ { v:'pad', w:'triangle', pat:'x', sus:.98, g:.016, at:.45, lead:1.15 },
             { v:'arp', w:'sine', dir:'up', pat:'x...o...x.......', sus:1.2, g:.012, at:.03 },
             { v:'bass', w:'sine', pat:'x...', sus:.92, g:.05, atms:110 } ] },

  /* ---------- the keys (v16 §1.3) — one per tier, rising in intensity the way the glyphs do.
     Keys 2 and 3 are a SHELL (#372, config/keys.js): what sits behind those tiers is undecided, so their loops are
     built as intensity steps over key 1 and nothing more. They are deliberately derived — same root, same chords —
     because a tier is the same thirty-one combinations at a harder bar, not a different collection. ---------- */
  'key:1':{ name:'Key I', root:130.8, bpm:88, beats:4, ch:[[0,7,12],[-4,3,8]], bass:[0,-4],
    voices:[ { v:'drone', w:'sine', pat:'x', sus:1, g:.05, at:.35 },
             { v:'lead', w:'triangle', pat:'x.......', seq:[19,null,24,null], sus:1.6, g:.02, at:.1 } ] },
  'key:2':{ name:'Key II', root:130.8, bpm:100, beats:4, ch:[[0,7,12],[-4,3,8],[-2,5,10],[-5,2,7]], bass:[0,-4,-2,-5],
    voices:[ { v:'drone', w:'sine', pat:'x', sus:1, g:.045, at:.3 },
             { v:'arp', w:'triangle', dir:'up', pat:'x...o...x...o...', sus:.9, g:.016, at:.03 },
             { v:'bass', w:'sine', pat:'x...', sus:.85, g:.05, atms:90 } ] },
  'key:3':{ name:'Key III', root:130.8, bpm:116, beats:4, ch:[[0,7,12,16],[-4,3,8,12],[-2,5,10,14],[-5,2,7,11]], bass:[0,-4,-2,-5],
    voices:[ { v:'pad', w:'triangle', pat:'x', sus:.97, g:.014, at:.35 },
             { v:'arp', w:'square', dir:'updown', pat:'x.o.x.o.x.o.x.o.', sus:.5, g:.011, at:.02 },
             { v:'lead', w:'sawtooth', pat:'....x..x', seq:[19,24,22,19,17,19], sus:.7, g:.012, at:.04 },
             { v:'bass', w:'triangle', pat:'x...x...', sus:.7, g:.055, at:.04 } ] },
};

/* the versus stems (v16 §1.4). ONE pair for every game, because a stem has to LINE UP with whatever the round's base
   loop is — it takes that track's root, bpm, bar length, chords and bass, and only the voicing is its own. Player 1
   gets a fifth above the chord, player 2 the bass line doubled an octave up; each rides its own gain node and the gain
   follows that player's proximity to the win condition. Presentation only — L10: nothing in a two-player run advances
   a key, a bar, an unlock or an achievement. */
export const STEMS = [
  { voices:[ { v:'arp', w:'triangle', dir:'up', o:1, pat:'..x...x.', sus:.5, g:.03, at:.02, add:7 } ] },
  { voices:[ { v:'bass', w:'square', o:1, pat:'x...x...', sus:.4, g:.022, at:.02 } ] },
];
