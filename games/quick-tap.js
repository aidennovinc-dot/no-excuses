/* No Excuses — Quick Tap — Two and Four
   Split out of index.html at build 12. Behaviour is identical to build 11. */

import { G, ring, sq } from "../engine-core.js";
import { sel } from "../menu.js";
const QT={ n(){ return sel.diff==='four'?4:2; }, streak:0,
  pickPad(prev){ const n=this.n(); let p=Math.random()*n|0; if(p===prev){ this.streak++; if(this.streak>=3){ p=(p+1+(Math.random()*(n-1)|0))%n; this.streak=0; } } else this.streak=0; return p; },
  begin(){ this.streak=0; G.target=Math.random()*this.n()|0; },
  advance(){ const p=G.target; G.target=this.pickPad(p); if(G.target===p){ const s=sq[G.target]; s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); } },
  render(live){ for(let i=0;i<4;i++) sq[i].style.setProperty('--v',(live&&G.target===i)?1:0); },
  ring(){ const r=ring[G.target]; r.classList.remove('go'); void r.offsetWidth; r.classList.add('go'); } };

export { QT };
