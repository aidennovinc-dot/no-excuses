/* No Excuses — sound data (build 16, refactor stage 2). DATA ONLY (A2). The code that plays it is audio.js. */
// the scales Sequence plays in
export const SCALES = { penta:{name:'Pentatonic',n:[0,2,4,7,9,12,14]}, chinese:{name:'Chinese',n:[0,2,5,7,9,12,14]}, hijaz:{name:'Hijaz',n:[0,1,4,5,7,8,10]}, blues:{name:'Blues',n:[0,3,5,6,7,10,12]} };

/* MUSIC — build 30 (v17 §B.29–§B.31). A track is an ARRANGEMENT: `voices` is the whole of it, each with its own wave,
   its own step pattern across one bar and a role, so two options can share a root and a tempo and still be different
   music. Bar length is `beats`. Nothing here is played by a rule outside this file — audio.js reads the voices and
   schedules exactly what they say.

   NO PERCUSSION, still. A drum is indistinguishable from a tap on a game where the tap is the whole interaction.

   BUILD 30 REPLACED MOST OF THE SET (B.30). The build-27 tracks were written blind against a 16-bar cap and Aiden's
   board notes said so: Sequence's were pitched in D while the game's own keys play in C ("they confuse the user"),
   Dots wanted "longer gradual notes, no high beeps", and Timing / Reaction / Spot "most seem like 4 random notes".
   The replacements come from the 2026-09-10 proposal (`_review/2026-09-10_music-keys-*`), measured rather than
   guessed. What did NOT change: Quick Tap · Held is the build-26 loop note for note (the quality bar Aiden named, and
   the gate asserts it) and Dots · Waltz is his pick, carried over untouched except for `vol` — it measured 4.67×
   quieter than Held through a phone speaker, which is the whole reason a track-level gain exists.

   THE OPTION IDS ARE NAMES NOW, not a/b/c. B.32 puts a per-game music row in Customise, and a row that says
   "Tide / Glass / Breath" is the only version of that screen worth reading. `TRACK_OPTS` is one list per game and the
   keys are '<game>:<opt>'; `TRACK_PICK` is what the app plays until the player chooses otherwise.

   Roles, and the octave each starts from (root is the track's own):
     pad    root*2   the chord, held
     stab   root*2   the chord, short
     arp    root*2   one chord note per hit, in `dir` order
     lead   root*2   `seq`, a melody in semitones, one entry per hit, cycling across the whole loop (null = rest)
     bass   root/2   the bar's bass note
     sub    root/4   the bar's bass note, an octave under the bass
     drone  root/2   one note held for the whole bar
   Per TRACK: `root` `bpm` `beats` `ch` `bass` · `per` bars per chord · `form` bars in one written pass · `vol` a gain
   over every voice.
   Per VOICE: `w` wave · `o` octave shift · `pat` the bar's step pattern ('x' loud, 'o' soft, '.' rest) · `sus` note
   length as a fraction of one step · `g` gain · `at` attack as a fraction of the note · `atms` a fixed attack in ms
   · `gl` glide, the end frequency as a ratio of the start · `lead` a gain multiplier for the first chord note ·
   `add` a fixed transposition · `ct` detune in cents · `lp` `q` a per-note lowpass · `hold` hold full gain until
   `dur×hold` before the release · `lv` a per-bar level string ('.' silent, '1'–'9' = 10–90%, 'x' = 100%, cycling) ·
   `lpv` the same string for the filter, cutoff `lp × 2^(3(m−1))`. Without `lpv` the filter follows `lv`. */

// one list per game, in the order the Customise row shows them. The first is not special; TRACK_PICK is
export const TRACK_OPTS = {
  'quick-tap':['held','runner','wide'], 'dots':['waltz','glide','drift'], 'hold':['tide','glass','breath'],
  'sequence':['root','fifths','hum'], 'timing':['loops','horizon','wheel'], 'reaction':['pressure','coil','ascent'],
  'spot':['oddone','sonar','tessellate'],
};
/* what each game plays out of the box (B.30). Quick Tap and Dots are Aiden's own picks off the build-27 board; the
   other five are Cowork's, marked (guess) in FEEDBACK-v17, and B.32 is how he swaps one on the phone. */
export const TRACK_PICK = { 'quick-tap':'held', 'dots':'waltz', 'hold':'tide', 'sequence':'root', 'timing':'horizon', 'reaction':'coil', 'spot':'sonar' };

/* B.29 — HOW LONG A RUN IS EXPECTED TO TAKE, so a known-length run can be given one arc instead of a loop. A timed
   game answers this itself (the length in seconds IS the run), so only the round-based Sets are here, keyed the same
   'game:mode' as SET_COPY. These are ESTIMATES from the round counts and each mode's own pacing — logged in
   UNVERIFIED.md — and a wrong one costs nothing but an arc that finishes a little early or late, because the finish
   ramp (B.28) lands the last downbeat on the clock whatever the arc did. A Streak has no expected length at all and
   gets the long form. */
export const SET_SECS = {
  'hold:grow':44, 'hold:cut':70, 'timing:stopwatch':42, 'timing:hidden':52,
  'reaction:flash':20, 'reaction:nogo':26, 'spot:count':62, 'spot:find':52,
};

/* B.30 — Sequence ducks the music while the pattern plays and while it is being copied. It is one number and one
   rule: any time a key rings (Snd.note, which is both halves — the game playing the pattern and the player answering
   it), the Sequence bed drops to DUCK for the note's length plus DUCK_TAIL. The confusion Aiden reported was the
   track fighting the keys for the same pitches; the new Sequence tracks fixed the pitch half of it (C and G only,
   all below the keys' own C4) and this is the level half. */
export const DUCK = 0.4, DUCK_TAIL = 0.35;

export const TRACKS = {
  /* ---------- Quick Tap — urgent, four on the floor without a floor ---------- */
  // held: the build-26 loop, unchanged and picked. Held triangle chord, sine bass, one chord a bar
  'quick-tap:held':{ name:'Held', root:110, bpm:126, beats:4, ch:[[0,7,12,16],[5,12,17,21],[3,10,15,19],[7,14,19,22]], bass:[0,5,3,7],
    voices:[ { v:'pad', w:'triangle', pat:'x', sus:.98, g:.022, at:.286, lead:1.2 },
             { v:'bass', w:'sine', pat:'x', sus:.9, g:.07, atms:90 } ] },
  // runner: sixteenths. A square pluck runs the chord up and down, the bass answers on the off-beats, nothing is held.
  // `vol` on these two is the same measured correction Waltz got — both rendered 10-13 dB under Held, which is the
  // difference between an option and an option nobody would pick because it sounds broken (_smoke/loudness.mjs)
  'quick-tap:runner':{ name:'Runner', vol:4.36, root:110, bpm:132, beats:4, ch:[[0,7,12,16],[5,12,17,21],[3,10,15,19],[7,14,19,22]], bass:[0,5,3,7],
    voices:[ { v:'arp', w:'square', dir:'updown', pat:'x.o.x.o.x.o.x.oo', sus:.55, g:.016, at:.02 },
             { v:'bass', w:'triangle', pat:'..x...x...x...x.', sus:.7, g:.05, at:.03 },
             { v:'sub', w:'sine', pat:'x', sus:1, g:.035, at:.2 } ] },
  // wide: two chords, wide gaps, a sub that never stops. The room around the taps rather than a track through them
  'quick-tap:wide':{ name:'Wide', vol:3.09, root:110, bpm:118, beats:4, ch:[[0,7,14],[3,10,17]], bass:[0,3],
    voices:[ { v:'drone', w:'sine', pat:'x', sus:1, g:.05, at:.25 },
             { v:'stab', w:'triangle', pat:'x.....o.', sus:.35, g:.03, at:.04 },
             { v:'lead', w:'sine', pat:'....x..x', seq:[19,null,22,24,null,19], sus:.8, g:.022, at:.1 } ] },

  /* ---------- Dots — bright, moving, always one step ahead of you ---------- */
  // waltz: in THREE, and Aiden's pick. `vol` is the measured correction, not a taste call — see the header
  'dots:waltz':{ name:'Waltz', vol:4.67, root:130.8, bpm:132, beats:3, ch:[[0,4,7,11],[5,9,12,16],[3,7,10,14],[7,11,14,17]], bass:[0,5,3,7],
    voices:[ { v:'arp', w:'triangle', dir:'up', pat:'x.o.o.', sus:.8, g:.02, at:.06 },
             { v:'bass', w:'sine', pat:'x..o..', sus:.9, g:.055, atms:60 } ] },
  // glide: the "longer gradual notes, no high beeps" note answered directly — eight chords, everything held and filtered
  'dots:glide':{ name:'Glide', vol:0.5, root:130.8, bpm:96, beats:4, form:32,
    ch:[[0,7,11,16],[2,9,14,18],[4,11,14,19],[2,6,9,14],[5,12,16,21],[7,14,17,23],[4,11,16,19],[2,9,14,17]], bass:[0,0,4,6,5,7,9,7],
    voices:[ { v:'pad', w:'triangle', pat:'x', sus:1.02, hold:.72, at:.16, g:.011, lp:2200, ct:-6, lv:'6789xxxxxxxxxxxxxxxxxxxxxxxx9877' },
             { v:'pad', w:'triangle', pat:'x', sus:1.02, hold:.72, at:.2, g:.009, lp:1600, ct:6, lv:'....5678xxxxxxxxxxxxxxxxxxxx9876' },
             { v:'bass', w:'triangle', pat:'x', sus:.96, hold:.55, g:.05, atms:140, lp:500 },
             { v:'lead', w:'sine', o:-1, pat:'x.x.', seq:[19,16,21,23,19,18,16,14,21,19,23,26,24,23,21,19], sus:1.9, hold:.5, at:.22, g:.02, lv:'....3456789xxxxxxxxxxxxxxxx98765' } ] },
  // drift: a slow sawtooth swell under an arp an octave down. Two bars a chord, so nothing lands where you expect it
  'dots:drift':{ name:'Drift', vol:1.03, root:155.6, bpm:104, beats:4, per:2, form:32,
    ch:[[0,7,14],[-2,5,12],[-4,3,10],[-5,2,9],[0,7,14],[3,10,17],[5,12,19],[2,9,16]], bass:[0,-2,-4,-5,0,3,5,2],
    voices:[ { v:'pad', w:'sawtooth', pat:'x', sus:1.04, hold:.75, at:.3, g:.007, lp:900, q:1.6, lpv:'2345678xx9876543' },
             { v:'pad', w:'triangle', pat:'x', sus:1.04, hold:.75, at:.35, g:.009, ct:8, lv:'5667788xx8877665' },
             { v:'arp', w:'triangle', o:-1, dir:'updown', pat:'x.o.x.o.', sus:2.2, at:.12, g:.016, lp:850, lv:'..3456789xxxxxxxxxxxxxxxxxxx9876' },
             { v:'sub', w:'sine', pat:'x', sus:1.02, hold:.8, at:.25, g:.04 },
             { v:'bass', w:'triangle', pat:'x', sus:.98, hold:.6, at:.2, g:.035, lp:400 } ] },

  /* ---------- Estimate — slow, held, nothing hurrying you. `hold` is the game's id, not the voice field ---------- */
  // tide: eight chords over thirty-two bars, two bars each, a bell every other bar. The picked one
  'hold:tide':{ name:'Tide', vol:0.85, root:98, bpm:70, beats:4, per:2, form:32,
    ch:[[0,7,12,16],[-3,4,9,12],[-7,0,5,9],[-5,2,7,11],[0,4,7,14],[-3,7,12,16],[-7,5,9,12],[-5,5,7,14]], bass:[0,-3,-7,-5,0,-3,-7,-5],
    voices:[ { v:'pad', w:'triangle', pat:'x', sus:1.04, hold:.7, at:.35, g:.011, lp:1500, lv:'45678xx8' },
             { v:'pad', w:'sine', add:12, pat:'x', sus:1.04, hold:.6, at:.5, g:.005, lv:'x8765567' },
             { v:'bass', w:'triangle', pat:'x', sus:.98, hold:.55, g:.045, atms:260, lp:420 },
             { v:'lead', w:'sine', pat:'x.......', seq:[12,null,16,null,14,null,7,null,12,null,19,null,16,null,11,null], sus:12, g:.018, at:.06, lv:'....xxxxxxxxxxxxxxxxxxxxxxxx....' } ] },
  // glass: 60bpm, four bars a chord. The slowest thing in the set — a run of Estimate is mostly waiting and this agrees
  'hold:glass':{ name:'Glass', vol:0.76, root:110, bpm:60, beats:4, per:4, form:16, ch:[[0,7,14,16],[-4,3,10,14],[-2,5,12,14],[-7,0,7,14]], bass:[0,-4,-2,-7],
    voices:[ { v:'pad', w:'sine', pat:'x', sus:1.04, hold:.8, at:.45, g:.012 },
             { v:'pad', w:'triangle', pat:'x', sus:1.04, hold:.7, at:.55, g:.007, ct:7, lp:1100, lv:'3579xxxxxxxx9753' },
             { v:'lead', w:'sine', o:1, pat:'x...', seq:[7,null,4,null,2,null,-5,null], sus:7, hold:.3, at:.35, g:.006, lv:'........xxxxxxxx' },
             { v:'bass', w:'triangle', pat:'x', sus:1.02, hold:.7, at:.3, g:.03, lp:380 } ] },
  // breath: two detuned sawtooth pads opening and closing against each other. The filter IS the rhythm
  'hold:breath':{ name:'Breath', vol:1.09, root:98, bpm:66, beats:4, per:2, form:16, ch:[[0,7,10,14],[-2,5,9,12],[-4,3,7,10],[-5,2,5,9]], bass:[0,-2,-4,-5],
    voices:[ { v:'pad', w:'sawtooth', pat:'x', sus:1.04, hold:.75, at:.3, g:.008, lp:1300, q:2.5, lpv:'12356789x9876532' },
             { v:'pad', w:'sawtooth', pat:'x', sus:1.04, hold:.75, at:.34, g:.006, ct:9, lp:1300, q:2.5, lpv:'2356789x98765321' },
             { v:'bass', w:'triangle', pat:'x', sus:1.02, hold:.75, at:.25, g:.035, lp:360 },
             { v:'lead', w:'triangle', o:-1, pat:'x.......', seq:[12,null,null,15,null,null,10,null], sus:6, at:.03, g:.02, lv:'....xxxxxxxxxxxx' } ] },

  /* ---------- Sequence — C and G ONLY, and everything below the keys ----------
     The build-27 Sequence tracks were in D while `Snd.note` plays the scales from C4 (261.6 Hz). That is what Aiden
     heard as "none of these suit sequence, they confuse the user": the bed was a semitone family away from the notes
     he was being asked to remember. These three use the two pitch classes every scale in SCALES contains, under C4,
     and DUCK drops them while a key rings. */
  'sequence:root':{ name:'Root', vol:0.82, root:130.8, bpm:60, beats:4, form:16, ch:[[-12,-5]], bass:[0],
    voices:[ { v:'pad', w:'sawtooth', pat:'x', sus:1.04, hold:.8, at:.4, g:.012, lp:560, q:1.2, lpv:'4567899x99876544' },
             { v:'pad', w:'triangle', pat:'x', sus:1.04, hold:.8, at:.45, g:.012, ct:5 },
             { v:'drone', w:'sine', pat:'x', sus:1.02, hold:.85, at:.3, g:.035 } ] },
  'sequence:fifths':{ name:'Fifths', vol:1.24, root:130.8, bpm:60, beats:4, form:16, ch:[[0]], bass:[0],
    voices:[ { v:'lead', w:'triangle', seq:[-24], pat:'x', sus:1.04, hold:.85, at:.4, g:.02, lp:600, lv:'9876543334567899' },
             { v:'lead', w:'triangle', seq:[-17], pat:'x', sus:1.04, hold:.85, at:.4, g:.016, lp:600 },
             { v:'lead', w:'triangle', seq:[-12], pat:'x', sus:1.04, hold:.85, at:.4, g:.014, lp:700, lv:'3456789xx9876543' },
             { v:'lead', w:'sine', seq:[-5], pat:'x', sus:1.04, hold:.85, at:.45, g:.01, lv:'1234567887654321' } ] },
  // six beats to a bar, so its level strings step at a different rate to Fifths — two drones on the same two notes
  // and the same waves would otherwise be one option written twice, which is the shape the gate refuses
  'sequence:hum':{ name:'Hum', vol:0.79, root:130.8, bpm:60, beats:6, form:8, ch:[[0]], bass:[0],
    voices:[ { v:'lead', w:'sine', seq:[-12], pat:'x', sus:1.04, hold:.9, at:.2, g:.02, ct:-4 },
             { v:'lead', w:'sine', seq:[-12], pat:'x', sus:1.04, hold:.9, at:.2, g:.02, ct:4 },
             { v:'lead', w:'triangle', seq:[-17], pat:'x', sus:1.04, hold:.9, at:.3, g:.014, lp:500, lv:'6789x987' },
             { v:'lead', w:'sine', seq:[-24], pat:'x', sus:1.04, hold:.9, at:.3, g:.03 } ] },

  /* ---------- Timing — no countable beat. The one thing a timing game must not be given is a metronome ---------- */
  'timing:loops':{ name:'Loops', vol:1.46, root:87.3, bpm:50, beats:4, form:32, ch:[[0,7,12]], bass:[0],
    voices:[ { v:'drone', w:'sine', pat:'x', sus:1.02, hold:.8, at:.3, g:.03, lv:'456789x98765' },
             { v:'drone', w:'triangle', o:1, pat:'x', sus:1.02, hold:.8, at:.4, g:.012, lp:500, lv:'98765456789x' },
             { v:'lead', w:'triangle', pat:'x.......', seq:[0,null,null,null,null,7,null], sus:14, hold:.35, at:.3, g:.016, lp:1200 },
             { v:'lead', w:'sine', pat:'...x....', seq:[null,12,null,null,null,null,null,null,4], sus:14, hold:.3, at:.35, g:.016 },
             { v:'lead', w:'triangle', o:-1, pat:'.....x..', seq:[5,null,null,null,null,null,null,null,null,null,9], sus:14, hold:.35, at:.3, g:.02, lp:900 },
             { v:'lead', w:'sine', pat:'..x.....', seq:[null,null,16,null,14], sus:12, hold:.3, at:.4, g:.011 } ] },
  // horizon: five beats to a bar, ten bars a pass. The picked one — wide, and nothing in it counts
  'timing:horizon':{ name:'Horizon', vol:0.81, root:87.3, bpm:54, beats:5, form:10, ch:[[0,7,16],[2,9,14],[-3,4,12],[-1,6,11],[0,9,14]], bass:[0,2,-3,-1,-5],
    voices:[ { v:'pad', w:'triangle', pat:'x', sus:1.04, hold:.75, at:.45, g:.012, lp:1500, lv:'45678xx876' },
             { v:'pad', w:'sine', pat:'x', sus:1.04, hold:.75, at:.5, g:.008, ct:-7 },
             { v:'lead', w:'sine', pat:'x....', seq:[12,null,14,null,null,7,null], sus:4.9, hold:.2, at:.5, g:.012, gl:1.12, lv:'..xxxxxxxx' },
             { v:'bass', w:'triangle', pat:'x', sus:1.02, hold:.6, at:.3, g:.03, lp:360 } ] },
  'timing:wheel':{ name:'Wheel', vol:0.7, root:87.3, bpm:43, beats:6, per:2, form:16, ch:[[0,4,7,12],[-3,4,9,12],[-7,0,5,9],[-5,2,7,14]], bass:[0,-3,-7,-5],
    voices:[ { v:'arp', w:'triangle', dir:'updown', pat:'x.x..x.x..x', sus:2.2, hold:.2, at:.2, g:.016, lp:800, lv:'3456789xxxxxxxxx' },
             { v:'pad', w:'sine', pat:'x', sus:1.04, hold:.8, at:.4, g:.01 },
             { v:'bass', w:'triangle', pat:'x', sus:1.02, hold:.6, at:.3, g:.03, lp:360 } ] },

  /* ---------- Reaction — tense, but with no sudden onset to jump at. A stab IS a false flash ---------- */
  'reaction:pressure':{ name:'Pressure', vol:1.72, root:123.5, bpm:140, beats:4, form:16, ch:[[0,3,7,10],[0,3,7,10],[-2,2,5,9],[-4,0,3,7]], bass:[0,0,-2,-4],
    voices:[ { v:'lead', w:'triangle', o:-1, pat:'xoxoxoxoxoxoxoxo', seq:[0,0,7,0,12,0,7,3], sus:.95, at:.25, g:.012, lp:600, lpv:'3456789x' },
             { v:'pad', w:'sawtooth', pat:'x', sus:1.04, hold:.8, at:.3, g:.006, lp:900, lv:'6666777788889999' },
             { v:'sub', w:'sine', pat:'x', sus:1.02, hold:.8, at:.2, g:.04 },
             { v:'lead', w:'sine', pat:'x', seq:[15,14,15,17], sus:1.04, hold:.8, at:.6, g:.006, lv:'........3579xxxx' } ] },
  // coil: six beats, two chords a semitone apart, everything wound and nothing released. The picked one
  'reaction:coil':{ name:'Coil', vol:1.2, root:123.5, bpm:132, beats:6, per:2, form:16, ch:[[0,7,12],[1,8,13]], bass:[0,1],
    voices:[ { v:'arp', w:'triangle', o:-1, dir:'up', pat:'xooxoo', sus:1.3, at:.15, g:.016, lp:700, lv:'56789xxxxxxxxx98' },
             { v:'drone', w:'sine', pat:'x', sus:1.02, hold:.85, at:.2, g:.035 },
             { v:'drone', w:'triangle', o:1, pat:'x', sus:1.02, hold:.85, at:.3, g:.012, lp:450 },
             { v:'pad', w:'triangle', pat:'x', sus:1.04, hold:.75, at:.4, g:.008, lp:1000, lv:'....4567899xxxxx' } ] },
  // ascent: twelve chords climbing a semitone a bar with a glide on every note. It never arrives, which is the idea
  'reaction:ascent':{ name:'Ascent', vol:0.49, root:123.5, bpm:120, beats:4, form:12,
    ch:[[0,7],[1,8],[2,9],[3,10],[4,11],[5,12],[6,13],[7,14],[8,15],[9,16],[10,17],[11,18]], bass:[0],
    voices:[ { v:'pad', w:'triangle', o:-1, pat:'x', sus:1, hold:.86, at:.1, g:.02, gl:1.0595, lp:900, lv:'...112334567' },
             { v:'pad', w:'sine', pat:'x', sus:1, hold:.86, at:.1, g:.02, gl:1.0595, lv:'8899xxxxx998' },
             { v:'pad', w:'sine', o:1, pat:'x', sus:1, hold:.86, at:.1, g:.016, gl:1.0595, lv:'8765433211..' } ] },

  /* ---------- Spot — searching. Something that wanders without ever arriving ---------- */
  'spot:oddone':{ name:'Odd one', vol:0.83, root:116.5, bpm:92, beats:4, per:2, form:24, ch:[[0,7,11,14],[-3,4,9,12],[2,9,12,16],[-5,2,7,11]], bass:[0,-3,2,-5],
    voices:[ { v:'lead', w:'triangle', pat:'x.x.x.x.', seq:[0,4,7,11,7,4,2,0,4,7,12,7,4,2,0,4,6,11,7,4,2], sus:1.9, hold:.3, at:.25, g:.016, lp:1200 },
             { v:'pad', w:'sine', pat:'x', sus:1.04, hold:.75, at:.4, g:.009, lv:'456789xxxxxxxxxxxxxx9876' },
             { v:'bass', w:'triangle', pat:'x', sus:1.02, hold:.6, at:.25, g:.03, lp:380 },
             { v:'lead', w:'sine', o:-1, pat:'x.x.x.x.', seq:[0,4,7,11,7,4,2,0,4,7,12,7,4,2,0,4,6,11,7,4,2], sus:1.9, hold:.3, at:.25, g:.012, lv:'........3456789xxxxxxxxx' } ] },
  // sonar: one ping and two echoes of it, four bars a chord. The picked one — it is a searching game and this searches
  'spot:sonar':{ name:'Sonar', vol:1.06, root:116.5, bpm:80, beats:4, per:4, form:16, ch:[[0,3,7,14],[-4,3,8,12],[-2,5,10,14],[-7,0,5,10]], bass:[0,-4,-2,-7],
    voices:[ { v:'pad', w:'triangle', pat:'x', sus:1.04, hold:.8, at:.45, g:.008, lp:900, lv:'5678899xxx998877' },
             { v:'sub', w:'sine', pat:'x', sus:1.02, hold:.8, at:.3, g:.035 },
             { v:'lead', w:'sine', pat:'x...............', seq:[7,null,14,10,null,null,12,null], sus:12, at:.04, g:.022 },
             { v:'lead', w:'sine', pat:'......x.........', seq:[7,null,14,10,null,null,12,null], sus:10, at:.06, g:.009 },
             { v:'lead', w:'sine', pat:'............x...', seq:[7,null,14,10,null,null,12,null], sus:8, at:.08, g:.004 } ] },
  'spot:tessellate':{ name:'Tessellate', vol:1.11, root:116.5, bpm:108, beats:5, per:2, form:16, ch:[[0,4,9,14],[2,7,11,16],[-3,4,7,12],[-1,6,9,14]], bass:[0,2,-3,-1],
    voices:[ { v:'arp', w:'triangle', o:-1, dir:'updown', pat:'x.o.o.x.o.', sus:1.6, at:.14, g:.017, lp:720, lv:'4567899xxxxxxxxx' },
             { v:'pad', w:'triangle', pat:'x', sus:1.04, hold:.75, at:.35, g:.008, lp:1400, lv:'..3456789xxxxxx9' },
             { v:'bass', w:'triangle', pat:'x.........', sus:6, hold:.5, at:.05, g:.03, lp:380 } ] },

  /* ---------- the menu (v16 §1.2) — its own track, not a game's. Calm, slow, no urgency at all ---------- */
  'menu':{ name:'Menu', root:103.8, bpm:80, beats:4, ch:[[0,7,12,16],[-3,4,9,14],[-5,2,7,14],[-1,4,11,16]], bass:[0,-3,-5,-1],
    voices:[ { v:'pad', w:'triangle', pat:'x', sus:.98, g:.016, at:.45, lead:1.15 },
             { v:'arp', w:'sine', dir:'up', pat:'x...o...x.......', sus:1.2, g:.012, at:.03 },
             { v:'bass', w:'sine', pat:'x...', sus:.92, g:.05, atms:110 } ] },

  /* ---------- v23 (§L.7a, build 42): THE THREE KEY THEMES, REWRITTEN — Key → Pro → Thorns ----------
     Aiden, on build 41's: "it takes far too long to get into the meat of things, and by then the person would have already exited".
     Measured, that was literal: Roots' melody came in 1.4s into a 5.7s bar and its bass and top pad were silent for its first four and
     eight bars; Frost's arp was silent for 10s and its melody for 38s; Thorn's filters opened from shut over 32s and its melody waited 32s.
     So the rewrite is in the ARRANGEMENT, and the harmony of each key stays: the same root and the same chords, which is also what keeps
     the four chest stings (below) resolving into the theme they are cut from.
     THE RULES THESE ARE WRITTEN TO, and the gate reads every one: each theme is in its motif on the first beat of the first bar, and every
     voice sounds in that bar at 70% of its level or more, at full gain inside one beat — no intro, no fade-up, no build; no level string
     carries a rest or drops under 60%, so no voice drops out at a loop point; the form is a whole number of chord cycles, so the loop lands
     back on the first chord; batch 12's "long gradual notes, no short high-pitched notes" as the chest stings have it — anything under
     700ms is under 300 Hz, anything above C5 lasts 1200ms or more. The written pass is 16 bars of a 16-bar melody (8 bars, then a
     variation), and the long form walks the level strings past three minutes like every other track.
     ESCALATION is in the writing, not the gain: Key is one melody over a held chord, steady and warm; Pro is faster, a chord a bar, a
     driving bass pulse and a low arp under it, and a SECOND voice answering the melody off the beat; Thorns is the lowest root, a sawtooth
     bass, filters moving, an arp in both directions and the answering voice too — the most notes a second of the three (gated).
     `music` in config/keys.js names the chest that opens each theme, and KEY_THEMES below maps that chest to its track — one field in the
     store (prefs.everywhere) and both surfaces read it.
     NOBODY HAS HEARD THESE. No audio device in a Claude Code session (UNVERIFIED.md). `vol` came out of _smoke/loudness.mjs: at 1.0 the
     three rendered −35.1 / −35.3 / −37.6 dB against about −40 for the game tracks, so 0.57 / 0.58 / 0.76 bring each to −40. ---------- */
  // Key: G, the Roots chords, a chord a bar. One melody, two long notes a bar, over a held triangle chord, a drone and a slow bass
  'theme:key':{ name:'Lantern', vol:0.57, root:98, bpm:88, beats:4, form:16, ch:[[0,7,12,14],[-2,5,10,12],[-4,3,8,12],[-2,5,10,14]], bass:[0,-2,-4,-2],
    voices:[ { v:'lead', w:'sine', pat:'x.x.', seq:[24,19, 22,24, 20,24, 17,14, 24,26, 24,22, 19,15, 17,14, 26,24, 22,26, 27,24, 22,17, 19,24, 26,22, 20,19, 17,14], sus:1.9, hold:.35, at:.12, g:.02, lv:'xxxxxxx9' },
             { v:'pad', w:'triangle', pat:'x', sus:1.02, hold:.7, at:.1, g:.011, lv:'x9xx9xx8xx9x' },
             { v:'drone', w:'sine', pat:'x', sus:1, hold:.8, at:.1, g:.04 },
             { v:'bass', w:'triangle', o:1, pat:'x...x...', sus:3.6, hold:.5, at:.08, g:.026, lp:340 },
             { v:'pad', w:'sine', add:12, pat:'x', sus:1.02, hold:.6, at:.12, g:.004, lv:'8999xx99' } ] },
  // Pro: D, the Frost chords, faster and a chord a bar. The melody, a second voice answering it off the beat, a bass pulse and a low arp
  'theme:pro':{ name:'Circuit', vol:0.58, root:146.8, bpm:112, beats:4, form:16,
    ch:[[0,7,14,19],[-2,5,12,17],[-5,2,9,14],[-3,4,11,16],[0,7,14,21],[3,10,17,22],[-2,5,12,19],[-7,0,7,14]], bass:[0,-2,-5,-3,0,3,-2,-7],
    voices:[ { v:'lead', w:'sine', o:-1, pat:'x...x...', seq:[19,14, 17,12, 14,21, 16,11, 21,19, 22,17, 19,17, 14,12, 21,19, 17,19, 21,14, 16,23, 19,21, 22,17, 19,12, 14,7], sus:5, hold:.4, at:.1, g:.016, lv:'xxxx9xxx' },
             { v:'lead', w:'triangle', o:-1, pat:'..x...x.', seq:[12,7, 10,5, 9,14, 11,4, 14,12, 15,10, 12,7, 7,2, 14,9, 12,10, 9,2, 11,16, 12,14, 10,15, 7,12, 2,7], sus:5, hold:.4, at:.1, g:.012, lp:1600, lv:'x9xxx9xx' },
             { v:'bass', w:'triangle', pat:'x.ox.ox.', sus:.9, at:.08, g:.04, lp:420 },
             { v:'arp', w:'triangle', o:-2, dir:'up', pat:'x.o.x.o.x.o.x.o.', sus:1.6, at:.1, g:.014, lp:900, lpv:'x9876789' },
             { v:'pad', w:'sine', o:-1, pat:'x', sus:1.02, hold:.75, at:.1, g:.009, lv:'9xx9xxx8x9' } ] },
  // Thorns: E, the Thorn chords, a chord a bar. Two detuned sawtooth pads with their filters moving, a sawtooth bass, an arp up and down,
  // the melody and the answering voice under it
  'theme:thorns':{ name:'Thorns', vol:0.76, root:82.4, bpm:76, beats:4, form:16,
    ch:[[0,7,12,15],[1,8,13,17],[0,7,12,15],[-2,5,10,13],[0,7,12,15],[1,8,13,17],[-4,3,8,12],[-6,1,6,10]], bass:[0,1,0,-2,0,1,-4,-6],
    voices:[ { v:'lead', w:'sine', o:1, pat:'x.x.', seq:[7,3, 8,13, 12,7, 5,1, 7,3, 8,1, 3,0, -2,1, 15,12, 13,8, 7,12, 10,5, 3,7, 8,13, 12,8, 6,1], sus:1.7, hold:.35, at:.1, g:.013, lv:'xxx9xxx9' },
             { v:'lead', w:'triangle', o:-1, pat:'.x.x', seq:[12,15, 13,17, 12,7, 10,13, 15,12, 17,13, 8,12, 6,10, 7,12, 8,13, 15,19, 13,17, 12,15, 13,8, 15,12, 10,6], sus:1.6, hold:.4, at:.1, g:.012, lp:900 },
             { v:'pad', w:'sawtooth', pat:'x', sus:1.02, hold:.75, at:.08, g:.008, lp:1000, q:1.5, lpv:'x98789x98' },
             { v:'pad', w:'sawtooth', pat:'x', sus:1.02, hold:.75, at:.08, g:.006, ct:11, lp:1000, q:1.5, lpv:'x9878989x9' },
             { v:'bass', w:'sawtooth', o:1, pat:'x..x..x.x..x..x.', sus:2, at:.05, g:.03, lp:240, q:1.2 },
             { v:'arp', w:'triangle', o:-1, dir:'updown', pat:'xoxoxoxoxoxoxoxo', sus:1.3, at:.1, g:.012, lp:700, lpv:'x9876789' },
             { v:'drone', w:'sine', o:1, pat:'x', sus:1.02, hold:.85, at:.06, g:.035 } ] },

  /* ---------- RETIRED AT BUILD 42 (v23 §L.7a): the build-30 themes, kept under their old ids for ONE build so the review board can play
     them beside the rewrites, then dropped. Nothing in the app plays them — config/keys.js and every sting point at the three above.
     The build-30 note, for the record: ONE THEME PER TIER, and the theme is a piece of music as much as a glyph.
     Roots → Frost → Thorn: one tree across three keys, which is what makes them read as a progression rather than
     three collections. Roots IS the build-27 Estimate loop 'Still' grown out — Aiden's board note was "Still is cool
     background music for the key", so it moved here rather than being replaced (superseded by v23 §L.7: "it takes far too long to get
     into the meat of things"). ---------- */
  'key:roots':{ name:'Still, grown', retired:42, vol:1.34, root:98, bpm:84, beats:8, form:16, ch:[[0,7,12,14],[-2,5,10,12],[-4,3,8,12],[-2,5,10,14]], bass:[0,-2,-4,-2],
    voices:[ { v:'drone', w:'sine', pat:'x', sus:1, g:.055, at:.3 },
             { v:'pad', w:'triangle', pat:'x', sus:.9, g:.012, at:.45 },
             { v:'lead', w:'sine', pat:'....x...', seq:[24,null,26,null,24,null,19,null,22,null,24,null,26,null,null,null], sus:1.8, g:.02, at:.15 },
             { v:'bass', w:'triangle', o:1, pat:'x.......', sus:7, hold:.5, at:.15, g:.028, lp:340, lv:'....5678xxxxxxxx' },
             { v:'pad', w:'sine', add:12, pat:'x', sus:1.04, hold:.7, at:.5, g:.004, lv:'........3456789x' } ] },
  'key:frost':{ name:'Frost', retired:42, vol:0.68, root:146.8, bpm:100, beats:4, per:2, form:32,
    ch:[[0,7,14,19],[-2,5,12,17],[-5,2,9,14],[-3,4,11,16],[0,7,14,21],[3,10,17,22],[-2,5,12,19],[-7,0,7,14]], bass:[0,-2,-5,-3,0,3,-2,-7],
    voices:[ { v:'pad', w:'sine', o:-1, pat:'x', sus:1.04, hold:.8, at:.35, g:.011 },
             { v:'pad', w:'triangle', o:-1, pat:'x', sus:1.04, hold:.75, at:.4, g:.007, ct:9, lp:2600, lpv:'3456789x' },
             { v:'arp', w:'triangle', o:-2, dir:'up', pat:'x.o.x.o.o.x.o.x.', sus:1.8, at:.1, g:.015, lp:900, lv:'....456789xxxxxxxxxxxxxxxxxx9876' },
             { v:'bass', w:'triangle', pat:'x', sus:1.02, hold:.6, at:.2, g:.03, lp:380 },
             { v:'lead', w:'sine', o:1, pat:'x...', seq:[7,null,null,null,5,null,null,null,2,null,4,null,null,null,null,null], sus:3.6, hold:.3, at:.55, g:.004, lv:'................xxxxxxxxxxxxxxxx' } ] },
  'key:thorn':{ name:'Thorn', retired:42, vol:1.14, root:82.4, bpm:60, beats:4, per:2, form:32,
    ch:[[0,7,12,15],[1,8,13,17],[0,7,12,15],[-2,5,10,13],[0,7,12,15],[1,8,13,17],[-4,3,8,12],[-6,1,6,10]], bass:[0,1,0,-2,0,1,-4,-6],
    voices:[ { v:'pad', w:'sawtooth', pat:'x', sus:1.04, hold:.8, at:.4, g:.008, lp:1100, q:1.5, lpv:'1234567899xxxxxxxxxx987654321111' },
             { v:'pad', w:'sawtooth', pat:'x', sus:1.04, hold:.8, at:.45, g:.006, ct:11, lp:1100, q:1.5, lpv:'1234567899xxxxxxxxxx987654321111' },
             { v:'bass', w:'triangle', o:1, pat:'x.o.....', sus:1.6, hold:.2, at:.12, g:.045, lp:220, lv:'....xxxxxxxxxxxxxxxxxxxxxxxx....' },
             { v:'drone', w:'sine', o:1, pat:'x', sus:1.02, hold:.85, at:.3, g:.04 },
             { v:'lead', w:'sine', o:1, pat:'x...', seq:[19,null,null,null,20,null,null,null], sus:3, hold:.1, at:.7, g:.005, lv:'........xxxxxxxxxxxxxxxxxxxxxxxx' } ] },
};

/* v23 (§L.7b / §L.7c, build 42): WHICH THEME A CHEST OPENS — the value prefs.everywhere takes, keyed by the chest's id, mapped to its track.
   'game' (every game its own track) is the one value that is not here. The key screen's SET THIS MUSIC and Customise's Everywhere row both
   write that one field; core/store.js everywhere() reads it back, and a theme whose chest is shut reads as 'game'. RETIRED is the build-30
   theme each one replaced, which only the review board plays (L.7e). */
/* v28 (item 3, build 53): the three key tracks are titled LANTERN / CIRCUIT / THORNS — the key's own `theme` in config/keys.js, never the
   key's NAME. Customise's Everywhere row printed the track name for the key and those names were Key / Pro / Thorns, which is exactly the
   Key / Pro / Thorns Aiden saw on that screen. The key is named Skill key / Pro / Author and only ever off config/keys.js `name`. */
export const KEY_THEMES = { key:'theme:key', pro:'theme:pro', thorns:'theme:thorns' };
export const KEY_THEMES_RETIRED = { key:'key:roots', pro:'key:frost', thorns:'key:thorn' };

/* the versus stems (v16 §1.4). ONE pair for every game, because a stem has to LINE UP with whatever the round's base
   loop is — it takes that track's root, bpm, bar length, chords and bass, and only the voicing is its own. Player 1
   gets a fifth above the chord, player 2 the bass line doubled an octave up; each rides its own gain node and the gain
   follows that player's proximity to the win condition. Presentation only — L10: nothing in a two-player run advances
   a key, a bar, an unlock or an achievement. */
export const STEMS = [
  { voices:[ { v:'arp', w:'triangle', dir:'up', o:1, pat:'..x...x.', sus:.5, g:.03, at:.02, add:7 } ] },
  { voices:[ { v:'bass', w:'square', o:1, pat:'x...x...', sus:.4, g:.022, at:.02 } ] },
];

/* B.27 — FLOW STATE. The same shape as a versus stem: it takes the running track's root, tempo, bar and chords, so it
   can only ever be in tune with whatever is playing, and it rides its own gain node whose level follows the player's
   taps per second. Solo Quick Tap and Dots only; the edge glow is light blue, which is P2 (L4), and that is why it can
   never appear in a two-player run. Presentation only (L10).

   `vol` IS MEASURED, not chosen, and the measurement did NOT say what B.27 expected it to. Rendered offline with a
   220 Hz high-pass over the loudest 4 s window (`_smoke/loudness.mjs`), the proposal's own 0.49 sits 6.2 dB under Held
   and 5.2 dB under Waltz — about half the track's level, which is audible, not inaudible. B.27's brief was 40 % of the
   track at full flow, which is −8 dB, so the number is 0.38 and the correction is a small one in the opposite
   direction to the one that was predicted. Re-run the script if any of the three tracks' gains change. */
export const FLOW_STEM = { vol:0.38, voices:[
  { v:'pad', w:'sine', o:1, pat:'x', sus:1.02, hold:.85, at:.35, g:.006, ct:-7 },
  { v:'pad', w:'sine', o:1, pat:'x', sus:1.02, hold:.85, at:.35, g:.006, ct:7 },
  { v:'pad', w:'triangle', add:12, pat:'x', sus:1.02, hold:.85, at:.4, g:.004, lp:1800 } ] };
/* v18 (B.9): the line is 2.7 taps a second, and THE HUM DOES NOT SWELL. It is one sound — on above the line, off below —
   and FLOW_RISE / FLOW_FALL are all that is left of the ramp: they smooth the SWITCH so it fades in and out instead of
   cutting, which is what they were always doing. FLOW_SPAN is retired with the swell it scaled. Aiden's answer to build
   30's open question, in his own words: "2.7 taps per second and one sound that doesn't change." */
export const FLOW_AT = 2.7, FLOW_RISE = .8, FLOW_FALL = 1.6;

/* v17 (§B.25, build 29): A SOUND PER VERDICT TIER. Data, not code, for the same reason the tracks are: the review
   catalogue plays these back with its own six-line player (§B.26), so a second copy in the page would drift the day one
   of them changed. One event is [at, f0, f1, ms, wave, gain, attackMs] — the plan shape `Music.plan` already hands the
   page — and `Snd.verdict(id)` in audio.js is the only thing in the app that reads them.

   Almost perfect is the "cool sound" B.25 asked for: a rising major triad with an octave shimmer over a swelling fifth.
   Good is a clean rising third; alright is a step that does not quite land (440 → 466, a semitone, deliberately
   unresolved); bad falls. None of them is the unlock sound and none is the achievement click — those two are asserted
   held apart by the gate and are not to be touched. */
/* ---------- v23 (§L.6 / §L.9c / §L.10d, build 41): THE CHESTS' SOUNDS ----------
   Three things per chest, all presentation (L10), and none of them is the unlock sound (Snd.unlockFx, v16 1.6) or the achievement click
   (Snd.click) — the gate holds all three apart, and the four chests apart from each other.
   CHEST_FX is the opening's EFFECTS, one event per sound in the VERDICT_FX shape plus an optional lowpass: [at s, f0, f1, ms, wave, gain,
   attackMs, lowpassHz]. They follow the ceremony's named steps in config/chests.js. Anything short is LOW — a click or a crack under
   300 Hz — because a short high note reads as a tap (batch 12). CHEST_NOISE is the one noise the app makes: the Author chest's single hard
   cut on the split, [at s, ms, gain, highpassHz]. It is an effect, not a music role — the tracks still have no noise (§1).
   CHEST_STING is the MUSIC: a resolution phrase from that key's own theme, 3–6 s, long gradual notes, ending on the reveal (L.6). A note is
   [at s, semitones over the theme's root × 2 (its pad octave), ms, wave, gain, attackMs, lowpassHz]. The Games chest borrows Roots, the
   theme of the key it reveals; the Skill chest is Roots, the key that opens it; Pro is Frost; Thorns is Thorn (guess). The gate holds every
   note to 700 ms or longer and every note above C5 to 1200 ms or longer.
   CHEST_READY_FX is L.9c's one quiet sound the first time the map paints a READY chest: a low two-note rise, the same for all four, under
   the unlock sound's level (guess). HUSH is the full duck under a ceremony, as two setTarget time constants (L.6: "ducks fully").
   NOBODY HAS HEARD ANY OF THIS — a Claude Code session has no audio device (UNVERIFIED.md). */
/* v27 (item 5, build 51): THE SEVEN SQUARES TICK, AND EACH ONE IS A STEP HIGHER. Aiden could not hear them and asked whether the sound had been
   removed or never wired: NEITHER — all seven have been here since build 41, on the same beat as the strikes wiping off (the `uncross` step in
   config/chests.js, 150ms apart), and all seven were the SAME 60ms note at the same pitch. Seven identical short knocks under a sting read as one
   texture rather than as seven boxes being ticked, which is why they went unheard. They climb the Roots scale the sting is cut from now — F G A B
   C D E, one square each — and the seventh is the FINISH: a longer note with a low body under it, so the last tick lands rather than simply
   stopping. The times are unchanged, so they still land with the strikes. THE WHOLE RISE STAYS UNDER 400 Hz, because L.6's own rule is that a
   chest effect shorter than 250ms is LOW — a short high note reads as a tap — and a tick is exactly the sound that rule was written about. */
export const CHEST_FX = {
  games: [[0, 206, 174.6, 70, 'triangle', .042, 2], [.15, 231.3, 196, 70, 'triangle', .042, 2], [.3, 259.6, 220, 70, 'triangle', .043, 2], [.45, 291.3, 246.9, 70, 'triangle', .044, 2],
    [.6, 308.7, 261.6, 70, 'triangle', .045, 2], [.75, 346.6, 293.7, 70, 'triangle', .046, 2], [.9, 388.9, 329.6, 150, 'triangle', .05, 2], [.9, 164.8, 164.8, 300, 'sine', .035, 3],
    [1.1, 196, 392, 700, 'sine', .03, 220],
    /* v29 Section A (57.2, build 57): the hit and the chord move with the steps they land on. The seven squares' ticks are UNTOUCHED — they are
       still 150ms apart on the `uncross` beat — and each one is now the sound of a crack as well as of a square, because 57.2 puts the cracking
       on that same beat. What moved is `burst` (2500 → 1900) and `chord` (2900 → 2300), so the 1.8s hit is 1.9 and the 2.1s triad is 2.3. */
    [1.9, 110, 82, 320, 'sine', .07, 10],
    [2.3, 392, 392, 1000, 'triangle', .045, 30], [2.3, 493.9, 493.9, 1000, 'triangle', .04, 30], [2.3, 587.3, 587.3, 1000, 'triangle', .035, 30]],
  /* v26 (§B1, build 49): KEY — "change it far more, much closer to the first key's theme". The scale that climbed G3 to G4 while the bars assembled was
     a generic figure beside the theme; it is now the theme's own first two chords, arpeggiated as the bars fly in (G · D · G · A, then F · C · F · G,
     the Roots progression theme:key opens on), the click and the turn as they were, the swell on the lid, and the theme's opening chord held as the
     light spills. The sting under it carries more of the theme (CHEST_STING.key). */
  key: [[0, 196, 196, 520, 'sine', .032, 40], [.22, 293.7, 293.7, 520, 'sine', .03, 40], [.44, 392, 392, 520, 'sine', .028, 40], [.66, 440, 440, 560, 'sine', .026, 40],
    [.9, 174.6, 174.6, 520, 'sine', .032, 40], [1.12, 261.6, 261.6, 520, 'sine', .03, 40], [1.34, 349.2, 349.2, 520, 'sine', .028, 40], [1.56, 392, 392, 640, 'sine', .026, 40],
    [1.8, 150, 110, 45, 'square', .05, 2, 900], [1.86, 140, 70, 300, 'triangle', .06, 20], [2.4, 98, 196, 800, 'sine', .07, 350],
    [2.7, 196, 196, 1400, 'sine', .022, 450], [2.7, 293.7, 293.7, 1400, 'sine', .018, 500], [2.7, 392, 392, 1400, 'sine', .016, 550], [2.75, 440, 440, 1350, 'sine', .012, 600]],
  /* v26 (§B1, build 49): PRO — "should be far more epic". The same steps, every one of them bigger: a doubled, detuned rumble over a sub that grows as
     the chest shakes; a low hit under each crack; a riser from the first crack to the burst; the burst a deeper boom under a full D major chord in
     sawtooth brass with the octave over it; and the cosmetics scattering on a five-note climb to D6 with a long shimmer. The sting under it runs
     further into the Pro theme and lands on a wider chord (CHEST_STING.pro). */
  pro: [[0, 55, 73.4, 1800, 'sawtooth', .045, 1400, 320], [0, 55.6, 74, 1800, 'sawtooth', .04, 1500, 320], [0, 36.7, 41.2, 1900, 'sine', .08, 1500],
    [1.2, 240, 90, 90, 'square', .055, 2, 900], [1.2, 110, 70, 260, 'sine', .07, 4], [1.6, 240, 90, 90, 'square', .055, 2, 900], [1.6, 110, 70, 260, 'sine', .07, 4],
    [2.0, 240, 90, 90, 'square', .055, 2, 900], [2.0, 110, 70, 260, 'sine', .075, 4], [2.4, 240, 90, 90, 'square', .06, 2, 900], [2.4, 110, 65, 300, 'sine', .08, 4],
    [1.6, 146.8, 587.3, 1200, 'sawtooth', .012, 900, 1400], [1.6, 293.7, 1174.7, 1200, 'triangle', .006, 900],
    [2.8, 90, 32, 1000, 'sine', .13, 6], [2.8, 146.8, 146.8, 1500, 'sawtooth', .016, 30, 1400], [2.8, 220, 220, 1500, 'sawtooth', .014, 30, 1400],
    [2.8, 293.7, 293.7, 1500, 'sawtooth', .014, 30, 1500], [2.8, 370, 370, 1500, 'sawtooth', .012, 30, 1600], [2.8, 440, 440, 1500, 'triangle', .03, 20], [2.8, 587.3, 587.3, 1600, 'sine', .02, 30],
    [3.2, 587.3, 587.3, 900, 'sine', .024, 30], [3.35, 659.3, 659.3, 900, 'sine', .024, 30], [3.5, 740, 740, 900, 'sine', .022, 30], [3.65, 880, 880, 1000, 'sine', .022, 40],
    [3.8, 1174.7, 1174.7, 1500, 'sine', .016, 60], [3.8, 1760, 1760, 1800, 'sine', .006, 120]],
  /* v29 Section A (57.8, build 57): THE AUTHOR CHEST'S TURN GETS A SOUND OF ITS OWN. Its only two events were the black wash and the widen —
     the COVER's, which is where they have gone (COVER_FX below) — so its key turn played under nothing at all. This is the Skill and Pro shape a
     tier bigger, on the Thorn theme's own root E: the bars assembling as a rising E-minor figure, the click and the turn, a swell on the lid, and
     the chord held as the light spills. Relative to `assemble`, like every other key chest's (COVER_AT offsets it). All (guess). */
  thorns: [[0, 82.4, 82.4, 900, 'sine', .05, 60], [.24, 123.5, 123.5, 900, 'sine', .045, 60], [.48, 164.8, 164.8, 900, 'sine', .04, 60], [.72, 246.9, 246.9, 950, 'sine', .036, 70],
    [.96, 329.6, 329.6, 1000, 'triangle', .03, 90], [1.2, 415.3, 415.3, 1000, 'triangle', .026, 110],
    [1.9, 150, 104, 50, 'square', .055, 2, 900], [1.96, 130, 62, 340, 'triangle', .07, 20], [2.6, 82.4, 164.8, 900, 'sine', .08, 380],
    [3.0, 164.8, 164.8, 1500, 'sine', .026, 480], [3.0, 246.9, 246.9, 1500, 'sine', .02, 520], [3.0, 329.6, 329.6, 1500, 'sine', .018, 560], [3.05, 493.9, 493.9, 1450, 'sine', .013, 620]],
};
/* ---------- v29 Section A (57.8, build 57): THE COVER'S OWN SOUNDS, AND WHERE THE TURN'S NOW START ----------
   A chest a key opens is two beats: a COVER that hides it and introduces it, then the key turn on the revealed chest. COVER_FX is the first beat,
   timed from the ceremony's own zero; CHEST_FX and the sting are the second, and audio.js shifts both by COVER_AT — which IS that ceremony's
   `assemble` step, so the arp still lands on the bars and the sting still resolves on the lid. The gate holds the two numbers together.
     key     the ground closing, warm lantern light blooming through it in thirds, then the iris opening — Lantern's own language
     pro     a low electrical hum, eight trace-ends ticking as they land, a filtered riser, then the grid powering down — Circuit's
     thorns  BUILD 52'S OWN TWO EVENTS, moved here verbatim: the sub under the black wash and the rise on the widen
   CHEST_NOISE is the Author cover's one hard cut on the split, so it is timed to the COVER and is not shifted. All (guess). */
export const COVER_AT = { games: 0, key: 2500, pro: 2800, thorns: 4400 };
export const COVER_FX = {
  key: [[0, 65.4, 49, 900, 'sine', .05, 300], [.45, 196, 196, 900, 'sine', .022, 260], [.62, 293.7, 293.7, 900, 'sine', .018, 280], [.8, 392, 392, 950, 'sine', .015, 300],
    [1.2, 130.8, 261.6, 900, 'sine', .04, 260], [1.35, 587.3, 587.3, 1250, 'sine', .012, 320]],
  pro: [[0, 55, 55, 1100, 'sine', .055, 400],
    [.35, 220, 130, 70, 'square', .03, 2, 900], [.55, 240, 142, 70, 'square', .03, 2, 900], [.75, 262, 155, 70, 'square', .032, 2, 900], [.95, 285, 168, 70, 'square', .032, 2, 900],
    [1.15, 311, 184, 70, 'square', .034, 2, 900], [1.3, 340, 200, 80, 'square', .036, 2, 900],
    [1.5, 146.8, 587.3, 900, 'sawtooth', .014, 300, 1800], [1.55, 73.4, 36.7, 800, 'sine', .06, 20]],
  thorns: [[.3, 41.2, 41.2, 2800, 'sine', .1, 2400], [3.1, 82.4, 164.8, 1600, 'sine', .06, 400]],
};
export const CHEST_NOISE = { thorns: [[2.7, 180, .14, 1200]] };
/* v24 (C.7, build 43): EVERY CHEST'S STING IS CUT FROM ITS OWN KEY'S THEME — not a phrase written beside it. Build 41's four were hand-written
   chords on each theme's root; Aiden liked the Pro chest's animation and wanted its music closer to the Pro key's own track, so the rule is
   now that the sting IS the theme: `track` played from its first bar through the same arrangement engine the key screen plays (audio.js
   bars()), up to `cut` seconds. `voices` picks which of the theme's voices come in — all of them when absent. A theme note still sounding at
   the cut rings on for STING_RING seconds and stops; one that would then break the theme rule (under 700 ms above 300 Hz, under 1200 ms above
   C5) is left out rather than clipped. Then `tail` — [at s, semitones over the theme's root × 2, ms, wave, gain, attackMs, lowpassHz] — lands
   the tonic on the reveal. ESCALATING Games → Key → Pro → Thorns in length, voices and notes a second (gated): the Games chest is key 1's
   theme with its melody and chord only; the Skill chest the whole of key 1's theme; Pro the whole of Pro's; Thorns the whole of Thorns'.
   Built after C.2 / C.3, so the theme each is cut from is the one its key screen actually plays. Not heard (UNVERIFIED.md). */
export const STING_RING = .45;
export const CHEST_STING = {
  games: { track: 'theme:key', voices: [0, 1], cut: 2.2, tail: [[2.2, 0, 1100, 'triangle', .012, 160], [2.2, 7, 1100, 'triangle', .012, 160], [2.2, 12, 1100, 'triangle', .012, 160], [2.25, 24, 1250, 'sine', .011, 260]] },
  // v26 (§B1, build 49): Key runs further into key 1's own theme before it lands (3.0s → 3.3s); Pro further into its own (3.6s → 3.9s), landing wider
  key: { track: 'theme:key', cut: 3.3, tail: [[3.3, -12, 1400, 'sine', .03, 300], [3.3, 0, 1300, 'triangle', .013, 200], [3.3, 7, 1300, 'triangle', .013, 200], [3.3, 12, 1300, 'triangle', .013, 200], [3.35, 26, 1400, 'sine', .011, 300]] },
  pro: { track: 'theme:pro', cut: 3.9, tail: [[3.9, -24, 1600, 'sine', .03, 250], [3.9, -12, 1500, 'triangle', .016, 200], [3.9, -5, 1500, 'triangle', .012, 200], [3.9, 2, 1500, 'triangle', .012, 200], [3.9, 9, 1500, 'triangle', .01, 200], [3.95, 14, 1450, 'sine', .014, 260], [4.0, 19, 1450, 'sine', .01, 300]] },
  thorns: { track: 'theme:thorns', cut: 4.2, tail: [[4.2, -12, 1800, 'sine', .04, 400], [4.2, 0, 1800, 'sawtooth', .009, 220, 1100], [4.2, 7, 1800, 'sawtooth', .009, 220, 1100], [4.2, 15, 1800, 'sawtooth', .007, 220, 1100], [4.25, 19, 1750, 'sine', .012, 500]] },
};
export const CHEST_READY_FX = [[0, 146.8, 146.8, 460, 'sine', .03, 50], [.24, 220, 220, 700, 'sine', .03, 80]];

/* ---------- v28 (item 13, build 53): THE GAMES CHEST CRACKING ON THE MAP — RETIRED AT BUILD 57 (v29 Section A, 57.2) ----------
   CRACK_FX was the crack that arrived on the map as each game was finished, and CRACK_BURST the seventh bursting it. 57.2 reverses the
   accumulating cracks they announced: the chest is CLEAN until it is opened and the cracking happens inside the opening, where the seven squares'
   own ticks (CHEST_FX.games) already land on exactly that beat. Both rows are gone rather than left unread, with Snd.crack() / Snd.crackBurst()
   and the map loop that was their only caller — a sound table nothing plays is the kind of thing that gets re-wired by accident. */

/* ---------- v28 (item 17, build 53): THE CELEBRATION ON THE CONGRATULATIONS SCREEN, ONE PER CHEST ----------
   Item 17: confetti and a celebratory sound on the screen the player taps through to after a chest opens, DIFFERENT FOR EACH CHEST and escalating
   Games → Skill → Pro → Author. Built from the palette that is already there, as the item asks: the Games chest's tick (CHEST_FX.games), the
   reward pop (POP_FX) and the gift landing (GIFT_FX), stacked thicker and lower each tier over that key's own root — G for Skill, D for Pro, E for
   Author, the roots their themes are written on. Nothing here is a new instrument; each is the same three voices arranged bigger.
   It fires ONCE, with the staged card's title (item 12), before the message row appears. An effect, so it follows the tap-sound switch. */
/* v29 Section A (57.3, build 57): AN ACHIEVEMENT, NOT A FLOURISH. Aiden on build 56's: "way too quick" — make it longer, with a bigger payoff.
   Each is the same three voices as build 53's, over the same root, extended rather than replaced: the rise now walks the letters of the word as
   they land instead of stopping in a fifth of a second, a LOW HIT lands underneath on the last letter, and a held chord and a long shimmer ring
   out over the confetti. Every tier stays a step bigger than the one below it in notes, length and depth, which the gate measures. */
export const CHEER_FX = {
  games: [[0, 392, 392, 110, 'triangle', .05, 2], [.09, 523.3, 523.3, 340, 'triangle', .044, 8], [.18, 659.3, 659.3, 420, 'triangle', .038, 10], [.27, 784, 784, 700, 'sine', .032, 12],
    [0, 130.8, 98, 300, 'sine', .05, 4], [.42, 98, 73.4, 560, 'sine', .07, 6],
    [.48, 392, 392, 1300, 'triangle', .022, 60], [.48, 587.3, 587.3, 1300, 'triangle', .018, 70], [.48, 784, 784, 1350, 'sine', .015, 90], [.6, 1174.7, 1174.7, 1400, 'sine', .01, 200]],
  key: [[0, 392, 392, 120, 'triangle', .055, 2], [.08, 587.3, 587.3, 420, 'triangle', .05, 8], [.16, 784, 784, 560, 'triangle', .042, 10], [.24, 987.8, 987.8, 700, 'sine', .034, 14],
    [.32, 1174.7, 1174.7, 760, 'sine', .026, 18],
    [0, 98, 73.4, 440, 'sine', .07, 6], [.5, 73.4, 49, 700, 'sine', .085, 6],
    [.56, 196, 196, 1500, 'sine', .026, 80], [.56, 392, 392, 1500, 'triangle', .02, 90], [.56, 587.3, 587.3, 1500, 'triangle', .017, 100], [.56, 784, 784, 1550, 'sine', .014, 120],
    [.7, 1567.9, 1567.9, 1600, 'sine', .009, 220], [.9, 196, 784, 1400, 'sine', .022, 320]],
  pro: [[0, 293.7, 293.7, 130, 'triangle', .058, 2], [.07, 440, 440, 460, 'triangle', .052, 8], [.14, 587.3, 587.3, 620, 'triangle', .046, 10], [.21, 880, 880, 760, 'sine', .038, 14],
    [.28, 1174.7, 1174.7, 860, 'sine', .028, 18], [.35, 1760, 1760, 900, 'sine', .02, 24],
    [0, 73.4, 55, 540, 'sine', .085, 6], [.54, 55, 36.7, 820, 'sine', .1, 6],
    [.6, 146.8, 146.8, 1700, 'sine', .03, 90], [.6, 293.7, 293.7, 1700, 'sawtooth', .014, 110, 1600], [.6, 440, 440, 1700, 'sawtooth', .012, 120, 1700],
    [.6, 587.3, 587.3, 1750, 'triangle', .016, 130], [.6, 880, 880, 1800, 'sine', .013, 160],
    [.78, 1174.7, 1174.7, 1800, 'sine', .01, 240], [.95, 146.8, 1174.7, 1600, 'sawtooth', .014, 340, 2400]],
  thorns: [[0, 164.8, 164.8, 140, 'triangle', .06, 2], [.07, 246.9, 246.9, 500, 'triangle', .056, 8], [.14, 329.6, 329.6, 680, 'triangle', .05, 10], [.21, 493.9, 493.9, 820, 'sine', .042, 14],
    [.28, 659.3, 659.3, 920, 'sine', .034, 18], [.35, 987.8, 987.8, 1000, 'sine', .026, 22], [.42, 1318.5, 1318.5, 1050, 'sine', .018, 28],
    [0, 41.2, 32.7, 660, 'sine', .095, 6], [.6, 32.7, 24.5, 900, 'sine', .11, 6],
    [.66, 82.4, 82.4, 1900, 'sine', .034, 100], [.66, 164.8, 164.8, 1900, 'sawtooth', .015, 120, 1300], [.66, 246.9, 246.9, 1900, 'sawtooth', .013, 130, 1400],
    [.66, 329.6, 329.6, 1950, 'triangle', .017, 140], [.66, 493.9, 493.9, 2000, 'sine', .014, 170], [.66, 659.3, 659.3, 2000, 'sine', .011, 200],
    [.86, 987.8, 987.8, 2000, 'sine', .01, 260], [1.05, 164.8, 1318.5, 1800, 'sawtooth', .016, 380, 2800], [1.3, 82.4, 82.4, 1600, 'sine', .05, 140]],
};
/* ---------- v29 Section A (57.6, build 57): THE KEY BEING CREATED — one sound per tier ----------
   config/keys.js KEY_INTRO is four named steps: `gather` the material arriving, `draw` the key's own paths drawing on, `forge` the strike that
   makes it a key, `settle` it taking its finished light. This is the BED under all four, cut from that key's own theme the way its earn sound is —
   the root and the fifth under a rising figure, the strike landing on `forge` and the chord opening on `settle`. Each step ALSO lands with its own
   hit: `gather` and `draw` take a quiet tick per piece and per path from ui/screens/key.js (MAP_FX / KEY_STEP_FX), and `forge` takes `snap`, which
   is a key turning in a lock and is exactly the right shape for one being struck. Escalating Skill → Pro → Author in notes, depth and length, and
   held to L.7a's theme rule — nothing under 700ms above 300 Hz, nothing above C5 under 1200ms. An EFFECT, so it follows the tap-sound switch, and
   it is none of the unlock sound, the achievement click, a chest's or a key's earn (gated). All (guess), heard by nobody (UNVERIFIED.md). */
export const KEY_INTRO_FX = {
  clear: { track: 'theme:key', notes: [[0, -24, 1600, 'sine', .05, 500], [0, -12, 1500, 'sine', .03, 520],
    [.7, 0, 1000, 'triangle', .018, 220], [1.0, 7, 1000, 'triangle', .018, 240], [1.3, 12, 1100, 'triangle', .016, 260],
    [1.8, -12, 800, 'sine', .07, 8], [2.1, 0, 1300, 'triangle', .02, 180], [2.1, 7, 1300, 'triangle', .017, 200], [2.15, 19, 1350, 'sine', .012, 300]] },
  pro: { track: 'theme:pro', notes: [[0, -24, 1900, 'sine', .055, 560], [0, -12, 1800, 'sine', .032, 580], [.4, -5, 1200, 'sawtooth', .01, 700, 1200],
    [.8, 0, 1100, 'triangle', .02, 240], [1.1, 7, 1100, 'triangle', .02, 260], [1.4, 12, 1150, 'triangle', .018, 280], [1.7, 19, 1250, 'sine', .014, 320],
    [2.1, -12, 900, 'sine', .08, 8], [2.44, -5, 1500, 'triangle', .02, 200], [2.44, 2, 1500, 'triangle', .017, 220], [2.44, 9, 1500, 'triangle', .015, 240], [2.5, 21, 1500, 'sine', .012, 340]] },
  author: { track: 'theme:thorns', notes: [[0, -24, 2200, 'sine', .06, 620], [0, -12, 2100, 'sine', .034, 640], [.3, 0, 1600, 'sawtooth', .009, 900, 1100],
    [.9, 0, 1200, 'triangle', .02, 260], [1.2, 3, 1200, 'triangle', .02, 280], [1.5, 7, 1250, 'triangle', .018, 300], [1.8, 10, 1300, 'sine', .015, 340], [2.1, 15, 1350, 'sine', .013, 360],
    [2.4, -12, 1000, 'sine', .09, 8], [2.78, -12, 1700, 'sine', .035, 300], [2.78, 3, 1700, 'sawtooth', .01, 240, 1100], [2.78, 10, 1700, 'sawtooth', .009, 260, 1100], [2.85, 22, 1700, 'sine', .012, 400]] },
};
export const HUSH = { down: .08, up: .4 };

/* ---------- v24 (C.5, build 43): EARNING A KEY — its own sound per tier, from that key's theme ----------
   The CHEST_STING note shape: [at s, semitones over the theme's root × 2, ms, wave, gain, attackMs, lowpassHz]. An EFFECT, so it follows the
   tap-sound switch the way the unlock sound does; it is none of the unlock sound, the achievement click or a chest's (gated). Escalating Key
   → Pro → Author in length and notes, each to the theme rule (nothing under 700 ms above 300 Hz, nothing above C5 under 1200 ms): key 1 a
   warm rising chord over its drone; Pro a driving bass pulse under a climbing arp, the melody and its answer, then the chord; Author the E
   drone, a sawtooth swell on the dark chord, a low figure circling under it, and the tonic landing with the melody over it. All (guess),
   and not heard (UNVERIFIED.md). */
/* ---------- v27 (item 14, build 51): THE KEY-EARNED ANIMATION'S OWN STEPS ----------
   KEY_EARN in config/keys.js is a list of named steps per tier, and each one lands with a sound of its own, in the same effect shape as every
   other family here — [at s, f0, f1, ms, wave, gain, attackMs, lowpassHz] — through the one tone(), so all of them follow the tap-sound switch
   and none of them is the unlock sound, the achievement click, a chest's or the key's own earn (gated).
   ONE ROW PER STEP NAME, not per tier, because a name means the same thing wherever it is used: `spin` the key turning and clicking upright;
   `snap` a key turning in a lock, a hard stop with a little overshoot behind it; `ring` the Pro ring flashing; `drop` the Author key falling in
   from above; `slam` the hit; `crack` the ring breaking outward; `thorns` the spikes flicking out round the rim. A SPOKE FIRING ALONE has no row:
   it lands with its OWN GAME'S sound, MAP_FX, the family the map's first open uses. Anything short is LOW, as everything short here is. The key's
   own earn sound (KEY_EARN_FX below) lands on the FLASH.
   v27 (Aiden's answer to build 51, build 52): `spokes` — the whole ring firing at once — IS GONE, because no key does that any more: the Pro key's
   seven now go round one at a time like the Skill key's, so both walk their games' own sounds and nothing was left playing the row. `trace` is new
   with them: the current running the ring from one spoke to the next, six times, quiet and short so it sits between the seven game sounds rather
   than over them — a filtered blip rising as it travels, with a thin high edge on it, which is the Circuit key's own language.
   All (guess), and heard by nobody (UNVERIFIED.md). */
export const KEY_STEP_FX = {
  trace: [[0, 620, 1180, 60, 'triangle', .012, 1, 3400], [.01, 210, 330, 70, 'sine', .018, 2, 1800]],
  spin: [[0, 240, 360, 260, 'triangle', .028, 30, 1800], [.2, 400, 200, 80, 'square', .022, 2, 1400], [.24, 150, 95, 240, 'sine', .04, 3]],
  snap: [[0, 300, 120, 70, 'square', .05, 1, 1100], [.05, 120, 70, 260, 'sine', .06, 3], [.05, 190, 150, 180, 'triangle', .02, 4, 900]],
  ring: [[0, 880, 880, 1300, 'sine', .014, 8], [0, 1318.5, 1318.5, 1250, 'sine', .01, 10], [0, 110, 66, 300, 'sine', .035, 3]],
  drop: [[0, 90, 420, 380, 'sine', .022, 120, 1400], [0, 45, 210, 400, 'triangle', .02, 140, 700]],
  slam: [[0, 200, 34, 420, 'sine', .1, 1], [0, 120, 28, 640, 'triangle', .07, 2, 420], [0, 700, 160, 90, 'sine', .018, 1, 2400]],
  crack: [[0, 260, 70, 200, 'sawtooth', .035, 2, 1200], [.06, 140, 50, 340, 'sine', .045, 3], [.12, 190, 60, 260, 'sawtooth', .022, 2, 900]],
  thorns: [[0, 620, 300, 120, 'triangle', .018, 2, 2200], [.07, 700, 330, 120, 'triangle', .016, 2, 2200], [.15, 560, 260, 140, 'triangle', .014, 2, 2000], [0, 100, 58, 300, 'sine', .03, 4]],
  /* v28 (item 15, build 53): `land` is the last hit of the finale, on the earn music's final note — one low thud with a bright edge on it, quiet,
     because the music is already landing its own last chord underneath. `rise` has no row on purpose: it is three to four seconds of continuous
     settling and a sound held under it would only fight the track. */
  land: [[0, 150, 62, 340, 'sine', .045, 2], [0, 520, 240, 130, 'triangle', .014, 1, 2600]],
};

export const KEY_EARN_FX = {
  clear: { track: 'theme:key', notes: [[0, -12, 2380, 'sine', .045, 300], [0, 0, 1500, 'triangle', .022, 60], [.22, 7, 1400, 'triangle', .022, 60], [.44, 12, 1500, 'triangle', .022, 80], [.66, 14, 1700, 'sine', .022, 120], [1.1, 19, 1290, 'sine', .018, 300]] },
  /* v27 (Aiden's answer to build 51, build 52): "let's make the music even more epic for the pro". Build 51's is all still here — the driving
     bass pulse, the climbing arp, the melody and its answer, the chord. Around it now: a sub an octave under the pulse from the first beat, two
     more pulses so the drive runs the whole length instead of stopping at 0.8s, a filtered sawtooth swell rising into the landing, a counter-line
     answering the melody, three more notes in the final chord with a high bell over it, and a low resolution to close on. It also has to stay
     UNDER the Author key, which item 14's escalation and the gate both ask, so every one of these lands again bigger in Thorn below.
     v29 (item 3, build 54): SHORTER, AT THE TAIL. Aiden played build 53's 4.10s and asked for 3.00s. Every note, every wave and every gain is
     build 52's — what moved is WHEN the closing gestures land and how long they ring: the final chord from 2.20/2.45 to 1.80 and the low
     resolution from 2.90 to 2.30, both now finishing ON 3.000s together instead of ringing a second past it. Nothing was deleted, so the
     escalation the gate measures (notes, layers, length: Skill < Pro < Author) is untouched. THE FLOOR THAT SHAPES THIS IS L.7a's KEY-THEME
     RULE — nothing under 700ms above 300 Hz, nothing above C5 under 1200ms — so a high voice CANNOT be trimmed to fit, it has to start
     earlier: that is why the chord moved rather than being cut short, and why the bells sit at 1.80 and ring across the landing. */
  pro: { track: 'theme:pro', notes: [[0, -12, 700, 'triangle', .05, 20, 420], [.27, -12, 700, 'triangle', .045, 20, 420], [.54, -12, 700, 'triangle', .05, 20, 420], [.8, -12, 700, 'triangle', .045, 20, 420],
    [1.06, -12, 700, 'triangle', .045, 20, 420], [1.32, -12, 700, 'triangle', .04, 20, 420],
    [0, -24, 1400, 'sine', .055, 20], [1.6, -24, 900, 'sine', .045, 20],
    [0, -5, 800, 'triangle', .02, 60], [.27, 2, 900, 'triangle', .02, 70], [.54, 7, 1000, 'triangle', .02, 80], [.8, 14, 1300, 'sine', .018, 110],
    [1.35, 19, 1500, 'sine', .018, 160], [1.62, 12, 1380, 'triangle', .016, 150, 1600],
    [1.5, 0, 1100, 'sawtooth', .012, 700, 900], [1.5, 7, 1100, 'sawtooth', .01, 700, 900],
    [1.7, 17, 1300, 'triangle', .014, 140, 1600],
    [1.85, -7, 1150, 'triangle', .016, 120], [1.85, 0, 1150, 'triangle', .016, 120], [1.85, 7, 1150, 'triangle', .016, 120], [1.8, 14, 1200, 'sine', .014, 200],
    [1.8, 12, 1200, 'triangle', .015, 130], [1.8, 19, 1200, 'sine', .013, 180], [1.8, 24, 1200, 'sine', .011, 240],
    [1.8, 26, 1200, 'sine', .008, 60],
    [2.3, -24, 700, 'sine', .05, 25], [2.3, -12, 700, 'triangle', .03, 30, 500], [2.3, 7, 700, 'triangle', .012, 220]] },
  /* v26 (§B1, build 49): THORN — "make it better, with more sounds". Build 43's five layers are all still there; around them now: a sub pulse on every
     second, like a slow heartbeat under the drone; a filtered sawtooth rising out of the dark chord; the low figure answered once more after the
     tonic; three high bells over the landing (each held long, to the theme rule); and the dark chord's answer, low, to close it.
     v27 (Aiden's answer to build 51, build 52): "the author should be epic super duper music" — the biggest of the three, by a clear margin, and
     everything build 52 gave the Pro key has to be beaten here or the escalation the whole set is built on stops meaning anything. Added: a deeper
     opening hit under the drone; a slow sawtooth CHOIR holding three notes of the dark chord from 0.9s; two more bells; the low figure walked a
     third time; and a final tonic held with its octave and fifth over a closing sub, so it ENDS rather than fades.
     v29 (item 3, build 54): SHORTER, AT THE TAIL — 6.70s to 4.00s, the biggest cut of the three and still the longest of the three. All 47
     notes are here and no wave or gain moved; the drone, the dark chord, the choir, the heartbeat subs and the first two walks of the low
     figure are untouched. What moved is the CLOSE: the final tonic with its octave and fifth comes in at 2.80 instead of 4.60, the dark
     chord's answer and the closing sub at 3.30 instead of 3.60/5.20, and the third walk of the low figure steps 3.25 · 3.50 · 3.75 into it
     rather than trailing off after the ending. Everything lands ON 4.000s. Same floor as Pro above: a high voice needs 1200ms of ring
     (L.7a), so the bells and the top of the chord had to move EARLIER — they could not be shortened. */
  author: { track: 'theme:thorns', notes: [[0, -12, 4000, 'sine', .07, 1500], [.6, -6, 2000, 'sawtooth', .012, 700, 800], [.6, 1, 2000, 'sawtooth', .012, 700, 800], [.6, 6, 2000, 'sawtooth', .01, 700, 800],
    [0, -24, 900, 'sine', .05, 20], [1.0, -24, 900, 'sine', .045, 20], [2.0, -24, 900, 'sine', .05, 20], [3.0, -24, 1000, 'sine', .055, 30],
    [1.2, 12, 1100, 'sawtooth', .006, 900, 900],
    [1.0, -5, 320, 'triangle', .022, 20, 700], [1.25, 0, 320, 'triangle', .022, 20, 700], [1.5, 3, 320, 'triangle', .022, 20, 700], [1.75, 0, 320, 'triangle', .022, 20, 700], [2.0, -5, 320, 'triangle', .022, 20, 700], [2.25, -1, 320, 'triangle', .022, 20, 700],
    [2.3, 0, 1700, 'sawtooth', .013, 200, 1100], [2.3, 7, 1700, 'sawtooth', .013, 200, 1100], [2.3, 15, 1700, 'sawtooth', .011, 200, 1100], [2.5, 19, 1500, 'sine', .016, 500], [2.8, 24, 1200, 'sine', .012, 400],
    [2.7, 3, 320, 'triangle', .018, 20, 700], [2.95, 0, 320, 'triangle', .018, 20, 700], [3.2, -5, 360, 'triangle', .018, 20, 700],
    [2.4, 31, 1600, 'sine', .006, 30], [2.75, 27, 1250, 'sine', .006, 40], [2.8, 36, 1200, 'sine', .005, 60],
    [3.3, -5, 700, 'triangle', .014, 200], [3.3, 3, 700, 'triangle', .012, 200], [3.3, 7, 700, 'triangle', .012, 200],
    [0, -24, 1800, 'sine', .075, 10],
    [.9, -12, 2600, 'sawtooth', .014, 900, 700], [.9, -5, 2600, 'sawtooth', .012, 900, 700], [.9, 3, 2600, 'sawtooth', .011, 900, 700],
    [1.9, 31, 1900, 'sine', .006, 50], [2.8, 36, 1200, 'sine', .005, 70],
    [3.25, 3, 360, 'triangle', .017, 20, 700], [3.5, 0, 360, 'triangle', .017, 20, 700], [3.75, -5, 250, 'triangle', .017, 20, 700],
    [3.3, -24, 700, 'sine', .05, 20], [3.55, -24, 450, 'sine', .05, 20],
    [2.8, 0, 1200, 'sawtooth', .014, 300, 1100], [2.8, 12, 1200, 'sawtooth', .012, 300, 1100], [2.8, 19, 1200, 'sine', .014, 400], [2.8, 24, 1200, 'sine', .01, 500],
    [2.8, -24, 1200, 'sine', .06, 30], [3.3, -24, 700, 'sine', .05, 30], [3.3, -12, 700, 'triangle', .026, 200, 500]] },
};

/* v25 (item 17, build 45): A ROUND'S TIER SOUND is VERDICT_FX played shorter and quieter — every start, length and attack × `time`, every gain ×
   `gain` — so five of them in a Set do not wear, and the result's own full sound is still the big moment (both guesses). Snd.roundVerdict(id) plays
   it and Snd.roundVerdictPlan(id) hands it to the review catalogue; nothing else reads it. */
export const ROUND_VERDICT = { time: 0.6, gain: 0.5 };
/* v26 (§B1, build 49): A ROUND'S TIER SOUND IS ITS OWN LIST NOW, ONE NOTE SHORTER THAN THE RESULT'S, WITH BASS UNDER IT. Aiden: "all end-of-run sounds should
   be one note more than their end-of-round sound, but still similar", and the bass under End of run is liked, so every round sound carries one.
   A note is a triangle event; the bass is the sine under it. ROUND_VERDICT still plays these shorter and quieter than a result. */
export const ROUND_FX = {
  ace: [[0, 659.3, 659.3, 300, 'triangle', .07, 18], [.1, 784, 784, 300, 'triangle', .072, 18], [.2, 1046.5, 1046.5, 460, 'triangle', .075, 18], [0, 130.8, 196, 760, 'sine', .05, 80]],
  good: [[0, 523.3, 523.3, 300, 'triangle', .075, 18], [.1, 784, 784, 460, 'triangle', .075, 18], [0, 130.8, 130.8, 640, 'sine', .045, 70]],
  ok: [[0, 493.9, 493.9, 380, 'triangle', .058, 16], [0, 196, 196, 560, 'sine', .036, 60]],
  bad: [[0, 392, 330, 300, 'triangle', .07, 14], [0, 98, 98, 520, 'sine', .04, 70]],
};

/* v26 (§B1, build 49): THE FOUR RESULT SOUNDS CLIMB. Meh. is unchanged (Aiden: good). Good. was a semitone step that never landed ("too sad") — it is now
   a rising major third, still positive, just less so. Great! is build 45's Amazing! note for note (Aiden: "this should become the sound for Great!").
   Amazing! is four notes, ending higher than Great! — E5 G5 C6 E6 with an E7 shimmer — so it is the brightest. Every one has a bass note under it. */
export const VERDICT_FX = {
  ace:  [[0, 659.3, 659.3, 300, 'triangle', .07, 18], [.1, 784, 784, 300, 'triangle', .072, 18], [.2, 1046.5, 1046.5, 320, 'triangle', .075, 18], [.32, 1318.5, 1318.5, 560, 'triangle', .08, 18],
         [.32, 2637, 2637, 340, 'sine', .018, 26], [0, 130.8, 261.6, 900, 'sine', .055, 90], [.2, 196, 196, 760, 'sine', .03, 80]],
  good: [[0, 523.3, 523.3, 300, 'triangle', .075, 18], [.10, 784, 784, 300, 'triangle', .075, 18], [.20, 1046.5, 1046.5, 460, 'triangle', .08, 18],
         [.20, 2093, 2093, 320, 'sine', .022, 26], [0, 261.6, 392, 760, 'sine', .05, 90]],
  ok:   [[0, 392, 392, 220, 'triangle', .06, 16], [.12, 493.9, 493.9, 400, 'triangle', .058, 16], [0, 196, 196, 560, 'sine', .036, 60]],
  bad:  [[0, 392, 330, 260, 'triangle', .07, 14], [.14, 294.7, 196, 440, 'triangle', .06, 14], [0, 98, 98, 560, 'sine', .04, 70]],
};

/* ---------- v25 (items 1 / 2 / 6 / 11, build 46): THE FOUR NEW SOUND FAMILIES ----------
   All four are EFFECTS in the VERDICT_FX / CHEST_FX shape — [at s, f0, f1, ms, wave, gain, attackMs, lowpassHz] — so audio.js plays them
   through the one tone() every other effect goes through and they follow the sound-pack switch (off means off). None of them is the unlock
   sound, the achievement click, a chest's or a key's earn (gated). Nobody has heard any of it: a Claude Code session has no audio device
   (UNVERIFIED.md), so every level here is judged against the ones already written and not by ear.

   TITLE_FX (item 1) — ONE IMPACT per line of the title, on the frame the line starts (v27 item 1, build 51; it was a low swelling whoosh from
   build 46 to build 50), the title line itself a little heavier. Tied to the line's OWN animation (ui/screens/menu.js reads the CSS animation's
   start and delay rather than keeping a second set of numbers), so a timing edit in the stylesheet cannot drift from the sound. A phone browser
   blocks audio until the player has tapped once, so on the web the very FIRST title of a session is silent — accepted, as item 1 says, and never
   faked with a hidden tap. */
/* v26 (§B1, build 49): "more spacey and wooshy and slightly longer", both. Each was about 40% longer with a slower swell, and over the low sweep a pair
   of quiet high sines a few hertz apart glided up together — the slow beating between them was the space.
   v27 (item 1, build 51): THE SWELL IS GONE AND EACH LINE GETS A SINGLE IMPACT — "fast attack, short tail, a boosh". Aiden heard the sound landing
   AFTER its line, and the two faults were one: a 400–600ms attack means the loudest part of the sound arrives half a second after the trigger, so a
   sound fired ON the frame the line starts still reads late. An impact has no attack to be late with — every layer opens in 1–3ms and falls away,
   so the moment it is fired IS the moment it is heard. ui/screens/menu.js now schedules it off the animation's own start time on the document
   timeline rather than off a setTimeout taken after the fact, which takes the last few milliseconds of drift out with it.
   The shape, both beats: a low sine dropping fast (the body), a triangle an octave under it (the weight) and one very quiet high tick (the "b" of
   the boosh, 90–110ms, well under the level that would read as a tap). The title line keeps a sub under it and a longer fall, so it is still the
   heavier of the two. Nothing under 300 Hz is short enough to read as a tap; nothing above it lasts long enough to read as a note. */
/* v29 Section A (57.1, build 57 — quotes L1; Aiden authorises the change): MORE REVERB ON EACH LINE, AND TAP TO BEGIN GETS ITS OWN SOUND.
   THE REVERB. There is no convolver in this app and there is not going to be one — every sound is tone() and nothing else — so a reverb here is
   what a reverb IS: the same impact again, later, quieter and darker. Each beat now carries three TAIL events after its impact, at +90 / +220 /
   +360ms, each about half the level of the one before and each lowpassed further down, which is a room rather than an effect. The IMPACT itself is
   untouched, so item 1's "the moment it is fired IS the moment it is heard" still holds: every event at 0s still opens inside 5ms.
   TAP TO BEGIN is `begin`, and it is HIGHER THAN THE TITLE HITS by design — Aiden's own instruction. The other three fall from 210–260 Hz into the
   floor; this one is a bell at G5 with the octave over it and a mid body under it, long enough not to read as a tap, with the same three-tail room
   on it. It is the fourth beat and the one instruction on the screen, so it is the one that rings rather than thuds. All (guess). */
export const TITLE_FX = {
  line: [[0, 210, 58, 250, 'sine', .055, 2, 900], [0, 120, 42, 380, 'triangle', .04, 3, 480], [0, 640, 210, 90, 'sine', .012, 1, 2200],
    [.09, 210, 58, 300, 'sine', .019, 6, 620], [.22, 210, 58, 380, 'sine', .0095, 9, 420], [.36, 210, 58, 460, 'sine', .005, 13, 300]],
  title: [[0, 260, 46, 420, 'sine', .075, 2, 1000], [0, 150, 34, 620, 'triangle', .055, 3, 460], [0, 74, 30, 900, 'sine', .045, 4],
    [0, 880, 250, 110, 'sine', .016, 1, 2600],
    [.09, 260, 46, 480, 'sine', .026, 6, 700], [.22, 260, 46, 560, 'sine', .013, 9, 480], [.36, 150, 34, 680, 'triangle', .007, 13, 340]],
  begin: [[0, 784, 784, 520, 'triangle', .03, 3, 3200], [0, 1174.7, 1174.7, 700, 'sine', .015, 4], [0, 392, 392, 380, 'sine', .022, 2, 2400],
    [.1, 784, 784, 620, 'triangle', .013, 8, 2400], [.24, 784, 784, 700, 'sine', .0065, 11, 1600], [.38, 1174.7, 1174.7, 800, 'sine', .0032, 15, 1200]],
};

/* MAP_FX (item 2, and item 11's nodes) — ONE SOFT SOUND PER GAME, so the map's first open previews what each game sounds like as its tile
   animates in, and so a game's node landing on a key reveal sounds like that game. It is the same family in both places on purpose (item 11:
   "the same family as item 2, so the sounds stay consistent across the app"). Each is that game's own character at a lower level than the game
   plays it: Quick Tap its tap, Dots a pop, Estimate a swell that stops, Sequence two notes, Timing a tick and its bell, Reaction a flash blip,
   Spot a sonar ping. `chest` is the chests' own arrival at the end of the map's sequence. LOCKED tiles play the same sound through `MAP_LOCKED`
   — every note down `semi` semitones and every gain × `gain` — so a locked game is recognisably the same thing, lower and muted (item 2). */
export const MAP_FX = {
  'quick-tap': [[0, 700, 1500, 70, 'sine', .045, 4]],
  dots: [[0, 320, 900, 90, 'triangle', .045, 6], [.05, 900, 620, 70, 'sine', .018, 4]],
  hold: [[0, 196, 392, 420, 'sine', .04, 180, 1400], [.4, 392, 330, 110, 'triangle', .022, 8]],
  sequence: [[0, 392, 392, 200, 'triangle', .04, 10], [.14, 523.3, 523.3, 260, 'triangle', .038, 10]],
  timing: [[0, 880, 880, 60, 'sine', .028, 4], [.22, 659.3, 659.3, 420, 'triangle', .04, 14]],
  reaction: [[0, 1320, 990, 55, 'square', .03, 2, 2200], [.09, 990, 1480, 130, 'sine', .04, 6]],
  spot: [[0, 1046.5, 1046.5, 140, 'sine', .04, 8], [.16, 1046.5, 784, 340, 'sine', .022, 12, 2600]],
  chest: [[0, 146.8, 146.8, 300, 'sine', .04, 40], [.16, 220, 293.7, 520, 'triangle', .03, 60]],
  // v26 (item 13, build 49): a Gauntlet tile — an armoured glove set down: a low thud and two inharmonic rings, like plate on plate (guess)
  gauntlet: [[0, 160, 90, 110, 'triangle', .05, 3, 900], [.02, 740, 730, 700, 'sine', .014, 6, 3000], [.02, 1043, 1030, 520, 'sine', .009, 6, 3200]],
};
export const MAP_LOCKED = { semi: -7, gain: .45 };
// v26 (§B1, build 49): "also play on unlock" — how long after a game's unlock toast (and its own unlock sound) that game's map sound follows (guess)
export const MAP_ON_UNLOCK_MS = 480;

/* GIFT_FX (item 6) — the small sound each unlock makes as its symbol rises out of an opened chest. One list, played a step higher for each
   symbol after the first (`step` semitones), so two or three arriving in turn read as a rising figure rather than the same noise repeated.
   The reward moment is not silent (item 6) and it is not the unlock toast's sound either — this is its own (gated). */
export const GIFT_FX = { step: 4, notes: [[0, 523.3, 523.3, 260, 'triangle', .05, 10], [.06, 1046.5, 1046.5, 420, 'sine', .022, 14], [0, 174.6, 261.6, 520, 'sine', .03, 90]] };
/* POP_FX (v26 item 6, build 49) — the small pop as each reward LEAVES the chest, before GIFT_FX lands it: a short low bubble with a quiet click on top,
   a step higher for each one after the first, so the rewards read as coming out one after another. Its own sound, not the landing (gated).
   v27 (item 6, build 51): THE GAMES CHEST'S POPS ARE LIFTED, AND A KEY POPS BRIGHTER. Item 6 says Customise and the Skill Key need a pop-out sound
   on the Games chest. They have fired since build 49 — the gate asserts one pop per reward on all four chests — but they are 170 Hz at .055 for
   80ms and they land at 3.26s and 3.66s, straight under the Games chest's own closing chord (392 / 493.9 / 587.3 Hz, still ringing until 3.1s) and
   its sting's tail (to 3.3s). Masked, not missing. `by` lifts one chest's pops clear of its own ceremony without touching any other chest's:
   ONLY `games` has a row, because item 12 approved the Pro chest's sounds exactly as they are and the other two were not complained about.
   `bright` is item 6's last line — "the key's slightly brighter" — applied to a reward whose symbol is a key, and only where `by` applies, for the
   same reason. Both are multipliers on POP_FX itself, so re-tuning the pop re-tunes them with it. */
export const POP_FX = { step: 2, notes: [[0, 170, 430, 80, 'sine', .055, 3], [.01, 860, 1300, 40, 'triangle', .01, 2, 3000]],
  by: { games: { gain: 2.1, semi: 9 } }, bright: { gain: 1.25, semi: 5 } };

/* WHOOSH_VARIANTS (v26 §B1, build 49) — "great, but add slight pitch and length variations, about 7 very similar versions played at random". The count-up
   whoosh keeps its shape; each time it plays it takes one of these at random, [pitch ×, length ×], none more than 6% from the original. The count it
   sits under is not touched — only the sound's own sweep. */
export const WHOOSH_VARIANTS = [[1, 1], [.97, 1.05], [1.03, .96], [.95, 1.08], [1.05, .93], [.985, 1.03], [1.02, 1.06]];

/* ---------- v27 (item 10, build 52): THE VIDEO PLAYER'S POWER ON AND POWER OFF ----------
   One pair for all eight clips, because item 10 puts them in the PLAYER and not in the files. A television switching on: a soft thunk with a
   short rise over it, landing on the frame `open`ing to the picture; and its reverse on the way out, landing on the line going to a dot.
   Same effect shape as every other family here — [at s, f0, f1, ms, wave, gain, attackMs, lowpassHz] — through the one tone(), so both follow
   the tap-sound switch and neither is the unlock sound, the achievement click, a chest's or a key's earn (gated).
   SOFT is the word in the item, so both sit well under a chest's pop: the thunk is a low body with a short filtered click on top, and the
   power-off is the same body falling instead of rising, a little quieter. All (guess), and heard by nobody (UNVERIFIED.md). */
export const VIDEO_FX = {
  on: [[0, 150, 62, 190, 'sine', .05, 2], [0, 70, 44, 300, 'triangle', .035, 3, 420], [.02, 900, 1600, 60, 'triangle', .012, 1, 3200], [.06, 320, 520, 110, 'sine', .014, 6, 2200]],
  off: [[0, 520, 300, 80, 'triangle', .012, 1, 2400], [.03, 120, 48, 260, 'sine', .04, 2], [.03, 62, 36, 330, 'triangle', .026, 4, 380]],
};
