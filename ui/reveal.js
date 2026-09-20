/* No Excuses — THE ONE SHARED REVEAL (v25 items 6 / 11 / 22, build 46). PRESENTATION ONLY (L10): by the time a reveal plays, the chest is
   open and credited or the key is whole and banked (progress/key.js), so nothing here can change what opened, cleared or earned.

   "Unlocking is an event" is the rule for chests and keys alike, so they are built from ONE routine and not two (item 11's last line). A
   reveal is four beats, in this order and always in this order:

     1. THE STAGE     what actually happens — a chest's ceremony (ui/ceremony.js, build 41) or a key's first-open reveal (ui/screens/key.js).
                      The routine does not know how to draw either; the caller hands it a `stage` with a length, an optional list of named
                      steps and three callbacks, and this file runs the clock.
     2. THE GIFTS     item 6: what the chest unlocks rises out of it one at a time as a symbol with its title under it, each landing with its
                      own small sound (GIFT_FX). A key hands over no gifts and this beat takes no time.
     3. TAP TO CONTINUE   held back until the last gift has landed (item 6), and NOT SKIPPABLE before it: every tap up to that point is
                      SWALLOWED, never queued, so nothing fires a button the moment the reveal ends (item 11).
     4. THE CARD      item 22: the congratulations card, never on top of the animation. Its Continue button is dead for about a second
                      (REVEAL.cardGo) so a tap left over from the animation cannot close it unseen. One tap, no tap-anywhere-to-close.

   FIRST TIME ONLY is the caller's business, not this file's — a reveal plays when it is asked for. `prefs.revealed` is where both callers
   keep what has played, and Testing's per-chest reset clears that chest's, which is what makes it a first time again on Aiden's phone.

   REDUCE MOTION (item 11): the stage, the gifts and the settle collapse into one short fade of REVEAL.fadeMs and the card follows. Apple
   expects it and the App Store review looks for it. Nothing is skipped — the same four beats happen, in the same order, quickly.

   v26 (items 10 / 11, build 48): TWO THINGS A STAGE CAN NOW ASK FOR. `hold()` — a promise the settle waits on, so a stage whose drawing has its own
   end (a key's earn moment) is never settled, and so never cut off, before that end; the beats after the settle keep their spacing from it. And
   `auto` — the reveal ends by itself when it would have held on "tap to continue", with no card: a key's reveal (item 11). Every tap up to that
   end is still swallowed, so no tap is accepted before the animation's last frame.

   The host is the same full-screen element a chest ceremony already used (#key-cere). A chest's stage is opaque and covers the screen; a
   key's is transparent, because the ring being revealed is the screen underneath — `kind` is the only thing that decides which.

   v26 (items 6 / 8, build 49): THE REWARDS COME OUT OF THE CHEST, AND THE CARD SITS UNDER THEM. A stage that has a chest answers `anchor()` — where its
   lid and its foot are on the host — and the row of rewards is laid out once, close under the chest, where they end up. Each reward's FLIGHT is drawn
   backwards from there: out of the lid, down to the right, round and home, a cubic curve sampled into eleven custom properties the stylesheet's one
   keyframe list walks (GIFT_LOOK in config/chests.js sets how far it swings and how grand it is, per chest). They leave REVEAL.giftGap apart, each
   with a small pop as it leaves and the "an unlock lands" sound as it lands — both read off that reward's own animation, never a second list of
   times. The chest's name and a key chest's count-up wait for the last one to land, and "tap to continue" waits for both. The card is placed BELOW
   the row, clear of the chest; if the phone is too short for it, the chest and its rewards lift up by exactly what the card needs. */
import { CHEER_LOOK, CONFETTI, CONFETTI_VARY, GIFT_LOOK, REVEAL } from "../config/chests.js";
import { CARD, KEY } from "../config/copy.js";
import { Music, Snd } from "../audio.js";
import { esc } from "../core.js";
import { msgPreview, symSvg } from "./chest.js";

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- the markup. Three layers on one host: the stage, the gifts, and the card over both ---------- */
// a reward: its symbol in a box of its own (so the flight can be measured off layout, not a moving rect), the rings and sparks it lands with, its title
const giftHtml = (gifts, chest) => { const L = GIFT_LOOK[chest] || GIFT_LOOK.games;
  const extras = '<i class="rring"></i>'.repeat(L.ring) + Array.from({ length: L.sparks }, (_, k) => `<i class="rspark" style="--a:${Math.round(k * 360 / Math.max(1, L.sparks))}deg"></i>`).join('');
  return `<div class="rgifts">${(gifts || []).map((g, i) =>
    `<span class="rgift${g.tba ? ' tba' : ''}" style="--i:${i}"><span class="rfly">${symSvg(g.sym, 'rsym', chest)}${extras}</span><b>${esc(g.w)}</b></span>`).join('')}</div>`; };
/* v26 (item 8, build 49): the card. A big "Congratulations" in the chest's own colour, one "You …" line, one "Next: can you …?" line, the video this
   chest opened as "A message from Aiden" (item 5), and Continue. No "what you got", no headings, no percentage.
   v28 (items 12 / 17, build 53): STAGED, AND CELEBRATED. Every block carries its own index (`--ci`) and the stylesheet lands it REVEAL.cardStep after
   the one before — the title, then each line, then the message, then Continue, the whole of it inside a second (item 12: "it can be fairly quick").
   Continue is last on purpose, so it cannot be tapped before the message row is on screen. The MESSAGE is no longer a grey line with a small icon:
   it is the build-52 player powered off (msgPreview in ui/chest.js), a framed picture with a play mark and the clip's own title under it, which is
   the same thing the Messages list shows — Aiden did not know the old line was tappable. And the confetti (item 17) is thrown on the title's beat,
   in the chest's own colour and in the game's own shapes, escalating with the chest. */
/* v29 Section A (57.3, build 57): A LOT OF IT, ACROSS THE WHOLE SCREEN. It was thrown from inside the card, so `spread` was a fraction of a 360px
   box and the pieces fell 190px. It hangs on the HOST now — the full-screen reveal element, which 57.4 clips at the top safe area — so `spread` is
   a percentage of the SCREEN and every piece falls past the bottom of it. `white` is how many in ten are drawn white instead of the chest's colour
   (57.3's "the chest's colour plus white"); the pieces are spread evenly with a sway and a stagger, so a hundred of them do not read as a curtain. */
/* v30 (59.9, build 59): EVERY PIECE DRAWS ITS OWN VALUES. Aiden: "the confetti is cool, except it looks very robotic and mechanical.
   It should be more randomized and human." It was a formula of the index — x evenly spaced, nine start times on a 60ms grid, five
   sways, one spin and one size for all — so the pieces fell as neat horizontal rows of identical dashes at identical angles, which
   reads as a pattern scrolling down rather than as confetti. Now: x anywhere across the spread, a start anywhere in the burst
   window and FRONT-LOADED so most launch early and stragglers trail, its own fall time, sway distance AND direction, spin speed AND
   direction, starting angle, size, and a small share that tumble edge-on. The spans are CONFETTI_VARY; what stays per chest is the
   colour, the white share, the shape, the count and the overall duration, which is what 59.9 says to randomise WITHIN.
   The draw is fresh on every call — the card is built each time it is shown — so two openings of the same chest never match. */
function confettiHtml(chest) { const C = CONFETTI[chest]; if (!C) return '';
  const V = CONFETTI_VARY, w = Math.max(0, Math.min(10, C.white || 0));
  const R = (a, b) => a + Math.random() * (b - a), sign = () => Math.random() < .5 ? -1 : 1;
  // the white share is a SHARE now, not every tenth piece: `i % 10 < w` put the white ones on a fixed cycle like everything else
  return `<span class="rconf" aria-hidden="true" style="--cf-ms:${C.ms}ms;--cf-spin:${C.spin}deg;--cf-sz:${C.size}px">`
    + Array.from({ length: C.n }, (_, i) => {
      const x = 50 + (Math.random() - .5) * C.spread;
      const d = Math.round(Math.pow(Math.random(), V.front) * V.burst);
      const fm = R(1 - V.fall, 1 + V.fall), sz = R(1 - V.size, 1 + V.size);
      const sw = (R(V.sway[0], V.sway[1]) * sign()).toFixed(2);
      const rot0 = Math.round(R(-V.tilt, V.tilt));
      const rot1 = rot0 + Math.round(C.spin * R(V.spin[0], V.spin[1])) * sign();
      return `<i class="cf ${C.shape}${Math.random() * 10 < w ? ' w' : ''}${Math.random() < V.flip ? ' tum' : ''}"`
        + ` style="--x:${x.toFixed(1)}%;--i:${i};--d:${d}ms;--sw:${sw};--fm:${fm.toFixed(3)};--s:${sz.toFixed(3)};--rot0:${rot0}deg;--rot1:${rot1}deg"></i>`;
    }).join('') + '</span>'; }
// 57.3: the word lands one letter at a time, so every letter carries its own index. A space is drawn and never animated
const wordHtml = t => String(t || '').split('').map((ch, i) =>
  ch === ' ' ? '<span class="clsp"> </span>' : `<span class="cl" style="--l:${i}">${esc(ch)}</span>`).join('');
function cardHtml(c) { if (!c) return '';
  let i = 0; const at = () => `style="--ci:${i++}"`;
  return `<div class="rcard" style="${c.col ? `--rc:${c.col}` : ''}">`
    + `<h3 class="rtitle" ${at()}>${wordHtml(c.title || '')}<i class="cshine" aria-hidden="true"></i></h3>`
    + (c.you ? `<p class="ryou" ${at()}>${esc(c.you)}</p>` : '')
    + (c.next ? `<p class="rnext" ${at()}>${esc(c.next)}</p>` : '')
    + (c.msg ? `<button class="rmsg" data-act="reveal-msg" data-msg="${esc(c.msg)}" ${at()}>${msgPreview(c.msgObj || null) || `<span class="mprev"><span class="mpframe"><span class="mppic"><i class="mpplay"></i></span></span><b class="mptitle">${esc(CARD.msg)}</b></span>`}</button>` : '')
    + `<button class="item rgo" data-act="reveal-go" ${at()} disabled>${esc(CARD.go)}</button></div>`; }

/* v26 (item 6, build 49): lay the rewards out under the chest and draw each one's flight backwards from where it rests. Offsets, not rects — the
   rewards are about to animate, and a rect taken now would include wherever the first keyframe puts them. Answers the chest's anchor, or null. */
const offIn = (el, root) => { let x = 0, y = 0, n = el; while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x, y }; };
function placeGifts(host, st, chest) { const row = host.querySelector('.rgifts'); if (!row || !row.children.length || !st.anchor) return null;
  // out of the flow FIRST: in it, the row takes height from the stage and the chest is measured somewhere it will not be
  row.classList.add('placed');
  let a = null; try { a = st.anchor(); } catch (e) { } if (!a) { row.classList.remove('placed'); return null; }
  const L = GIFT_LOOK[chest] || GIFT_LOOK.games;
  row.style.top = Math.round(a.bottom + REVEAL.under) + 'px'; void row.offsetHeight;
  host.style.setProperty('--gpop', L.pop); host.style.setProperty('--gspin', L.spin + 'deg'); host.style.setProperty('--gglow', L.glow + 'px');
  [...row.querySelectorAll('.rgift')].forEach(g => { const b = g.querySelector('.rfly'), o = offIn(b, host);
    const fx = o.x + b.offsetWidth / 2, fy = o.y + b.offsetHeight / 2;
    // out of the lid and up, swinging right; down past the resting place to the right; round and home
    const p0 = [a.cx - fx, a.lid - fy], p1 = [p0[0] + L.arc[0] * .6, p0[1] - L.arc[1] * .95], p2 = [L.arc[0] * 1.2, L.arc[1] * 1.15];
    for (let k = 0; k <= 10; k++) { const t = 1 - Math.pow(1 - k / 10, 1.35), u = 1 - t;
      const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0], y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1];
      g.style.setProperty('--x' + k, x.toFixed(1) + 'px'); g.style.setProperty('--y' + k, y.toFixed(1) + 'px'); } });
  return a; }

/* ---------- the one that is playing ---------- */
let cur = null;
// ends it with no hand-over: a screen change, a second reveal, the screen reopened. Idempotent, and always gives the music back
function stop() { if (!cur) return; const c = cur; cur = null; c.timers.forEach(clearTimeout);
  if (c.stage && c.stage.clear) { try { c.stage.clear(); } catch (e) { } }
  c.host.className = 'cere'; c.host.hidden = true; c.host.innerHTML = ''; c.host.removeAttribute('style'); delete c.host.dataset.step; Music.hush(false); }

/* play(host, o) — o is { kind, id, col, stage, gifts, card, silent, auto, onReady, onDone }.
   `stage` is { ms, steps, start(), step(name), settle(), clear() }, every field optional but `ms`: this file owns the clock and the caller
   owns the drawing. `silent` plays no sound at all (the review catalogue's frames; Testing's replay is NOT silent — the sounds are what is
   being reviewed). `onReady` fires when "tap to continue" appears, `onDone` when the card's Continue is taken — or when the tap lands, if
   there is no card. Answers whether it started. */
function play(host, o = {}) { stop(); if (!host) return false;
  const st = o.stage || { ms: 0 }, quick = reduced(), ms = quick ? REVEAL.fadeMs : (st.ms || 0);
  const gifts = o.gifts || [], giftAt = ms + (quick ? 0 : REVEAL.giftAt), giftGap = quick ? 0 : REVEAL.giftGap;
  // v26 (item 6): the last reward lands at `landAt`; the chest's name and its count-up come then, and "tap to continue" after both
  const landAt = giftAt + (gifts.length ? (gifts.length - 1) * giftGap + (quick ? 0 : REVEAL.giftMs) : 0);
  /* v27 (item 14, build 51): a KEY hands over no rewards, so there is nothing for `giftAt`'s beat to wait for — it ends the frame its animation
     does. It was `giftAt` (the stage plus REVEAL.giftAt) for every kind alike, which put 260ms of nothing on the end of an animation item 14
     caps at two seconds. A chest is unchanged: it still waits for its last reward to land and for its own line after it. */
  const ready = gifts.length ? landAt + Math.max(REVEAL.hold, quick ? 0 : (st.textMs || 0)) : (o.kind === 'key' ? ms : giftAt);
  const c = cur = { host, stage: st, timers: [], ready: false, silent: !!o.silent, card: o.card || null, onReady: o.onReady, onDone: o.onDone };
  host.className = 'cere rev' + (o.kind === 'key' ? ' clear' : '') + (quick ? ' quick' : '');
  host.dataset.kind = o.kind || 'chest'; host.dataset.rev = o.id || ''; host.dataset.step = '';
  host.style.setProperty('--rev-ms', ms + 'ms'); host.style.setProperty('--gift-ms', (quick ? 0 : REVEAL.giftMs) + 'ms');
  host.style.setProperty('--gift-at', giftAt + 'ms'); host.style.setProperty('--gift-gap', giftGap + 'ms');
  host.style.setProperty('--card-ms', REVEAL.cardAt + 'ms'); host.style.setProperty('--card-step', REVEAL.cardStep + 'ms'); host.style.setProperty('--card-block', REVEAL.cardBlockMs + 'ms'); if (o.col) host.style.setProperty('--rc', o.col);
  host.innerHTML = `<div class="rstage"></div>${giftHtml(gifts, o.id)}<i class="ctap">${esc(KEY.tapOn)}</i><div class="rcardwrap"></div>`;
  host.hidden = false; void host.offsetWidth;
  Music.hush(true);
  const at = (t, fn) => c.timers.push(setTimeout(() => { if (cur === c) fn(); }, Math.max(0, t)));
  // 1. the stage. Under Reduce Motion it is drawn and settled at once — the short fade is the whole of it. v26 (item 6): its text waits for the rewards
  if (st.start) { try { st.start(host.querySelector('.rstage'), { quick, silent: !!o.silent, textAt: gifts.length ? landAt : undefined }); } catch (e) { } }
  if (gifts.length) host.style.setProperty('--reveal-at', landAt + 'ms');
  /* v26 (item 6): the rewards are laid out close under the chest, where they will rest, before anything moves — then the host starts playing and each
     one flies there out of the lid. A stage with no chest (a key's) has no anchor and hands over no rewards, and nothing here happens */
  c.anchor = gifts.length ? placeGifts(host, st, o.id) : null;
  host.classList.add('play');
  if (!quick && st.step) for (const s of (st.steps || [])) at(s.at, () => { host.dataset.step = s.name; try { st.step(s.name, s); } catch (e) { } });
  /* 2. the gifts. Each leaves with a small pop and lands with its own sound a step above the one before (item 6) — both READ OFF THAT REWARD'S OWN
     ANIMATION, so re-timing the flight in config/chests.js moves the sounds with it. Under Reduce Motion there is no flight: each lands on the fade */
  // v27 (item 6, build 51): the pop knows which chest it left and whether the reward is a KEY — audio.js popPlan lifts the Games chest's and
  // brightens a key's (config/audio.js POP_FX.by / .bright). A key reward is one whose symbol draws a key, which ui/chest.js marks `symkey`
  if (!o.silent) [...host.querySelectorAll('.rgift')].forEach((g, i) => { const an = (g.getAnimations ? g.getAnimations() : []).find(x => x.animationName === 'rgiftfly');
    const tm = an && an.effect ? an.effect.getComputedTiming() : null;
    const how = { chest: o.id || '', key: !!g.querySelector('.rsym.symkey') };
    if (tm && !quick) { at(tm.delay || 0, () => Snd.pop(i, how)); at((tm.delay || 0) + (+tm.duration || 0), () => Snd.gift(i)); }
    else at(giftAt + i * giftGap, () => Snd.gift(i)); });
  /* 3. tap to continue, held until the last one has landed — or, for an `auto` reveal, the end. It comes the same beat after the SETTLE that it
     always did, and the settle waits for the stage's hold (v26 item 10): nothing after the stage can start while the stage is still drawing */
  const settleAt = quick ? 0 : (typeof st.settleAt === 'number' ? st.settleAt : ms), after = Math.max(0, ready - settleAt);
  const finish = () => { c.ready = true;
    if (o.auto) { stop(); if (c.onReady) c.onReady(); if (c.onDone) c.onDone(); return; }
    host.classList.add('tap'); host.dataset.step = 'tap'; if (c.onReady) c.onReady(); };
  const settle = (now) => { if (cur !== c) return; host.dataset.step = 'settle'; if (st.settle) { try { st.settle(); } catch (e) { } }
    c.timers.push(setTimeout(() => { if (cur === c) finish(); }, now ? 0 : after)); };
  at(settleAt, () => { let h = null; try { h = st.hold ? st.hold() : null; } catch (e) { }
    if (h && typeof h.then === 'function') { c.holding = true; h.then(() => { c.holding = false; settle(); }, () => { c.holding = false; settle(); }); } else settle(); });
  /* v27 (item 14, build 51): what a SKIP does to the clock. The stage's own skip runs its drawing to the last frame, but the hold is not even
     asked for until `settleAt` — so without this the reveal still sat out its full length with a finished picture on screen. Every pending
     timer goes (the steps and the settle are all that is left for a stage that has just ended), and it settles and hands over at once. */
  c.jump = () => { if (cur !== c) return; c.timers.forEach(clearTimeout); c.timers = []; c.holding = false; settle(true); };
  return true; }

/* the tap. Before "tap to continue" it is NOTHING AT ALL — swallowed, not queued (item 11) — and after it the card comes up, or, with no
   card, the reveal ends and hands over. The card's own Continue is a button with its own act, so a stray tap on the card does nothing.
   v27 (item 14, build 51): UNLESS THE STAGE OFFERS A SKIP. A chest's ceremony does not and is still unskippable; a KEY's does — item 14 asks
   for a tap that jumps to the end at any point — and it answers whether it took the tap. This is the only route in while a reveal is up: the
   host covers the screen and carries its own `data-act`, so `ui/actions.js` never reaches its captures. */
function tap() { if (!cur) return false;
  if (!cur.ready) { const st = cur.stage, c0 = cur;
    if (st && st.skip) { let took = false; try { took = !!st.skip(); } catch (e) { took = false; } if (took) { c0.jump(); return true; } }
    return false; }
  if (cur.carded) return false; const c = cur;
  if (!c.card) { stop(); if (c.onDone) c.onDone(); return true; }
  c.carded = true; c.host.classList.remove('tap'); c.host.dataset.step = 'card';
  const wrap = c.host.querySelector('.rcardwrap'), row = c.host.querySelector('.rgifts.placed');
  wrap.innerHTML = cardHtml(c.card);
  /* v26 (item 8): LOWER, CLEAR OF THE CHEST. The card starts under the row of rewards; on a phone too short to hold it there, the chest and its rewards
     lift by exactly what the card needs, and never past the top of the chest */
  /* v29 Section A (57.4, build 57): THE LIFT RESPECTS THE TOP SAFE AREA. It was capped at the CHEST'S own top — "never past the top
     of the chest" — but the Games chest draws its row of seven squares 150 units ABOVE the chest, so a card that asked for a big lift
     pushed them over the phone's clock and battery (Aiden's 2:59 screenshot). The cap is the stage's topmost SOLID layer instead
     (`anchor.head`, ui/ceremony.js STAGE_HEAD), held at the host's own padding line — which IS `env(safe-area-inset-top)`. A card that
     then does not fit scrolls, which it could always do; nothing is drawn under the status bar to make room for it. */
  if (row && c.anchor) { const cs = getComputedStyle(c.host), pad = parseFloat(cs.paddingBottom) || 18, padTop = parseFloat(cs.paddingTop) || 18;
    const top = row.offsetTop + row.offsetHeight + REVEAL.cardGap;
    const need = (wrap.firstElementChild || wrap).offsetHeight, room = c.host.clientHeight - pad - top;
    const headroom = Math.max(0, (typeof c.anchor.head === 'number' ? c.anchor.head : c.anchor.top) - padTop);
    const lift = Math.round(Math.max(0, Math.min(headroom, need - room)));
    c.host.style.setProperty('--lift', lift + 'px'); wrap.classList.add('below'); wrap.style.top = (top - lift) + 'px'; }
  /* v30 (59.2, build 59): AND CONTINUE IS ON SCREEN WITHOUT SCROLLING. 57.4's last line accepted a card that "does not fit
     scrolls, which it could always do" — on Aiden's phone that put Continue off the bottom of every chest. The lift above is
     already capped by the top safe area, so when it is not enough the card itself has to get shorter, and the block that gives
     way is the PICTURE: it is the tallest thing on the card and the only one that carries no words. Measured, not guessed —
     the overflow is read off the laid-out card and taken off the frame's height cap, twice at most, and never below MP_MIN,
     under which a picture stops reading as one. A card with no picture has nothing to give and scrolls as it did. */
  { const card = wrap.firstElementChild, fr = card && card.querySelector('.mpframe');
    const over = () => card.scrollHeight - card.clientHeight;
    const squeeze = () => { for (let i = 0; fr && i < 3; i++) { const o = over(); if (o <= 0) return;
      const h = fr.getBoundingClientRect().height;
      const next = Math.max(REVEAL.cardPicMin, Math.round(h - o)); if (next >= Math.round(h)) return;
      fr.style.setProperty('--mp-max', next + 'px'); } };
    if (card) { squeeze();
      /* and if the picture has given all it can, the card's own SPACING gives way next — the Pro chest's rewards row sits
         lowest, so even at the picture's floor its card ran about 14px past the bottom. `tight` takes that out of the gaps
         and the padding and nothing out of the words. The card stays BELOW the rewards either way: centring it instead was
         tried and is worse, because the wrap then holds the card over the chest, the gift row and the spill's light. */
      if (over() > 0) { card.classList.add('tight'); squeeze(); } } }
  c.host.classList.add('card');
  /* v28 (item 17, build 53): the celebration — confetti and one sound, different per chest and escalating, on the card's TITLE beat and before
     the message row, which is where item 17 puts it: "the screen the player taps through to after a chest opens", never on the map and never
     during the chest animation. A key's reveal is `auto` and has no card, so it never reaches this.
     v29 Section A (57.3, build 57): AND THE WORD IS A CELEBRATION. Every number is config/chests.js CHEER_LOOK, written onto the host as custom
     properties the stylesheet reads, so a re-tune is a number edit there: the beat between letters, how long one takes and how far it overshoots,
     the shine that crosses the word once the last letter has landed, the slow pulse it settles into, its colour (the chest's own, white for the
     Games chest, whose grey was the dim Aiden pointed at), its halo and how much bigger than the line under it it is. `--cw-last` is the last
     letter's index, which is what the shine and the pulse wait for. THE CONFETTI HANGS ON THE HOST, not in the card, so it covers the screen. */
  { const L = CHEER_LOOK[c.card.chest] || CHEER_LOOK.games, n = String(c.card.title || '').length;
    const h = c.host.style;
    h.setProperty('--cwc', L.col); h.setProperty('--cw-glow', L.glow + 'px'); h.setProperty('--cw-step', L.step + 'ms');
    h.setProperty('--cw-drop', L.drop + 'ms'); h.setProperty('--cw-bounce', String(L.bounce)); h.setProperty('--cw-shine', L.shine + 'ms');
    h.setProperty('--cw-shineat', L.shineAt + 'ms'); h.setProperty('--cw-pulse', L.pulse + 'ms'); h.setProperty('--cw-size', String(L.size));
    h.setProperty('--cw-last', String(Math.max(0, n - 1)));
    if (c.card.chest) c.host.insertAdjacentHTML('beforeend', confettiHtml(c.card.chest)); }
  if (!c.silent && c.card.chest) c.timers.push(setTimeout(() => { if (cur === c) Snd.cheer(c.card.chest); }, REVEAL.cardAt));
  // item 22: Continue is dead for about a second, so a tap left over from the animation cannot close the card unseen. Item 12 puts it last of the
  // staged blocks, so its own wait now starts after the blocks have landed
  c.timers.push(setTimeout(() => { if (cur !== c) return; const b = c.host.querySelector('.rgo'); if (b) { b.disabled = false; b.classList.add('on'); } }, REVEAL.cardAt + REVEAL.cardGo));
  return true; }
// the card's Continue. Answers whether it ended one
function go() { if (!cur || !cur.carded) return false; const c = cur; const b = c.host.querySelector('.rgo'); if (b && b.disabled) return false;
  stop(); if (c.onDone) c.onDone(); return true; }
const on = () => !!cur;
// which message the card is offering, if any — ui/screens/key.js hands it to the About screen
const msgOf = () => (cur && cur.card && cur.card.msg) || '';

export { msgOf, on as revealOn, play as playReveal, go as revealGo, stop as stopReveal, tap as revealTap };
