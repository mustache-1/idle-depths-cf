// The Drain, tycoon mode. Pure economy and simulation: no DOM, no network.
// A shaft of levels digs ore into deposits. An elevator rides down, collects it and brings it
// up to the warehouse. A hauler carries it to market. Whichever of the three is slowest sets
// your income, which is the whole game: find the bottleneck and fix it.

export const MAX_LV = 40;
export const MILE = [10, 25, 50, ...Array.from({ length: 38 }, (_, k) => 75 + 25 * k)];
export const ms = L => { let n = 0; for (const m of MILE) { if (L >= m) n++; else break; } return n; };
export const mult = L => L * Math.pow(2, ms(L));          // every milestone doubles the output
export const nextMile = L => MILE.find(m => m > L) || null;

// foremen: automation plus a boost. Without one the area idles until you tap it.
export const TIERS = [
  { n: "No foreman", m: 1, auto: false },
  { n: "Rookie", m: 1.6, auto: true },
  { n: "Veteran", m: 3.2, auto: true },
  { n: "Legend", m: 8, auto: true },
];
const FORE = [0, 1, 25, 700];           // cost of tier t as a multiple of the area's base
export const EMBER_BONUS = 0.03;        // +3% to everything per ember
export const LV_T = 6, LOAD_T = 0.6, WH_T = 5;

export const unlockCost = i => i === 0 ? 0 : Math.round(110 * Math.pow(6.4, i - 1));
export const baseRate = i => 1.6 * Math.pow(4.3, i);
const AREAS = {
  lv: i => ({ c0: i === 0 ? 7 : unlockCost(i) * 0.11, g: 1.075, fore: i === 0 ? 60 : unlockCost(i) * 1.6 }),
  el: () => ({ c0: 90, g: 1.08, fore: 500 }),
  wh: () => ({ c0: 160, g: 1.08, fore: 1400 }),
};
export const area = (kind, i = 0) => AREAS[kind](i);
export const upCost = (kind, i, L, n = 1) => {          // cost to go from L to L+n
  const a = area(kind, i); return a.c0 * Math.pow(a.g, L) * (Math.pow(a.g, n) - 1) / (a.g - 1);
};
export const maxBuy = (kind, i, L, cash) => {
  const a = area(kind, i), first = a.c0 * Math.pow(a.g, L);
  return Math.max(0, Math.floor(Math.log(1 + cash * (a.g - 1) / first) / Math.log(a.g)));
};
export const foreCost = (kind, i, tier) => Math.round(area(kind, i).fore * FORE[tier]);

export const rate = (st, i) => baseRate(i) * mult(st.levels[i].L) * TIERS[st.levels[i].mgr].m * emb(st);
export const emb = st => 1 + EMBER_BONUS * st.embers;
export const spd = cfg => Math.min(6, Math.pow(1.25, ms(cfg.L))) * Math.pow(TIERS[cfg.mgr].m, .6);
export const elCap = cfg => 60 * mult(cfg.L) * emb({ embers: 0 });
export const whCap = cfg => 90 * mult(cfg.L);
export const EL_V = 2.2;

export function newState() {
  return { cash: 0, lifetime: 0, lifeAll: 0, embers: 0, runs: 0, levels: [{ L: 1, mgr: 0 }], elev: { L: 1, mgr: 0 }, wh: { L: 1, mgr: 0 }, odCharges: 1, odAt: Date.now(), t: Date.now() };
}
export function makeRT(st) {
  return { lv: st.levels.map(() => ({ ph: 0, run: false, dep: 0 })), el: { state: "idle", y: 0, carried: 0, t: 0, tgt: 0, run: false }, wh: { state: "idle", carried: 0, t: 0, stock: 0, run: false }, od: 0, ev: [] };
}
export const ensureRT = (st, rt) => { while (rt.lv.length < st.levels.length) rt.lv.push({ ph: 0, run: false, dep: 0 }); };
export const auto = cfg => TIERS[cfg.mgr].auto;

export function step(st, rt, dt) {
  ensureRT(st, rt);
  const od = rt.od > 0 ? 2 : 1; rt.od = Math.max(0, rt.od - dt);
  st.levels.forEach((lv, i) => {
    const r = rt.lv[i];
    if (!r.run) { if (TIERS[lv.mgr].auto) r.run = true; else return; }
    const before = r.ph; r.ph += dt * od / LV_T;
    if (before < .8 && r.ph >= .8) { r.dep += rate(st, i) * LV_T; rt.ev.push({ t: "drop", i }); }
    if (r.ph >= 1) { r.ph = 0; if (!TIERS[lv.mgr].auto) r.run = false; }
  });
  // elevator
  const e = rt.el, cfg = st.elev, cap = elCap(cfg), v = EL_V * spd(cfg) * od, n = st.levels.length;
  const hasOre = () => rt.lv.some((r, i) => i < n && r.dep > 0);
  if (e.state === "idle") {
    if (hasOre() && (auto(cfg) || e.run)) { e.state = "down"; e.carried = 0; e.run = false; e.tgt = 0; }
  }
  if (e.state === "down") {
    if (!e.tgt) { for (let k = Math.max(1, Math.ceil(e.y + 1e-6)); k <= n; k++) if (rt.lv[k - 1].dep > 0) { e.tgt = k; break; } }
    if (!e.tgt || e.carried >= cap) { e.state = "up"; e.tgt = 0; }
    else { e.y = Math.min(e.tgt, e.y + v * dt); if (e.y >= e.tgt) { e.state = "load"; e.t = 0; } }
  } else if (e.state === "load") {
    e.t += dt * od * spd(cfg) / LOAD_T;
    if (e.t >= 1) {
      const r = rt.lv[e.tgt - 1], take = Math.min(r.dep, cap - e.carried); r.dep -= take; e.carried += take;
      rt.ev.push({ t: "load", i: e.tgt - 1, v: take }); e.state = "down"; e.y = e.tgt + 1e-4; e.tgt = 0;
    }
  } else if (e.state === "up") {
    e.y = Math.max(0, e.y - v * dt); if (e.y <= 0) { e.state = "unload"; e.t = 0; }
  } else if (e.state === "unload") {
    e.t += dt * od * spd(cfg) / LOAD_T;
    if (e.t >= 1) { rt.wh.stock += e.carried; rt.ev.push({ t: "unload", v: e.carried }); e.carried = 0; e.state = "idle"; }
  }
  // warehouse hauler
  const w = rt.wh, wc = st.wh, wcap = whCap(wc);
  if (w.state === "idle") {
    if (w.stock > 0 && (auto(wc) || w.run)) { w.carried = Math.min(w.stock, wcap); w.stock -= w.carried; w.state = "go"; w.t = 0; w.run = false; }
  } else {
    w.t += dt * od * spd(wc) / WH_T;
    if (w.state === "go" && w.t >= 1) { st.cash += w.carried; st.lifetime += w.carried; st.lifeAll += w.carried; rt.ev.push({ t: "sell", v: w.carried }); w.carried = 0; w.state = "back"; w.t = 0; }
    else if (w.state === "back" && w.t >= 1) { w.state = "idle"; w.t = 0; }
  }
}

// What the mine earns per second once everything is running: the slowest link decides.
export function steady(st) {
  const n = st.levels.length;
  if (!auto(st.elev) || !auto(st.wh)) return 0;
  let prod = 0; st.levels.forEach((lv, i) => { if (TIERS[lv.mgr].auto) prod += rate(st, i); });
  const v = EL_V * spd(st.elev), trip = 2 * n / v + (n + 1) * LOAD_T / spd(st.elev);
  const elT = elCap(st.elev) / trip, whT = whCap(st.wh) / (2 * WH_T / spd(st.wh));
  return Math.min(prod, elT, whT);
}
export function bottleneck(st) {
  const n = st.levels.length; let prod = 0; st.levels.forEach((lv, i) => prod += rate(st, i));
  const v = EL_V * spd(st.elev), trip = 2 * n / v + (n + 1) * LOAD_T / spd(st.elev);
  const a = [["Shafts", prod], ["Elevator", elCap(st.elev) / trip], ["Warehouse", whCap(st.wh) / (2 * WH_T / spd(st.wh))]];
  return a.sort((x, y) => x[1] - y[1])[0][0];
}

export const potential = life => Math.floor(150 * Math.sqrt(life / 1e13));
export const emberGain = st => Math.max(0, potential(st.lifeAll) - st.embers);
export function prestige(st) {
  const g = emberGain(st); if (g < 1) return null;
  st.embers += g; st.runs++; st.cash = 0; st.lifetime = 0;
  st.levels = [{ L: 1, mgr: 0 }]; st.elev = { L: 1, mgr: 0 }; st.wh = { L: 1, mgr: 0 };
  return g;
}

const SUF = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td"];
export function fmt(n) {
  if (!isFinite(n)) return "∞"; if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : Math.floor(n).toString();
  const e = Math.floor(Math.log10(n) / 3); if (e >= SUF.length) return n.toExponential(2).replace("e+", "e");
  const v = n / Math.pow(1000, e); return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + SUF[e];
}

// Everything the state has paid for so far. The server uses this to refuse a save that claims
// more cash than the player could possibly be holding.
export function spent(st) {
  let t = 0;
  st.levels.forEach((lv, i) => {
    t += unlockCost(i) + upCost("lv", i, 1, lv.L - 1);
    for (let k = 1; k <= lv.mgr; k++) t += foreCost("lv", i, k);
  });
  for (const [kind, cfg] of [["el", st.elev], ["wh", st.wh]]) {
    t += upCost(kind, 0, 1, cfg.L - 1);
    for (let k = 1; k <= cfg.mgr; k++) t += foreCost(kind, 0, k);
  }
  return t;
}
export function validState(st) {
  const okCfg = c => c && Number.isInteger(c.L) && c.L >= 1 && c.L <= 1100 && Number.isInteger(c.mgr) && c.mgr >= 0 && c.mgr <= 3;
  if (!st || typeof st !== "object") return false;
  for (const k of ["cash", "lifetime", "lifeAll", "embers", "runs"]) if (typeof st[k] !== "number" || !isFinite(st[k]) || st[k] < 0) return false;
  if (!Array.isArray(st.levels) || st.levels.length < 1 || st.levels.length > MAX_LV || !st.levels.every(okCfg)) return false;
  return okCfg(st.elev) && okCfg(st.wh);
}
