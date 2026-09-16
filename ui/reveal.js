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
import { GIFT_LOOK, REVEAL } from "../config/chests.js";
import { CARD, KEY } from "../config/copy.js";
import { Music, Snd } from "../audio.js";
import { esc } from "../core.js";
import { symSvg } from "./chest.js";

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- the markup. Three layers on one host: the stage, the gifts, and the card over both ---------- */
// a reward: its symbol in a box of its own (so the flight can be measured off layout, not a moving rect), the rings and sparks it lands with, its title
const giftHtml = (gifts, chest) => { const L = GIFT_LOOK[chest] || GIFT_LOOK.games;
  const extras = '<i class="rring"></i>'.repeat(L.ring) + Array.from({ length: L.sparks }, (_, k) => `<i class="rspark" style="--a:${Math.round(k * 360 / Math.max(1, L.sparks))}deg"></i>`).join('');
  return `<div class="rgifts">${(gifts || []).map((g, i) =>
    `<span class="rgift${g.tba ? ' tba' : ''}" style="--i:${i}"><span class="rfly">${symSvg(g.sym, 'rsym', chest)}${extras}</span><b>${esc(g.w)}</b></span>`).join('')}</div>`; };
/* v26 (item 8, build 49): the card. A big "Congratulations" in the chest's own colour, one "You …" line, one "Next: can you …?" line, the video this
   chest opened as "A message from Aiden" (item 5), and Continue. No "what you got", no headings, no percentage. */
function cardHtml(c) { if (!c) return '';
  return `<div class="rcard" style="${c.col ? `--rc:${c.col}` : ''}">`
    + `<h3>${esc(c.title || '')}</h3>`
    + (c.you ? `<p class="ryou">${esc(c.you)}</p>` : '')
    + (c.next ? `<p class="rnext">${esc(c.next)}</p>` : '')
    + (c.msg ? `<button class="item sub rmsg" data-act="reveal-msg" data-msg="${esc(c.msg)}">${symSvg('video', 'rmsgsym')}<span>${esc(CARD.msg)}</span></button>` : '')
    + `<button class="item rgo" data-act="reveal-go" disabled>${esc(CARD.go)}</button></div>`; }

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
  const ready = gifts.length ? landAt + Math.max(REVEAL.hold, quick ? 0 : (st.textMs || 0)) : giftAt;
  const c = cur = { host, stage: st, timers: [], ready: false, card: o.card || null, onReady: o.onReady, onDone: o.onDone };
  host.className = 'cere rev' + (o.kind === 'key' ? ' clear' : '') + (quick ? ' quick' : '');
  host.dataset.kind = o.kind || 'chest'; host.dataset.rev = o.id || ''; host.dataset.step = '';
  host.style.setProperty('--rev-ms', ms + 'ms'); host.style.setProperty('--gift-ms', (quick ? 0 : REVEAL.giftMs) + 'ms');
  host.style.setProperty('--gift-at', giftAt + 'ms'); host.style.setProperty('--gift-gap', giftGap + 'ms');
  host.style.setProperty('--card-ms', REVEAL.cardAt + 'ms'); if (o.col) host.style.setProperty('--rc', o.col);
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
  if (!o.silent) [...host.querySelectorAll('.rgift')].forEach((g, i) => { const an = (g.getAnimations ? g.getAnimations() : []).find(x => x.animationName === 'rgiftfly');
    const tm = an && an.effect ? an.effect.getComputedTiming() : null;
    if (tm && !quick) { at(tm.delay || 0, () => Snd.pop(i)); at((tm.delay || 0) + (+tm.duration || 0), () => Snd.gift(i)); }
    else at(giftAt + i * giftGap, () => Snd.gift(i)); });
  /* 3. tap to continue, held until the last one has landed — or, for an `auto` reveal, the end. It comes the same beat after the SETTLE that it
     always did, and the settle waits for the stage's hold (v26 item 10): nothing after the stage can start while the stage is still drawing */
  const settleAt = quick ? 0 : (typeof st.settleAt === 'number' ? st.settleAt : ms), after = Math.max(0, ready - settleAt);
  const finish = () => { c.ready = true;
    if (o.auto) { stop(); if (c.onReady) c.onReady(); if (c.onDone) c.onDone(); return; }
    host.classList.add('tap'); host.dataset.step = 'tap'; if (c.onReady) c.onReady(); };
  const settle = () => { if (cur !== c) return; host.dataset.step = 'settle'; if (st.settle) { try { st.settle(); } catch (e) { } } c.timers.push(setTimeout(() => { if (cur === c) finish(); }, after)); };
  at(settleAt, () => { let h = null; try { h = st.hold ? st.hold() : null; } catch (e) { }
    if (h && typeof h.then === 'function') { c.holding = true; h.then(() => { c.holding = false; settle(); }, () => { c.holding = false; settle(); }); } else settle(); });
  return true; }

/* the tap. Before "tap to continue" it is NOTHING AT ALL — swallowed, not queued (item 11) — and after it the card comes up, or, with no
   card, the reveal ends and hands over. The card's own Continue is a button with its own act, so a stray tap on the card does nothing. */
function tap() { if (!cur || !cur.ready || cur.carded) return false; const c = cur;
  if (!c.card) { stop(); if (c.onDone) c.onDone(); return true; }
  c.carded = true; c.host.classList.remove('tap'); c.host.dataset.step = 'card';
  const wrap = c.host.querySelector('.rcardwrap'), row = c.host.querySelector('.rgifts.placed');
  wrap.innerHTML = cardHtml(c.card);
  /* v26 (item 8): LOWER, CLEAR OF THE CHEST. The card starts under the row of rewards; on a phone too short to hold it there, the chest and its rewards
     lift by exactly what the card needs, and never past the top of the chest */
  if (row && c.anchor) { const pad = parseFloat(getComputedStyle(c.host).paddingBottom) || 18, top = row.offsetTop + row.offsetHeight + REVEAL.cardGap;
    const need = (wrap.firstElementChild || wrap).offsetHeight, room = c.host.clientHeight - pad - top;
    const lift = Math.round(Math.max(0, Math.min(c.anchor.top - pad, need - room)));
    c.host.style.setProperty('--lift', lift + 'px'); wrap.classList.add('below'); wrap.style.top = (top - lift) + 'px'; }
  c.host.classList.add('card');
  // item 22: Continue is dead for about a second, so a tap left over from the animation cannot close the card unseen
  c.timers.push(setTimeout(() => { if (cur !== c) return; const b = c.host.querySelector('.rgo'); if (b) { b.disabled = false; b.classList.add('on'); } }, REVEAL.cardAt + REVEAL.cardGo));
  return true; }
// the card's Continue. Answers whether it ended one
function go() { if (!cur || !cur.carded) return false; const c = cur; const b = c.host.querySelector('.rgo'); if (b && b.disabled) return false;
  stop(); if (c.onDone) c.onDone(); return true; }
const on = () => !!cur;
// which message the card is offering, if any — ui/screens/key.js hands it to the About screen
const msgOf = () => (cur && cur.card && cur.card.msg) || '';

export { msgOf, on as revealOn, play as playReveal, go as revealGo, stop as stopReveal, tap as revealTap };
