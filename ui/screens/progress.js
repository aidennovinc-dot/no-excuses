/* No Excuses — Progress: ONE TAB PER CHEST, then Customise unlocks and Achievements (v29 Section A 58.3, build 58, quoting L6
   where the unlock table's PRESENTATION moves; the screen itself is build 33, v18 §B.31).

   WHY IT MOVED. Aiden, on v0.56: "the current achievements make no sense." His 67 of 110 were the 33 Skill-key rows and the
   34 Pro-key rows — the clearance bars, listed a second time as achievements, under a heading that made them look like
   extras. They are not extras; they are what a chest needs. So each chest gets a tab that says what THAT chest needs, the
   key rows live under the chest their key opens, today's Game unlocks content sits under the Games chest, and Achievements
   keeps only what fits nowhere else — today the five Pro extras and the thirteen Secrets. Its count shrinks to match.

   THE TABS ARE STILL A PARTITION, and it is still ONE test: `tabFor(a)` below. A row with `unlocks` is on Customise unlocks
   and nowhere else (v23 L.4c, unchanged); a keyAch row goes to the chest whose `needs` is its tier (`kt`); everything else
   is on Achievements. The gate asserts the six are disjoint and their union is ACH + keyAch(). Nothing about what a row SAYS
   changed — L.1, Aiden's own rewrite of names and lines, is still deferred.

   ONE HOST FOR FOUR CHEST TABS. They differ in what they list, not in how they are laid out. `#chest-list` takes the `unl`
   class for the Games chest (whose rows are the chain's own `.urow`s) and `ach` for a key chest (whose rows are achievement
   rows), because the two rule sets disagree on one selector and a host wearing both would paint a locked achievement's line
   green. `#chest-need` is the chest's own requirements, ticked, and it does not scroll away.

   WHAT IS UNCHANGED, DELIBERATELY. Build 53's three rules hold: NO ENTRY ANIMATION on any list or tab (R3), ONE "N of M
   unlocked" line per tab, and SECRET below every other tier. The per-game filter stays, one inside each chest tab and the
   one on Achievements. Customise unlocks is untouched — "Customise is great".

   A SECRET'S DESCRIPTION IS HIDDEN UNTIL IT IS EARNED (58.3). The tier heading says "what earns them is not written down"
   and every row then wrote it down, in `hint`. The progress bar is the hint now, and the only one.

   L6 is quoted by B.31 and again here, because "the Unlocks screen" in that rule is the Games chest tab now. Every line on
   it still comes out of UNLOCKS and lenLock() / lenNeed() in progress.js, exactly as the lock box, the goal line and the
   Next card do. A tap on a locked row opens the same lock box the pick sheet opens.

   The screen remembers which tab was last open in `prefs.progTab`; only the tab that is up renders. */
import { ACH_SCREEN, GRID, GAUNTLET, ITEM_WORD, PROGRESS_SCREEN, TIERS, UNLOCKS_SCREEN } from "../../config/copy.js";
import { CHESTS } from "../../config/chests.js";
import { KEYS } from "../../config/keys.js";
import { MODE_NAME } from "../../config/games.js";
import { $, $$, T } from "../../core.js";
import { emit } from "../../core/events.js";
import { sel } from "../../core/state.js";
import { prefs, save } from "../../core/store.js";
import { GAMES, GC, lenName } from "../../games/registry.js";
import { Scores, UNLOCKS, achAll, achById, achTab, gameOpen, got, isOpen, lenLock, lenOpen, markSeen, modeCount, newMark, setPendingAim, unlockHear, unlockHtml, unlockName, unlocked } from "../../progress.js";
import { chestNeeds, chestOpen, keyAch, keyState, tierOpen } from "../../progress/key.js";
import { Snd } from "../../audio.js";
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

/* ---------- 58.3: the six tabs ----------
   One per chest, in the order they open (config/chests.js IS that order), then the two that are not a chest. A chest tab's
   id is `c-<chest>`, so the four chest names are still spelled in exactly one place (GRID.chest) and a fifth chest would
   add a fifth tab with no code change. A profile that last had `unl` open lands on the Games chest, which is what that tab
   became; `cus` from builds 33–38 still lands on Customise (core/store.js). */
const CHEST_TABS = CHESTS.map(c => 'c-' + c.id);
const TABS = CHEST_TABS.concat(['cul', 'ach']);
const OLD_TAB = { unl: 'c-games' };
const tabOf = t => { const want = OLD_TAB[t] || t; if (TABS.includes(want)) return want;
  const held = OLD_TAB[prefs.progTab] || prefs.progTab; return TABS.includes(held) ? held : TABS[0]; };
const chestOfTab = t => CHESTS.find(c => 'c-' + c.id === t) || null;
const tabLabel = t => { const c = chestOfTab(t); return c ? (GRID.chest[c.id] || c.id) : PROGRESS_SCREEN[t]; };
/* THE ONE TEST — which tab a row lives on, so the six are a partition. A payout goes to Customise unlocks (L.4c); a key row
   goes to the chest whose `needs` is its tier; everything else is on Achievements. */
function tabFor(a){ if(!a) return 'ach'; if(achTab(a)==='cul') return 'cul';
  if(!a.kt) return 'ach'; const c=CHESTS.find(x=>x.needs===a.kt); return c?'c-'+c.id:'ach'; }
// the tier a chest's rows belong to — null for the Games chest, whose rows are the chain and not a key
const tierOfChest = c => c && c.needs !== 'modes' ? c.needs : null;

/* ---------- the Games chest tab (the old Game unlocks tab, build 23 v15 §2.4 — its content unchanged) ---------- */
const row=(cls,name,need,state,data)=>`<button data-act="unl" class="urow ${cls}"${data}><span>${name}</span><em>${state}</em><small>${need}</small></button>`;
function gamesHtml(gsel){
  const u=unlocked(); const fresh=[];
  // the chain, in the order it is earned. A row is open when its key is in the store or its game is open from the start
  let open=0, total=0;                         // item 4: what the tab's one count line reports
  const mine=g=>gsel==='all'||g===gsel;        // 58.3: the per-game filter, now on this tab too
  const chain=UNLOCKS.map(x=>{ const [g,d]=x.key.split(':'); const isO=x.key==='sequence:practice'?!!u[x.key]:isOpen(g,d);
    const nw=isO?newMark('mode:'+g+':'+d,fresh):''; total++; if(isO) open++;
    if(!mine(g)) return '';
    return row('u'+(isO?' done':' lock')+nw,unlockName(x.key),isO?'':x.need,isO?UNLOCKS_SCREEN.done:UNLOCKS_SCREEN.locked,` data-g="${g}" data-d="${d}"`); }).join('');
  // every length of every mode, from lenLock — the same call the pick sheet's crossed-out rows make
  const lens=[];
  for(const g in GAMES){ if(!gameOpen(g)) continue; for(const d of GAMES[g].modes) for(const s of GC(g,d).lens){ const L=lenLock(g,d,s); if(!L&&GC(g,d).lens.indexOf(s)===0) continue;
    const name=`${GAMES[g].name}${MODE_NAME[d]?' · '+MODE_NAME[d]:''} · ${lenName(g,s,d)}`;
    total++; if(!L) open++; if(!mine(g)) continue;
    lens.push(row('u'+(L?' lock':' done'),name,L?L.need:'',L?UNLOCKS_SCREEN.locked:UNLOCKS_SCREEN.done,` data-g="${g}" data-d="${d}" data-s="${s}"`)); } }
  // v23 (L.10a, build 40): key 1 is quiet until the Games chest — the key row says what opens it, with no count
  const k=keyState(), kq=!tierOpen('clear');
  const keyRow=gsel!=='all'?'':`<h4>${UNLOCKS_SCREEN.keys}</h4>`+
    // v17 (B.9): the count in the key line is read from the same keyState() the row's own figure comes from — a literal
    // would have gone stale the day Sequence lost 5 keys, which is the day it did
    row('u key'+(!kq&&k.done>=k.total?' done':' lock'),UNLOCKS_SCREEN.keys,kq?PROGRESS_SCREEN.keyLocked:T(UNLOCKS_SCREEN.keyLine,{n:k.total}),kq?UNLOCKS_SCREEN.locked:`${k.done}/${k.total}`,' data-key="1"');
  markSeen(fresh);
  /* item 4: the chain rows and the length rows, open against the lot. The key row is not counted — it is a way in to another screen with
     its own count on it (`19/30`), not a thing this tab unlocks. The count is the WHOLE tab, not the filter's slice, because this tab's
     count is the Games chest's own requirement and a filter must not make the chest look closer than it is. */
  return { html:`<h4>${UNLOCKS_SCREEN.games}</h4>${chain}`+`<h4>${UNLOCKS_SCREEN.lens}</h4>${lens.join('')||''}`+keyRow, open, total };
}

/* ---------- one achievement row, for any tab that lists achievements ----------
   Build 39 lifts this out of renderAch so every tab builds a row's WORDS the same way: L.1 is deferred, so a row that
   moved tabs must say exactly what it said before. What differs is the headline. On an achievement or a chest tab a row
   leads with its name, as it always has. On Customise unlocks it leads with what it pays out (v23 L.4d), and the
   achievement's name and criterion sit under it. */
function achRow(a,tab,{g,all,fsGame,fresh}){
  const isDone=!!g[a.id], secret=a.tier==='secret'&&!isDone;
  const p=a.progress&&!isDone?Math.min(1,a.progress(all,fsGame)):null;
  // v14 (8.3): the game name leads the title. v14 (8.4): so it is written once — the jump line below repeats it only for
  // the rows that have no game of their own ("Every game", "Full set") or that name no mode and no length to point at
  const wg=a.g==='all'?fsGame:a.g;
  const gname=a.g==='all'?'':`<i>${GAMES[a.g].name}</i>`;
  // v28 (item 1, build 53): a Secret row's bar is the ordinary one — `s` was the red cue bar, and red means a miss everywhere else (L.2)
  const bar=p!==null?`<div class="pbar"><i style="width:${Math.round(p*100)}%"></i></div>`:'';
  const jump=a.g!=='all'||a.id==='fullset';
  const wbits=[]; if(a.at?.d) wbits.push(MODE_NAME[a.at.d]); if(a.at?.s!==undefined) wbits.push(lenName(a.g,a.at.s,a.at?.d||GAMES[wg].modes[0]));
  if(a.g==='all'||!wbits.length) wbits.unshift(GAMES[wg].name);
  const where=jump&&!secret?`<small class="go">→ ${wbits.join(' · ')}</small>`:'';
  // v14 (8.1): a requirement that is a set of things names the ones still outstanding
  const left=!isDone&&a.left?a.left(all):null;
  const leftTxt=left&&left.length?T(ACH_SCREEN.left,{names:left.join(', ')}):'';
  /* v29 Section A (58.3, build 58): A SECRET SAYS NOTHING UNTIL IT IS EARNED. v14 (8.5) gave every secret a `hint` describing what
     kind of thing earns it, and the tier heading above it says "what earns them is not written down" — so the heading and the rows
     disagreed, thirteen times. The progress bar is the hint now and the only one; `hint` is left in config/achievements.js because
     an EARNED secret is still described by its `how`, and the day Aiden wants the hints back it is this line that changes. */
  const line=secret?'':a.how+(a.id==='fullset'?T(ACH_SCREEN.inGame,{game:GAMES[fsGame].name}):'')+leftTxt;
  /* v28 (item 1 / R3, build 53): NO ENTRY ANIMATION ON A LIST. The earned rows used to slide in on a 70ms stagger, so a tab or a filter
     tap painted over about a second. Motion belongs to rewards, not to menus. */
  const nw=isDone?newMark('ach:'+a.id,fresh):'';
  const cls=`${isDone?'done':'lock'}${nw} ${jump?'jump':''}`, name=secret?ACH_SCREEN.hidden:a.name;
  // v23 (L.4d): what it unlocks first, white until earned and green once (L.2); the achievement and its criterion under it
  if(tab==='cul') return `<button data-act="ach" class="a cu ${cls}" data-ach="${a.id}" id="cul-${a.id}"><span class="rw">${isDone?'✓ ':''}${unlockHtml(a)}</span><em>${isDone?ACH_SCREEN.done:''}</em><small>${gname}${name} · ${line}</small>${where}${bar}</button>`;
  return `<button data-act="ach" class="a ${cls}" data-ach="${a.id}" id="${tab}-${a.id}"><span>${gname}${isDone?'✓ ':''}${name}</span><em>${isDone?ACH_SCREEN.done:secret?ACH_SCREEN.secret:''}</em><small>${line}</small>${where}${bar}</button>`;
}

/* ---------- 58.3: WHAT THIS CHEST NEEDS ----------
   `chestNeeds` in progress/key.js is the one read, and it is the same one the map tile uses — the key (or every mode) it has
   always named, and since 58.2 a finished Gauntlet on the Pro and Author chests. Each row carries its own tick, so the tab
   says what is left rather than only what is missing first. L.2: white until met, green once, never red. */
function needHtml(c,m){
  return chestNeeds(c.id).map(r=>{
    const name=r.k==='gaunt'?T(PROGRESS_SCREEN.needGaunt,{name:GAUNTLET.name[r.gaunt]||r.gaunt})
      :r.k==='modes'?T(PROGRESS_SCREEN.needModes,{open:m.open,total:m.total})
      :T(PROGRESS_SCREEN.needKey,{key:(KEYS.find(k=>k.id===r.tier)||{}).name||r.tier});
    return `<div class="urow ${r.done?'done':'lock'}"><span>${name}</span><em>${r.done?PROGRESS_SCREEN.met:PROGRESS_SCREEN.todo}</em></div>`;
  }).join('');
}

/* ---------- 58.3: a chest tab ----------
   The Games chest lists the chain and the lengths, which is what opens it. A key chest lists that key's own rows, grouped by
   game the way the Key Unlocks Desk groups them — each game's bars, then that game's own row — with the key entire last. A
   tier whose chest has not revealed it lists nothing and says so (A.1: existence shows, numbers do not). */
const F={};                                     // the per-tab game filter, remembered while the screen is up
function renderChest(tab){
  const c=chestOfTab(tab); if(!c) return;
  const g=got(), all=Scores.runs(); const fresh=[]; const gsel=F[tab]||'all';
  const m=modeCount();
  $('#chest-need').innerHTML=needHtml(c,m);
  $('#chest-g').innerHTML=`<button class="chip" data-act="chip-chest" data-chip="chest-g" data-v="all">${ACH_SCREEN.all}</button>`+Object.entries(GAMES).map(([id,x])=>`<button class="chip" data-act="chip-chest" data-chip="chest-g" data-v="${id}">${x.name}</button>`).join(''); chips('chest','g',gsel);
  const list=$('#chest-list');
  const tier=tierOfChest(c);
  if(!tier){ const out=gamesHtml(gsel); list.className='unl scroll'; list.innerHTML=out.html; tabCount('chest',out.open,out.total); return; }
  list.className='ach scroll';
  const key='key'+(KEYS.findIndex(k=>k.id===tier)+1);
  if(!groupShown(key)){ list.innerHTML=`<h4>${PROGRESS_SCREEN.shut}</h4>`; tabCount('chest',0,0); return; }
  const rows=allAch().filter(a=>tabFor(a)===tab);
  const ctx={g,all,fsGame:gsel==='all'?sel.game:gsel,fresh};
  const shown=rows.filter(a=>gsel==='all'||a.g===gsel||a.g==='all');
  let html='';
  for(const gid in GAMES){ if(gsel!=='all'&&gid!==gsel) continue;
    const items=shown.filter(a=>a.g===gid); if(!items.length) continue;
    const done=items.filter(a=>g[a.id]).length;
    html+=`<h4>${GAMES[gid].name} · ${done}/${items.length}</h4>`+items.map(a=>achRow(a,tab,ctx)).join(''); }
  const whole=shown.filter(a=>a.g==='all');
  if(whole.length) html+=`<h4>${PROGRESS_SCREEN.whole} · ${whole.filter(a=>g[a.id]).length}/${whole.length}</h4>`+whole.map(a=>achRow(a,tab,ctx)).join('');
  list.innerHTML=html;
  // item 4: the tab's one count is the WHOLE chest, not the filter's slice — a filter must never make a chest look closer than it is
  tabCount('chest',rows.filter(a=>g[a.id]).length,rows.length);
  markSeen(fresh);
}

/* ---------- the Customise unlocks tab (build 39, v23 L.4b–d) — UNCHANGED at 58.3 ("Customise is great") ----------
   Every achievement that pays out a cosmetic, and nothing else — grouped by the Customise row it pays into, in that
   screen's own order, so the list reads like the screen it leads to. An earned row goes to Customise with that item
   picked out; an unearned one still goes to play it. No game filter: it is twenty rows, and a filter would hide the
   Every-game rows behind a chip (guess). */
const CUL_ORDER=['sq','lead','cut','bg','snd','scale','rate','wheel'];
function renderCul(){
  const g=got(), all=Scores.runs(); const fresh=[]; const ctx={g,all,fsGame:sel.game,fresh};
  // v24 (D.2, build 44): key roster rows that pay out a cosmetic are here too — the tier's rows only once its chest has revealed it (A.1)
  const list=allAch().filter(a=>tabFor(a)==='cul'&&groupShown(a.tier));
  const at=s=>{ const i=CUL_ORDER.indexOf(s); return i<0?99:i; };
  const sets=[...new Set(list.map(a=>a.unlocks[0]))].sort((x,y)=>at(x)-at(y));
  $('#cul-list').innerHTML=sets.map(set=>{ const items=list.filter(a=>a.unlocks[0]===set), done=items.filter(a=>g[a.id]).length;
    return `<h4>${PROGRESS_SCREEN.culGroup[set]||ITEM_WORD[set]||set} · ${done}/${items.length}</h4>`+items.map(a=>achRow(a,'cul',ctx)).join(''); }).join('');
  // item 4: the tab line is the sum of the per-section counts this tab already prints
  tabCount('cul',list.filter(a=>g[a.id]).length,list.length);
  markSeen(fresh);
}

/* ---------- the Achievements tab — 58.3: THE EXTRAS THAT FIT NOWHERE ELSE ----------
   Today that is the five Pro extras and the thirteen Secrets. Every key row has gone to its own chest's tab, which is what
   Aiden's "the current achievements make no sense" was about: 67 of his 110 were clearance bars wearing an achievement's
   clothes. The filter row and build 53's rules stay — Secret below every other tier (the TIERS key order IS the render
   order), one count line, no entry animation. */
const A={ g:'all' };
function renderAch(){
  const g=got(), all=Scores.runs(), gsel=A.g; const fresh=[];
  $('#ach-g').innerHTML=`<button class="chip" data-act="chip-ach" data-chip="ach-g" data-v="all">${ACH_SCREEN.all}</button>`+Object.entries(GAMES).map(([id,x])=>`<button class="chip" data-act="chip-ach" data-chip="ach-g" data-v="${id}">${x.name}</button>`).join(''); chips('ach','g',gsel);
  const list=allAch().filter(a=>tabFor(a)==='ach'&&(gsel==='all'||a.g===gsel||a.g==='all'));
  const ctx={g,all,fsGame:gsel==='all'?sel.game:gsel,fresh};
  $('#achlist').innerHTML = Object.keys(TIERS).filter(groupShown).map(t=>{
    const items=list.filter(a=>a.tier===t), done=items.filter(a=>g[a.id]).length;
    if(!items.length) return '';
    return `<h4 class="${t}">${TIERS[t][0]} · ${done}/${items.length}<span>${TIERS[t][1]}</span></h4>`+items.map(a=>achRow(a,'ach',ctx)).join(''); }).join('');
  /* v28 (item 4, build 53): ONE COUNT LINE FOR THE TAB, where the grey "tap one to go play it" was. R1 narrows the total: a SECRET row is not
     counted until at least one has been found, so the line can never say how many secrets there are. Once one is found they all count — the
     player knows the kind of thing exists by then, which is exactly what R1 allows. The count follows the filter, because it sits under it. */
  const secretFound=allAch().some(a=>a.tier==='secret'&&g[a.id]);
  const counted=list.filter(a=>a.tier!=='secret'||secretFound||g[a.id]);
  tabCount('ach',counted.filter(a=>g[a.id]).length,counted.length);
  markSeen(fresh);
}
// a locked row: straight to the sheet it is earned on, at the mode and length it names; a locked mode or length asks the box first
function jumpTo(a){ const g=a.g==='all'?(A.g==='all'?sel.game:A.g):a.g; const d=a.at?.d||GAMES[g].modes[0]; if(!isOpen(g,d)) return emit('lock:ask',{g,d}); if(a.at?.s!==undefined&&!lenOpen(g,d,a.at.s)) return emit('lock:ask',{g,d,s:a.at.s}); setPendingAim(a.how); show('s-pick',{g,d:a.at?.d,s:a.at?.s}); }

/* ---------- v28 (item 4, build 53): ONE COUNT LINE PER TAB, WHERE THE GREY HELPER TEXT WAS ----------
   Three lines went: "tap a locked row to see what it takes" and the paragraph under it on Game unlocks, "tap an earned one to use it" /
   "open the Games chest to use them" on Customise unlocks, and "tap one to go play it" on Achievements. None of them said anything a row
   does not say by being a row. In their place the tab says how much of ITSELF is done — the same shape Customise unlocks already prints per
   section ("Target colours · 1/3"), summed. Each render works its own count out and hands it here. */
const tabCount=(tab,done,total)=>{ const el=$('#'+tab+'-hint'); if(el) el.textContent=T(PROGRESS_SCREEN.count,{done,total}); };

/* ---------- the six tabs ---------- */
// only the tab that is up is rendered: a chest's list is the longest markup in the app and the Games chest's walks every mode of
// every game, so building the hidden ones would be six renders for one screen. `opts.ach` is a row to scroll to and flash — on
// whichever tab tabFor says it lives
function renderTabs(tab){
  $('#prog-tabs').innerHTML=TABS.map(t=>`<button data-act="ptab" class="chip${t===tab?' sel':''}" data-tab="${t}">${tabLabel(t)}</button>`).join('');
}
function setTab(t,opts){ const tab=tabOf(t); prefs.progTab=tab; save(); opts=opts||{};
  renderTabs(tab);
  $('#p-chest').hidden=!chestOfTab(tab); $('#p-cul').hidden=tab!=='cul'; $('#p-ach').hidden=tab!=='ach';
  if(chestOfTab(tab)) renderChest(tab); else if(tab==='cul') renderCul(); else renderAch();
  if(opts.ach){ const r=$(`#${tab}-${opts.ach}`); if(r){ r.scrollIntoView({block:'center'}); r.classList.add('flash'); } } }

register('s-prog',{ onShow(o){ const a=o.ach?findAch(o.ach):null; const t=a?tabFor(a):o.tab;
  if(a&&t==='ach') A.g=a.g==='all'?'all':a.g; if(a&&chestOfTab(t)) F[t]=a.g==='all'?'all':a.g;
  setTab(t,o); } });
define({
  ptab(b){ setTab(b.dataset.tab); return 'pick'; },
  // a locked row asks the lock box, exactly as the pick sheet does (v15 2.1); an open one goes where it is played
  // v24 (A.1, build 43): the key row goes where the Keys menu row goes, and waits for the Games chest the same way
  unl(b){ if(b.dataset.key) { if(!chestOpen('games')){ toast(TOAST.keysLocked,'','',true); return 'pick'; } show('s-key'); return 'click'; }
    const {g,d,s}=b.dataset; const len=s===undefined?undefined:+s;
    if(b.classList.contains('lock')){ emit('lock:ask',{g,d,s:len}); return 'pick'; }
    show('s-pick',{g,d,s:len}); return 'click'; },
  'chip-ach'(b){ A.g=b.dataset.v; renderAch(); return 'pick'; },
  // 58.3: the per-game filter inside a chest tab, remembered per tab so switching tabs does not lose it
  'chip-chest'(b){ F[tabOf(prefs.progTab)]=b.dataset.v; renderChest(tabOf(prefs.progTab)); return 'pick'; },
  /* an EARNED row that paid out a cosmetic opens Customise — its own screen again since build 39 — with that game previewed
     and the item picked out (v11; v23 L.4d). Every other row, earned or not, goes where it is played: build 38 sent an earned
     row with no payout to the Customise tab with nothing to show, and that tab is gone (guess: to play it, as the hint says) */
  /* v23 (L.11a, build 40): Customise is locked until the Games chest — an earned row still banks and still shows green, and a tap on it
     says what opens Customise instead of opening a screen that is not open yet */
  /* v28 (item 6, build 53): AN EARNED ROW THAT UNLOCKS A SOUND PLAYS IT ONCE. Aiden: "a small icon, and tapping an earned row plays the sound
     once." It plays the pack or the scale THAT ROW unlocks, not the one in use, and the tap still goes on to Customise with the item ringed —
     hearing it and seeing where it lives are the same tap. A locked row is silent: the sound is the reward. */
  ach(b){ const a=findAch(b.dataset.ach); if(!a) return 'click';
    if(got()[a.id]&&a.unlocks){ const h=unlockHear(a); if(h){ if(h.k==='scale') Snd.scaleHear(h.v); else { Snd.hit(h.v); setTimeout(()=>Snd.hit(h.v),150); } }
      if(!chestOpen('games')){ toast(TOAST.cusLocked,'','',true); return 'pick'; } show('s-custom',{g:a.g==='all'?null:a.g,unlocks:a.unlocks}); return 'click'; }
    if((a.g!=='all'||a.id==='fullset')&&a.tier!=='secret') jumpTo(a); return 'click'; },
});
