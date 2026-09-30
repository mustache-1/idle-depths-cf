// The Drain — the picture. One canvas that draws the shaft, your rig (built from your own
// layout), its crew, and a small set piece for every kind of fork. Nothing here decides
// anything; index.html tells it what happened and it plays it back.

const W = 400, H = 300, CX = 200, CY = 116, PPM = 3;   // logical size, rig position, px per metre
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const ease = t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const rnd = (a, b) => a + Math.random() * (b - a);

// what the shaft looks like at each depth
const PAL = [
  { d: 0,    bg: [9, 28, 40],  rock: [48, 64, 74], rim: [255, 170, 90],  glint: [255, 200, 90] },
  { d: 280,  bg: [12, 12, 38], rock: [40, 36, 72], rim: [130, 170, 255], glint: [120, 210, 255] },
  { d: 700,  bg: [10, 5, 18],  rock: [40, 22, 52], rim: [230, 100, 200], glint: [220, 130, 255] },
  { d: 1200, bg: [18, 4, 8],   rock: [58, 26, 28], rim: [255, 110, 70],  glint: [255, 120, 80] },
];
export function pal(d) {
  let i = 0; while (i < PAL.length - 2 && d > PAL[i + 1].d) i++;
  const a = PAL[i], b = PAL[i + 1], t = clamp((d - a.d) / (b.d - a.d), 0, 1);
  return { bg: mix(a.bg, b.bg, t), rock: mix(a.rock, b.rock, t), rim: mix(a.rim, b.rim, t), glint: mix(a.glint, b.glint, t) };
}

// ---- sound: small synth, created on the first tap (browsers require that) ----
export const Sfx = {
  ctx: null, muted: false, drillNode: null,
  init() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {} }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },
  tone(f, dur, type = "sine", vol = .08, slide = 0, delay = 0) {
    if (this.muted || !this.ctx) return;
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .02);
  },
  noise(dur, vol = .1, freq = 800, delay = 0) {
    if (this.muted || !this.ctx) return;
    const c = this.ctx, n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + delay;
    s.buffer = buf; f.type = "lowpass"; f.frequency.value = freq; g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination); s.start(t);
  },
  click() { this.tone(520, .05, "square", .03); },
  clank() { this.noise(.25, .22, 1400); this.tone(95, .3, "triangle", .18, -40); },
  coin() { this.tone(988, .09, "square", .05); this.tone(1319, .18, "square", .05, 0, .07); },
  air() { this.tone(330, .25, "sine", .06, 220); },
  warn() { this.tone(440, .12, "square", .05); this.tone(440, .12, "square", .05, 0, .2); },
  hum() { this.tone(110, 1.4, "sine", .09, 4); this.tone(165, 1.4, "sine", .05, 6, .05); },
  rumble() { this.noise(1.1, .2, 160); },
  fanfare() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .3, "triangle", .07, 0, i * .11)); },
  lose() { [330, 262, 196, 147].forEach((f, i) => this.tone(f, .4, "sawtooth", .05, -20, i * .18)); },
  drill(on) {
    if (!this.ctx || this.muted) on = false;
    if (on && !this.drillNode) {
      const c = this.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = "sawtooth"; o.frequency.value = 52; f.type = "lowpass"; f.frequency.value = 260; g.gain.value = 0;
      o.connect(f).connect(g).connect(c.destination); o.start(); g.gain.linearRampToValueAtTime(.07, c.currentTime + .2);
      this.drillNode = { o, g };
    } else if (!on && this.drillNode) {
      const { o, g } = this.drillNode, c = this.ctx; g.gain.linearRampToValueAtTime(0, c.currentTime + .25); o.stop(c.currentTime + .3); this.drillNode = null;
    }
  },
};

// ---- set pieces: one per fork. Origin is the middle of the open water below the rig. ----
const glow = (c, x, y, r, col, a) => {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgb(col, a)); g.addColorStop(1, rgb(col, 0));
  c.globalCompositeOperation = "lighter"; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalCompositeOperation = "source-over";
};
const PIECES = {
  ping(c, t) {   // a wreck on the ledge and sonar rings climbing out of it
    c.save(); c.translate(52, 22); c.rotate(-.35); c.fillStyle = "#18232b"; c.beginPath(); c.moveTo(-34, 0); c.lineTo(30, -6); c.lineTo(24, 14); c.lineTo(-26, 16); c.closePath(); c.fill();
    c.fillStyle = "#223540"; c.fillRect(-10, -16, 16, 14); c.restore();
    for (let i = 0; i < 3; i++) { const k = ((t * .6 + i / 3) % 1); c.strokeStyle = `rgba(90,255,190,${(1 - k) * .55})`; c.lineWidth = 2; c.beginPath(); c.arc(52, 22, 8 + k * 70, 0, 7); c.stroke(); }
    glow(c, 52, 22, 30, [80, 255, 180], .35 + .2 * Math.sin(t * 6));
  },
  glass(c, t) {   // warm blue glass spanning the shaft
    c.fillStyle = "rgba(90,170,255,.28)"; c.beginPath(); c.moveTo(-105, -6); c.lineTo(105, -14); c.lineTo(105, 24); c.lineTo(-105, 30); c.closePath(); c.fill();
    c.strokeStyle = "rgba(190,230,255,.55)"; c.lineWidth = 1.5; c.stroke();
    const gx = -120 + ((t * 70) % 260); c.fillStyle = "rgba(255,255,255,.22)"; c.beginPath(); c.moveTo(gx, -10); c.lineTo(gx + 16, -10); c.lineTo(gx - 6, 28); c.lineTo(gx - 22, 28); c.closePath(); c.fill();
    glow(c, 0, 10, 110, [90, 170, 255], .25);
    c.strokeStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.moveTo(-40, -8); c.lineTo(-20, 14); c.lineTo(-34, 28); c.moveTo(50, -12); c.lineTo(38, 10); c.stroke();
  },
  lamp(c, t) {   // someone's marker lamp on a ledge, still burning
    c.fillStyle = "#16212a"; c.fillRect(-110, 34, 90, 10);
    c.fillStyle = "#2b3943"; c.fillRect(-92, 6, 3, 28); c.fillRect(-96, 4, 11, 4);
    const f = .8 + .2 * Math.sin(t * 13) + .1 * Math.sin(t * 5.3);
    glow(c, -90, 2, 60, [255, 160, 60], .55 * f); c.fillStyle = "#ffd28a"; c.beginPath(); c.arc(-90, 1, 3.2, 0, 7); c.fill();
    c.fillStyle = "#3a2a1c"; c.fillRect(-70, 22, 14, 12); c.fillRect(-56, 26, 10, 8); c.fillStyle = "#6b4a2a"; c.fillRect(-70, 22, 14, 3);
  },
  cavern(c, t) {   // the floor is gone: stalactites and weather below
    for (let i = 0; i < 9; i++) { const x = -150 + i * 38 + hash(i) * 20, h = 14 + hash(i + 9) * 30; c.fillStyle = "#1a1b2b"; c.beginPath(); c.moveTo(x - 8, -40); c.lineTo(x + 8, -40); c.lineTo(x, -40 + h); c.closePath(); c.fill(); }
    for (let i = 0; i < 4; i++) { const x = ((t * 14 + i * 110) % 420) - 210, y = 30 + Math.sin(t * .8 + i) * 12; glow(c, x, y, 70, [150, 160, 220], .12); }
    c.fillStyle = "rgba(10,10,30,.55)"; c.fillRect(-200, 38, 400, 60);
  },
  hummer(c, t) {   // the Hum: rings coming off the cab
    for (let i = 0; i < 4; i++) { const k = ((t * .5 + i / 4) % 1); c.strokeStyle = `rgba(190,150,255,${(1 - k) * .6})`; c.lineWidth = 2; c.beginPath(); c.arc(0, -120, 30 + k * 120, .25 * Math.PI, .75 * Math.PI); c.stroke(); }
    c.fillStyle = "rgba(200,160,255,.85)"; c.font = "700 14px 'IBM Plex Mono',monospace"; c.textAlign = "center";
    ["♪", "♫", "♪"].forEach((n, i) => { const k = ((t * .7 + i * .33) % 1); c.globalAlpha = 1 - k; c.fillText(n, -30 + i * 30, -60 - k * 60); }); c.globalAlpha = 1;
  },
  flood(c, t) {   // still black water, slowly breathing
    const top = 4 + Math.sin(t * .8) * 3;
    c.fillStyle = "rgba(10,40,70,.72)"; c.beginPath(); c.moveTo(-210, 120);
    for (let x = -210; x <= 210; x += 10) c.lineTo(x, top + Math.sin(x * .06 + t * 2) * 2.2);
    c.lineTo(210, 120); c.closePath(); c.fill();
    c.strokeStyle = "rgba(150,220,255,.5)"; c.lineWidth = 1.2; c.beginPath();
    for (let x = -210; x <= 210; x += 10) { const y = top + Math.sin(x * .06 + t * 2) * 2.2; x === -210 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke();
    const k = (t * .3) % 1; c.strokeStyle = `rgba(150,220,255,${(1 - k) * .4})`; c.beginPath(); c.ellipse(40, top + 6, 8 + k * 40, 2 + k * 8, 0, 0, 7); c.stroke();
  },
  wreck(c, t) {   // another rig, hanging broken off its cable
    c.save(); c.translate(-62, 12); c.rotate(.42 + Math.sin(t * 1.1) * .03);
    c.fillStyle = "#3b2a22"; c.beginPath(); c.roundRect(-18, -24, 36, 48, 10); c.fill(); c.fillStyle = "#1c120e"; c.fillRect(-18, -4, 36, 6);
    c.strokeStyle = "#0e0a08"; c.lineWidth = 2; c.beginPath(); c.moveTo(-6, 24); c.lineTo(-14, 40); c.moveTo(8, 24); c.lineTo(14, 36); c.stroke();
    c.restore();
    c.strokeStyle = "#0e0a08"; c.beginPath(); c.moveTo(-62 - 8, -10); c.lineTo(-74, -80); c.stroke();
    const f = Math.sin(t * 9) > .2 ? 1 : .15; glow(c, -50, 4, 26, [255, 90, 60], .5 * f);
  },
  pocket(c, t) {   // green mist out of a crack
    c.strokeStyle = "#0a1410"; c.lineWidth = 3; c.beginPath(); c.moveTo(108, -10); c.lineTo(92, 6); c.lineTo(100, 20); c.stroke();
    for (let i = 0; i < 6; i++) { const k = ((t * .25 + i / 6) % 1); glow(c, 92 - k * 100 + Math.sin(t + i) * 10, 8 - k * 30, 26 + k * 34, [110, 255, 160], .3 * (1 - k)); }
  },
  ceiling(c, t) {   // cracks overhead, pebbles coming down
    c.strokeStyle = "rgba(0,0,0,.6)"; c.lineWidth = 2; c.beginPath(); c.moveTo(-70, -150); c.lineTo(-50, -120); c.lineTo(-62, -96); c.moveTo(30, -160); c.lineTo(46, -128); c.lineTo(34, -110); c.stroke();
    for (let i = 0; i < 7; i++) { const k = ((t * .9 + hash(i) * 3) % 1); c.fillStyle = "#5b5560"; c.fillRect(-90 + hash(i + 3) * 180, -150 + k * 240, 3 + hash(i) * 3, 3 + hash(i + 5) * 3); }
  },
  skiff(c, t) {   // a merchant, somehow, with a lantern and nothing holding him up
    c.save(); c.translate(-20, 10 + Math.sin(t * 1.6) * 3); c.rotate(Math.sin(t * 1.2) * .06);
    c.fillStyle = "#3a2b20"; c.beginPath(); c.moveTo(-34, 0); c.lineTo(34, 0); c.lineTo(24, 14); c.lineTo(-24, 14); c.closePath(); c.fill();
    c.strokeStyle = "#2a1e16"; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -34); c.stroke();
    c.fillStyle = "#0c0c10"; c.beginPath(); c.arc(-16, -8, 4.5, 0, 7); c.fill(); c.fillRect(-20.5, -4, 9, 10);
    c.strokeStyle = "#0c0c10"; c.beginPath(); c.moveTo(-14, -2); c.lineTo(-6 + Math.sin(t * 5) * 4, -16); c.stroke();
    glow(c, 0, -30, 34, [255, 190, 90], .6); c.fillStyle = "#ffe0a0"; c.beginPath(); c.arc(0, -30, 3, 0, 7); c.fill();
    c.restore();
  },
  eyes(c, t) {   // pairs of eyes that close when you look
    [[-90, 0, 1], [70, -20, 1.4], [-30, 50, .8], [110, 40, 1.1]].forEach(([x, y, s], i) => {
      const open = Math.max(0, Math.sin(t * .9 + i * 2.1)) > .15 ? 1 : 0; if (!open) return;
      const dx = clamp(-x * .02, -1.5, 1.5);
      c.fillStyle = "rgba(255,230,120,.95)"; c.beginPath(); c.ellipse(x - 6 * s, y, 3.2 * s, 2 * s, 0, 0, 7); c.ellipse(x + 6 * s, y, 3.2 * s, 2 * s, 0, 0, 7); c.fill();
      c.fillStyle = "#000"; c.fillRect(x - 6 * s + dx - .8, y - 2 * s, 1.6, 4 * s); c.fillRect(x + 6 * s + dx - .8, y - 2 * s, 1.6, 4 * s);
      glow(c, x, y, 26, [255, 210, 90], .18);
    });
  },
  jam(c, t) {   // something under the bit
    c.fillStyle = "#555e66"; c.beginPath(); c.moveTo(-50, 26); c.lineTo(50, 22); c.lineTo(58, 44); c.lineTo(-44, 50); c.closePath(); c.fill();
    c.strokeStyle = "#8a97a2"; c.lineWidth = 1.5; c.stroke(); c.fillStyle = "#3a4148"; [-30, 0, 30].forEach(x => { c.beginPath(); c.arc(x, 36, 3, 0, 7); c.fill(); });
    if (Math.sin(t * 17) > .2) glow(c, rnd(-14, 14), 22, 22, [255, 190, 90], .6);
  },
  gate(c, t) {   // black stone doors, runes keeping time with the Hum
    c.fillStyle = "#07060c"; c.fillRect(-90, -30, 180, 120);
    c.strokeStyle = "#1e1a2c"; c.lineWidth = 3; c.strokeRect(-90, -30, 180, 120); c.beginPath(); c.moveTo(0, -30); c.lineTo(0, 90); c.stroke();
    const p = .55 + .45 * Math.sin(t * 3);
    for (let i = 0; i < 7; i++) { const y = -14 + i * 16, x = (i % 2 ? 38 : 22); c.strokeStyle = `rgba(200,140,255,${.35 + .5 * p})`; c.lineWidth = 2; c.beginPath(); c.moveTo(-x, y); c.lineTo(-x + 14, y); c.lineTo(-x + 14, y + 8); c.moveTo(x, y); c.lineTo(x - 14, y); c.lineTo(x - 14, y + 8); c.stroke(); }
    glow(c, 0, 30, 110, [190, 120, 255], .22 * p);
  },
  road(c, t) {   // a carved road along the wall, markers counting down
    c.fillStyle = "#1d1a26"; c.beginPath(); c.moveTo(-210, 54); c.lineTo(210, 34); c.lineTo(210, 60); c.lineTo(-210, 84); c.closePath(); c.fill();
    for (let i = 0; i < 6; i++) { const x = -170 + i * 70, y = 54 - (x + 210) * .05 + 2; c.fillStyle = "#2c2838"; c.fillRect(x, y - 16, 6, 16); const f = .5 + .5 * Math.sin(t * 2 + i); glow(c, x + 3, y - 12, 14, [190, 130, 255], .4 * f); c.fillStyle = `rgba(215,170,255,${.5 + .4 * f})`; c.fillRect(x + 1, y - 13, 4, 2); }
  },
};

export class Scene {
  constructor(canvas, opts = {}) {
    this.cv = canvas; this.c = canvas.getContext("2d"); this.preview = !!opts.preview;
    this.t = 0; this.vd = this.preview ? 160 : 0; this.lastVd = this.vd; this.speed = 0;
    this.tweens = []; this.parts = [];
    this.ev = null; this.evA = 0; this.evT = 0; this.open = 0;
    this.shake = 0; this.flash = null; this.flashA = 0; this.dead = 0; this.hull = 1; this.air = 1;
    this.crew = { hurt: 0, cheer: 0 }; this.rigS = { drill: 1, cool: 0, relay: 0, plate: 0, tank: 0 };
    this.offset = 0; this.dive = false; this.seed = 1;
    this.fit(); new ResizeObserver(() => this.fit()).observe(canvas);
    this.last = performance.now(); requestAnimationFrame(n => this.frame(n));
  }
  fit() {
    const r = this.cv.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.width * H / W * dpr);
    this.k = this.cv.width / W;
  }
  setRig(grid) {
    const n = { drill: 0, cool: 0, relay: 0, plate: 0, tank: 0 };
    for (const g of grid) if (g) n[g]++;
    this.rigS = { ...n, drill: Math.max(1, n.drill) };
  }
  setVitals(h, a) { this.hull = clamp(h, 0, 1); this.air = clamp(a, 0, 1); }
  tween(key, to, ms) {
    return new Promise(res => {
      this.tweens = this.tweens.filter(x => x.key !== key);
      this.tweens.push({ key, from: this[key], to, ms: Math.max(1, ms), t: 0, res });
    });
  }
  // depth on screen sits a little below the real depth so the first fork is already under the mouth
  descend(d, ms = 1300) { this.dive = true; return this.tween("vd", d + 22, ms); }
  showEvent(id) { this.ev = id; this.evT = 0; if (id === "hummer") Sfx.hum(); if (id === "ceiling") Sfx.rumble(); }
  hideEvent() { this.ev = null; }
  react(kind, n = 0) {
    const cx = CX, cy = CY;
    if (kind === "hurt") {
      this.shake = 12; this.flash = [255, 70, 60]; this.flashA = .4; this.crew.hurt = 1.2; Sfx.clank();
      if (navigator.vibrate) { try { navigator.vibrate(60); } catch {} }
      for (let i = 0; i < 14; i++) this.parts.push({ type: "spark", x: cx + rnd(-25, 25), y: cy + rnd(-10, 40), vx: rnd(-90, 90), vy: rnd(-120, 10), g: 300, life: 0, max: rnd(.3, .7), col: [255, rnd(150, 220), 70] });
      for (let i = 0; i < 6; i++) this.parts.push({ type: "chunk", x: cx + rnd(-30, 30), y: cy - 40, vx: rnd(-40, 40), vy: rnd(-30, 20), g: 340, life: 0, max: 1.1, size: rnd(2, 5) });
      this.text(`-${n} hull`, cx + 40, cy - 30, [255, 110, 100]);
    } else if (kind === "loot") {
      this.crew.cheer = 1.4; Sfx.coin();
      for (let i = 0; i < Math.min(16, 4 + n / 6); i++) this.parts.push({ type: "coin", x: cx + rnd(-16, 16), y: cy + 40, vx: rnd(-70, 70), vy: rnd(-200, -110), g: 420, life: 0, max: 1.1 });
      this.text(`+${n} loot`, cx - 40, cy - 30, [255, 214, 106]);
    } else if (kind === "air") {
      Sfx.air();
      for (let i = 0; i < 10; i++) this.parts.push({ type: "bubble", x: cx + rnd(-20, 20), y: cy + rnd(10, 40), vx: rnd(-8, 8), vy: rnd(-50, -20), g: -10, life: 0, max: rnd(1, 1.8), size: rnd(1.5, 3.5) });
      this.text(`+${n} air`, cx + 30, cy - 50, [120, 210, 255]);
    } else if (kind === "hull") {
      this.flash = [120, 255, 190]; this.flashA = .18; this.text(`+${n} hull`, cx + 40, cy - 30, [120, 255, 190]);
    } else if (kind === "loose") {
      this.text(`-${n} air`, cx + 30, cy - 50, [120, 170, 220]);
    }
  }
  text(s, x, y, col) { this.parts.push({ type: "text", txt: s, x, y, vx: 0, vy: -36, g: 0, life: 0, max: 1.6, col }); }
  // a dive ends: surfacing climbs back up to the harbor; dying drops the lights and sinks the rig
  async end(how) {
    this.hideEvent(); Sfx.drill(false);
    if (how === "dead") {
      Sfx.lose(); this.shake = 14; this.flash = [255, 50, 40]; this.flashA = .5;
      await Promise.all([this.tween("dead", 1, 1600), this.tween("offset", 70, 2200)]);
      await this.tween("vd", this.vd, 300);
    } else {
      Sfx.drill(true); await this.tween("vd", 0, 2200 + Math.min(1800, this.vd * 2)); Sfx.drill(false); Sfx.fanfare(); this.crew.cheer = 2.5;
      for (let i = 0; i < 40; i++) this.parts.push({ type: "coin", x: rnd(60, 340), y: rnd(-20, 40), vx: rnd(-30, 30), vy: rnd(40, 120), g: 120, life: 0, max: 2 });
      await this.wait(900);
    }
  }
  reset() { this.dive = false; this.dead = 0; this.offset = 0; this.tweens = []; this.vd = this.preview ? 160 : 0; this.ev = null; this.evA = 0; this.parts = []; this.hull = 1; this.air = 1; }
  wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  frame(now) {
    const dt = Math.min(.05, (now - this.last) / 1000); this.last = now;
    if (this.cv.offsetParent !== null && this.k) { this.update(dt); this.draw(); }
    requestAnimationFrame(n => this.frame(n));
  }
  update(dt) {
    this.t += dt;
    for (const tw of this.tweens) {
      tw.t += dt * 1000; const k = clamp(tw.t / tw.ms, 0, 1); this[tw.key] = lerp(tw.from, tw.to, ease(k));
      if (k >= 1) { tw.done = true; tw.res(); }
    }
    this.tweens = this.tweens.filter(x => !x.done);
    this.speed = (this.vd - this.lastVd) / Math.max(dt, .001); this.lastVd = this.vd;
    const fast = Math.abs(this.speed);
    Sfx.drill(this.dive && fast > 6 && !this.preview);
    this.evA = lerp(this.evA, this.ev ? 1 : 0, Math.min(1, dt * 5)); this.evT += dt;
    this.open = lerp(this.open, this.ev === "cavern" ? 1 : 0, Math.min(1, dt * 1.6));
    this.warnT = (this.warnT || 0) - dt;
    if (this.air < .3 && this.dive && !this.preview && !this.dead && this.warnT <= 0) { Sfx.warn(); this.warnT = 2.2; }
    this.shake = Math.max(0, this.shake - dt * 30); this.flashA = Math.max(0, this.flashA - dt * 1.4);
    this.crew.hurt = Math.max(0, this.crew.hurt - dt); this.crew.cheer = Math.max(0, this.crew.cheer - dt);

    const P = pal(this.vd), sy = this.surfaceY(), hw = this.hw(0);
    if (Math.random() < dt * 9) this.parts.push({ type: "dust", x: rnd(CX - hw, CX + hw), y: -4, vx: rnd(-4, 4), vy: rnd(10, 26), g: 0, life: 0, max: 9, size: rnd(.7, 1.6) });
    if (Math.random() < dt * (1.5 + this.vd / 160)) this.parts.push({ type: "mote", x: rnd(CX - hw, CX + hw), y: rnd(30, H), vx: rnd(-6, 6), vy: rnd(-8, -2), g: 0, life: 0, max: rnd(4, 8), size: rnd(1, 2.2), col: P.glint });
    if (fast > 8) {
      for (let i = 0; i < Math.min(3, fast / 30); i++) this.parts.push({ type: "streak", x: rnd(CX - hw + 6, CX + hw - 6), y: H + 5, vx: 0, vy: -(120 + fast * 3), g: 0, life: 0, max: .6, size: rnd(6, 16) });
      if (Math.random() < .7) this.parts.push({ type: "spark", x: CX + rnd(-16, 16), y: CY + 66 + this.offset, vx: rnd(-50, 50), vy: rnd(30, 120), g: 200, life: 0, max: rnd(.2, .5), col: [255, 200, 120] });
    }
    if (this.hull < .3 && Math.random() < dt * 10) this.parts.push({ type: "smoke", x: CX + rnd(-12, 12), y: CY - 38 + this.offset, vx: rnd(-6, 6), vy: rnd(-26, -12), g: 0, life: 0, max: 1.8, size: rnd(3, 6) });
    if (this.air < .3 && Math.random() < dt * 2.2) this.parts.push({ type: "bubble", x: CX + rnd(-10, 10), y: CY - 40 + this.offset, vx: rnd(-6, 6), vy: rnd(-30, -16), g: -5, life: 0, max: 1.4, size: rnd(1.5, 3) });
    if (this.ev === "jam" && Math.random() < dt * 12) this.parts.push({ type: "spark", x: CX + rnd(-12, 12), y: CY + 58, vx: rnd(-80, 80), vy: rnd(-40, 60), g: 280, life: 0, max: .5, col: [255, 210, 120] });
    if (this.ev === "ceiling" && Math.random() < dt * 12) this.parts.push({ type: "chunk", x: rnd(CX - hw, CX + hw), y: -5, vx: 0, vy: rnd(40, 100), g: 260, life: 0, max: 2.5, size: rnd(1.5, 3.5) });
    for (const p of this.parts) { p.life += dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.type === "streak") p.y += 0; }
    this.parts = this.parts.filter(p => p.life < p.max && p.y > -40 && p.y < H + 40);
    if (this.parts.length > 260) this.parts.splice(0, this.parts.length - 260);
  }
  surfaceY() { return CY + 74 - this.vd * PPM; }
  hw(wy) { return 96 + this.open * 74 + 6 * Math.sin(wy * .004) + (this.vd > 500 ? 6 : 0); }
  wallX(y, side, layer) {
    const wy = y - this.surfaceY(), n = Math.sin(wy * .021 + this.seed) * 8 + Math.sin(wy * .057 + 2 * this.seed) * 5 + Math.sin(wy * .13 + 3 * this.seed) * 2.5;
    const half = this.hw(wy) + (layer ? 70 + 12 * Math.sin(wy * .009 + 1) : 0) + (layer ? n * .5 : n);
    return side < 0 ? CX - half : CX + half;
  }

  draw() {
    const c = this.c, k = this.k, P = pal(this.vd), sy = this.surfaceY();
    c.setTransform(k, 0, 0, k, 0, 0);
    const sh = this.shake; c.save(); if (sh > 0) c.translate(rnd(-sh, sh) * .4, rnd(-sh, sh) * .4);
    c.fillStyle = rgb(P.bg); c.fillRect(-10, -10, W + 20, H + 20);

    // sky and harbor, only while the surface is on screen
    if (sy > -20) this.drawHarbor(c, sy);

    // far wall, near wall
    const y0 = Math.max(0, sy);
    for (const layer of [1, 0]) {
      const shade = layer ? .55 : 1, col = P.rock.map(v => Math.round(v * shade));
      for (const side of [-1, 1]) {
        c.beginPath(); c.moveTo(side < 0 ? -10 : W + 10, y0);
        for (let y = y0; y <= H + 8; y += 6) c.lineTo(this.wallX(y, side, layer), y);
        c.lineTo(side < 0 ? -10 : W + 10, H + 8); c.closePath();
        c.fillStyle = rgb(col); c.fill();
        if (!layer) { c.strokeStyle = rgb(P.rim, .45); c.lineWidth = 1.6; c.beginPath(); for (let y = y0; y <= H + 8; y += 6) { const x = this.wallX(y, side, 0); y === y0 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); }
      }
    }
    // strata, glints and depth plates follow the world
    const wy0 = -sy, first = Math.floor(Math.max(0, wy0) / 34);
    for (let b = first; b * 34 < wy0 + H + 40; b++) {
      const y = sy + b * 34; if (y < y0 || y > H) continue;
      for (const side of [-1, 1]) { const x = this.wallX(y, side, 0); c.strokeStyle = "rgba(0,0,0,.22)"; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + side * (40 + hash(b + side) * 40), y + hash(b * side) * 6 - 3); c.stroke(); }
      const h = hash(b * 1.7), side = h > .5 ? 1 : -1;
      if (h > .35) { const x = this.wallX(y, side, 0) + side * (8 + hash(b + 5) * 30), tw = .5 + .5 * Math.sin(this.t * 2 + b); c.fillStyle = rgb(P.glint, .4 + .6 * tw); c.beginPath(); c.moveTo(x, y - 3); c.lineTo(x + 2.4, y); c.lineTo(x, y + 3); c.lineTo(x - 2.4, y); c.closePath(); c.fill(); glow(c, x, y, 9, P.glint, .3 * tw); }
    }
    const pk = Math.floor(Math.max(0, wy0) / (40 * PPM));
    for (let b = pk; b * 40 * PPM < wy0 + H + 40; b++) {
      if (b < 1) continue; const y = sy + b * 40 * PPM; if (y < 6 || y > H - 4) continue; const x = this.wallX(y, 1, 0) - 38;
      c.fillStyle = "rgba(10,18,24,.85)"; c.fillRect(x, y - 6, 34, 12); c.strokeStyle = rgb(P.rim, .7); c.lineWidth = 1; c.strokeRect(x, y - 6, 34, 12);
      c.fillStyle = rgb(P.rim, .95); c.font = "500 8px 'IBM Plex Mono',monospace"; c.textAlign = "left"; c.fillText(b * 40 + "m", x + 4, y + 3);
    }
    // pipe down the right wall
    c.strokeStyle = "rgba(0,0,0,.35)"; c.lineWidth = 3; c.beginPath(); for (let y = y0; y <= H; y += 6) { const x = this.wallX(y, -1, 0) + 8; y === y0 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke();

    // the set piece for this fork, in the water under the rig
    if (this.ev && PIECES[this.ev] || this.evA > .02 && this.lastEv) {
      const id = this.ev || this.lastEv; if (this.ev) this.lastEv = this.ev;
      c.save(); c.globalAlpha = this.evA; c.translate(CX, CY + 98 + (1 - this.evA) * 14); PIECES[id](c, this.evT); c.restore();
    }

    this.drawRig(c);
    for (const p of this.parts) this.drawPart(c, p);

    // lamp-lit dark: less light the deeper you go
    const dark = clamp(.3 + this.vd / 1800 + this.dead * .4, .3, .85), g = c.createRadialGradient(CX, CY + 20, 30, CX, CY + 20, 230);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${dark})`);
    if (sy < H) { c.fillStyle = g; c.fillRect(-10, Math.max(-10, sy), W + 20, H + 20); }
    if (this.flashA > 0 && this.flash) { c.fillStyle = rgb(this.flash, this.flashA); c.fillRect(-10, -10, W + 20, H + 20); }
    c.restore();
  }

  drawHarbor(c, sy) {
    const g = c.createLinearGradient(0, sy - 240, 0, sy); g.addColorStop(0, "#0a1024"); g.addColorStop(.6, "#3a2346"); g.addColorStop(1, "#d9713a");
    c.fillStyle = g; c.fillRect(-10, -10, W + 20, sy + 10);
    for (let i = 0; i < 26; i++) { const x = hash(i) * W, y = sy - 40 - hash(i + 40) * 230; if (y > -10) { c.fillStyle = `rgba(255,255,255,${.3 + .5 * Math.abs(Math.sin(this.t * .8 + i))})`; c.fillRect(x, y, 1.2, 1.2); } }
    c.fillStyle = "#1c1730"; c.beginPath(); c.moveTo(-10, sy); for (let x = -10; x <= W + 10; x += 14) c.lineTo(x, sy - 30 - 14 * Math.sin(x * .03) - 8 * Math.sin(x * .11)); c.lineTo(W + 10, sy); c.closePath(); c.fill();
    // town on the salt flat: roofs and lit windows
    for (let i = 0; i < 12; i++) { const x = i < 6 ? 6 + i * 14 : 268 + (i - 6) * 20, h = 10 + hash(i + 3) * 16; c.fillStyle = "#120f22"; c.fillRect(x, sy - h - 4, 11, h + 4); c.beginPath(); c.moveTo(x - 1, sy - h - 4); c.lineTo(x + 5.5, sy - h - 10); c.lineTo(x + 12, sy - h - 4); c.fill(); if (hash(i + 9) > .3) { c.fillStyle = `rgba(255,190,90,${.7 + .3 * Math.sin(this.t * 3 + i)})`; c.fillRect(x + 3, sy - h, 3, 3); } }
    // ground lip either side of the mouth, and the gantry that holds the cable
    c.fillStyle = "#3b3340"; c.fillRect(-10, sy - 3, 110 - 10 + 10, 6); c.fillRect(300, sy - 3, 120, 6);
    c.fillStyle = "#231d2b"; c.fillRect(102, sy - 76, 6, 76); c.fillRect(292, sy - 76, 6, 76); c.fillRect(98, sy - 80, 204, 6);
    c.strokeStyle = "#231d2b"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(108, sy - 70); c.lineTo(292, sy - 6); c.moveTo(292, sy - 70); c.lineTo(108, sy - 6); c.stroke();
    const f = Math.sin(this.t * 2) > 0 ? 1 : .3; glow(c, 105, sy - 82, 12, [255, 80, 70], .7 * f); glow(c, 295, sy - 82, 12, [255, 80, 70], .7 * (1.3 - f));
    // a few people on the lip waving at the rig when it is home
    if (this.vd < 60) for (let i = 0; i < 3; i++) { const x = 66 + i * 11, w = this.crew.cheer > 0 ? Math.abs(Math.sin(this.t * 10 + i)) * 4 : 0; c.fillStyle = "#0e0b18"; c.fillRect(x, sy - 14 - w, 4, 11); c.beginPath(); c.arc(x + 2, sy - 17 - w, 2.6, 0, 7); c.fill(); }
  }

  drawRig(c) {
    const t = this.t, S = this.rigS, bob = Math.sin(t * 1.7) * 1.6 + (this.dive ? 0 : 0), ox = CX + Math.sin(t * .9) * 1.2 + (this.dead ? Math.sin(t * 40) * this.dead * 2 : 0), oy = CY + bob + this.offset;
    const lit = 1 - this.dead, drillSpeed = this.dive && Math.abs(this.speed) > 4 ? 3.2 : (this.ev === "jam" ? .4 : .7);
    c.save(); c.translate(ox, oy); c.scale(1.2, 1.2);
    if (this.dead) c.rotate(this.dead * .18 * Math.sin(1.2));
    // cable up to the gantry or off the top of the screen
    c.strokeStyle = "#0c1419"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -38); c.lineTo(0, -oy - 40); c.stroke(); c.strokeStyle = "rgba(255,255,255,.12)"; c.lineWidth = 1; c.beginPath(); c.moveTo(-1, -38); c.lineTo(-1, -oy - 40); c.stroke();
    // lamp cones
    if (lit > .02) for (const s of [-1, 1]) {
      const g = c.createLinearGradient(0, 28, s * 40, 150); g.addColorStop(0, `rgba(255,220,150,${.34 * lit})`); g.addColorStop(1, "rgba(255,220,150,0)");
      c.fillStyle = g; c.beginPath(); c.moveTo(s * 16, 26); c.lineTo(s * 58, 150); c.lineTo(s * 4, 150); c.closePath(); c.fill();
    }
    // tanks, plates, coolant fins and relay masts sit on the body, so the rig looks like the one you built
    for (let i = 0; i < Math.min(4, S.tank); i++) { const s = i % 2 ? 1 : -1, y = -14 + Math.floor(i / 2) * 26; c.fillStyle = "#2a5a6a"; c.beginPath(); c.roundRect(s * 34 - 6, y - 2, 12, 26, 5); c.fill(); c.fillStyle = "rgba(200,245,255,.45)"; c.fillRect(s * 34 - 3, y + 1, 2.5, 20); }
    for (let i = 0; i < Math.min(4, S.cool); i++) { const s = i % 2 ? 1 : -1, y = 18 + Math.floor(i / 2) * 7; c.fillStyle = "#58c8ff"; c.beginPath(); c.moveTo(s * 26, y); c.lineTo(s * 42, y + 8); c.lineTo(s * 26, y + 10); c.closePath(); c.fill(); glow(c, s * 34, y + 6, 14, [100, 200, 255], .35 * lit); }
    for (let i = 0; i < Math.min(3, S.relay); i++) { const x = -14 + i * 14, h = 18 + (i % 2) * 8; c.strokeStyle = "#7a8a94"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, -34); c.lineTo(x, -34 - h); c.stroke(); if (Math.sin(t * 4 + i * 2) > 0 && lit > .3) { glow(c, x, -34 - h, 8, [90, 255, 190], .8); c.fillStyle = "#b8ffe0"; c.beginPath(); c.arc(x, -34 - h, 1.6, 0, 7); c.fill(); } }
    // drill heads
    const nd = Math.min(3, S.drill), xs = nd === 1 ? [0] : nd === 2 ? [-9, 9] : [-15, 0, 15];
    for (const x of xs) {
      c.save(); c.translate(x, 34); c.fillStyle = "#8c949a"; c.beginPath(); c.moveTo(-7, 0); c.lineTo(7, 0); c.lineTo(0, 30); c.closePath(); c.fill(); c.clip();
      c.strokeStyle = "#3a4248"; c.lineWidth = 2; for (let i = 0; i < 5; i++) { const yy = ((i * 6 + t * drillSpeed * 30) % 30); c.beginPath(); c.moveTo(-8, yy - 3); c.lineTo(8, yy + 3); c.stroke(); } c.restore();
    }
    // hull
    const hg = c.createLinearGradient(-28, 0, 28, 0); hg.addColorStop(0, "#b5500e"); hg.addColorStop(.45, "#ff8a2b"); hg.addColorStop(1, "#b5500e");
    c.fillStyle = hg; c.beginPath(); c.roundRect(-28, -36, 56, 72, 16); c.fill();
    c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(-28, 4, 56, 3); c.fillRect(-28, 22, 56, 3);
    for (let i = 0; i < Math.min(6, S.plate); i++) { const s = i % 2 ? 1 : -1, y = -24 + Math.floor(i / 2) * 15; c.fillStyle = "#56606a"; c.beginPath(); c.roundRect(s * 22 - 6, y, 12, 12, 2); c.fill(); c.fillStyle = "#8a96a0"; c.fillRect(s * 22 - 5, y + 1, 10, 2); }
    if (this.hull < .55) { c.strokeStyle = "rgba(0,0,0,.6)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-10, 8); c.lineTo(-4, 16); c.lineTo(-12, 24); c.moveTo(12, -2); c.lineTo(6, 8); c.lineTo(14, 14); c.stroke(); }
    // cab window with the crew
    c.save(); c.beginPath(); c.arc(0, -14, 17, 0, 7); c.clip(); c.fillStyle = lit > .3 ? "#10283a" : "#05090c"; c.fillRect(-20, -34, 40, 40);
    if (lit > .3) glow(c, 0, -12, 18, [255, 200, 120], .28);
    const hurt = this.crew.hurt > 0, cheer = this.crew.cheer > 0, tired = this.air < .3;
    [[-8.5, "#ffd23c"], [0, "#f2f2f2"], [8.5, "#ff5a4f"]].forEach(([x, hat], i) => {
      const dy = (hurt ? 5 : 0) + (cheer ? -Math.abs(Math.sin(t * 11 + i)) * 4 : 0) + (tired ? Math.sin(t * 3 + i) * 1.2 : 0) + (this.dead ? this.dead * 6 : 0), y = -10 + dy;
      c.fillStyle = "#22313a"; c.fillRect(x - 5, y + 3, 10, 12);
      c.fillStyle = "#e8b48a"; c.beginPath(); c.arc(x, y, 4.3, 0, 7); c.fill();
      c.fillStyle = hat; c.beginPath(); c.arc(x, y - 1.6, 4.6, Math.PI, 0); c.fill();
      if (lit > .3) glow(c, x, y - 2, 6, [255, 240, 170], .8);
      const blink = Math.sin(t * .7 + i * 3) > .96; c.fillStyle = "#14100c";
      if (hurt || this.dead) { c.fillRect(x - 2.4, y - .8, 1.6, 1.6); c.fillRect(x + .8, y - .8, 1.6, 1.6); }
      else if (!blink) { c.fillRect(x - 2.2, y, 1.3, 1.6); c.fillRect(x + 1, y, 1.3, 1.6); }
      if (cheer) { c.strokeStyle = "#e8b48a"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 5, y + 9); c.lineTo(x - 7, y + 1 - Math.abs(Math.sin(t * 11 + i)) * 3); c.moveTo(x + 5, y + 9); c.lineTo(x + 7, y + 1 - Math.abs(Math.sin(t * 11 + i + 1)) * 3); c.stroke(); }
    });
    c.restore();
    c.strokeStyle = "#0c1419"; c.lineWidth = 2.5; c.beginPath(); c.arc(0, -14, 17, 0, 7); c.stroke();
    // headlamps and the low-air beacon
    if (lit > .02) { glow(c, -18, 26, 16, [255, 230, 170], .8 * lit); glow(c, 18, 26, 16, [255, 230, 170], .8 * lit); }
    c.fillStyle = lit > .2 ? "#fff4d0" : "#3a3a3a"; c.beginPath(); c.arc(-18, 26, 2.6, 0, 7); c.arc(18, 26, 2.6, 0, 7); c.fill();
    if (this.air < .3 && Math.sin(t * 8) > 0) { glow(c, 0, -40, 26, [255, 60, 50], .9); c.fillStyle = "#ff5a4f"; c.beginPath(); c.arc(0, -38, 3.5, 0, 7); c.fill(); }
    c.restore();
  }

  drawPart(c, p) {
    const a = 1 - p.life / p.max;
    switch (p.type) {
      case "dust": c.fillStyle = `rgba(255,255,255,${.25 * a})`; c.fillRect(p.x, p.y, p.size, p.size); break;
      case "mote": { const tw = .4 + .6 * Math.abs(Math.sin(p.life * 2.2)); c.fillStyle = rgb(p.col, .7 * tw * Math.min(1, a * 3)); c.beginPath(); c.arc(p.x, p.y, p.size, 0, 7); c.fill(); glow(c, p.x, p.y, 8, p.col, .25 * tw); break; }
      case "streak": c.strokeStyle = `rgba(255,255,255,${.18 * a})`; c.lineWidth = 1; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x, p.y + p.size); c.stroke(); break;
      case "spark": c.strokeStyle = rgb(p.col, a); c.lineWidth = 1.4; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * .03, p.y - p.vy * .03); c.stroke(); break;
      case "chunk": c.fillStyle = `rgba(90,82,96,${Math.min(1, a * 2)})`; c.fillRect(p.x, p.y, p.size, p.size); break;
      case "coin": { const w = Math.abs(Math.cos(p.life * 9)); c.fillStyle = `rgba(255,214,106,${Math.min(1, a * 2)})`; c.beginPath(); c.ellipse(p.x, p.y, 3.4 * w + .6, 3.4, 0, 0, 7); c.fill(); c.strokeStyle = `rgba(150,100,10,${a})`; c.lineWidth = .8; c.stroke(); break; }
      case "bubble": c.strokeStyle = `rgba(180,230,255,${.8 * a})`; c.lineWidth = 1; c.beginPath(); c.arc(p.x, p.y, p.size, 0, 7); c.stroke(); break;
      case "smoke": c.fillStyle = `rgba(40,40,46,${.45 * a})`; c.beginPath(); c.arc(p.x, p.y, p.size * (1 + p.life), 0, 7); c.fill(); break;
      case "text": { const s = 1 + Math.max(0, .5 - p.life * 3); c.save(); c.translate(p.x, p.y); c.scale(s, s); c.font = "900 17px 'Big Shoulders Display',Impact,sans-serif"; c.textAlign = "center"; c.lineWidth = 3.5; c.strokeStyle = `rgba(0,0,0,${a})`; c.strokeText(p.txt, 0, 0); c.fillStyle = rgb(p.col, Math.min(1, a * 2)); c.fillText(p.txt, 0, 0); c.restore(); break; }
    }
  }
}
