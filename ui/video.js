/* No Excuses — THE SHARED VIDEO PLAYER (v27 items 9 / 10, build 52).

   ONE player for all eight of Aiden's messages, built once and reused. It is a module under ui/ and not a screen — like ui/reveal.js and
   ui/chest.js — so any screen may open it (A4), and today the About list does. It sits over whatever screen is up: the game's own background
   stays visible around the picture and is DIMMED, which is item 9's first line.

   ITEM 9 — WHAT IT LOOKS LIKE
     · the clip is 16:9 and the phone stays UPRIGHT. Nothing rotates, nothing goes full screen, and `playsinline` keeps iOS out of its own player
     · the picture is inset `PLAYER.inset`% from every screen edge (config/messages.js) — NEVER EDGE TO EDGE
     · the frame is a thin white rounded outline at the same 1px weight as the map's tiles and the chests, and it GLOWS while the clip is playing
       in the colour of the chest that unlocked the slot (`msgCol()` in ui/chest.js) — dim when paused or ended
     · title above in the game's spaced capitals; captions below; "tap outside to close" in dim grey at the foot of the screen
     · NOTHING IS DRAWN OVER THE PICTURE. No knobs, no antenna, no scanlines — and no native control bar either, which is why there is no
       `controls` attribute: a tap on the PICTURE pauses and plays, a tap anywhere else closes. Two targets, both `data-act`, so ui/actions.js
       routes them like every other control in the app.
     · THE CAPTIONS ARE DRAWN BY THIS FILE, not by the browser. A <track> renders its cues ON TOP of the picture, which item 9 forbids, so the
       track is loaded with `mode:'hidden'` — it still fires `cuechange`, and the cue's text is written into the strip under the frame. The
       track element is still in the markup and still `default`, so nothing about how a clip ships changes.

   ITEM 10 — POWER ON AND POWER OFF, IN THE PLAYER
     Named steps with their own times, off `PLAYER.on` / `PLAYER.off`, written onto the host as `--v-<step>-at` / `--v-<step>-ms` so the
     stylesheet holds no duration of its own and a re-tune is a number edit in config/. This file draws a step by its name and nothing else —
     the CEREMONY and KEY_EARN shape, on purpose. Every clip gets both without being touched, which is the whole of item 10.
     The soft thunk is `Snd.videoFx('on' | 'off')` (config/audio.js VIDEO_FX), fired on the beat the picture opens and the beat it goes to a dot.

   Presentation only (L10): watching a clip marks it watched and nothing else. */
import { MSG } from "../config/copy.js";
import { PLAYER } from "../config/messages.js";
import { Snd } from "../audio.js";
import { $, esc } from "../core.js";
import { prefs, save } from "../core/store.js";
import { define } from "./actions.js";
import { msgCol } from "./chest.js";
import { msgTitle } from "../progress/key.js";

let host = null, vid = null, closing = 0, ids = [], onSeen = null;
const at = (t, fn) => { const h = setTimeout(fn, Math.max(0, t)); ids.push(h); return h; };
const clearAt = () => { ids.forEach(clearTimeout); ids = []; };

/* the one element, built the first time a clip is opened and kept. `.vback` is the dimmed game behind the picture. `.vline` is the white line
   item 10's power-on snaps across the frame's centre; the picture itself is clipped by `.vpic`, so the opening happens INSIDE the frame and
   nothing spills out of it. */
function build() { if (host) return host;
  /* the CLOSE action is on the host, not on the backdrop: ui/actions.js routes a tap to its nearest data-act ancestor and, failing one, treats it
     as a tap on bare ground and goes BACK. Everything inside the player that is not the picture — the title, the caption strip, the gap between
     them — has to be "outside" or a tap there would navigate out from under the player. The frame carries its own act and wins inside it. */
  host = document.createElement('div'); host.id = 'vplay'; host.hidden = true; host.dataset.act = 'vclose';
  host.innerHTML = '<div class="vback"></div>'
    + '<div class="vwrap"><div class="vtitle"></div>'
    + '<div class="vframe" data-act="vtap"><div class="vpic"></div><i class="vline"></i></div>'
    + `<div class="vcc"></div></div><div class="vfoot">${esc(MSG.close)}</div>`;
  document.body.appendChild(host);
  host.style.setProperty('--vinset', PLAYER.inset + '%');
  for (const k of ['on', 'off']) for (const s of PLAYER[k].steps) { host.style.setProperty(`--v-${s.name}-at`, s.at + 'ms'); host.style.setProperty(`--v-${s.name}-ms`, s.ms + 'ms'); }
  host.style.setProperty('--von-ms', PLAYER.on.ms + 'ms'); host.style.setProperty('--voff-ms', PLAYER.off.ms + 'ms');
  return host; }

/* the captions strip. The track is HIDDEN, never showing: a showing track paints its cues over the picture and item 9 says nothing overlays it.
   `cuechange` still fires on a hidden track, so the text lands in the strip under the frame instead — and a clip with no `cc` simply has none. */
function captions(v) { const box = host.querySelector('.vcc'); box.textContent = '';
  const wire = () => { const t = v.textTracks && v.textTracks[0]; if (!t) return; t.mode = 'hidden';
    t.oncuechange = () => { const c = t.activeCues && t.activeCues[0]; box.textContent = c ? String(c.text).replace(/<[^>]*>/g, '') : ''; }; };
  wire(); v.addEventListener('loadedmetadata', wire, { once: true }); }

const glow = on => { if (host) host.classList.toggle('vlit', !!on); };

/* OPEN. The picture is built, the power-on runs its three steps, and the clip starts as the frame opens — so the first frame the player sees is
   the picture arriving, not a black box waiting. Marks the slot watched, which is what takes the green off the About row (item 23 / v26 item 4). */
function playVideo(m) { if (!m || !m.file) return false;
  build(); clearAt(); closing = 0;
  host.hidden = false; host.classList.remove('voff', 'vlit'); host.dataset.msg = m.id;
  host.style.setProperty('--vg', msgCol(m) || '#FFFFFF');
  host.querySelector('.vtitle').textContent = msgTitle(m);
  host.querySelector('.vcc').textContent = '';
  const pic = host.querySelector('.vpic');
  pic.innerHTML = `<video playsinline preload="metadata"${m.cc ? ' crossorigin="anonymous"' : ''}><source src="${esc(m.file)}" type="video/mp4">`
    + (m.cc ? `<track kind="captions" srclang="en" label="English" src="${esc(m.cc)}" default>` : '') + '</video>';
  vid = pic.querySelector('video'); captions(vid);
  vid.addEventListener('play', () => glow(true));
  vid.addEventListener('pause', () => glow(false));
  vid.addEventListener('ended', () => glow(false));
  /* v29 (item 10, build 55): A CLIP THAT WILL NOT PLAY SAYS SO, AND play() IS CALLED IN THE TAP'S OWN TASK.
     Nothing listened for `error` and the play() rejection was swallowed by a bare catch, so a missing file, a 404 or an iOS
     NotAllowedError all showed the same thing: a silent black rectangle inside a glowing frame that never lit, with "tap outside to
     close" as the only way out. And play() was fired 320ms after the tap, from inside the power-on's `open` step - WebKit grants
     un-muted playback through a transient-activation window that current iOS is generous with and iOS <= 16.3 and some WKWebView
     configurations are not. It is called synchronously now; the frame is still clipped shut for those 320ms, so the picture still
     OPENS, and the power-on sound still lands on its own beat. */
  const failed = () => { if (!host || host.dataset.msg !== m.id) return; glow(false); host.classList.add('vfail');
    const box = host.querySelector('.vcc'); if (box) box.textContent = MSG.unavailable; };
  vid.addEventListener('error', failed);
  const src = pic.querySelector('source'); if (src) src.addEventListener('error', failed);
  host.classList.remove('vfail');
  // the power-on, by name: `outline` and `line` are the stylesheet's; `open` is the beat the picture arrives and the beat the thunk lands on
  void host.offsetWidth; host.classList.add('von');
  try { vid.load(); const pl = vid.play(); if (pl && pl.catch) pl.catch(failed); } catch (e) { failed(); }
  for (const s of PLAYER.on.steps) if (s.name === 'open') at(s.at, () => Snd.videoFx('on'));
  at(PLAYER.on.ms, () => host.classList.remove('von'));
  if (!prefs.msgSeen || !prefs.msgSeen[m.id]) { prefs.msgSeen = Object.assign({}, prefs.msgSeen, { [m.id]: 1 }); save(); }
  if (onSeen) onSeen(m.id);
  return true; }

/* CLOSE. The reverse, and the clip stops on the first beat of it so nothing is heard playing behind a picture that is collapsing. The element is
   emptied at the end rather than removed: one player, built once (item 10). A second close while one is running is ignored. */
function closeVideo() { if (!host || host.hidden || closing) return false;
  closing = 1; clearAt();
  if (vid) { try { vid.pause(); } catch (e) { } }
  glow(false); host.classList.remove('von'); void host.offsetWidth; host.classList.add('voff');
  for (const s of PLAYER.off.steps) if (s.name === 'dot') at(s.at, () => Snd.videoFx('off'));
  // v29 (item 10, build 55): the source is RELEASED before the frame is emptied. innerHTML='' alone leaves the iOS decoder alive until GC,
  // so eight opens in a row held eight decoders. pause / removeAttribute('src') / load() is the documented way to let one go.
  at(PLAYER.off.ms, () => { host.classList.remove('voff', 'vfail'); host.hidden = true; delete host.dataset.msg;
    if (vid) { try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch (e) { } }
    host.querySelector('.vpic').innerHTML = ''; host.querySelector('.vcc').textContent = ''; vid = null; closing = 0; });
  return true; }

const videoOn = () => !!(host && !host.hidden);
// ui/screens/about.js hands this a function so a row can repaint itself the moment its clip is watched, without the list rebuilding under the player
const onVideoSeen = fn => { onSeen = fn; };

/* the two taps. A tap on the picture pauses and plays it — the only control there is, because item 9 puts nothing over the picture; a tap anywhere
   else closes. Both are silent: the player has its own power-on and power-off, and a click sound on top of a thunk is one sound too many. */
define({ vclose() { closeVideo(); },
  vtap() { if (!vid) return; if (vid.paused) { const p = vid.play(); if (p && p.catch) p.catch(() => { }); } else vid.pause(); } });

export { closeVideo, onVideoSeen, playVideo, videoOn };
