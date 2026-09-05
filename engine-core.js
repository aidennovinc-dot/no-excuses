/* No Excuses — the shared run state for the timed engines
   Split out of index.html at build 12. Behaviour is identical to build 11. */

import { $ } from "./core.js";
/* ---------- shared timed engine: timer, hits, misses, lockout. Quick Tap and Dots supply begin/advance/render/ring ---------- */
const G={ on:false, t0:0, end:0, hits:0, misses:0, armed:false, lockUntil:0, raf:0, target:-1, next:-1, pos:null, nextPos:null, prevPos:null, timers:[] };
const flip=()=>Math.random()<0.5?0:1;
let cur=null;
const sq=[$('#sq0'),$('#sq1'),$('#sq2'),$('#sq3')], ring=[$('#ring0'),$('#ring1'),$('#ring2'),$('#ring3')];
// pity (v9): random, but a streak of the same pad is cut at three — long runs of "again?" annoy without testing anything
function setCur(v){ cur=v; }


export { G, cur, flip, ring, setCur, sq };
