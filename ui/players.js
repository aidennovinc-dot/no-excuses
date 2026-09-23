/* No Excuses — THE PLAYER PICKER, ONE COMPONENT (v31 60.23, build 60).

   L3 has always said the same thing in two places: Solo / With a friend, then Pass & play / Versus. The PICK SHEET had it as
   markup in index.html and the RESULT screen built its own string, so the two drifted — different widths, different wrapping
   (Versus alone on a second line), and a selected chip that took a white outline on one and the sheet's own orange on the other.
   Aiden: "ONE shared component used by the result screen and the pick sheet, in all games."

   This is it. It returns the markup and marks the selection; each screen passes its own `act`, because a tap on the sheet and a
   tap on the result screen do different things and `data-act` is how every control in this app says which (ui/actions.js).

   THE SHAPE (60.23):
   · row one is Solo | With a friend, EQUAL WIDTHS — `flex:1 1 0`, so neither can be wider than the other whatever it says;
   · row two is Pass & play | Versus, drawn only when With a friend is picked, and it SLIDES IN (the stylesheet, `.prow.sub`);
   · SELECTED IS ORANGE — `--press`, the one colour this app uses for "this is what you chose" (v22 §K) — unselected is dim, and
     a locked choice keeps its crossed-out treatment;
   · a mode whose game has no versus simply has no Versus button, as it always did.

   A4: this is a module under `ui/`, like `ui/chips.js` and `ui/reveal.js`, so both screens may import it without importing
   each other. It reads nothing and decides nothing — the caller owns `sel` and passes what it has. */
import { PLAYERS } from "../config/copy.js";

// the two little pictures, unchanged from the sheet's own markup: one phone, two phones, two phones with an arrow, two phones split
const ART = {
  solo: '<svg viewBox="0 0 22 16"><rect x="7" y="1" width="8" height="14" rx="1.5"/></svg>',
  friend: '<svg viewBox="0 0 22 16"><rect x="1" y="2" width="7" height="12" rx="1.5"/><rect x="14" y="2" width="7" height="12" rx="1.5"/></svg>',
  pass: '<svg viewBox="0 0 22 16"><rect x="1" y="2" width="7" height="12" rx="1.5"/><rect x="14" y="2" width="7" height="12" rx="1.5"/><path d="M9 8h4M11 6l2 2-2 2"/></svg>',
  versus: '<svg viewBox="0 0 22 16"><rect x="1" y="2" width="7" height="12" rx="1.5"/><rect x="14" y="2" width="7" height="12" rx="1.5"/><path d="M11 5v6"/></svg>',
};

/* `vs` is 0 solo, 1 pass & play, 2 versus. `vsOk` says whether THIS game and mode has versus at all. `act` is the data-act the
   top row's taps carry and `act2` the sub-row's; a screen that uses one action for both passes it twice. */
export function playersHtml({ act, act2, vs, vsOk }) {
  const sel = (on) => 'pchip' + (on ? ' sel' : '');
  const row1 = `<div class="prow">`
    + `<button class="${sel(vs === 0)}" data-act="${act}" data-p="0">${ART.solo}<span>${PLAYERS.solo}</span></button>`
    + `<button class="${sel(vs > 0)}" data-act="${act}" data-p="f">${ART.friend}<span>${PLAYERS.friend}</span></button></div>`;
  const row2 = `<div class="prow sub"${vs > 0 ? '' : ' hidden'}>`
    + `<button class="${sel(vs === 1)}" data-act="${act2 || act}" data-p2="1">${ART.pass}<span>${PLAYERS.pass}</span></button>`
    /* the Versus button is always DRAWN and hidden when this game has none, never left out: the sheet draws this markup ONCE
       (ui/screens/pick.js renderVsRow) and marks it from then on, so a button omitted on the first sheet ever opened could never
       come back for the next game. `playersMark` is the one thing that decides whether it shows. */
    + `<button class="${sel(vs === 2)}" data-act="${act2 || act}" data-p2="2"${vsOk ? '' : ' hidden'}>${ART.versus}<span>${PLAYERS.versus}</span></button>`
    + `</div>`;
  return row1 + row2;
}

/* mark an ALREADY-DRAWN picker, for the sheet, which keeps its rows in the markup and only ever changes what is chosen.
   `host` is the element the two rows live in. */
export function playersMark(host, vs, vsOk) {
  if (!host) return;
  [...host.querySelectorAll('[data-p]')].forEach(b => b.classList.toggle('sel', (b.dataset.p === '0') === (vs === 0)));
  const sub = host.querySelector('.prow.sub');
  if (sub) { sub.hidden = !(vs > 0);
    const v2 = sub.querySelector('[data-p2="2"]'); if (v2) v2.hidden = !vsOk;
    [...sub.querySelectorAll('[data-p2]')].forEach(b => b.classList.toggle('sel', +b.dataset.p2 === vs)); }
}
