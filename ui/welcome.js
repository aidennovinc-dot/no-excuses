/* No Excuses — THE WELCOME CEREMONY (v31 60.33, build 60).

   The first game on a new save unlocks the Welcome message (v27 item 8: `{run:{g,s}}`, Quick Tap · Sprint). Until build 59 that
   arrived as one green toast among the others and a green dot on a menu row, and Aiden's note is that it is "far too easy to
   miss" — the first thing the game ever gives you, announced the same way as a colour swatch.

   Cowork's direction, as Aiden approved it: once the first result screen has finished counting, a full-screen moment. The screen
   goes dark, the SHARED "television turning on" intro flickers a picture into being — the same named steps the video player uses
   (`PLAYER.on` in config/messages.js), so the thing that is about to play and the thing announcing it are recognisably one
   object — a short sting lands on it, and then a card: "A message from Aiden · Welcome", Play, and Later.

   · PLAY opens the shared player (ui/video.js), so the clip behaves exactly as every other message does, 60.32 included.
   · LATER closes the moment and leaves the Messages row GREEN until the clip is watched, which is the existing first-seen rule
     (L8, `prefs.msgSeen` → `msgDot()`); nothing here writes that, it simply does not clear it.
   · IT FIRES ONCE PER SAVE (`prefs.welcomeSeen`, written the moment it starts, so a reload mid-ceremony cannot replay it) and
     NEVER INTERRUPTS A RUN — the one caller is the result screen, after its own counting, and the guard below refuses while a
     run is live.
   · ITS SOUND IS ITS OWN (`Snd.welcome()`, `WELCOME_FX`), distinct from the unlock sound and from the achievement click, the
     same way a chest's and a key's are (v23 L.6, v24 C.5).

   A4: a module under `ui/`, like `ui/reveal.js` and `ui/video.js`, so the result screen can ask for it without importing a
   screen and this file navigates to none. */
import { Snd } from "../audio.js";
import { MESSAGES, PLAYER } from "../config/messages.js";
import { WELCOME } from "../config/copy.js";
import { $, esc } from "../core.js";
import { prefs, save } from "../core/store.js";
import { msgOpen, msgTitle } from "../progress/key.js";
import { define } from "./actions.js";
import { playVideo } from "./video.js";

let host = null, ts = [];
const clearT = () => { ts.forEach(clearTimeout); ts = []; };
const at = (ms, f) => ts.push(setTimeout(f, ms));

// the slot this is about: the FIRST message, which is the one a new save unlocks by playing its first game
const slotOf = () => MESSAGES[0] || null;

function build() {
  if (host) return host;
  host = document.createElement('div');
  host.id = 'welcome'; host.hidden = true; host.dataset.act = 'wclose';
  document.body.appendChild(host);
  return host;
}

/* the moment itself. The power-on's named steps are written onto the host as custom properties exactly as the player writes its
   own, so one set of timings drives both and a retune of `PLAYER.on` moves this with it. */
function playWelcome() {
  const m = slotOf(); if (!m) return false;
  build(); clearT();
  for (const s of PLAYER.on.steps) { host.style.setProperty('--w-' + s.name + '-at', s.at + 'ms'); host.style.setProperty('--w-' + s.name + '-ms', s.ms + 'ms'); }
  host.innerHTML = `<div class="wstage"><i class="wframe"><i class="wpic"></i></i></div>`
    + `<div class="wcard" data-act="wcard">`
    + `<em>${esc(WELCOME.from)}</em><b>${esc(msgTitle(m) || WELCOME.fallback)}</b>`
    + `<div class="wrow"><button class="item wplay" data-act="wplay">${esc(WELCOME.play)}</button>`
    + `<button class="item sub wlater" data-act="wlater">${esc(WELCOME.later)}</button></div></div>`;
  host.hidden = false; host.classList.remove('wgo'); void host.offsetWidth; host.classList.add('won');
  // the sting lands on the beat the picture arrives, the same beat the player's own thunk lands on
  for (const s of PLAYER.on.steps) if (s.name === 'open') at(s.at, () => Snd.welcome());
  at(PLAYER.on.ms + 120, () => host.classList.add('wgo'));
  return true;
}

function closeWelcome() { if (!host || host.hidden) return false;
  clearT(); host.classList.remove('won', 'wgo'); host.hidden = true; host.innerHTML = '';
  return true; }

/* the one caller: the result screen, once it has finished counting. Everything that says "not now" is here rather than at the
   call site, so there is one place to read and one place to change. */
function welcomeCheck(live) {
  if (live || prefs.welcomeSeen) return false;
  const m = slotOf(); if (!m || !msgOpen(m)) return false;
  // already watched it (a restored profile, or Testing) — there is nothing to announce
  if (prefs.msgSeen && prefs.msgSeen[m.id]) { prefs.welcomeSeen = 1; save(); return false; }
  prefs.welcomeSeen = 1; save();
  return playWelcome();
}

define({
  wclose() { closeWelcome(); return 'click'; },
  // a tap on the card itself does nothing: the two buttons are the only way out, so neither is missed by a stray tap
  wcard() { return 'pick'; },
  wplay() { const m = slotOf(); closeWelcome(); if (m) playVideo(m); return 'click'; },
  wlater() { closeWelcome(); return 'click'; },
});

export { closeWelcome, welcomeCheck };
