/* No Excuses — the achievements screen (build 18, refactor stage 4; was renderAch / gotoAch / jumpTo in menu.js). One filter
   row, three tiers plus the author rows. A locked row jumps to the sheet it is earned on (or asks the lock box); an earned
   one opens Customise at what it unlocked. show('s-ach', {ach:id}) scrolls to and flashes that row (toast taps, lock lines). */
import { ACH_SCREEN, TIERS } from "../../config/copy.js";
import { MODE_NAME } from "../../config/games.js";
import { $, T } from "../../core.js";
import { emit } from "../../core/events.js";
import { sel } from "../../core/state.js";
import { GAMES, lenName } from "../../games/registry.js";
import { Scores, achAll, achById, got, isOpen, lenOpen, markSeen, newMark, setPendingAim, unlockHtml } from "../../progress.js";
import { define } from "../actions.js";
import { chips } from "../chips.js";
import { register, show } from "../router.js";

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
      const gname=a.g==='all'?'':`<i>${GAMES[a.g].name}</i>`;
      const bar=p!==null?`<div class="pbar ${secret?'s':''}"><i style="width:${Math.round(p*100)}%"></i></div>`:'';
      const jump=a.g!=='all'||a.id==='fullset';
      const where=jump&&!secret?`<small class="go">→ ${GAMES[a.g==='all'?fsGame:a.g].name}${a.at?.d?' · '+MODE_NAME[a.at.d]:''}${a.at?.s!==undefined?' · '+lenName(a.g,a.at.s,a.at?.d||GAMES[a.g].modes[0]):''}</small>`:'';
      const nw=isDone?newMark('ach:'+a.id,fresh):''; const dl=isDone?` style="animation-delay:${Math.min(k++,14)*70}ms"`:'';
      return `<button data-act="ach" class="a ${isDone?'done':'lock'}${nw} ${jump?'jump':''}" data-ach="${a.id}" id="ach-${a.id}"${dl}><span>${isDone?'✓ ':''}${secret?ACH_SCREEN.hidden:a.name}${gname}</span><em class="${a.unlocks&&!isDone?'u':''}">${isDone?ACH_SCREEN.done+(a.unlocks?' · '+unlockHtml(a):''):a.unlocks?unlockHtml(a):secret?ACH_SCREEN.secret:''}</em><small>${secret?(p!==null?T(ACH_SCREEN.progress,{p:Math.round(p*100)}):ACH_SCREEN.stretch):a.how+(a.id==='fullset'?T(ACH_SCREEN.inGame,{game:GAMES[fsGame].name}):'')}</small>${where}${bar}</button>`; }).join(''); }).join('');
  markSeen(fresh);
}
// a locked row: straight to the sheet it is earned on, at the mode and length it names; a locked mode or length asks the box first
function jumpTo(a){ const g=a.g==='all'?(F.g==='all'?sel.game:F.g):a.g; const d=a.at?.d||GAMES[g].modes[0]; if(!isOpen(g,d)) return emit('lock:ask',{g,d}); if(a.at?.s!==undefined&&!lenOpen(g,d,a.at.s)) return emit('lock:ask',{g,d,s:a.at.s}); setPendingAim(a.how); show('s-pick',{g,d:a.at?.d,s:a.at?.s}); }

register('s-ach',{ onShow({ach}){ const a=ach?achById(ach):null; if(a) F.g=a.g==='all'?'all':a.g; renderAch(); if(a){ const row=$('#ach-'+a.id); if(row){ row.scrollIntoView({block:'center'}); row.classList.add('flash'); } } } });
define({
  'chip-ach'(b){ F.g=b.dataset.v; renderAch(); return 'pick'; },
  // an earned achievement (v11) opens Customise at what it unlocked; a locked one still offers the run
  ach(b){ const a=achById(b.dataset.ach); if(!a) return 'click'; if(got()[a.id]){ if(a.g!=='all') sel.game=a.g; show('s-custom',{unlocks:a.unlocks}); return 'click'; }
    if((a.g!=='all'||a.id==='fullset')&&a.tier!=='secret') jumpTo(a); return 'click'; },
});
