// The Drain, tycoon mode: the picture. One canvas behind a scrolling column of controls.
// Logical width is always 400; the page scales it. Everything here only reads state.
import { pal } from "./scene.js";
import { MAX_LV, EL_V, elCap, whCap, spd, auto } from "./mine.js";

export const W = 400, TOP = 128, CTRL = 112, LV0 = TOP + CTRL, LVH = 80, GROUND = 112;
export const levelY = i => LV0 + i * LVH;
export const totalH = n => LV0 + Math.min(n + 1, MAX_LV) * LVH + 16;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rgb = (c, a = 1, m = 1) => `rgba(${Math.round(c[0] * m)},${Math.round(c[1] * m)},${Math.round(c[2] * m)},${a})`;
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const rnd = (a, b) => a + Math.random() * (b - a);
const glow = (c, x, y, r, col, a) => {
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgb(col, a)); g.addColorStop(1, rgb(col, 0));
  c.globalCompositeOperation = "lighter"; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalCompositeOperation = "source-over";
};
const HATS = ["#ffd23c", "#f2f2f2", "#ff5a4f", "#6fd3ff"];

function miner(c, x, yF, face, mode, t, hat, sack, w) {
  c.save(); c.translate(x, yF); c.scale(face, 1);
  const walk = mode === "walk", bob = walk ? Math.abs(Math.sin(t * 12 + w)) * 1.4 : 0, sw = walk ? Math.sin(t * 12 + w) * 3 : 0;
  c.strokeStyle = "#16222a"; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-1.6, -6 - bob); c.lineTo(-1.6 + sw, 0); c.moveTo(1.6, -6 - bob); c.lineTo(1.6 - sw, 0); c.stroke();
  c.fillStyle = "#3c6b8a"; c.fillRect(-4, -16 - bob, 8, 10);
  c.fillStyle = "#e8b48a"; c.beginPath(); c.arc(0, -19 - bob, 3.4, 0, 7); c.fill();
  c.fillStyle = hat; c.beginPath(); c.arc(0, -20 - bob, 3.9, Math.PI, 0); c.fill();
  glow(c, 3, -21 - bob, 7, [255, 240, 170], .7);
  if (mode === "dig") {
    const a = -1.3 + Math.sin(t * 9 + w) * .9;
    c.save(); c.translate(3, -13); c.rotate(a); c.strokeStyle = "#7a5a3a"; c.lineWidth = 1.7; c.beginPath(); c.moveTo(0, 0); c.lineTo(10, 0); c.stroke();
    c.strokeStyle = "#a9b4bb"; c.lineWidth = 2; c.beginPath(); c.moveTo(9, -4); c.lineTo(9, 4); c.stroke(); c.restore();
  } else if (sack) { c.fillStyle = "#8b6b3b"; c.beginPath(); c.arc(-2, -15 - bob, 5, 0, 7); c.fill(); c.fillStyle = "#b3904f"; c.fillRect(-4, -19 - bob, 4, 2); }
  c.restore();
}

export class MineView {
  constructor(cv) { this.cv = cv; this.c = cv.getContext("2d"); this.t = 0; this.k = 1; this.parts = []; this.pulley = 0; this.coins = 0; this.flash = []; }
  fit(cssW, cssH) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(cssW * dpr); this.cv.height = Math.round(cssH * dpr); this.k = this.cv.width / W; this.viewH = this.cv.height / this.k;
  }
  feed(ev) {   // events from the simulation become little effects
    for (const e of ev) {
      if (e.t === "sell") { this.coins = Math.min(1, this.coins + .35); for (let i = 0; i < 10; i++) this.parts.push({ k: "coin", x: 350 + rnd(-14, 14), y: GROUND - 20, vx: rnd(-40, 40), vy: rnd(-150, -80), g: 420, life: 0, max: 1 }); }
      else if (e.t === "unload") this.flash.push({ x: 140, y: 82, life: 0 });
    }
  }
  elevPx(y, n) { return y <= 1 ? lerp(GROUND - 28, levelY(0) + LVH - 34, clamp(y, 0, 1)) : levelY(Math.floor(y) - 1) + LVH - 34 + (y - Math.floor(y)) * LVH; }

  draw(st, rt, dt, scrollY, od) {
    const c = this.c, k = this.k, n = st.levels.length; this.t += dt;
    const t = this.t, y0 = scrollY, y1 = scrollY + this.viewH;
    for (const p of this.parts) { p.life += dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.parts = this.parts.filter(p => p.life < p.max); this.coins = Math.max(0, this.coins - dt * .1);
    this.flash = this.flash.filter(f => (f.life += dt) < .5);
    const e = rt.el, moving = e.state === "down" || e.state === "up"; if (moving) this.pulley += dt * EL_V * spd(st.elev) * (e.state === "down" ? 1 : -1) * (od ? 2 : 1) * 2;
    c.setTransform(k, 0, 0, k, 0, -scrollY * k);
    c.fillStyle = "#06121a"; c.fillRect(0, y0, W, y1 - y0 + 2);
    if (y0 < LV0) this.surface(c, st, rt, t);
    for (let i = 0; i <= n && i < MAX_LV; i++) { const ly = levelY(i); if (ly + LVH < y0 || ly > y1) continue; this.level(c, i, st, rt, i >= n, t); }
    this.shaft(c, st, rt, n, y0, y1);
    for (const p of this.parts) {
      const a = 1 - p.life / p.max;
      if (p.k === "coin") { const w = Math.abs(Math.cos(p.life * 9)); c.fillStyle = `rgba(255,214,106,${Math.min(1, a * 2)})`; c.beginPath(); c.ellipse(p.x, p.y, 3.2 * w + .6, 3.2, 0, 0, 7); c.fill(); }
      else if (p.k === "spark") { c.strokeStyle = `rgba(255,210,120,${a})`; c.lineWidth = 1.2; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * .03, p.y - p.vy * .03); c.stroke(); }
    }
    if (od) { c.fillStyle = "rgba(255,190,70,.07)"; c.fillRect(0, y0, W, y1 - y0); }
  }

  surface(c, st, rt, t) {
    const g = c.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, "#0a1024"); g.addColorStop(.65, "#3a2346"); g.addColorStop(1, "#d9713a");
    c.fillStyle = g; c.fillRect(0, 0, W, GROUND);
    for (let i = 0; i < 20; i++) { c.fillStyle = `rgba(255,255,255,${.25 + .5 * Math.abs(Math.sin(t * .8 + i))})`; c.fillRect(hash(i) * W, hash(i + 30) * 70, 1.2, 1.2); }
    c.fillStyle = "#1c1730"; c.beginPath(); c.moveTo(0, GROUND); for (let x = 0; x <= W; x += 12) c.lineTo(x, GROUND - 28 - 12 * Math.sin(x * .03) - 7 * Math.sin(x * .11)); c.lineTo(W, GROUND); c.fill();
    // ground and the rock under it
    c.fillStyle = "#3b3340"; c.fillRect(0, GROUND, W, 5); c.fillStyle = "#2a2230"; c.fillRect(0, GROUND + 5, W, LV0 - GROUND - 5);
    for (let i = 0; i < 9; i++) { c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect(hash(i) * W, GROUND + 14 + hash(i + 5) * 70, 26 + hash(i + 9) * 40, 2); }
    // elevator tower
    c.fillStyle = "#231d2b"; c.fillRect(16, 40, 5, GROUND - 40); c.fillRect(59, 40, 5, GROUND - 40); c.fillRect(14, 36, 52, 6);
    c.strokeStyle = "#231d2b"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(21, 50); c.lineTo(59, GROUND - 6); c.moveTo(59, 50); c.lineTo(21, GROUND - 6); c.stroke();
    c.save(); c.translate(40, 44); c.rotate(this.pulley * .12); c.strokeStyle = "#8a97a2"; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 9, 0, 7); c.moveTo(-9, 0); c.lineTo(9, 0); c.moveTo(0, -9); c.lineTo(0, 9); c.stroke(); c.restore();
    const f = Math.sin(t * 2) > 0 ? 1 : .3; glow(c, 18, 34, 10, [255, 80, 70], .7 * f);
    // warehouse
    c.fillStyle = "#2d2838"; c.fillRect(76, 56, 122, GROUND - 56); c.fillStyle = "#3a3346"; c.beginPath(); c.moveTo(70, 56); c.lineTo(137, 34); c.lineTo(204, 56); c.closePath(); c.fill();
    c.fillStyle = "#15111d"; c.fillRect(96, 74, 82, GROUND - 74);
    const cap = whCap(st.wh), fill = clamp(rt.wh.stock / Math.max(1, cap * 2), 0, 1), crates = Math.ceil(fill * 10);
    for (let i = 0; i < crates; i++) { const cx = 100 + (i % 5) * 15, cy = GROUND - 12 - Math.floor(i / 5) * 13; c.fillStyle = "#7a5a3a"; c.fillRect(cx, cy, 13, 12); c.fillStyle = "#ffd76a"; c.fillRect(cx + 2, cy + 2, 9, 3); }
    c.fillStyle = "#ff8a2b"; c.font = "700 9px 'IBM Plex Mono',monospace"; c.textAlign = "center"; c.fillText("WAREHOUSE", 137, 50);
    // hauler on the road to market
    const w = rt.wh; let hx = 204;
    if (w.state === "go") hx = lerp(204, 306, clamp(w.t, 0, 1)); else if (w.state === "back") hx = lerp(306, 204, clamp(w.t, 0, 1));
    const dir = w.state === "back" ? -1 : 1;
    c.fillStyle = "#4a4452"; c.fillRect(200, GROUND - 2, 116, 2);
    c.save(); c.translate(hx, GROUND - 2); c.scale(dir, 1);
    c.fillStyle = "#ff8a2b"; c.fillRect(-14, -14, 28, 10); c.fillStyle = "#c95a0f"; c.fillRect(6, -19, 9, 6);
    if (w.state === "go") { c.fillStyle = "#ffd76a"; c.fillRect(-12, -19, 16, 6); c.fillStyle = "#7a5a3a"; c.fillRect(-12, -16, 16, 2); }
    c.fillStyle = "#111"; for (const x of [-8, 9]) { c.beginPath(); c.arc(x, -3, 3.4, 0, 7); c.fill(); }
    c.restore();
    // market
    c.fillStyle = "#2d2838"; c.fillRect(322, 70, 70, GROUND - 70);
    for (let i = 0; i < 7; i++) { c.fillStyle = i % 2 ? "#f0e6d0" : "#e04a3f"; c.fillRect(318 + i * 11, 62, 11, 14); }
    c.fillStyle = "#15111d"; c.fillRect(336, 84, 40, GROUND - 84);
    c.fillStyle = "#ffd76a"; c.font = "700 9px 'IBM Plex Mono',monospace"; c.fillText("MARKET", 357, 58);
    for (let i = 0; i < Math.ceil(this.coins * 9); i++) { c.fillStyle = "#ffd76a"; c.beginPath(); c.ellipse(342 + (i % 5) * 7, GROUND - 4 - Math.floor(i / 5) * 4, 3, 2, 0, 0, 7); c.fill(); }
    const hint = (x, y) => { const b = 2 * Math.sin(t * 4); c.fillStyle = "#ff8a2b"; c.font = "700 10px 'IBM Plex Mono',monospace"; c.textAlign = "center"; c.fillText("TAP", x, y + b); };
    if (!auto(st.elev) && rt.el.state === "idle" && rt.lv.some(r => r.dep > 0)) hint(40, 26);
    if (!auto(st.wh) && rt.wh.state === "idle" && rt.wh.stock > 0) hint(137, 26);
    for (const fl of this.flash) glow(c, fl.x, fl.y + 40, 40, [255, 200, 120], .3 * (1 - fl.life * 2));
    c.textAlign = "left";
  }

  shaft(c, st, rt, n, y0, y1) {
    const bot = levelY(Math.min(n, MAX_LV) - 1) + LVH;
    c.fillStyle = "#04080c"; c.fillRect(22, Math.max(y0, TOP), 36, Math.min(y1, bot) - Math.max(y0, TOP));
    c.strokeStyle = "#1c2a33"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(25, TOP); c.lineTo(25, bot); c.moveTo(55, TOP); c.lineTo(55, bot); c.stroke();
    const e = rt.el, cy = this.elevPx(e.y, n), ct = cy; if (ct + 28 < y0 || ct - 70 > y1) return;
    c.strokeStyle = "#0c1419"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(40, 44); c.lineTo(40, ct); c.stroke();
    const g = c.createLinearGradient(24, 0, 56, 0); g.addColorStop(0, "#b5500e"); g.addColorStop(.5, "#ff8a2b"); g.addColorStop(1, "#b5500e");
    c.fillStyle = g; c.fillRect(24, ct, 32, 28); c.fillStyle = "#15111d"; c.fillRect(28, ct + 4, 24, 14);
    const fill = clamp(e.carried / Math.max(1, elCap(st.elev)), 0, 1); c.fillStyle = "#ffd76a"; c.fillRect(28, ct + 18 - 14 * fill, 24, 14 * fill);
    glow(c, 40, ct + 8, 20, [255, 200, 120], .3);
  }

  level(c, i, st, rt, locked, t) {
    const y0 = levelY(i), P = pal(i * 90 + 20), floor = y0 + LVH - 12;
    c.fillStyle = rgb(P.rock, 1, .62); c.fillRect(0, y0, W, LVH);
    for (let s = 0; s < 4; s++) { c.fillStyle = "rgba(0,0,0,.16)"; c.fillRect(hash(i * 7 + s) * 300, y0 + 6 + hash(i + s * 3) * (LVH - 12), 40 + hash(s + i) * 80, 2); }
    if (locked) {
      c.fillStyle = "rgba(0,0,0,.45)"; c.fillRect(62, y0 + 6, W - 62, LVH - 12);
      for (let s = 0; s < 6; s++) { c.fillStyle = rgb(P.glint, .35 + .3 * Math.sin(t * 2 + s + i)); c.fillRect(80 + hash(s + i * 4) * 300, y0 + 14 + hash(s + 2) * (LVH - 28), 2.4, 2.4); }
      return;
    }
    c.fillStyle = "rgba(4,8,12,.62)"; c.fillRect(62, y0 + 6, W - 62, LVH - 12);
    c.fillStyle = rgb(P.rock, 1, .95); c.fillRect(62, floor, W - 62, 6);
    for (let x = 122; x < 330; x += 70) { c.fillStyle = "#5b3d22"; c.fillRect(x, y0 + 6, 4, floor - y0 - 6); c.fillRect(x - 6, y0 + 6, 16, 4); }
    for (const lx of [150, 284]) { const fl = .8 + .2 * Math.sin(t * 9 + lx); glow(c, lx, y0 + 26, 34, [255, 170, 80], .3 * fl); c.fillStyle = "#ffd28a"; c.beginPath(); c.arc(lx, y0 + 22, 2.2, 0, 7); c.fill(); }
    // deposit pile by the elevator
    const r = rt.lv[i], lv = st.levels[i];
    c.fillStyle = "#5b3d22"; c.fillRect(66, floor - 10, 34, 10);
    const f = clamp(r.dep / Math.max(1, elCap(st.elev) * .5), 0, 1), bits = Math.ceil(f * 14);
    for (let b = 0; b < bits; b++) { const bx = 69 + (b % 6) * 5 + hash(b + i) * 2, by = floor - 13 - Math.floor(b / 6) * 5; c.fillStyle = rgb(P.glint); c.fillRect(bx, by, 4, 4); }
    // ore face
    c.fillStyle = rgb(P.rock, 1, 1.15); c.beginPath(); c.moveTo(352, y0 + 6); for (let y = y0 + 6; y <= floor; y += 8) c.lineTo(352 + 8 * Math.sin(y * .3 + i * 2), y); c.lineTo(W, floor); c.lineTo(W, y0 + 6); c.fill();
    for (let s = 0; s < 6; s++) { const tw = .5 + .5 * Math.sin(t * 3 + s + i); c.fillStyle = rgb(P.glint, .4 + .6 * tw); c.fillRect(362 + hash(s + i) * 30, y0 + 14 + hash(s + 9 + i) * (LVH - 34), 3, 3); }
    // miners
    const workers = Math.min(4, 1 + Math.floor(lv.L / 25)), ph = r.ph, faceX = 344, depX = 108;
    for (let w = 0; w < workers; w++) {
      if (!r.run) { miner(c, faceX - w * 11, floor, 1, "idle", t, HATS[w % 4], false, w); continue; }
      const q = (ph + w * .17) % 1; let x, face = 1, mode = "dig", sack = false;
      if (q < .5) { x = faceX - w * 11; mode = "dig"; if (Math.random() < .05) this.parts.push({ k: "spark", x: faceX + 8, y: floor - 12, vx: rnd(20, 90), vy: rnd(-90, 10), g: 240, life: 0, max: .35 }); }
      else if (q < .78) { const u = (q - .5) / .28; x = lerp(faceX - w * 11, depX + w * 8, u); face = -1; mode = "walk"; sack = true; }
      else if (q < .86) { x = depX + w * 8; face = -1; mode = "idle"; }
      else { const u = (q - .86) / .14; x = lerp(depX + w * 8, faceX - w * 11, u); face = 1; mode = "walk"; }
      miner(c, x, floor, face, mode, t, HATS[w % 4], sack, w);
    }
    if (!r.run && !auto(lv)) { const b = 2 * Math.sin(t * 4); c.fillStyle = "#ff8a2b"; c.font = "700 10px 'IBM Plex Mono',monospace"; c.textAlign = "center"; c.fillText("TAP", faceX - 10, floor - 34 + b); c.textAlign = "left"; }
  }
}
