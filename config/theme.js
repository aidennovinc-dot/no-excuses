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
// the four backgrounds and the ground tint each one sits on
export const DESIGNS = { stars:{tint:'#050506'}, grid:{tint:'#070A14'}, rain:{tint:'#0B1008'}, orbs:{tint:'#0E0608'} };
// Customise: every item, and the achievement id that earns it (`by`). No `by` = open from the start
export const ITEMS = {
  sq:  [{v:'#FFFFFF'},{v:'#FFE9C4',by:'first'},{v:'#9BE8FF',by:'qt_clean5'},{v:'#FFD1DC',by:'dt_pin'},{v:'#F3D9FF',by:'hd_steady'},{v:'#C6FF7A',by:'qt_clean30'},{v:'#FFF3A0',by:'sq_12'},{v:'wheel',by:'fullset'}],
  lead:[{v:'#C8322A'},{v:'#FFB020',by:'every'},{v:'#7CFFB2',by:'dt_sweep'},{v:'#4FD9FF',by:'qt_r5'},{v:'#FF4FD8',by:'qt_eyes'},{v:'#FFFFFF',by:'hd_est'},{v:'wheel',by:'fullset'}],
  bg:  [{v:'stars'},{v:'grid',by:'named'},{v:'rain',by:'qt_clean15'},{v:'orbs',by:'dt_land'},{v:'wheel',by:'fullset'}],
  snd: [{v:'space',label:'Space'},{v:'click',label:'Click',by:'qt_r4'},{v:'wood',label:'Wood',by:'hd_money'},{v:'sigh',label:'Sigh',by:'tour'},{v:'off',label:'Off'}],
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
