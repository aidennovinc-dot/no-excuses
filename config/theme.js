/* No Excuses — colours, backgrounds, cosmetic items, the two-player pictures (build 16, refactor stage 2). DATA ONLY (A2). */
// player colours (v11 / L4): Player 1 is red, Player 2 is light blue, everywhere two people share the phone
export const P1C = '#E0453B', P2C = '#6EC6FF';
/* v17 (B.22, build 29): the PRESSED game on the grid wears an outline, and its colour is named here rather than picked
   in the stylesheet. Green is L8's first-seen mark and white is L7's unplayed tile, so neither could be borrowed — this
   is AMBER, the same #FFB020 already in the lead palette above, so the grid gains no new colour. ui/theme.js publishes
   it as --press; nothing else in the app uses it. */
export const PRESS = { name:'amber', v:'#FFB020' };
/* v18 (B.18, build 32): a tile's outline fills with its key-1 progress. Not green (L8's first-seen mark), not white (L7's
   unplayed tile), and not the pressed amber above — LILAC, the #F3D9FF already in the target palette, so the grid gains no
   new colour. ui/theme.js publishes it as --keyfill; the filled outline and the complete tile's wash both spend it. */
export const KEYFILL = { name:'lilac', v:'#F3D9FF' };
// the seven backgrounds and the ground each one sits on
/* v24 (C.6, build 43): three more, one per key — Lantern, Circuit, Thorn. Each WAS the stock stars with that key's own layer drawn over them.
   v29 SECTION A (57.11a, build 57): STARS BELONG TO THE DEFAULT BACKGROUND ONLY. Aiden: every other background is a whole scene, not a layer over
   the starfield. Audited, all seven: `grid`, `rain` and `orbs` already drew no stars and are untouched (the three he did not mention); `lantern`,
   `circuit` and `thorn` drew the starfield underneath and no longer do (ui/atmosphere.js). Their grounds change with them — Lantern Sky is a dusk
   GRADIENT now rather than a near-black, and its ground is the bottom of that gradient (57.11d), and Circuit's is a shade lighter than black so the
   traces have something to sit on (57.11e).
   57.11c: GRID IS BLUE. Aiden asked for "more blue": the ground is a real navy rather than a blue-black, and the lines are a blue you can see. */
export const DESIGNS = { stars:{tint:'#050506'}, grid:{tint:'#0A1430'}, rain:{tint:'#0B1008'}, orbs:{tint:'#0E0608'}, lantern:{tint:'#1A1024'}, circuit:{tint:'#05080E'}, thorn:{tint:'#020202'} };
// Customise: every item, and the achievement id that earns it (`by`). No `by` = open from the start
// v24 (C.6, build 43): `key` is the other kind of lock — the key tier that has to be FINISHED (every bar on it cleared) before the item opens
export const ITEMS = {
  sq:  [{v:'#FFFFFF'},{v:'#FFE9C4',by:'first'},{v:'#9BE8FF',by:'qt_clean5'},{v:'#FFD1DC',by:'dt_pin'},{v:'#F3D9FF',by:'hd_steady'},{v:'#C6FF7A',by:'qt_clean30'},{v:'#FFF3A0',by:'sq_12'},{v:'wheel',by:'fullset'}],
  lead:[{v:'#C8322A'},{v:'#FFB020',by:'every'},{v:'#7CFFB2',by:'dt_sweep'},{v:'#4FD9FF',by:'qt_r5'},{v:'#FF4FD8',by:'qt_eyes'},{v:'#FFFFFF',by:'hd_est'},{v:'wheel',by:'fullset'}],
  /* v29 Section A (57.11b, build 57): THE BACKGROUND IS TWO SETTINGS NOW — a PATTERN and a COLOUR. Aiden: the colour wheel "stops applying once
     another background is chosen, and it colours everything on screen — text, borders, buttons — not just the background". Both faults came from one
     line: the picked colour WAS `--ground`, which every panel, border and target colour is mixed from, and choosing a pattern cleared it. So the
     wheel comes off this row and gets one of its own: `bg` is the pattern, `bgcol` is the colour, the colour is painted on the BACKGROUND LAYER
     beneath the UI (ui/atmosphere.js), it survives a change of pattern, and `none` is the way back to the design's own ground. */
  bg:  [{v:'stars'},{v:'grid',by:'named'},{v:'rain',by:'qt_clean15'},{v:'orbs',by:'dt_land'},{v:'lantern',key:'clear'},{v:'circuit',key:'pro'},{v:'thorn',key:'author'}],
  bgcol: [{v:'none'},{v:'wheel',by:'fullset'}],
  /* v26 (§B1, build 49): SIGH IS HELD. It was made to sound like a person sighing, and Aiden wants it as a fun unlockable for one particular achievement,
     which is still to be decided — so it is off the sound pack row (`held`: Customise does not show it, the store will not keep it chosen) and no longer
     earned by Grand tour. Its sounds stay in audio.js. When the achievement is chosen, it takes `unlocks:['snd','sigh']` and this row takes its `by` */
  snd: [{v:'space',label:'Space'},{v:'click',label:'Click',by:'qt_r4'},{v:'wood',label:'Wood',by:'hd_money'},{v:'sigh',label:'Sigh',held:1},{v:'off',label:'Off'}],
  // v13 (12.1): music is per game — one track each, switched off or previewed on its own row
  music:[{v:true,label:'On'},{v:false,label:'Off'}],
  // v14 (6.7): the rate bar's two readings. Live is the rolling average over the last few taps; Whole run averages every tap
  // over the time played so far — at 15s it averages 15s, at 17s it averages 17s. Shown only on the timed games
  rate:[{v:'live',label:'Live'},{v:'run',label:'Whole run'}],
  // v13 (6.5): the Cut pieces are a pair. This picks the cut-off piece; the rest is the same colour at 40%
  cut: [{v:'#FFFFFF'},{v:'#FFE9C4',by:'first'},{v:'#9BE8FF',by:'qt_clean5'},{v:'#FFD1DC',by:'dt_pin'},{v:'#F3D9FF',by:'hd_steady'},{v:'#C6FF7A',by:'qt_clean30'},{v:'#FFF3A0',by:'sq_12'},{v:'wheel',by:'fullset'}],
};
// the two-player pictures (v10). v14: the caption is gone (4.2), the phones are phone-shaped (4.4) and versus draws a player at
// each end of the one phone (4.5). The labels are drawn beside them by ui/screens/pick.js, so they carry the player colours
export const VS_ART = {
  1:'<svg viewBox="0 0 120 74"><rect x="20" y="4" width="26" height="66" rx="4"/><rect x="74" y="4" width="26" height="66" rx="4"/><path d="M52 37h16M62 31l6 6-6 6"/><path d="M27 62h12M81 62h12"/></svg>',
  2:'<svg viewBox="0 0 120 74"><rect x="44" y="2" width="32" height="70" rx="5"/><path d="M44 37h32" stroke-dasharray="3 3"/><circle cx="60" cy="15" r="5"/><path d="M52 26a8 8 0 0 1 16 0"/><circle cx="60" cy="59" r="5"/><path d="M68 48a8 8 0 0 0-16 0"/></svg>',
};
