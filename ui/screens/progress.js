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

   BUILD 69 (68.40 / 68.42, PICKED as mocked — "Well done on the progress screen"). Aiden on v0.68: "It's just not super obvious that everything is
   complete in this, or like how far through we are … you have to really read it." So every tab is drawn by the same few rules: a count line with a
   thin gold bar at the top; ONE heading per game — its map symbol (the tile's own, read off the map), its name and a pip per target; a game whose
   targets are all met is a gold heading with a tick, FOLDED SHUT until it is tapped, and on a chest tab that heading IS the old gold "Quick Tap ·
   Skill key" row; to-do rows above done rows; no "Done" / "Open" / "Locked" word on any row; the thin best-so-far bar stays under unfinished targets;
   a NEXT chip on the one row closest to done (nextPick's own test, `closest()`). The game filter rows are gone — the headings do that job, with
   the general rows under a "General" heading on Achievements. Customise unlocks keeps its groups and gives each row a fixed left column: a 30px
   swatch with 12px of clear space, the red diagonal while unearned, two lines of words, the state at the right edge. Build 53's rules hold: NO
   ENTRY ANIMATION (R3) and ONE "N of M unlocked" line per tab.

   L6 is quoted by B.31 and again here, because "the Unlocks screen" in that rule is the Games chest tab now. Every line on
   it still comes out of UNLOCKS and lenLock() / lenNeed() in progress.js, exactly as the lock box, the goal line and the
   Next card do. A tap on a locked row opens the same lock box the pick sheet opens.

   The screen remembers which tab was last open in `prefs.progTab`; only the tab that is up renders. */
import { ACH_SCREEN, EXCUSE_TXT, GRID, ITEM_WORD, PROGRESS_SCREEN, TIERS, UNLOCKS_SCREEN } from "../../config/copy.js";
import { CHESTS } from "../../config/chests.js";
import { EXCUSES } from "../../config/excuses.js";
import { excuseCount } from "../../progress/excuses.js";
import { KEYS, KEY_ART } from "../../config/keys.js";
import { MODE_NAME } from "../../config/games.js";
import { $, $$, T, esc } from "../../core.js";
import { scoreTxt } from "../format.js";
import { emit } from "../../core/events.js";
import { sel } from "../../core/state.js";
import { prefs, save } from "../../core/store.js";
import { GAMES, GC, lenName } from "../../games/registry.js";
import { Scores, UNLOCKS, achAll, achById, achTab, achWhere, gameOpen, got, isOpen, lenLock, lenNeed, lenOpen, markSeen, modeCount, nameless, newMark, setPendingAim, unlockArt, unlockHear, unlockHtml, unlockName, unlocked } from "../../progress.js";
import { COMBOS, barOf, chestOpen, keyAch, keyState, tierOpen } from "../../progress/key.js";
import { closest, nextPick } from "../../progress/next.js";
import { askPlay } from "../askplay.js";
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
import { register, show } from "../router.js";

/* ---------- 58.3: the six tabs ----------
   One per chest, in the order they open (config/chests.js IS that order), then the two that are not a chest. A chest tab's
   id is `c-<chest>`, so the four chest names are still spelled in exactly one place (GRID.chest) and a fifth chest would
   add a fifth tab with no code change. A profile that last had `unl` open lands on the Games chest, which is what that tab
   became; `cus` from builds 33–38 still lands on Customise (core/store.js). */
const CHEST_TABS = CHESTS.map(c => 'c-' + c.id);
const TABS = CHEST_TABS.concat(['cul', 'ach', 'exc']);
const OLD_TAB = { unl: 'c-games' };
const tabOf = t => { const want = OLD_TAB[t] || t; if (TABS.includes(want)) return want;
  const held = OLD_TAB[prefs.progTab] || prefs.progTab; return TABS.includes(held) ? held : TABS[0]; };
const chestOfTab = t => CHESTS.find(c => 'c-' + c.id === t) || null;
const tabLabel = t => { const c = chestOfTab(t); return c ? (GRID.chest[c.id] || c.id) : PROGRESS_SCREEN[t]; };
/* THE ONE TEST — which tab a row lives on, so the six are a partition. A payout goes to Customise unlocks (L.4c); a key row
   goes to the chest whose `needs` is its tier; everything else is on Achievements. */
function tabFor(a){ if(!a) return 'ach'; if(achTab(a)==='cul') return 'cul';
  if(!a.kt) return 'ach'; const c=CHESTS.find(x=>x.needs===a.kt); return c?'c-'+c.id:'ach'; }
// build 69: the key chest a row is listed under, cosmetic or not — a key row is on its chest's tab whatever tabFor() says is its home
function chestFor(a){ if(!a||!a.kt) return null; const c=CHESTS.find(x=>x.needs===a.kt); return c?'c-'+c.id:null; }
// the tier a chest's rows belong to — null for the Games chest, whose rows are the chain and not a key
const tierOfChest = c => c && c.needs !== 'modes' ? c.needs : null;

/* ---------- build 69 (68.40): THE GROUPS ----------
   One heading per game. The symbol is the game's own tile art on the map, copied, never redrawn — a game's look changes in one place. A chest tab's
   heading carries a pip per target and is a button: a finished game starts FOLDED SHUT and opens on a tap, an unfinished one starts open and can be
   shut; what the player did is remembered while the screen is up (FOLD). Achievements' and Customise unlocks' headings are plain. */
const symOf=g=>{ const m=document.querySelector(`#grid .tile[data-game="${g}"] .mini`); return `<span class="gpic">${m?m.outerHTML:''}</span>`; };
const FOLD={};
const todoFirst=(items,isDone)=>items.filter(x=>!isDone(x)).concat(items.filter(isDone));
function gameGroup(tab,gid,pips,rows,ach){ const gold=pips.length>0&&pips.every(Boolean), k=tab+':'+gid, open=k in FOLD?FOLD[k]:!gold;
  const head=`${symOf(gid)}<span class="n">${esc(GAMES[gid].name)}</span><span class="pips">${pips.map(f=>`<i${f?' class="f"':''}></i>`).join('')}</span>${gold?'<b class="tick">✓</b>':''}`;
  return `<div class="g${gold?' whole':''}${open?'':' fold'}" data-g="${gid}"><h4><button class="gh" data-act="pfold" data-g="${gid}"${ach?` data-ach="${ach}"`:''} aria-expanded="${open}">${head}</button></h4><div class="gb"${open?'':' hidden'}>${rows}</div></div>`; }
const plainGroup=(gid,label,rows,sym)=>`<div class="g" data-g="${gid}"><h4><span class="gh" data-g="${gid}">${sym?symOf(gid):'<span class="gpic"></span>'}<span class="n">${esc(label)}</span></span></h4><div class="gb">${rows}</div></div>`;
// the NEXT chip is drawn from an attribute, so it is never part of a row's words (61.12: a score-target row is one line)
const nxAttr=on=>on?` data-nx="${esc(PROGRESS_SCREEN.next)}"`:'';

/* ---------- the Games chest tab (the old Game unlocks tab, build 23 v15 §2.4 — its content unchanged) ---------- */
// build 69 (68.40): no "open" / "locked" word on a row — the state is the row's colour and, once open, the tick on its requirement (64.10)
const row=(cls,name,need,data,nx)=>`<button data-act="unl" class="urow ${cls}${nx?' nx':''}"${data}><span${nxAttr(nx)}>${name}</span><em></em><small>${need}</small></button>`;
/* build 65 (64.10): AN OPEN ROW KEEPS ITS REQUIREMENT. Only locked rows used to say how; an open one showed nothing, so a player could not look up how
   they had got it. The requirement stays, ticked and green, and where the run that earned it was recorded (`prefs.unlBy`, run/run.js) it says what
   the player did and when — "✓ 7 hits in a row, no misses, in a Quick Tap · Two Sprint · you: 16, 29 Sep" (Cowork's call). An unlock earned before
   build 65 has no run on record and keeps the requirement and the tick. */
function didLine(key,need){ if(!need) return ''; const b=(prefs.unlBy||{})[key];
  const you=b&&GAMES[b.g]?T(UNLOCKS_SCREEN.you,{score:esc(scoreTxt(b.g,b.h,b.d,b.s)),when:new Date(b.t).toLocaleDateString(undefined,{day:'numeric',month:'short'})}):'';
  return T(UNLOCKS_SCREEN.did,{need})+you; }
function gamesHtml(){
  const u=unlocked(); const fresh=[]; const per={};
  const add=(g,it)=>{ (per[g]=per[g]||[]).push(it); };
  // the chain, in the order it is earned. A row is open when its key is in the store or its game is open from the start
  UNLOCKS.forEach(x=>{ const [g,d]=x.key.split(':'); const isO=x.key==='sequence:practice'?!!u[x.key]:isOpen(g,d);
    const nw=isO?newMark('mode:'+g+':'+d,fresh):'';
    add(g,{ key:x.key, done:isO, html:nx=>row('u'+(isO?' done':' lock')+nw,unlockName(x.key),isO?didLine(x.key,x.need):x.need,` data-g="${g}" data-d="${d}"`,nx) }); });
  // every length of every mode, from lenLock — the same call the pick sheet's crossed-out rows make
  for(const g in GAMES){ if(!gameOpen(g)) continue; for(const d of GAMES[g].modes) for(const s of GC(g,d).lens){ const L=lenLock(g,d,s); if(!L&&GC(g,d).lens.indexOf(s)===0) continue;
    const name=`${MODE_NAME[d]?MODE_NAME[d]+' · ':''}${lenName(g,s,d)}`;
    add(g,{ key:`${g}:${d}:${s}`, done:!L, html:nx=>row('u'+(L?' lock':' done'),name,L?L.need:didLine(g+':'+d+':'+s,lenNeed(g,d,s)),` data-g="${g}" data-d="${d}" data-s="${s}"`,nx) }); } }
  /* NEXT: the row the menu's next-unlock card names, when it is on this tab and still to do; else the first row to do */
  const p=nextPick(), pk=p&&(p.kind==='unlock'||p.kind==='len')?p.key:null;
  const todo=Object.keys(GAMES).flatMap(g=>(per[g]||[]).filter(i=>!i.done)), nk=((pk&&todo.find(i=>i.key===pk))||todo[0]||{}).key;
  // v23 (L.10a, build 40): key 1 is quiet until the Games chest — the key row says what opens it, with no count
  const kq=!tierOpen('clear');
  /* build 62 (61.26): THE SKILL KEY IS ITS ART AND ONE LINE. The grey paragraph ("The first key is earned here…", 30/30) is gone: the key's own
     glyph, dim with "Unlock all games to open the Skill key" until the Games chest opens it, then lit in its colour with "Skill key unlocked"
     (Cowork's wording for the earned state). Still the way in to the Keys screen, as the row it replaces was. */
  const sk=KEYS[0], lit=!kq;
  const keyRow=`<button data-act="unl" class="keyblock${lit?' lit':''}" data-key="1" style="--kt:${sk.tint}"><svg class="kbart" viewBox="0 0 48 48" aria-hidden="true">${KEY_ART[sk.id].map(d=>`<path d="${d}"></path>`).join('')}</svg><span>${lit?PROGRESS_SCREEN.skillOpen:PROGRESS_SCREEN.skillShut}</span></button>`;
  markSeen(fresh);
  // a game's name is its heading now, so a length row says only its mode and length ("Four · Marathon")
  return Object.keys(GAMES).filter(g=>per[g]).map(g=>gameGroup('c-games',g,per[g].map(i=>i.done),todoFirst(per[g],i=>i.done).map(i=>i.html(i.key===nk)).join(''))).join('')+keyRow;
}

/* build 62 (61.16): SAY THE MODE ONCE. A Customise-unlock row read "Clean · Marathon · Four · Marathon, no misses, at least 50 hits" — the
   mode and length in the name, again in the requirement and again on the → line. The → line carries them now and nothing else does: the
   words it names come off the front of the requirement and off the end of the NAME AS SHOWN (config/ keeps the name whole). And a whole
   number of percent drops its decimals everywhere a requirement is shown: "30% or less", never "30.00%". */
const pctTidy=s=>String(s).replace(/(\d+)\.0+%/g,'$1%');
const said=words=>words.filter(Boolean).map(w=>String(w).toLowerCase());
function reqOf(a,words){ let s=String(a.how||''); const drop=said(words);
  for(let k=0;k<4;k++){ const m=s.match(/^([^,·—]+?)\s*[,·—]\s*/); if(!m||!drop.includes(m[1].trim().toLowerCase())) break; s=s.slice(m[0].length); }
  s=pctTidy(s); return s.charAt(0).toUpperCase()+s.slice(1); }
function shownName(a,words){ const drop=said(words), bits=String(a.name).split(' · ');
  while(bits.length>1&&drop.includes(bits[bits.length-1].toLowerCase())) bits.pop(); return bits.join(' · '); }
/* ---------- one achievement row, for any tab that lists achievements ----------
   Build 39 lifts this out of renderAch so every tab builds a row's WORDS the same way: L.1 is deferred, so a row that
   moved tabs must say exactly what it said before. What differs is the headline. On an achievement or a chest tab a row
   leads with its name, as it always has. On Customise unlocks it leads with what it pays out (v23 L.4d), and the
   achievement's name and criterion sit under it. */
function achRow(a,tab,{g,all,fsGame,fresh,nx}){
  /* build 62 (61.14): NO SECRETS. Every row shows its name and what earns it, earned or not, on every tab — the "???" row, the SECRET label and
     58.3's silent secret are gone. "???" is left only where a chest has not been opened yet (A.1: `PROGRESS_SCREEN.shut`). */
  const isDone=!!g[a.id];
  const p=a.progress&&!isDone?Math.min(1,a.progress(all,fsGame)):null;
  const wg=a.g==='all'?fsGame:a.g;
  /* build 69 (68.40): every tab groups its rows under their game's heading now, Achievements included, so no row repeats the game's name (61.9's
     rule, which only Achievements' flat list was outside) */
  // v28 (item 1, build 53): a Secret row's bar is the ordinary one — `s` was the red cue bar, and red means a miss everywhere else (L.2)
  const bar=p!==null?`<div class="pbar"><i style="width:${Math.round(p*100)}%"></i></div>`:'';
  const jump=a.g!=='all'||a.id==='fullset';
  const wbits=[]; if(a.at?.d) wbits.push(MODE_NAME[a.at.d]); if(a.at?.s!==undefined) wbits.push(lenName(a.g,a.at.s,a.at?.d||GAMES[wg].modes[0]));
  if(a.g==='all'||!wbits.length) wbits.unshift(GAMES[wg].name);
  const where=jump?`<small class="go">→ ${wbits.join(' · ')}</small>`:'';
  // v14 (8.1): a requirement that is a set of things names the ones still outstanding
  const left=!isDone&&a.left?a.left(all):null;
  const leftTxt=left&&left.length?T(ACH_SCREEN.left,{names:left.join(', ')}):'';
  const line=pctTidy(a.how)+(a.id==='fullset'?T(ACH_SCREEN.inGame,{game:GAMES[fsGame].name}):'')+leftTxt;
  /* v28 (item 1 / R3, build 53): NO ENTRY ANIMATION ON A LIST. The earned rows used to slide in on a 70ms stagger, so a tab or a filter
     tap painted over about a second. Motion belongs to rewards, not to menus. */
  const nw=isDone?newMark('ach:'+a.id,fresh):'';
  const isNx=!isDone&&nx===a.id;
  // build 62 (61.15): an achievement's own name is a TITLE, in gold, wherever it is shown (a nameless score-target row has none)
  // build 69 (68.40): the row's state is its colour and a tick in front — the word "done" is gone; `em` is that tick's place
  const cls=`${isDone?'done':'lock'}${nw} ${jump?'jump':''}${isNx?' nx':''}`, name=`<b class="aname">${esc(a.name)}</b>`, tick=`<em>${isDone?'✓':''}</em>`;
  // build 62 (61.12): a score-target row is its mode and length and what it asks — no name, no second line, no → line
  if(nameless(a)&&tab!=='cul') return `<button data-act="ach" class="a nameless ${cls}" data-ach="${a.id}" id="${tab}-${a.id}"><span${nxAttr(isNx)}>${esc(achWhere(a,' · '))} — ${line}</span>${tick}${bar}</button>`;
  /* build 69 (68.42): A CUSTOMISE-UNLOCK ROW IS A FIXED LEFT COLUMN AND TWO LINES. Aiden: "We're using a lot of vertical space … the customised colours
     are way too close to the actual words." The thing it unlocks in a 30px swatch with clear space after it (crossed in red while unearned), then the
     name in gold, then the requirement and where it is played on ONE line (61.16's say-the-mode-once, the → gone), and the state at the right edge:
     the tick once earned, else the thin best-so-far bar. A tap on an unearned row still goes to play it (`ach` → jumpTo) */
  if(tab==='cul'){ const [k,v]=a.unlocks, w=[GAMES[wg].name].concat(wbits.filter(x=>x!==GAMES[wg].name));
    const st=isDone?'✓':p!==null?`<span class="pbar"><i style="width:${Math.round(p*100)}%"></i></span>`:'';
    return `<button data-act="ach" class="a cu ${cls}" data-ach="${a.id}" id="cul-${a.id}"><span class="rw cuart">${unlockArt(k,v)}</span><span class="tx"><b class="aname">${esc(shownName(a,w))}</b><small>${esc(reqOf(a,w))}${leftTxt}${jump?esc(' · '+w.join(' · ')):''}</small></span><span class="st">${st}</span></button>`; }
  // build 64 (62.14): an achievement that opens part of the app says what, on a line of its own
  const gives=a.gives?`<small class="gives">${esc(T(ACH_SCREEN.gives,{what:a.gives}))}</small>`:'';
  return `<button data-act="ach" class="a ${cls}" data-ach="${a.id}" id="${tab}-${a.id}"><span${nxAttr(isNx)}>${name}</span>${tick}<small>${line}</small>${gives}${where}${bar}</button>`;
}

/* ---------- build 62 (61.8, SUPERSEDING 61.27): WHAT THIS CHEST NEEDS IS NOT LISTED HERE ANY MORE ----------
   58.3 put the chest's requirements above its filter chips, ticked. On the phone they ran into their own status ("Pro — every bar
   clearedNOT YET"), the second line was cut in half by the chips, and all of it repeated the Keys screen, which already carries the
   key's progress and its Gauntlet (60.30). Aiden: "Does it need to exist?" No. A key chest keeps one small link to its key's screen;
   the Games chest, opened by its own list below, has nothing. */
function needHtml(c){ const i=KEYS.findIndex(k=>k.id===c.needs); if(i<0) return '';
  return `<button class="chestlink" data-act="chest-how" data-kt="${i}">${PROGRESS_SCREEN.howOpen}</button>`; }

/* ---------- 58.3: a chest tab ----------
   The Games chest lists the chain and the lengths, which is what opens it. A key chest lists that key's own rows under a heading per game — that
   game's bars, the heading gold and folded once every one is met — with the key entire last. A tier whose chest has not revealed it lists nothing
   and says so (A.1: existence shows, numbers do not). */
function renderChest(tab){
  const c=chestOfTab(tab); if(!c) return;
  const g=got(), all=Scores.runs(); const fresh=[];
  $('#chest-need').innerHTML=needHtml(c);
  const list=$('#chest-list');
  const tier=tierOfChest(c);
  /* build 64 (A1, Aiden's answer to build 62): THE GAMES CHEST COUNTS MODES, AND ITS LINE SAYS SO. The tab counted every row on it, Streaks
     included; the chest opens on the thirteen modes (modeCount(), what the map tile and the Keys screen print), so the line is that count and
     says Streak is outside it — "13 of 13" over locked Streak rows no longer reads as a wrong sum. */
  if(!tier){ const m=modeCount(); list.className='unl scroll'; list.innerHTML=gamesHtml(); countLine('chest','',T(PROGRESS_SCREEN.gamesCount,{open:m.open,total:m.total}),m.open,m.total); return; }
  list.className='ach scroll';
  const key='key'+(KEYS.findIndex(k=>k.id===tier)+1);
  if(!groupShown(key)){ list.innerHTML=`<h4>${PROGRESS_SCREEN.shut}</h4>`; tabCount('chest',0,0,''); return; }
  /* build 69 (the count bugs, from Aiden's 68.40 / 68.41 frames): A CHEST'S TAB LISTS EVERY ROW OF ITS KEY. A key row that also pays out a cosmetic
     lived on Customise unlocks alone, so the Skill tab's Quick Tap said 6/6 over five bars (Four · Sprint pays a target colour). Those rows are on
     their chest's tab as well now, and still on Customise unlocks, which lists what pays out.
     68.40: a game's own row ("Quick Tap · Skill key") is its gold heading now, so what the tab lists is the key's bars, a heading per game and the
     key entire — and "N of M" is the bars (M is the key's own count, 30 today, read off the rows), the number the key and the next-unlock card say */
  const rows=allAch().filter(a=>chestFor(a)===tab), bars=rows.filter(a=>a.combo);
  const top=closest(tier), order=Object.keys(GAMES).flatMap(gid=>bars.filter(a=>a.g===gid&&!g[a.id]));
  const nx=((top&&order.find(a=>a.combo===top.c.key))||order[0]||{}).id;
  const ctx={g,all,fsGame:sel.game,fresh,nx};
  let html='';
  for(const gid in GAMES){ const items=bars.filter(a=>a.g===gid); if(!items.length) continue;
    const own=rows.find(a=>a.g===gid&&!a.combo);
    html+=gameGroup(tab,gid,items.map(a=>!!g[a.id]),todoFirst(items,a=>!!g[a.id]).map(a=>achRow(a,tab,ctx)).join(''),own&&own.id); }
  const whole=rows.filter(a=>a.g==='all');
  if(whole.length) html+=plainGroup('all',PROGRESS_SCREEN.whole,todoFirst(whole,a=>!!g[a.id]).map(a=>achRow(a,tab,ctx)).join(''),false);
  list.innerHTML=html;
  const k=KEYS.find(x=>x.id===tier)||{};
  tabCount('chest',bars.filter(a=>g[a.id]).length,bars.length,k.name||'');
  markSeen(fresh);
}

/* ---------- the Customise unlocks tab (build 39, v23 L.4b–d) ----------
   Every achievement that pays out a cosmetic, and nothing else — grouped by the Customise row it pays into, in that
   screen's own order, so the list reads like the screen it leads to. An earned row goes to Customise with that item
   picked out; an unearned one still goes to play it. Build 69 (68.42): each group is its label and count over its own thin bar, to-do first. */
const CUL_ORDER=['sq','lead','cut','bg','snd','scale','rate','wheel'];
function renderCul(){
  const g=got(), all=Scores.runs(); const fresh=[]; const ctx={g,all,fsGame:sel.game,fresh};
  // v24 (D.2, build 44): key roster rows that pay out a cosmetic are here too — the tier's rows only once its chest has revealed it (A.1)
  const list=allAch().filter(a=>tabFor(a)==='cul'&&groupShown(a.tier));
  const at=s=>{ const i=CUL_ORDER.indexOf(s); return i<0?99:i; };
  const sets=[...new Set(list.map(a=>a.unlocks[0]))].sort((x,y)=>at(x)-at(y));
  $('#cul-list').innerHTML=sets.map(set=>{ const items=list.filter(a=>a.unlocks[0]===set), done=items.filter(a=>g[a.id]).length;
    return `<div class="g" data-set="${set}"><h4 class="cgh"><span>${esc(PROGRESS_SCREEN.culGroup[set]||ITEM_WORD[set]||set)}</span><b>${T(PROGRESS_SCREEN.of,{done,total:items.length})}</b></h4>${barHtml(done,items.length)}<div class="gb">${todoFirst(items,a=>!!g[a.id]).map(a=>achRow(a,'cul',ctx)).join('')}</div></div>`; }).join('');
  // item 4: the tab line is the sum of the per-section counts this tab already prints
  tabCount('cul',list.filter(a=>g[a.id]).length,list.length,PROGRESS_SCREEN.cul);
  markSeen(fresh);
}

/* ---------- the Achievements tab — 58.3: THE EXTRAS THAT FIT NOWHERE ELSE ----------
   Build 69 (68.40): grouped like every other tab — "General" first for the rows that belong to no game (`g:'all'`), then a heading per game — and
   no filter row; to-do above done in each group. The rows keep their order within a group (TIERS is still the order), one count line. */
function renderAch(){
  const g=got(), all=Scores.runs(); const fresh=[];
  const list=allAch().filter(a=>tabFor(a)==='ach');
  const ctx={g,all,fsGame:sel.game,fresh};
  const rows=Object.keys(TIERS).filter(groupShown).flatMap(t=>list.filter(a=>a.tier===t));
  const grp=(gid,items)=>items.length?plainGroup(gid,gid==='all'?PROGRESS_SCREEN.general:GAMES[gid].name,todoFirst(items,a=>!!g[a.id]).map(a=>achRow(a,'ach',ctx)).join(''),gid!=='all'):'';
  $('#achlist').innerHTML=grp('all',rows.filter(a=>a.g==='all'))+Object.keys(GAMES).map(gid=>grp(gid,rows.filter(a=>a.g===gid))).join('');
  // build 62 (61.13): the count is the TRUE total of what is listed — every row counts
  tabCount('ach',rows.filter(a=>g[a.id]).length,rows.length,PROGRESS_SCREEN.ach);
  markSeen(fresh);
}
// a locked row: straight to the sheet it is earned on, at the mode and length it names; a locked mode or length asks the box first
function jumpTo(a){ const g=a.g==='all'?sel.game:a.g; const d=a.at?.d||GAMES[g].modes[0]; if(!isOpen(g,d)) return emit('lock:ask',{g,d}); if(a.at?.s!==undefined&&!lenOpen(g,d,a.at.s)) return emit('lock:ask',{g,d,s:a.at.s});
  // build 62 (61.11): it asks first — "Play …?", the row's target and the player's best, one PLAY
  const c=a.combo&&COMBOS.find(x=>x.key===a.combo);
  askPlay({ g, d, s:a.at?.s, target:c?barOf(c,a.kt):null, go:()=>{ setPendingAim(a.how); show('s-pick',{g,d:a.at?.d,s:a.at?.s}); } }); }

/* ---------- v28 (item 4, build 53): ONE COUNT LINE PER TAB, WHERE THE GREY HELPER TEXT WAS ----------
   Three lines went: "tap a locked row to see what it takes" and the paragraph under it on Game unlocks, "tap an earned one to use it" /
   "open the Games chest to use them" on Customise unlocks, and "tap one to go play it" on Achievements. None of them said anything a row
   does not say by being a row. In their place the tab says how much of ITSELF is done. Build 69 (68.40): the line has what it counts on the left,
   the count on the right, and a thin gold bar under it — how far through, without reading. */
const barHtml=(done,total)=>`<div class="cbar"><i style="width:${total?Math.round(done/total*100):0}%"></i></div>`;
function countLine(tab,label,text,done,total){ const el=$('#'+tab+'-hint'); if(el) el.textContent=text; const lb=$('#'+tab+'-lab'); if(lb) lb.textContent=label;
  const b=$('#'+tab+'-bar'); if(b) b.firstElementChild.style.width=(total?Math.round(done/total*100):0)+'%'; }
const tabCount=(tab,done,total,label)=>countLine(tab,label||'',T(PROGRESS_SCREEN.count,{done,total}),done,total);

/* ---------- the tabs ----------
   build 69 (68.40): ONE ROW THAT SLIDES SIDEWAYS — seven labels wrapped onto three lines at 390px. The picked tab is brought into view when it is
   picked and when the screen opens on it. Only the tab that is up is rendered: a chest's list is the longest markup in the app and the Games chest's
   walks every mode of every game. `opts.ach` is a row to scroll to and flash — on whichever tab tabFor says it lives, its game opened if it was shut */
function renderTabs(tab){
  const row=$('#prog-tabs');
  row.innerHTML=TABS.map(t=>`<button data-act="ptab" class="chip${t===tab?' sel':''}" data-tab="${t}">${tabLabel(t)}</button>`).join('');
  const into=()=>{ const s=row.querySelector('.sel'); if(s&&row.clientWidth) row.scrollLeft=Math.max(0,s.offsetLeft-(row.clientWidth-s.offsetWidth)/2); };
  into(); requestAnimationFrame(into);
}
/* build 68 (67.38): THE EXCUSES TAB — the total, then each excuse with its hint and how many times it has been made. Nothing is secret: every
   name shows from the start, and the hint alludes. Build 69 (68.40): the count line and its bar like every tab, to-do above made */
function renderExc(){ const c=prefs.excuses||{}, made=EXCUSES.filter(e=>c[e.id]).length;
  countLine('exc',PROGRESS_SCREEN.exc,T(EXCUSE_TXT.total,{n:excuseCount()}),made,EXCUSES.length);
  $('#exc-list').innerHTML=todoFirst(EXCUSES,e=>!!c[e.id]).map(e=>{ const k=c[e.id]||0; return `<div class="exrow${k?' made':''}" id="exc-${e.id}"><b>#${e.id}</b><span>${esc(e.name)}</span><em>×${k}</em><small>${esc(e.hint)}</small></div>`; }).join(''); }
function setTab(t,opts){ const tab=tabOf(t); prefs.progTab=tab; save(); opts=opts||{};
  renderTabs(tab);
  $('#p-chest').hidden=!chestOfTab(tab); $('#p-cul').hidden=tab!=='cul'; $('#p-ach').hidden=tab!=='ach'; $('#p-exc').hidden=tab!=='exc';
  if(chestOfTab(tab)) renderChest(tab); else if(tab==='cul') renderCul(); else if(tab==='exc') renderExc(); else renderAch();
  if(opts.ach){ const r=$(`#${tab}-${opts.ach}`); if(r){ const gb=r.closest('.gb'), gr=gb&&gb.closest('.g'); if(gb&&gb.hidden){ gb.hidden=false; gr.classList.remove('fold'); }
    r.scrollIntoView({block:'center'}); r.classList.add('flash'); } } }

register('s-prog',{ onShow(o){ const a=o.ach?findAch(o.ach):null; const t=a?tabFor(a):o.tab;
  setTab(t,o); } });
define({
  ptab(b){ setTab(b.dataset.tab); return 'pick'; },
  // build 62 (61.8): the one line left where the requirements were — to the Keys screen, on the key that opens this chest
  'chest-how'(b){ show('s-key',{tier:+b.dataset.kt}); return 'click'; },
  /* build 69 (68.40): a game's heading on a chest tab opens or shuts its rows — a finished game starts shut, an unfinished one open — and the
     screen keeps what the player chose while it is up */
  pfold(b){ const gr=b.closest('.g'), body=gr&&gr.querySelector('.gb'); if(!body) return 'pick'; const open=body.hidden;
    body.hidden=!open; gr.classList.toggle('fold',!open); b.setAttribute('aria-expanded',String(open)); FOLD[tabOf(prefs.progTab)+':'+b.dataset.g]=open; return 'pick'; },
  // a locked row asks the lock box, exactly as the pick sheet does (v15 2.1); an open one goes where it is played
  // v24 (A.1, build 43): the key row goes where the Keys menu row goes, and waits for the Games chest the same way
  unl(b){ if(b.dataset.key) { if(!chestOpen('games')){ toast(TOAST.keysLocked,'','',true); return 'pick'; } show('s-key'); return 'click'; }
    const {g,d,s}=b.dataset; const len=s===undefined?undefined:+s;
    if(b.classList.contains('lock')){ emit('lock:ask',{g,d,s:len}); return 'pick'; }
    askPlay({ g, d, s:len, target:null, go:()=>show('s-pick',{g,d,s:len}) }); return 'click'; },
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
    if(a.g!=='all'||a.id==='fullset') jumpTo(a); return 'click'; },
});
