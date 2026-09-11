/* No Excuses — Progress: the unlock chain and the achievements, two tabs on one screen (build 29, v17 §B.21).

   Build 23 (v15 §2.4) split them onto two screens, and the reason was right: an UNLOCK opens something you could not
   play before, an achievement is a mark on a thing you already have, and the menu had been calling both "Achievements".
   What was not right was two menu rows for it. The split survives as the two tabs, in the same order and for the same
   reason — unlocks outrank achievements everywhere the next thing is surfaced (2.2), so Unlocks is the left tab and the
   default. The screen remembers which tab was last open in `prefs.progTab`.

   L6 is quoted by B.21, because "the Unlocks screen" in that rule is a tab now. Nothing else about it moved: every line
   on the Unlocks tab still comes out of UNLOCKS and lenLock() / lenNeed() in progress.js, exactly as the lock box, the
   goal line and the Next card do, and nothing here is a second copy of a requirement. A tap on a locked row opens the
   same lock box the pick sheet opens, so §2.1's discovery route works from here too.

   This is ONE screen file, not two files and a host: A4 forbids a screen importing a screen, and a tab host that called
   into `unlocks.js` and `achievements.js` would be exactly that. It is the merge of those two files; both are deleted.

   SHELL, still, on the key section: what sits behind keys 2 and 3 is register #372 and is not decided (v15 §5.3). The
   key row says what is true today and links to the keys screen for the rest. */
import { ACH_SCREEN, PROGRESS_SCREEN, TIERS, UNLOCKS_SCREEN } from "../../config/copy.js";
import { MODE_NAME } from "../../config/games.js";
import { $, $$, T } from "../../core.js";
import { emit } from "../../core/events.js";
import { sel } from "../../core/state.js";
import { prefs, save } from "../../core/store.js";
import { GAMES, GC, lenName } from "../../games/registry.js";
import { Scores, UNLOCKS, achAll, achById, gameOpen, got, isOpen, lenLock, lenOpen, markSeen, newMark, setPendingAim, unlockHtml, unlockName, unlocked } from "../../progress.js";
import { keyState } from "../../progress/key.js";
import { define } from "../actions.js";
import { chips } from "../chips.js";
import { register, show } from "../router.js";

const TABS = ['unl', 'ach'];
const tabOf = t => TABS.includes(t) ? t : (TABS.includes(prefs.progTab) ? prefs.progTab : 'unl');

/* ---------- the Unlocks tab (build 23, v15 §2.4 — unchanged but for where it lives) ---------- */
const row=(cls,name,need,state,data)=>`<button data-act="unl" class="urow ${cls}"${data}><span>${name}</span><em>${state}</em><small>${need}</small></button>`;
function renderUnlocks(){
  const u=unlocked(); const fresh=[];
  // the chain, in the order it is earned. A row is open when its key is in the store or its game is open from the start
  const chain=UNLOCKS.map(x=>{ const [g,d]=x.key.split(':'); const open=x.key==='sequence:practice'?!!u[x.key]:isOpen(g,d);
    const nw=open?newMark('mode:'+g+':'+d,fresh):'';
    return row('u'+(open?' done':' lock')+nw,unlockName(x.key),open?'':x.need,open?UNLOCKS_SCREEN.done:UNLOCKS_SCREEN.locked,` data-g="${g}" data-d="${d}"`); }).join('');
  // every length of every mode, from lenLock — the same call the pick sheet's crossed-out rows make
  const lens=[];
  for(const g in GAMES){ if(!gameOpen(g)) continue; for(const d of GAMES[g].modes) for(const s of GC(g,d).lens){ const L=lenLock(g,d,s); if(!L&&GC(g,d).lens.indexOf(s)===0) continue;
    const name=`${GAMES[g].name}${MODE_NAME[d]?' · '+MODE_NAME[d]:''} · ${lenName(g,s,d)}`;
    lens.push(row('u'+(L?' lock':' done'),name,L?L.need:'',L?UNLOCKS_SCREEN.locked:UNLOCKS_SCREEN.done,` data-g="${g}" data-d="${d}" data-s="${s}"`)); } }
  const k=keyState();
  $('#unl-list').innerHTML=
    `<h4>${UNLOCKS_SCREEN.games}</h4>${chain}`+
    `<h4>${UNLOCKS_SCREEN.lens}</h4>${lens.join('')||''}`+
    `<h4>${UNLOCKS_SCREEN.keys}</h4>`+
    // v17 (B.9): the count in the key line is read from the same keyState() the row's own figure comes from — a literal
    // would have gone stale the day Sequence lost 5 keys, which is the day it did
    row('u key'+(k.done>=k.total?' done':' lock'),UNLOCKS_SCREEN.keys,T(UNLOCKS_SCREEN.keyLine,{n:k.total}),`${k.done}/${k.total}`,' data-key="1"');
  markSeen(fresh);
}

/* ---------- the Achievements tab (build 18; the filter row, three tiers plus the author rows) ---------- */
const F={ g:'all' };
function renderAch(){
  const g=got(), all=Scores.runs(), gsel=F.g; const fresh=[]; let k=0;
  $('#ach-g').innerHTML=`<button class="chip" data-act="chip-ach" data-chip="ach-g" data-v="all">${ACH_SCREEN.all}</button>`+Object.entries(GAMES).map(([id,x])=>`<button class="chip" data-act="chip-ach" data-chip="ach-g" data-v="${id}">${x.name}</button>`).join(''); chips('ach','g',gsel);
  const list=achAll().filter(a=>gsel==='all'||a.g===gsel||a.g==='all');
  const fsGame=gsel==='all'?sel.game:gsel;
  $('#achlist').innerHTML = Object.keys(TIERS).map(t=>{
    const items=list.filter(a=>a.tier===t), done=items.filter(a=>g[a.id]).length;
    if(!items.length) return '';
    return `<h4 class="${t}">${TIERS[t][0]} · ${done}/${items.length}<span>${TIERS[t][1]}</span></h4>`+items.map(a=>{
      const isDone=!!g[a.id], secret=a.tier==='secret'&&!isDone;
      const p=a.progress&&!isDone?Math.min(1,a.progress(all,fsGame)):null;
      // v14 (8.3): the game name leads the title. v14 (8.4): so it is written once — the jump line below repeats it only for
      // the rows that have no game of their own ("Every game", "Full set") or that name no mode and no length to point at
      const wg=a.g==='all'?fsGame:a.g;
      const gname=a.g==='all'?'':`<i>${GAMES[a.g].name}</i>`;
      const bar=p!==null?`<div class="pbar ${secret?'s':''}"><i style="width:${Math.round(p*100)}%"></i></div>`:'';
      const jump=a.g!=='all'||a.id==='fullset';
      const wbits=[]; if(a.at?.d) wbits.push(MODE_NAME[a.at.d]); if(a.at?.s!==undefined) wbits.push(lenName(a.g,a.at.s,a.at?.d||GAMES[wg].modes[0]));
      if(a.g==='all'||!wbits.length) wbits.unshift(GAMES[wg].name);
      const where=jump&&!secret?`<small class="go">→ ${wbits.join(' · ')}</small>`:'';
      // v14 (8.1): a requirement that is a set of things names the ones still outstanding
      const left=!isDone&&a.left?a.left(all):null;
      const leftTxt=left&&left.length?T(ACH_SCREEN.left,{names:left.join(', ')}):'';
      // v14 (8.5): a secret row is described. The name stays ???; the hint says what kind of thing earns it, never the number
      const line=secret?(a.hint||ACH_SCREEN.stretch)+(p!==null?T(ACH_SCREEN.progress,{p:Math.round(p*100)}):'')
                       :a.how+(a.id==='fullset'?T(ACH_SCREEN.inGame,{game:GAMES[fsGame].name}):'')+leftTxt;
      const nw=isDone?newMark('ach:'+a.id,fresh):''; const dl=isDone?` style="animation-delay:${Math.min(k++,14)*70}ms"`:'';
      return `<button data-act="ach" class="a ${isDone?'done':'lock'}${nw} ${jump?'jump':''}" data-ach="${a.id}" id="ach-${a.id}"${dl}><span>${gname}${isDone?'✓ ':''}${secret?ACH_SCREEN.hidden:a.name}</span><em class="${a.unlocks&&!isDone?'u':''}">${isDone?ACH_SCREEN.done+(a.unlocks?' · '+unlockHtml(a):''):a.unlocks?unlockHtml(a):secret?ACH_SCREEN.secret:''}</em><small>${line}</small>${where}${bar}</button>`; }).join(''); }).join('');
  markSeen(fresh);
}
// a locked row: straight to the sheet it is earned on, at the mode and length it names; a locked mode or length asks the box first
function jumpTo(a){ const g=a.g==='all'?(F.g==='all'?sel.game:F.g):a.g; const d=a.at?.d||GAMES[g].modes[0]; if(!isOpen(g,d)) return emit('lock:ask',{g,d}); if(a.at?.s!==undefined&&!lenOpen(g,d,a.at.s)) return emit('lock:ask',{g,d,s:a.at.s}); setPendingAim(a.how); show('s-pick',{g,d:a.at?.d,s:a.at?.s}); }

/* ---------- the two tabs ---------- */
// only the tab that is up is rendered: the achievements list is the longest markup in the app and the unlocks list walks
// every mode of every game, so building the hidden one on every open would be two full renders for one screen
function setTab(t,opts){ const tab=tabOf(t); prefs.progTab=tab; save();
  $$('#prog-tabs .chip').forEach(c=>c.classList.toggle('sel',c.dataset.tab===tab));
  $('#p-unl').hidden=tab!=='unl'; $('#p-ach').hidden=tab!=='ach';
  if(tab==='unl') renderUnlocks(); else renderAch();
  if(tab==='ach'&&opts&&opts.ach){ const r=$('#ach-'+opts.ach); if(r){ r.scrollIntoView({block:'center'}); r.classList.add('flash'); } } }

register('s-prog',{ onShow(o){ const a=o.ach?achById(o.ach):null; if(a) F.g=a.g==='all'?'all':a.g;
  $('#unl-hint').textContent=PROGRESS_SCREEN.unlHint; $('#ach-hint').textContent=PROGRESS_SCREEN.achHint;
  $('#unl-lede').textContent=UNLOCKS_SCREEN.lede;
  setTab(o.ach?'ach':o.tab,o); } });
define({
  ptab(b){ setTab(b.dataset.tab); return 'pick'; },
  // a locked row asks the lock box, exactly as the pick sheet does (v15 2.1); an open one goes where it is played
  unl(b){ if(b.dataset.key) { show('s-key'); return 'click'; }
    const {g,d,s}=b.dataset; const len=s===undefined?undefined:+s;
    if(b.classList.contains('lock')){ emit('lock:ask',{g,d,s:len}); return 'pick'; }
    show('s-pick',{g,d,s:len}); return 'click'; },
  'chip-ach'(b){ F.g=b.dataset.v; renderAch(); return 'pick'; },
  // an earned achievement (v11) opens Customise at what it unlocked; a locked one still offers the run
  ach(b){ const a=achById(b.dataset.ach); if(!a) return 'click'; if(got()[a.id]){ if(a.g!=='all') sel.game=a.g; show('s-custom',{unlocks:a.unlocks}); return 'click'; }
    if((a.g!=='all'||a.id==='fullset')&&a.tier!=='secret') jumpTo(a); return 'click'; },
});
