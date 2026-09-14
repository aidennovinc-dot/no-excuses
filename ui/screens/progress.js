/* No Excuses — Progress: Game unlocks · Customise unlocks · Achievements, three tabs on one screen (build 33, v18 §B.31;
   the middle tab is a LIST since build 39, v23 §L.4, amending B.31 as v21 G.6 asked).

   Build 23 (v15 §2.4) split unlocks from achievements onto two screens, and the reason was right: an UNLOCK opens
   something you could not play before, an achievement is a mark on a thing you already have. Build 29 (v17 §B.21) made
   that split two tabs instead of two menu rows. Build 33 brought the Customise screen in as the middle tab; build 39
   takes it back out (`ui/screens/customise.js`, its own menu row again) and the middle tab becomes what Aiden meant in
   the first place — "achievements that provided a customisation unlock would have its own subsection just like
   achievements and just like unlocks" (v23 L.4).

   THE THREE TABS ARE A PARTITION (v23 L.4c). `achTab()` in progress.js is the one test: an ACH row with `unlocks` is on
   Customise unlocks and nowhere else; every other row and every keyAch() row is on Achievements; Game unlocks is the
   chain (L6) and holds no achievement at all. The gate asserts the three are disjoint and their union is ACH + keyAch().
   A row that moved tabs says exactly what it said before — L.1, Aiden's own rewrite of names and lines, is deferred.

   A LABEL IS WHITE UNTIL IT IS EARNED AND GREEN ONCE IT IS, ON EVERY TAB — NEVER RED (v23 L.2). The red Aiden saw was
   `.ach .lock em.u`, a build-8 rule that put an unearned "unlocks …" label in the cue red; v21 G.6 asked for white and
   green and was never built.

   L6 is quoted by B.31, because "the Unlocks screen" in that rule is the Game unlocks tab now. Nothing else about it
   moved: every line on it still comes out of UNLOCKS and lenLock() / lenNeed() in progress.js, exactly as the lock box,
   the goal line and the Next card do. A tap on a locked row opens the same lock box the pick sheet opens.

   The screen remembers which tab was last open in `prefs.progTab`; only the tab that is up renders. */
import { ACH_SCREEN, ITEM_WORD, PROGRESS_SCREEN, TIERS, UNLOCKS_SCREEN } from "../../config/copy.js";
import { MODE_NAME } from "../../config/games.js";
import { $, $$, T } from "../../core.js";
import { emit } from "../../core/events.js";
import { sel } from "../../core/state.js";
import { prefs, save } from "../../core/store.js";
import { GAMES, GC, lenName } from "../../games/registry.js";
import { Scores, UNLOCKS, achAll, achById, achTab, gameOpen, got, isOpen, lenLock, lenOpen, markSeen, newMark, setPendingAim, unlockHtml, unlockName, unlocked } from "../../progress.js";
import { chestOpen, keyAch, keyState, tierOpen } from "../../progress/key.js";
import { toast } from "../toast.js";
import { TOAST } from "../../config/copy.js";

// v18 (B.25): the key achievement sets live in progress/key.js (progress.js cannot import it); this screen reads both lists
const allAch=()=>achAll().concat(keyAch());
const findAch=id=>achById(id)||keyAch().find(a=>a.id===id);
// the second and third key sets are not shown before chest 1 (A.1)
// build 38: each key's achievement set waits for that key's own chest — the Pro set for chest 1, the Author set for the Pro chest
// build 40 (L.10a): and key 1's set waits for the Games chest, which is what reveals key 1
const groupShown=t=>t==='key1'?tierOpen('clear'):t==='key2'?tierOpen('pro'):t==='key3'?tierOpen('author'):true;
import { define } from "../actions.js";
import { chips } from "../chips.js";
import { register, show } from "../router.js";

// build 39 (v23 L.4b): the middle tab is `cul`, Customise unlocks. A stored 'cus' from builds 33–38 lands on it (core/store.js)
const TABS = ['unl', 'cul', 'ach'];
const tabOf = t => TABS.includes(t) ? t : (TABS.includes(prefs.progTab) ? prefs.progTab : 'unl');

/* ---------- the Game unlocks tab (build 23, v15 §2.4 — unchanged but for where it lives and what it is called) ---------- */
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
  // v23 (L.10a, build 40): key 1 is quiet until the Games chest — the key row says what opens it, with no count
  const k=keyState(), kq=!tierOpen('clear');
  $('#unl-list').innerHTML=
    `<h4>${UNLOCKS_SCREEN.games}</h4>${chain}`+
    `<h4>${UNLOCKS_SCREEN.lens}</h4>${lens.join('')||''}`+
    `<h4>${UNLOCKS_SCREEN.keys}</h4>`+
    // v17 (B.9): the count in the key line is read from the same keyState() the row's own figure comes from — a literal
    // would have gone stale the day Sequence lost 5 keys, which is the day it did
    row('u key'+(!kq&&k.done>=k.total?' done':' lock'),UNLOCKS_SCREEN.keys,kq?PROGRESS_SCREEN.keyLocked:T(UNLOCKS_SCREEN.keyLine,{n:k.total}),kq?UNLOCKS_SCREEN.locked:`${k.done}/${k.total}`,' data-key="1"');
  markSeen(fresh);
}

/* ---------- one achievement row, for either tab that lists achievements ----------
   Build 39 lifts this out of renderAch so both tabs build a row's WORDS the same way: L.1 is deferred, so a row that
   moved tabs must say exactly what it said on build 38. What differs is the headline. On Achievements a row leads with
   its name, as it always has. On Customise unlocks it leads with what it pays out (v23 L.4d), and the achievement's
   name and criterion sit under it. `c` carries the earned-row stagger across a whole list. */
function achRow(a,tab,{g,all,fsGame,fresh,c}){
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
  const nw=isDone?newMark('ach:'+a.id,fresh):''; const dl=isDone?` style="animation-delay:${Math.min(c.k++,14)*70}ms"`:'';
  const cls=`${isDone?'done':'lock'}${nw} ${jump?'jump':''}`, name=secret?ACH_SCREEN.hidden:a.name;
  // v23 (L.4d): what it unlocks first, white until earned and green once (L.2); the achievement and its criterion under it
  if(tab==='cul') return `<button data-act="ach" class="a cu ${cls}" data-ach="${a.id}" id="cul-${a.id}"${dl}><span class="rw">${isDone?'✓ ':''}${unlockHtml(a)}</span><em>${isDone?ACH_SCREEN.done:''}</em><small>${gname}${name} · ${line}</small>${where}${bar}</button>`;
  return `<button data-act="ach" class="a ${cls}" data-ach="${a.id}" id="ach-${a.id}"${dl}><span>${gname}${isDone?'✓ ':''}${name}</span><em>${isDone?ACH_SCREEN.done:secret?ACH_SCREEN.secret:''}</em><small>${line}</small>${where}${bar}</button>`;
}

/* ---------- the Customise unlocks tab (build 39, v23 L.4b–d) ----------
   Every achievement that pays out a cosmetic, and nothing else — grouped by the Customise row it pays into, in that
   screen's own order, so the list reads like the screen it leads to. An earned row goes to Customise with that item
   picked out; an unearned one still goes to play it. No game filter: it is twenty rows, and a filter would hide the
   Every-game rows behind a chip (guess). */
const CUL_ORDER=['sq','lead','cut','bg','snd','scale','rate','wheel'];
function renderCul(){
  const g=got(), all=Scores.runs(); const fresh=[]; const ctx={g,all,fsGame:sel.game,fresh,c:{k:0}};
  const list=achAll().filter(a=>achTab(a)==='cul');
  const at=s=>{ const i=CUL_ORDER.indexOf(s); return i<0?99:i; };
  const sets=[...new Set(list.map(a=>a.unlocks[0]))].sort((x,y)=>at(x)-at(y));
  $('#cul-list').innerHTML=sets.map(set=>{ const items=list.filter(a=>a.unlocks[0]===set), done=items.filter(a=>g[a.id]).length;
    return `<h4>${PROGRESS_SCREEN.culGroup[set]||ITEM_WORD[set]||set} · ${done}/${items.length}</h4>`+items.map(a=>achRow(a,'cul',ctx)).join(''); }).join('');
  markSeen(fresh);
}

/* ---------- the Achievements tab (build 18; the filter row, three tiers plus the key sets) ---------- */
const A={ g:'all' };
function renderAch(){
  const g=got(), all=Scores.runs(), gsel=A.g; const fresh=[];
  $('#ach-g').innerHTML=`<button class="chip" data-act="chip-ach" data-chip="ach-g" data-v="all">${ACH_SCREEN.all}</button>`+Object.entries(GAMES).map(([id,x])=>`<button class="chip" data-act="chip-ach" data-chip="ach-g" data-v="${id}">${x.name}</button>`).join(''); chips('ach','g',gsel);
  // v23 (L.4c): only the rows achTab puts here — nothing that pays out a cosmetic
  const list=allAch().filter(a=>achTab(a)==='ach'&&(gsel==='all'||a.g===gsel||a.g==='all'));
  const ctx={g,all,fsGame:gsel==='all'?sel.game:gsel,fresh,c:{k:0}};
  $('#achlist').innerHTML = Object.keys(TIERS).filter(groupShown).map(t=>{
    const items=list.filter(a=>a.tier===t), done=items.filter(a=>g[a.id]).length;
    if(!items.length) return '';
    return `<h4 class="${t}">${TIERS[t][0]} · ${done}/${items.length}<span>${TIERS[t][1]}</span></h4>`+items.map(a=>achRow(a,'ach',ctx)).join(''); }).join('');
  markSeen(fresh);
}
// a locked row: straight to the sheet it is earned on, at the mode and length it names; a locked mode or length asks the box first
function jumpTo(a){ const g=a.g==='all'?(A.g==='all'?sel.game:A.g):a.g; const d=a.at?.d||GAMES[g].modes[0]; if(!isOpen(g,d)) return emit('lock:ask',{g,d}); if(a.at?.s!==undefined&&!lenOpen(g,d,a.at.s)) return emit('lock:ask',{g,d,s:a.at.s}); setPendingAim(a.how); show('s-pick',{g,d:a.at?.d,s:a.at?.s}); }

/* ---------- the three tabs ---------- */
// only the tab that is up is rendered: the achievements list is the longest markup in the app and the unlocks list walks
// every mode of every game, so building the hidden ones would be three renders for one screen. `opts.ach` is a row to
// scroll to and flash — on whichever tab achTab says it lives
function setTab(t,opts){ const tab=tabOf(t); prefs.progTab=tab; save(); opts=opts||{};
  $$('#prog-tabs .chip').forEach(c=>c.classList.toggle('sel',c.dataset.tab===tab));
  for(const x of TABS) $('#p-'+x).hidden=tab!==x;
  if(tab==='unl') renderUnlocks(); else if(tab==='cul') renderCul(); else renderAch();
  if(opts.ach&&tab!=='unl'){ const r=$(`#${tab}-${opts.ach}`); if(r){ r.scrollIntoView({block:'center'}); r.classList.add('flash'); } } }

register('s-prog',{ onShow(o){ const a=o.ach?findAch(o.ach):null; if(a&&achTab(a)==='ach') A.g=a.g==='all'?'all':a.g;
  // v23 (L.11a, build 40): the Customise unlocks tab is NOT gated — it is the list of what can be earned — but it says what opens Customise until it opens (guess)
  $('#unl-hint').textContent=PROGRESS_SCREEN.unlHint; $('#cul-hint').textContent=chestOpen('games')?PROGRESS_SCREEN.culHint:PROGRESS_SCREEN.culLocked; $('#ach-hint').textContent=PROGRESS_SCREEN.achHint;
  $('#unl-lede').textContent=UNLOCKS_SCREEN.lede;
  setTab(a?achTab(a):o.tab,o); } });
define({
  ptab(b){ setTab(b.dataset.tab); return 'pick'; },
  // a locked row asks the lock box, exactly as the pick sheet does (v15 2.1); an open one goes where it is played
  unl(b){ if(b.dataset.key) { show('s-key'); return 'click'; }
    const {g,d,s}=b.dataset; const len=s===undefined?undefined:+s;
    if(b.classList.contains('lock')){ emit('lock:ask',{g,d,s:len}); return 'pick'; }
    show('s-pick',{g,d,s:len}); return 'click'; },
  'chip-ach'(b){ A.g=b.dataset.v; renderAch(); return 'pick'; },
  /* an EARNED row that paid out a cosmetic opens Customise — its own screen again since build 39 — with that game previewed
     and the item picked out (v11; v23 L.4d). Every other row, earned or not, goes where it is played: build 38 sent an earned
     row with no payout to the Customise tab with nothing to show, and that tab is gone (guess: to play it, as the hint says) */
  /* v23 (L.11a, build 40): Customise is locked until the Games chest — an earned row still banks and still shows green, and a tap on it
     says what opens Customise instead of opening a screen that is not open yet */
  ach(b){ const a=findAch(b.dataset.ach); if(!a) return 'click';
    if(got()[a.id]&&a.unlocks){ if(!chestOpen('games')){ toast(TOAST.cusLocked,'','',true); return 'pick'; } show('s-custom',{g:a.g==='all'?null:a.g,unlocks:a.unlocks}); return 'click'; }
    if((a.g!=='all'||a.id==='fullset')&&a.tier!=='secret') jumpTo(a); return 'click'; },
});
