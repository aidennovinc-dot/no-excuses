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
   key's is transparent, because the ring being revealed is the screen underneath — `kind` is the only thing that decides which. */
import { REVEAL } from "../config/chests.js";
import { CARD, KEY } from "../config/copy.js";
import { Music, Snd } from "../audio.js";
import { esc } from "../core.js";
import { symSvg } from "./chest.js";

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- the markup. Three layers on one host: the stage, the gifts, and the card over both ---------- */
const giftHtml = gifts => `<div class="rgifts">${(gifts || []).map((g, i) =>
  `<span class="rgift${g.tba ? ' tba' : ''}" style="--i:${i}">${symSvg(g.sym, 'rsym')}<b>${esc(g.w)}</b></span>`).join('')}</div>`;
/* item 22's card: a title in this chest's or key's own colour, up to three lines of what you did, a row of what you got, one line of
   what's next, and Continue. `msg` is item 23's button, and it is there only when this unlock opened a message that has a clip. */
function cardHtml(c) { if (!c) return '';
  const did = (c.did || []).slice(0, 3);
  return `<div class="rcard" style="${c.col ? `--rc:${c.col}` : ''}">`
    + `<h3>${esc(c.title || '')}</h3>`
    + (did.length ? `<u>${esc(CARD.did)}</u><ul>${did.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : '')
    + ((c.got || []).length ? `<u>${esc(CARD.got)}</u>${giftHtml(c.got).replace('rgifts', 'rgifts row')}` : '')
    + (c.next ? `<u>${esc(CARD.next)}</u><p>${esc(c.next)}</p>` : '')
    + (c.msg ? `<button class="item sub rmsg" data-act="reveal-msg" data-msg="${esc(c.msg)}">${esc(CARD.msg)}</button>` : '')
    + `<button class="item rgo" data-act="reveal-go" disabled>${esc(CARD.go)}</button></div>`; }

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
  const ready = giftAt + (gifts.length ? (gifts.length - 1) * giftGap + (quick ? 0 : REVEAL.giftMs) + REVEAL.hold : 0);
  const c = cur = { host, stage: st, timers: [], ready: false, card: o.card || null, onReady: o.onReady, onDone: o.onDone };
  host.className = 'cere rev' + (o.kind === 'key' ? ' clear' : '') + (quick ? ' quick' : '');
  host.dataset.kind = o.kind || 'chest'; host.dataset.rev = o.id || ''; host.dataset.step = '';
  host.style.setProperty('--rev-ms', ms + 'ms'); host.style.setProperty('--gift-ms', (quick ? 0 : REVEAL.giftMs) + 'ms');
  host.style.setProperty('--gift-at', giftAt + 'ms'); host.style.setProperty('--gift-gap', giftGap + 'ms');
  host.style.setProperty('--card-ms', REVEAL.cardAt + 'ms'); if (o.col) host.style.setProperty('--rc', o.col);
  host.innerHTML = `<div class="rstage"></div>${giftHtml(gifts)}<i class="ctap">${esc(KEY.tapOn)}</i><div class="rcardwrap"></div>`;
  host.hidden = false; void host.offsetWidth; host.classList.add('play');
  Music.hush(true);
  const at = (t, fn) => c.timers.push(setTimeout(() => { if (cur === c) fn(); }, Math.max(0, t)));
  // 1. the stage. Under Reduce Motion it is drawn and settled at once — the short fade is the whole of it
  if (st.start) { try { st.start(host.querySelector('.rstage'), { quick, silent: !!o.silent }); } catch (e) { } }
  /* item 6 asks for the symbols to come OUT OF THE CHEST, so once the stage has drawn itself the gift row moves inside it, directly under
     the chest and above the chest's own line of text — otherwise they rise at the foot of the screen, a long way from what they came from.
     A stage with no text of its own (a key's — its drawing is the ring behind this host) leaves the row where it is. */
  const txt = host.querySelector('.rstage .ctxt'), row = host.querySelector('.rgifts');
  if (txt && row && gifts.length) txt.parentNode.insertBefore(row, txt);
  if (!quick && st.step) for (const s of (st.steps || [])) at(s.at, () => { host.dataset.step = s.name; try { st.step(s.name, s); } catch (e) { } });
  // 2. the gifts, each with its own small sound a step above the one before (item 6 — the reward moment is not silent)
  gifts.forEach((g, i) => at(giftAt + i * giftGap, () => { if (!o.silent) Snd.gift(i); }));
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
  c.host.querySelector('.rcardwrap').innerHTML = cardHtml(c.card);
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
