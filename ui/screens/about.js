/* No Excuses — the About screen (build 18, refactor stage 4; was devState / renderTier / freshGame in menu.js). The support
   line, the tier box, Send feedback and the build hint — nothing else since build 21: v14 (8.10) moved Testing out to its
   own menu item directly below About, in ui/screens/testing.js, so it can be reviewed on its own. */
import { BUILD } from "../../config/build.js";
import { ABOUT, GRID, MSG, TOAST } from "../../config/copy.js";
import { KEYS } from "../../config/keys.js";
import { MESSAGES } from "../../config/messages.js";
import { MODE_NAME } from "../../config/games.js";
import { $, $$, T, esc } from "../../core.js";
import { prefs, save } from "../../core/store.js";
import { msgOpen } from "../../progress/key.js";
import { GAMES, lenName } from "../../games/registry.js";
import { Scores } from "../../progress.js";
import { define } from "../actions.js";
import { register } from "../router.js";
import { toast } from "../toast.js";

// what supporting gets (v13, 13.1): no comparison table — a thank-you line and three lines of what is included. Pro lengths are gone (0.3)
function renderTier(){ $('#tierbox').innerHTML=ABOUT.tier.map(t=>`<div><span>${t}</span></div>`).join('');
  $('#support-title').textContent=prefs.supporter?ABOUT.supTitleOn:ABOUT.supTitleOff; $('#support-text').textContent=prefs.supporter?ABOUT.supTextOn:ABOUT.supTextOff; }

/* build 33 — SEND FEEDBACK (the beta paragraph, item 1). GitHub Pages is already the beta channel; what was missing was
   the way back from a tester. It is a mailto, built when the screen opens: no form, no endpoint, no third party, and
   nothing sent without the tester's own mail app and their own send button. The three things a report is useless
   without — which build, which device, which run — are filled in, because nobody thinks to include them.
   It is an <a>, not a button with a handler: `data-act="none"` gives it the click sound and lets the link do its own
   work, so nothing here has to know what a mail client is. */
const lastRun=()=>{ const rs=Scores.runs(); if(!rs||!rs.length) return ABOUT.fbNoRun;
  const r=rs.reduce((a,b)=>b.t>a.t?b:a);
  const g=GAMES[r.g]; if(!g) return ABOUT.fbNoRun;
  return `${g.name}${MODE_NAME[r.d]?' · '+MODE_NAME[r.d]:''} · ${lenName(r.g,r.s,r.d)} · ${r.hits}${r.practice?' (practice)':''} · ${new Date(r.t).toISOString().slice(0,16).replace('T',' ')}`; };
const device=()=>`${navigator.userAgent} · ${innerWidth}x${innerHeight} @${devicePixelRatio||1}x`;
function renderFeedback(){ const a=$('#feedback'); if(!a) return; const build='v0.'+BUILD;
  const q=s=>encodeURIComponent(s);
  a.textContent=ABOUT.fb;
  a.href=`mailto:${ABOUT.fbTo}?subject=${q(T(ABOUT.fbSubject,{build}))}`
    +`&body=${q(T(ABOUT.fbBody,{build,when:new Date().toISOString().slice(0,16).replace('T',' '),device:device(),run:lastRun()}))}`; }


/* ---------- v25 (item 23, build 46): THE MESSAGES ----------
   Eight slots in unlock order (config/messages.js), and the list IS the screen — a clip arrives by filling in a file name and nothing here
   changes. ONE test decides a row's state, and it is the same test the congratulations card asks (ui/screens/key.js msgFor):
     no `by`          open from the first load (the intro)
     { chest:'…' }    that chest opened        — chestOpen(), the one read every surface uses
     { key:'…' }      that key finished        — keyFinished(), which is what opens its background in Customise too (C.6)
   (the test itself is msgOpen() in progress/key.js — one test, because a screen may not import a screen, A4.)
   A LOCKED row says what opens it and nothing about what is in it (v17 A.1's shape) and its tap says so where it stands. An OPEN row with a
   clip is TAP-TO-PLAY: iPhones will not start a video with sound unaided, so nothing here autoplays, and the player is built in place with
   `playsinline` so it never jumps to full screen. CAPTIONS ARE ON EVERY CLIP — many people play on silent and Apple checks for it — so the
   track is written the moment a `cc` exists and a clip without one is a clip that is not finished. An OPEN row with no clip yet shows the
   "video coming soon" frame, which is what all eight show today: Aiden records them and they drop in (his decision, 2026-09-16).
   `prefs.msgSeen` marks a clip as watched, which is what takes the dot off the About row on the menu.
   v26 (item 4, build 49): AN UNWATCHED CLIP PULSES AND GLOWS UNTIL IT IS PLAYED — `unwatched` on a row that is unlocked AND has a real clip AND is not in
   `prefs.msgSeen`, in the same green every other "not seen yet" wears. Tapping play is watched, and the row goes back to exactly how it looked. A
   placeholder ("video coming soon") and a locked slot never pulse — there is nothing to watch. The About menu row stays green while any such clip is
   waiting (ui/screens/menu.js, msgDot), which is the one signal for it; there is no separate dot. */
// the player, built in place. One at a time: opening a second closes the first, so nothing plays behind anything
function playMsg(id){ const m=MESSAGES.find(x=>x.id===id); if(!m||!msgOpen(m)||!m.file) return false;
  $$('#msglist .msgrow').forEach(r=>{ if(r.dataset.msg!==id) r.classList.remove('playing'); const v=r.querySelector('video'); if(v&&r.dataset.msg!==id){ v.pause(); v.remove(); } });
  const row=$(`#msglist .msgrow[data-msg="${id}"]`); if(!row) return false;
  if(!row.querySelector('video')){ const frame=row.querySelector('.msgframe');
    frame.innerHTML=`<video playsinline preload="metadata" controls${m.cc?' crossorigin="anonymous"':''}><source src="${esc(m.file)}" type="video/mp4">`
      +(m.cc?`<track kind="captions" srclang="en" label="English" src="${esc(m.cc)}" default>`:'')+`</video>`; }
  row.classList.add('playing');
  const v=row.querySelector('video'); if(v){ const p=v.play(); if(p&&p.catch) p.catch(()=>{}); }
  // watched, without rebuilding the list under the player that is now running: the row says so and the dot on the menu comes off
  if(!prefs.msgSeen||!prefs.msgSeen[id]){ prefs.msgSeen=Object.assign({},prefs.msgSeen,{[id]:1}); save();
    row.classList.add('seen'); row.classList.remove('unwatched'); const t=row.querySelector('.msgtxt small'); if(t) t.textContent=MSG.watched; }
  return true; }
/* v27 (item 4, build 51): WHAT A LOCKED SLOT SAYS, composed rather than written out. Each row used to carry its own `need` string, which meant
   every chest and key name was spelled a second time here — and three of them were still the 2026-09-16 names ("a whole Lantern key"). The line
   is built from the slot's own `by`: a chest through GRID.chestNeed × GRID.chest (config/copy.js, the one source, item 4), a key through
   MSG.keyNeed × that tier's `name` in config/keys.js. A slot with no lock has no line. */
const needOf=m=>{ if(!m||!m.by) return '';
  if(m.by.chest) return T(GRID.chestNeed,{chest:GRID.chest[m.by.chest]||m.by.chest});
  const k=KEYS.find(x=>x.id===m.by.key); return k?T(MSG.keyNeed,{key:k.name}):''; };
function renderMessages(){ const box=$('#msglist'); if(!box) return; const seen=prefs.msgSeen||{};
  const open=MESSAGES.filter(msgOpen).length;
  $('#msg-lede').textContent=MSG.lede+' · '+T(MSG.count,{done:open,total:MESSAGES.length});
  box.innerHTML=MESSAGES.map(m=>{ const o=msgOpen(m), has=o&&!!m.file, w=!!seen[m.id];
    const state=!o?T(MSG.locked,{need:needOf(m)}):has?(w?MSG.watched:MSG.play):MSG.soon;
    return `<button class="msgrow${o?'':' locked'}${has?' has':''}${w?' seen':''}${has&&!w?' unwatched':''}" data-act="msg" data-msg="${esc(m.id)}">`
      +`<span class="msgframe">${has?'':`<i>${esc(o?MSG.soon:'')}</i>`}</span>`
      +`<span class="msgtxt"><b class="${o?'':'x'}">${esc(m.title)}</b><small class="${o?'':'need'}">${esc(state)}</small></span></button>`; }).join(''); }

/* `msg` is the congratulations card's "A message from Aiden" button arriving here (item 22 × item 23): the screen opens with that row
   scrolled to and, if it has a clip, playing. A row that is still locked is never opened this way — the card only offers one that is open. */
/* v26 (item 5, build 49): a chest's video reward — on the map, or the card's button — arrives here too, and it arrives while every slot is still a
   placeholder, so a row with no clip is scrolled to and picked out for a moment rather than played */
register('s-about',{ onShow({msg}={}){ renderTier(); renderFeedback(); renderMessages();
  if(msg) setTimeout(()=>{ const row=$(`#msglist .msgrow[data-msg="${msg}"]`); if(!row) return; row.scrollIntoView({block:'center'});
    if(!playMsg(msg)){ row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash'); setTimeout(()=>row.classList.remove('flash'),1800); } },120); } });
define({ support(){ toast(prefs.supporter?TOAST.supAlready:TOAST.supLater); return 'click'; },
  // item 23: a locked row says what opens it where it stands; an open one with no clip yet says so; an open one with a clip plays in place
  msg(b){ const id=b.dataset.msg, m=MESSAGES.find(x=>x.id===id); if(!m) return 'click';
    if(!msgOpen(m)){ toast(T(MSG.locked,{need:needOf(m)})); return 'pick'; }
    if(!m.file){ toast(MSG.noFile); return 'pick'; }
    playMsg(id); return 'click'; } });
