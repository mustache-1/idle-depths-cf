// The Drain — game rules. One file, two readers: the browser plays a dive with it, and the
// Worker replays the same dive to check the result before anything is written. Everything
// here is pure and seeded, so the same seed and the same choices always give the same dive.

export const STEP_M = 40;          // metres per fork
export const MAX_STEPS = 60;
export const GRID_W = 6, GRID_H = 5, GRID_N = GRID_W * GRID_H;
export const PIECES = ["drill", "cool", "relay", "plate", "tank"];
export const START_PIECES = 6, MAX_PIECES = 24;
export const pieceCost = owned => Math.round(60 * Math.pow(1.5, owned - START_PIECES));

function hash(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}
export function rng(seed) {
  let a = hash(seed);
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));

// ---- the rig ----
// Drills make the loot multiplier. Coolant beside a drill adds 50% each, a relay adds +2,
// and every drill touching another drill loses 30% to heat. Plating and tanks add hull and
// air instead, so every cell spent on loot is a cell not spent on staying alive.
const nb = i => {
  const x = i % GRID_W, y = Math.floor(i / GRID_W), r = [];
  if (x > 0) r.push(i - 1); if (x < GRID_W - 1) r.push(i + 1);
  if (y > 0) r.push(i - GRID_W); if (y < GRID_H - 1) r.push(i + GRID_W);
  return r;
};
export function rigStats(grid) {
  let out = 0, plate = 0, tank = 0;
  for (let i = 0; i < GRID_N; i++) {
    const c = grid[i];
    if (c === "plate") plate++;
    else if (c === "tank") tank++;
    else if (c === "drill") {
      let cool = 0, relay = 0, heat = 0;
      for (const n of nb(i)) { if (grid[n] === "cool") cool++; else if (grid[n] === "relay") relay++; else if (grid[n] === "drill") heat++; }
      out += (10 + 2 * relay) * (1 + 0.5 * cool) * Math.max(0.2, 1 - 0.3 * heat);
    }
  }
  return { out: Math.round(out), hullMax: 100 + 10 * plate, airMax: 100 + 10 * tank, lootMult: 1 + out / 100 };
}
export function validGrid(grid, owned) {
  if (!Array.isArray(grid) || grid.length !== GRID_N) return false;
  let n = 0;
  for (const c of grid) { if (c !== null) { if (!PIECES.includes(c)) return false; n++; } }
  return n <= owned;
}

// ---- events ----
// roll(r) returns {h, o, l, m}: hull change, air change, loot change, and the line shown.
const EVENTS = [
  { id: "ping", min: 0, text: "A dead sonar ping repeats from somewhere below the ledge.", c: [
    { label: "Follow the ping", hint: "Loot likely, hull risk", roll: r => { const h = ri(r, 8, 25), l = ri(r, 20, 45); return { h: -h, l, m: `It leads to a wrecked skiff. Loot +${l}, hull -${h}.` }; } },
    { label: "Mute it and keep going", hint: "Costs air", roll: () => ({ o: -6, m: "You drill on in silence. Air -6." }) } ] },
  { id: "glass", min: 0, text: "A wall of blue glass blocks the shaft. It is warm to the touch.", c: [
    { label: "Drill straight through", hint: "Fast, hard on the hull", roll: r => { const h = ri(r, 12, 22), l = ri(r, 5, 15); return { h: -h, l, m: `The bit screams. Hull -${h}, but the shards sell. Loot +${l}.` }; } },
    { label: "Route around the edge", hint: "Slow, costs air", roll: r => { const o = ri(r, 10, 16); return { o: -o, m: `Six minutes of detour. Air -${o}.` }; } },
    { label: "Listen at the glass", hint: "Gamble", roll: r => r() < 0.5 ? { l: 60, m: "The glass hums back a coordinate. Loot +60." } : { h: -20, m: "It cracks and floods the gallery. Hull -20." } } ] },
  { id: "lamp", min: 0, text: "Another crew's marker lamp is still burning. Nobody answers the radio.", c: [
    { label: "Take their supplies", hint: "Air and hull", roll: () => ({ o: 15, h: 8, m: "Their locker is stocked. Air +15, hull +8." }) },
    { label: "Leave a note and move on", hint: "Nothing gained", roll: () => ({ m: "You leave a note on the lamp. The harbor will hear of it." }) } ] },
  { id: "cavern", min: 120, text: "The floor is gone. Below the rig is a cavern with its own weather.", c: [
    { label: "Lower the rig slowly", hint: "Costs air", roll: r => { const l = ri(r, 10, 25); return { o: -12, l, m: `A careful descent. Air -12, loot +${l}.` }; } },
    { label: "Drop and brace", hint: "Hull risk", roll: r => { const h = ri(r, 15, 30), l = ri(r, 25, 40); return { h: -h, l, m: `You hit hard. Hull -${h}, but the landing is rich. Loot +${l}.` }; } } ] },
  { id: "hummer", min: 80, text: "A crewman hears the Hum. He starts repeating it back in his sleep.", c: [
    { label: "Wake him", hint: "Costs air", roll: () => ({ o: -5, m: "He wakes confused. Air -5." }) },
    { label: "Let him hum", hint: "Story fragment", roll: () => ({ l: 30, m: "Three notes, always the same. Loot +30." }) } ] },
  { id: "flood", min: 40, text: "The gallery ahead is half flooded. The water is very still.", c: [
    { label: "Pump it out", hint: "Air, steady loot", roll: () => ({ o: -8, l: 15, m: "Pumps run for an hour. Air -8, loot +15." }) },
    { label: "Wade the crew through", hint: "Hull risk", roll: r => { const h = ri(r, 8, 20); return { h: -h, l: 35, m: `Something brushes past. Hull -${h}, loot +35.` }; } },
    { label: "Seal it and bypass", hint: "Cheap, no reward", roll: () => ({ o: -4, m: "You weld the door shut. Air -4." }) } ] },
  { id: "wreck", min: 40, text: "A collapsed rig hangs in the shaft wall, lamps still on.", c: [
    { label: "Scavenge the cargo", hint: "Loot, some hull damage", roll: r => { const l = ri(r, 25, 50), h = ri(r, 5, 20); return { l, h: -h, m: `Loot +${l}. A beam drops. Hull -${h}.` }; } },
    { label: "Take their air tanks", hint: "Safe", roll: () => ({ o: 20, h: -5, m: "Air +20, hull -5." }) } ] },
  { id: "pocket", min: 80, text: "A stale air pocket hisses from a crack. It smells sweet.", c: [
    { label: "Breathe it", hint: "Air, maybe spores", roll: r => r() < 0.3 ? { o: 25, h: -10, m: "Air +25, but the spores eat the seals. Hull -10." } : { o: 25, m: "Clean enough. Air +25." } },
    { label: "Vent it and move on", hint: "Nothing gained", roll: () => ({ o: -2, m: "You seal the crack. Air -2." }) } ] },
  { id: "ceiling", min: 160, text: "The ceiling groans. Dust is coming down in sheets.", c: [
    { label: "Brace the rig", hint: "Certain, small cost", roll: () => ({ h: -6, o: -4, m: "It holds. Hull -6, air -4." }) },
    { label: "Run for it", hint: "Gamble", roll: r => r() < 0.5 ? { m: "You clear it with seconds to spare." } : { h: -25, m: "The roof catches the rig. Hull -25." } } ] },
  { id: "skiff", min: 120, text: "A merchant skiff sits in the dark, engines off. Its owner waves you over.", c: [
    { label: "Sell loot for air", hint: "-20 loot, +30 air", roll: () => ({ l: -20, o: 30, m: "Loot -20, air +30." }) },
    { label: "Sell air for loot", hint: "-15 air, +35 loot", roll: () => ({ o: -15, l: 35, m: "Air -15, loot +35." }) },
    { label: "Wave and pass", hint: "Nothing gained", roll: () => ({ m: "The skiff is gone when you look back." }) } ] },
  { id: "eyes", min: 200, text: "Something in the dark is watching the rig. The lamp catches two points of light.", c: [
    { label: "Shine the lamp", hint: "Gamble", roll: r => r() < 0.4 ? { h: -20, m: "It lunges at the light. Hull -20." } : { l: 45, m: "It flees, leaving a nest of salvage. Loot +45." } },
    { label: "Kill the light", hint: "Safe, costs air", roll: () => ({ o: -3, m: "You sit in the dark until it leaves. Air -3." }) } ] },
  { id: "jam", min: 80, text: "The drill bit jams against something that is not rock.", c: [
    { label: "Hammer it loose", hint: "Hull risk", roll: r => r() < 0.7 ? { h: -10, l: 20, m: "It frees with a bang. Hull -10, loot +20." } : { h: -20, m: "The bit snaps. Hull -20." } },
    { label: "Strip the bit", hint: "Costs air", roll: () => ({ o: -10, l: 10, m: "Careful work. Air -10, loot +10." }) } ] },
  { id: "gate", min: 320, text: "A gate of black stone stands across the shaft. The Hum is loud enough to feel in your teeth.", c: [
    { label: "Force the gate", hint: "Big loot, big damage", roll: r => { const h = ri(r, 20, 35), l = ri(r, 60, 110); return { h: -h, l, m: `It opens. Hull -${h}, loot +${l}.` }; } },
    { label: "Hum back", hint: "Costs air, calm gamble", roll: r => r() < 0.6 ? { o: -10, l: 70, m: "The gate answers. Air -10, loot +70." } : { o: -20, m: "It does not answer. Air -20." } } ] },
  { id: "road", min: 400, text: "A drowned road runs along the shaft wall. Someone built this.", c: [
    { label: "Follow it down", hint: "Steady", roll: r => { const l = ri(r, 30, 60); return { o: -8, l, m: `Mile markers in a language you do not read. Air -8, loot +${l}.` }; } },
    { label: "Take the stones", hint: "Hull risk", roll: r => { const h = ri(r, 10, 25), l = ri(r, 55, 90); return { h: -h, l, m: `Heavy and warm. Hull -${h}, loot +${l}.` }; } } ] },
];

// The fork at a given step is fixed by the seed, never by earlier choices, so a weekly
// shaft is the same shaft for everyone. Only what happens after a pick can differ.
export function eventAt(seed, step) {
  const pick = k => {
    const pool = EVENTS.filter(e => e.min <= k * STEP_M);
    return pool[Math.floor(rng(`${seed}|ev|${k}`)() * pool.length)];
  };
  const ev = pick(step);
  if (step > 0 && pick(step - 1) === ev) {
    const pool = EVENTS.filter(e => e.min <= step * STEP_M);
    return pool[(pool.indexOf(ev) + 1) % pool.length];
  }
  return ev;
}
export const publicEvent = ev => ({ id: ev.id, text: ev.text, choices: ev.c.map(c => ({ label: c.label, hint: c.hint })) });

export function newRun(stats) {
  return { step: 0, d: 0, h: stats.hullMax, o: stats.airMax, l: 0, over: false, why: "" };
}

export function choose(st, seed, idx, stats) {
  if (st.over) throw new Error("run is over");
  const ev = eventAt(seed, st.step);
  const c = ev.c[idx];
  if (!c) throw new Error("bad choice");
  const res = c.roll(rng(`${seed}|out|${st.step}|${idx}`));
  const danger = 1 + 0.05 * st.step, prize = 1 + 0.03 * st.step;
  const n = { ...st };
  n.h = Math.min(stats.hullMax, n.h + Math.round((res.h || 0) * ((res.h || 0) < 0 ? danger : 1)));
  n.o = Math.min(stats.airMax, n.o + Math.round((res.o || 0) * ((res.o || 0) < 0 ? danger : 1)) - 4);
  const l = res.l || 0;
  n.l = Math.max(0, n.l + (l > 0 ? Math.round(l * prize * stats.lootMult) : l));
  n.step++; n.d += STEP_M;
  if (n.h <= 0) { n.over = true; n.why = "The hull gives out."; }
  else if (n.o <= 0) { n.over = true; n.why = "The air runs out."; }
  else if (n.step >= MAX_STEPS) { n.over = true; n.why = "The shaft ends. You have reached the bottom."; }
  return { st: n, msg: res.m };
}

// Dying costs you three quarters of the haul, but the depth still counts for the board.
// Surfacing, or reaching the bottom alive, banks all of it.
export function finish(st, surfaced) {
  const dead = st.over && (st.h <= 0 || st.o <= 0);
  const safe = !dead && (surfaced || st.over);
  return { depth: st.d, banked: safe ? st.l : Math.floor(st.l * 0.25), safe };
}

// Server side: replay a whole dive and return the verified result, or null if it is invalid.
export function replay(seed, choices, surface, grid) {
  if (!Array.isArray(choices) || choices.length > MAX_STEPS) return null;
  const stats = rigStats(grid);
  let st = newRun(stats);
  for (const idx of choices) {
    if (st.over || !Number.isInteger(idx)) return null;
    try { st = choose(st, seed, idx, stats).st; } catch { return null; }
  }
  return { ...finish(st, !!surface), steps: choices.length };
}
