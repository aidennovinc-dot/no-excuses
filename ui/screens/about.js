/* No Excuses — the About screen (build 18, refactor stage 4; was devState / renderTier / freshGame in menu.js). The support
   line, the tier box, Send feedback and the build hint — nothing else since build 21: v14 (8.10) moved Testing out to its
   own menu item directly below About, in ui/screens/testing.js, so it can be reviewed on its own. */
import { BUILD } from "../../config/build.js";
import { ABOUT, GAUNTLET, GRID, MSG, TOAST } from "../../config/copy.js";
import { MESSAGES } from "../../config/messages.js";
import { MODE_NAME } from "../../config/games.js";
import { $, T, esc } from "../../core.js";
import { prefs } from "../../core/store.js";
import { msgOpen, msgShown, msgTitle } from "../../progress/key.js";
import { GAMES, lenName } from "../../games/registry.js";
import { Scores } from "../../progress.js";
import { define } from "../actions.js";
import { register } from "../router.js";
import { toast } from "../toast.js";
import { msgCol } from "../chest.js";
import { onVideoSeen, playVideo } from "../video.js";

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
/* v27 (items 8 / 9 / 10, build 52): THE PLAYER IS NOT IN THE ROW ANY MORE. Build 46 built a <video> inside the row that was tapped, which
   made the picture as wide as the list and left the native control bar over it — both of which item 9 rules out. A tap now opens the ONE
   SHARED PLAYER (ui/video.js): a 16:9 picture in a drawn frame over the dimmed game, title above, captions below, tap outside to close, with
   the power-on and power-off item 10 asks for. This screen's job is the LIST; the player is the player's.
   The row still repaints itself the moment its clip is watched — `onVideoSeen` — rather than rebuilding the list, because the list must not
   move under a player that is already up. */
function playMsg(id){ const m=MESSAGES.find(x=>x.id===id); if(!m||!msgOpen(m)||!m.file) return false; return playVideo(m); }
onVideoSeen(id=>{ const row=$(`#msglist .msgrow[data-msg="${id}"]`); if(!row) return;
  row.classList.add('seen'); row.classList.remove('unwatched'); const t=row.querySelector('.msgtxt small'); if(t) t.textContent=MSG.watched; });

/* v27 (items 4 / 8, build 51-52): WHAT A LOCKED SLOT SAYS, composed rather than written out. Each row used to carry its own `need` string, which
   meant every chest and key name was spelled a second time here. The line is built from the slot's own `by`, one branch per kind of lock, and
   every name comes from the one place that owns it — GRID.chest for a chest, GAUNTLET.name for a Gauntlet, the game's own name and length for a
   run. A slot with no lock has no line. (`by.key` is gone with the three key rows item 8 deleted.) */
const needOf=m=>{ const b=(m&&m.by)||null; if(!b) return '';
  if(b.chest) return T(MSG.locked,{need:T(GRID.chestNeed,{chest:GRID.chest[b.chest]||b.chest})});
  if(b.run){ const g=GAMES[b.run.g]; return g?T(MSG.lockedRun,{game:g.name,len:lenName(b.run.g,b.run.s,b.run.d)}):''; }
  if(b.gauntlet) return T(MSG.lockedGaunt,{name:GAUNTLET.name[b.gauntlet]||b.gauntlet});
  if(b.support) return MSG.lockedPaid;
  return ''; };
/* R1 (item 8): the list draws only the slots that are SHOWN — a Gauntlet's row is not there at all until its Gauntlet has come out of its chest,
   no row and no gap — but the COUNTER COUNTS ALL EIGHT, both ends, so it always reads "N of 8" and a player knows two secrets exist without
   knowing what they are. msgShown() in progress/key.js is that test; MESSAGES.length is the total, so the two cannot drift apart. */
function renderMessages(){ const box=$('#msglist'); if(!box) return; const seen=prefs.msgSeen||{};
  const open=MESSAGES.filter(msgOpen).length;
  $('#msg-lede').textContent=MSG.lede+' · '+T(MSG.count,{done:open,total:MESSAGES.length});
  box.innerHTML=MESSAGES.filter(msgShown).map(m=>{ const o=msgOpen(m), has=o&&!!m.file, w=!!seen[m.id];
    const state=!o?needOf(m):has?(w?MSG.watched:MSG.play):MSG.soon;
    return `<button class="msgrow${o?'':' locked'}${has?' has':''}${w?' seen':''}${has&&!w?' unwatched':''}" data-act="msg" data-msg="${esc(m.id)}">`
      // v28 (item 12, build 53): the row's picture carries the play mark and the chest's glow — the same powered-off player the congratulations card shows
      +`<span class="msgframe" style="${msgCol(m)?`--vg:${msgCol(m)}`:''}">${has?'<i class="mpplay"></i>':`<i>${esc(o?MSG.soon:'')}</i>`}</span>`
      +`<span class="msgtxt"><b class="${o?'':'x'}">${esc(msgTitle(m))}</b><small class="${o?'':'need'}">${esc(state)}</small></span></button>`; }).join(''); }

/* `msg` is the congratulations card's "A message from Aiden" button arriving here (item 22 × item 23): the screen opens with that row
   scrolled to and, if it has a clip, playing. A row that is still locked is never opened this way — the card only offers one that is open. */
/* v26 (item 5, build 49): a chest's video reward — on the map, or the card's button — arrives here too, and it arrives while every slot is still a
   placeholder, so a row with no clip is scrolled to and picked out for a moment rather than played */
register('s-about',{ onShow({msg}={}){ renderTier(); renderFeedback(); renderMessages();
  /* v29 (item 10, build 55): the clip starts in the TAP'S OWN TASK, not 120ms later. A play() off a timer is outside WebKit's transient
     activation on older iOS and in some WKWebView configurations, and it was refused there and swallowed. The scroll and the flash keep
     their 120ms - they are presentation and the list has to be laid out first. */
  if(msg){ const played=playMsg(msg);
    setTimeout(()=>{ const row=$(`#msglist .msgrow[data-msg="${msg}"]`); if(!row) return; row.scrollIntoView({block:'center'});
      if(!played){ row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash'); setTimeout(()=>row.classList.remove('flash'),1800); } },120); } } });
define({ support(){ toast(prefs.supporter?TOAST.supAlready:TOAST.supLater); return 'click'; },
  // item 23: a locked row says what opens it where it stands; an open one with no clip yet says so; an open one with a clip plays in place
  msg(b){ const id=b.dataset.msg, m=MESSAGES.find(x=>x.id===id); if(!m) return 'click';
    if(!msgOpen(m)){ toast(needOf(m)); return 'pick'; }
    if(!m.file){ toast(MSG.noFile); return 'pick'; }
    playMsg(id); return 'click'; } });
