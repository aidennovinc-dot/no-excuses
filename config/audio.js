/* No Excuses — sound data (build 16, refactor stage 2). DATA ONLY (A2). The code that plays it is audio.js. */
// the scales Sequence plays in
export const SCALES = { penta:{name:'Pentatonic',n:[0,2,4,7,9,12,14]}, chinese:{name:'Chinese',n:[0,2,5,7,9,12,14]}, hijaz:{name:'Hijaz',n:[0,1,4,5,7,8,10]}, blues:{name:'Blues',n:[0,3,5,6,7,10,12]} };
// music (v13, 12.1): one pad-and-bass module per game — root Hz, tempo, four chords as semitone stacks, four bass notes. Nothing borrows
export const TRACKS = {
  'quick-tap':{root:110,  bpm:126, ch:[[0,7,12,16],[5,12,17,21],[3,10,15,19],[7,14,19,22]], bass:[0,5,3,7]},
  'dots':     {root:130.8,bpm:112, ch:[[0,4,7,11],[5,9,12,16],[3,7,10,14],[7,11,14,17]], bass:[0,5,3,7]},
  'hold':     {root:98,   bpm:84,  ch:[[0,7,12,14],[-4,3,8,12],[-2,5,10,12],[0,7,12,16]], bass:[0,-4,-2,0]},
  'sequence': {root:146.8,bpm:104, ch:[[0,3,7,10],[3,7,10,14],[5,8,12,15],[7,10,14,17]], bass:[0,3,5,7]},
  'timing':   {root:87.3, bpm:72,  ch:[[0,7,14,19],[-5,2,9,14],[0,5,12,17],[-3,4,11,16]], bass:[0,-5,0,-3]},
  'reaction': {root:123.5,bpm:138, ch:[[0,5,12,19],[2,7,14,21],[0,5,12,17],[-2,5,10,17]], bass:[0,2,0,-2]},
  'spot':     {root:116.5,bpm:96,  ch:[[0,4,9,14],[2,6,11,16],[-3,4,7,12],[0,4,9,16]], bass:[0,2,-3,0]},
};
