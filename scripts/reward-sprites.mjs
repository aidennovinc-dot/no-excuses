/* No Excuses — the mock excuse-reward figures (build 69, 68.44). NOT part of the gate or the app; run it by hand:
 *     node scripts/reward-sprites.mjs
 *
 * One horizontal sprite sheet per figure kind — dancer, clapper, sweeper — written to assets/rewards/<kind>.png. Each is a 3D-LOOKING figure
 * played as a FLAT animation (no 3D engine): a capsule body lit from the left with a shaded right side, a sphere head with a highlight, limbs that
 * are shaded cylinders swinging across the frames, and a soft drop shadow under the feet. Stand-ins until Aiden's dance clip exists; a real sheet
 * drops in at the same path with the same frame count and size (config/excuses.js REWARD_FIG).
 *
 * Drawn on a canvas in headless Chrome (the gate's own _smoke/chrome.mjs, so no new dependency) and read back as PNG. Every frame is `w` x `h`
 * CSS pixels drawn at 2x, so the sheet is (2w * frames) x 2h. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from '../_smoke/chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { REWARD_FIG } = await import(pathToFileURL(path.join(ROOT, 'config', 'excuses.js')).href);
const OUT = path.join(ROOT, 'assets', 'rewards');
fs.mkdirSync(OUT, { recursive: true });

const browser = await launch();
const page = await browser.newPage();
await page.goto('data:text/html,<canvas id=c></canvas>');
for (const [kind, f] of Object.entries(REWARD_FIG)) {
  if (!f.sheet) continue;
  const b64 = await page.evaluate((kind, f) => {
    const S = 2, W = f.w, H = f.h, N = f.frames;
    const c = document.getElementById('c'); c.width = W * N * S; c.height = H * S;
    const x = c.getContext('2d');
    // a shaded cylinder from (ax,ay) to (bx,by): a dark rim, the base colour, a lit stripe on its left side, rounded ends
    const cyl = (ax, ay, bx, by, w, base, lit) => {
      x.lineCap = 'round';
      x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = w + 1.6; x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
      x.strokeStyle = base; x.lineWidth = w; x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, o = w * .22, s = nx < 0 ? -1 : 1;
      x.strokeStyle = lit; x.lineWidth = w * .34; x.beginPath(); x.moveTo(ax - nx * o * s, ay - ny * o * s); x.lineTo(bx - nx * o * s, by - ny * o * s); x.stroke(); };
    // a jointed limb: from a root, an upper part at angle a1 and a lower part at a2 (radians, 0 = straight down)
    const limb = (rx, ry, a1, l1, a2, l2, w, base, lit) => { const kx = rx + Math.sin(a1) * l1, ky = ry + Math.cos(a1) * l1;
      const ex = kx + Math.sin(a2) * l2, ey = ky + Math.cos(a2) * l2; cyl(rx, ry, kx, ky, w, base, lit); cyl(kx, ky, ex, ey, w * .9, base, lit); return [ex, ey]; };
    // the capsule body, lit from the left: a horizontal gradient light -> base -> shadow, a specular stripe, a dark rim
    const body = (cx, top, bot, w, light, base, dark) => { const r = w / 2;
      const g = x.createLinearGradient(cx - r, 0, cx + r, 0); g.addColorStop(0, light); g.addColorStop(.45, base); g.addColorStop(1, dark);
      x.beginPath(); x.moveTo(cx - r, top + r); x.arc(cx, top + r, r, Math.PI, 0); x.lineTo(cx + r, bot - r); x.arc(cx, bot - r, r, 0, Math.PI); x.closePath();
      x.fillStyle = g; x.fill(); x.lineWidth = .9; x.strokeStyle = 'rgba(0,0,0,.6)'; x.stroke();
      x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(cx - r * .45, (top + bot) / 2, r * .18, (bot - top) * .3, 0, 0, Math.PI * 2); x.fill(); };
    // the sphere head: a radial gradient off its upper left, a highlight, two eyes and a mouth (`mood`: 0 flat, 1 smile)
    const head = (cx, cy, r, light, base, dark, mood, look = 0) => { const g = x.createRadialGradient(cx - r * .4, cy - r * .45, r * .1, cx, cy, r * 1.05);
      g.addColorStop(0, light); g.addColorStop(.55, base); g.addColorStop(1, dark);
      x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = g; x.fill(); x.lineWidth = .9; x.strokeStyle = 'rgba(0,0,0,.6)'; x.stroke();
      x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.ellipse(cx - r * .38, cy - r * .42, r * .22, r * .14, -.6, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#1a1a1a'; const ex = cx + look * r * .25; x.beginPath(); x.arc(ex - r * .3, cy - r * .05, r * .11, 0, 7); x.arc(ex + r * .3, cy - r * .05, r * .11, 0, 7); x.fill();
      x.strokeStyle = '#1a1a1a'; x.lineWidth = .9; x.lineCap = 'round'; x.beginPath();
      if (mood) { x.arc(ex, cy + r * .2, r * .3, .25 * Math.PI, .75 * Math.PI); } else { x.moveTo(ex - r * .22, cy + r * .42); x.lineTo(ex + r * .22, cy + r * .42); }
      x.stroke(); };
    const shadow = (cx, cy, rx) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, rx); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.save(); x.translate(cx, cy); x.scale(1, .28); x.translate(-cx, -cy); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rx, 0, 7); x.fill(); x.restore(); };
    const P = f.paint;
    for (let i = 0; i < N; i++) {
      x.save(); x.translate(i * W * S, 0); x.scale(S, S);
      const t = i / N * Math.PI * 2, cx = W / 2, floor = H - 3;
      shadow(cx, floor, W * .34);
      if (kind === 'dancer') {
        const sway = Math.sin(t) * 3, bob = Math.abs(Math.sin(t)) * 3, hip = floor - 21 + bob, sh = hip - 15;
        const kneeL = Math.max(0, Math.sin(t)) * .9, kneeR = Math.max(0, -Math.sin(t)) * .9;
        limb(cx - 3 + sway * .5, hip, -.12 - kneeL * .5, 10, .1 + kneeL * .5, 10, 4.2, P.limb, P.limbLit);
        limb(cx + 3 + sway * .5, hip, .12 + kneeR * .5, 10, -.1 - kneeR * .5, 10, 4.2, P.limb, P.limbLit);
        body(cx + sway, sh - 3, hip + 3, 12, P.light, P.base, P.dark);
        // the arms: one up, one down, swapping — the disco point
        const up = Math.sin(t);
        limb(cx + sway - 5, sh + 1, -Math.PI * (.6 + .32 * up), 7.5, -Math.PI * (.8 + .2 * up), 7, 3.6, P.limb, P.limbLit);
        limb(cx + sway + 5, sh + 1, Math.PI * (.6 - .32 * up), 7.5, Math.PI * (.8 - .2 * up), 7, 3.6, P.limb, P.limbLit);
        head(cx + sway * 1.3, sh - 9, 6.5, P.headLight, P.head, P.headDark, 1, Math.sin(t) * .6);
      } else if (kind === 'clapper') {
        // a slow clap: the hands drift apart and meet in front of the chest once a loop, a deadpan face
        const hip = floor - 21, sh = hip - 15, open = (1 + Math.cos(t)) / 2, gap = 2 + open * 9;
        limb(cx - 3, hip, -.05, 10, .05, 10, 4.2, P.limb, P.limbLit);
        limb(cx + 3, hip, .05, 10, -.05, 10, 4.2, P.limb, P.limbLit);
        body(cx, sh - 3, hip + 3, 12, P.light, P.base, P.dark);
        const hy = sh + 6, lx = cx - gap, rx = cx + gap;
        cyl(cx - 5, sh + 1, cx - 7, sh + 7, 3.6, P.limb, P.limbLit); cyl(cx - 7, sh + 7, lx, hy, 3.4, P.limb, P.limbLit);
        cyl(cx + 5, sh + 1, cx + 7, sh + 7, 3.6, P.limb, P.limbLit); cyl(cx + 7, sh + 7, rx, hy, 3.4, P.limb, P.limbLit);
        if (open < .08) { x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = .9; x.beginPath();
          for (const a of [-2.4, -1.6, -.8]) { x.moveTo(cx + Math.cos(a) * 4, hy - 2 + Math.sin(a) * 4); x.lineTo(cx + Math.cos(a) * 7, hy - 2 + Math.sin(a) * 7); } x.stroke(); }
        head(cx, sh - 9, 6.5, P.headLight, P.head, P.headDark, 0, 0);
      } else if (kind === 'sweeper') {
        // walking right, bent a little forward, the broom pushed along the floor ahead of the feet
        const hip = floor - 20, sh = hip - 14, step = Math.sin(t), lean = 2;
        limb(cx - 2, hip, -.45 * step, 10, -.45 * step + Math.max(0, step) * .5, 10, 4.2, P.limb, P.limbLit);
        limb(cx + 2, hip, .45 * step, 10, .45 * step + Math.max(0, -step) * .5, 10, 4.2, P.limb, P.limbLit);
        body(cx + lean, sh - 3, hip + 3, 11, P.light, P.base, P.dark);
        const push = Math.sin(t * 2) * 3, bx = cx + 14 + push, by = floor - 1;
        // the broom: a wooden handle from the hands to the head, then the straw
        x.lineCap = 'round'; x.strokeStyle = '#3a2412'; x.lineWidth = 2.6; x.beginPath(); x.moveTo(cx + 1, sh - 2); x.lineTo(bx, by - 4); x.stroke();
        x.strokeStyle = '#B07A3E'; x.lineWidth = 1.8; x.beginPath(); x.moveTo(cx + 1, sh - 2); x.lineTo(bx, by - 4); x.stroke();
        const sg = x.createLinearGradient(bx - 5, 0, bx + 6, 0); sg.addColorStop(0, '#F3D27A'); sg.addColorStop(1, '#A9822E');
        x.fillStyle = sg; x.beginPath(); x.moveTo(bx - 2, by - 5); x.lineTo(bx + 3, by - 5); x.lineTo(bx + 7, by); x.lineTo(bx - 5, by); x.closePath(); x.fill();
        x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = .7; x.stroke();
        x.strokeStyle = 'rgba(90,60,20,.7)'; x.lineWidth = .5; x.beginPath(); for (let k = -3; k <= 5; k += 2) { x.moveTo(bx + k * .5, by - 4.5); x.lineTo(bx + k, by); } x.stroke();
        // both arms on the handle
        cyl(cx + lean - 4, sh + 1, cx + 2, sh + 6 + push * .2, 3.4, P.limb, P.limbLit); cyl(cx + 2, sh + 6 + push * .2, cx + 6 + push * .5, sh + 4, 3.2, P.limb, P.limbLit);
        cyl(cx + lean + 4, sh + 1, cx + 8, sh + 8, 3.4, P.limb, P.limbLit); cyl(cx + 8, sh + 8, cx + 10 + push * .7, sh + 9, 3.2, P.limb, P.limbLit);
        head(cx + lean + 1, sh - 9, 6.2, P.headLight, P.head, P.headDark, 1, .7);
      }
      x.restore();
    }
    return c.toDataURL('image/png').split(',')[1];
  }, kind, f);
  const file = path.join(ROOT, f.sheet);
  fs.writeFileSync(file, Buffer.from(b64, 'base64'));
  console.log(`${f.sheet}  ${f.frames} frames of ${f.w}x${f.h} (drawn 2x)  ${fs.statSync(file).size} bytes`);
}
await browser.close();
