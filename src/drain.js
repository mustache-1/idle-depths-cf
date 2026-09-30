// The Drain — API. Lives beside the old game in the same Worker and the same KV namespace,
// but under its own keys (dsave:, dboard:, dsec:) so nothing here can touch an old save.
// Crews are shared: /api/crew/* is reused as is.
import { json } from "./_session.js";
import { weekKey, prevWeekKey, weekEnds } from "./_week.js";
import { replay, rigStats, validGrid, pieceCost, START_PIECES, MAX_PIECES, GRID_N } from "../public/drain/engine.js";

const CHARGE_MAX = 10, CHARGE_EVERY = 6 * 60 * 1000, PUSH_COST = 2, PUSH_POINTS = 8;
const RUN_COOLDOWN = 8000;
const SECTORS = ["Ledge Yard", "Glass Gallery", "Hum Gate", "Low Cavern"];
const PAYOUT = 120;   // loot per sector a crew held at the end of the week

const blank = () => ({ bank: 0, pieces: START_PIECES, grid: Array(GRID_N).fill(null), best: 0, runs: 0, charge: CHARGE_MAX, chargeAt: Date.now(), lastRun: 0, claimed: "" });

function tick(s) {
  const now = Date.now();
  if (s.charge >= CHARGE_MAX) { s.charge = CHARGE_MAX; s.chargeAt = now; return; }
  const n = Math.floor((now - s.chargeAt) / CHARGE_EVERY);
  if (n > 0) { s.charge = Math.min(CHARGE_MAX, s.charge + n); s.chargeAt = s.charge >= CHARGE_MAX ? now : s.chargeAt + n * CHARGE_EVERY; }
}

const readSectors = async (env, wk) =>
  Promise.all(SECTORS.map(async (name, i) => ({ name, c: ((await env.SAVES.get(`dsec:${wk}:${i}`, { type: "json" })) || { c: {} }).c })));

// A sector is held by the crew with strictly the most points. A tie holds nothing.
const leader = c => {
  const rows = Object.entries(c).sort((a, b) => b[1].p - a[1].p);
  return rows.length && (rows.length === 1 || rows[0][1].p > rows[1][1].p) ? rows[0][0] : null;
};

async function myCrewId(env, id) {
  const cid = await env.SAVES.get(`crewof:${id}`);
  if (!cid) return null;
  const crew = await env.SAVES.get(`crew:${cid}`, { type: "json" });
  return crew ? { cid, name: crew.name } : null;
}

export async function handleDrain(p, request, env, s) {
  const wk = weekKey();
  const seed = `W:${wk}`;
  const post = request.method === "POST";

  // ---- public ----
  if (p === "/api/drain/board") {
    const cached = await env.SAVES.get("cache:dboard", { type: "json" });
    if (cached && Date.now() - cached.at < 60000) return json(cached.data);
    const rows = [];
    let cursor;
    do {
      const page = await env.SAVES.list({ prefix: "dboard:", cursor, limit: 1000 });
      for (const k of page.keys) { const v = await env.SAVES.get(k.name, { type: "json" }); if (v) rows.push(v); }
      cursor = page.list_complete ? null : page.cursor;
    } while (cursor);
    const top = (f, key) => rows.filter(f).sort((a, b) => key(b) - key(a)).slice(0, 10)
      .map(r => ({ id: r.id, name: r.name, week: r.week === wk ? r.weekDepth : 0, best: r.best, runs: r.runs, weekLoot: r.week === wk ? r.weekLoot : 0 }));
    const data = {
      week: top(r => r.week === wk && r.weekDepth > 0, r => r.weekDepth),
      all: top(r => r.best > 0, r => r.best),
      weekEnds: weekEnds(), seed,
    };
    await env.SAVES.put("cache:dboard", JSON.stringify({ at: Date.now(), data }), { expirationTtl: 120 });
    return json(data);
  }

  if (p === "/api/drain/sectors") {
    const secs = await readSectors(env, wk);
    const mine = s ? await myCrewId(env, s.id) : null;
    return json({
      weekEnds: weekEnds(),
      mine: mine && mine.cid,
      sectors: secs.map(x => {
        const rows = Object.entries(x.c).sort((a, b) => b[1].p - a[1].p).slice(0, 4).map(([cid, v]) => ({ cid, name: v.n, p: v.p }));
        return { name: x.name, rows, held: leader(x.c) };
      }),
    });
  }

  // ---- everything else needs a session ----
  if (!s) return json({ error: "not logged in" }, 401);
  const key = `dsave:${s.id}`;
  const save = { ...blank(), ...((await env.SAVES.get(key, { type: "json" })) || {}) };
  tick(save);

  if (p === "/api/drain/load") {
    // Last week's sector payout is claimed lazily, the first time the player opens the game
    // in a new week. Only a member who pushed for the winning crew is paid.
    let payout = 0;
    const pk = prevWeekKey();
    if (save.claimed !== pk) {
      const secs = await readSectors(env, pk);
      for (const x of secs) { const w = leader(x.c); if (w && x.c[w].m && x.c[w].m.includes(s.id)) payout += PAYOUT; }
      save.claimed = pk; save.bank += payout;
      await env.SAVES.put(key, JSON.stringify(save));
    }
    return json({ save, seed, week: wk, weekEnds: weekEnds(), name: s.name, payout, nextPiece: save.pieces < MAX_PIECES ? pieceCost(save.pieces) : null });
  }

  if (p === "/api/drain/rig" && post) {
    const body = await request.json().catch(() => null);
    if (!body || !validGrid(body.grid, save.pieces)) return json({ error: "That layout isn't valid." }, 400);
    save.grid = body.grid;
    await env.SAVES.put(key, JSON.stringify(save));
    return json({ ok: true, stats: rigStats(save.grid) });
  }

  if (p === "/api/drain/buy" && post) {
    if (save.pieces >= MAX_PIECES) return json({ error: "The rig has no more room." }, 400);
    const cost = pieceCost(save.pieces);
    if (save.bank < cost) return json({ error: "Not enough loot." }, 400);
    save.bank -= cost; save.pieces++;
    await env.SAVES.put(key, JSON.stringify(save));
    return json({ ok: true, save, nextPiece: save.pieces < MAX_PIECES ? pieceCost(save.pieces) : null });
  }

  if (p === "/api/drain/run" && post) {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.seed !== "string") return json({ error: "bad run" }, 400);
    const weekly = body.seed === seed;
    if (!weekly && !/^F:[A-Za-z0-9]{4,16}$/.test(body.seed)) return json({ error: "bad seed" }, 400);
    if (Date.now() - save.lastRun < RUN_COOLDOWN) return json({ error: "The rig is still cooling down." }, 429);
    const res = replay(body.seed, body.choices, !!body.surface, save.grid);
    if (!res) return json({ error: "That dive doesn't check out." }, 400);

    save.lastRun = Date.now();
    save.bank += res.banked; save.runs++; save.best = Math.max(save.best, res.depth);
    const prev = (await env.SAVES.get(`dboard:${s.id}`, { type: "json" })) || {};
    const sameWeek = prev.week === wk;
    const row = {
      id: s.id, name: prev.name || s.name, best: save.best, runs: save.runs,
      week: sameWeek ? prev.week : wk, weekDepth: sameWeek ? prev.weekDepth || 0 : 0, weekLoot: sameWeek ? prev.weekLoot || 0 : 0,
    };
    if (weekly) {
      row.week = wk;
      if (res.depth > row.weekDepth || (res.depth === row.weekDepth && res.banked > row.weekLoot)) { row.weekDepth = res.depth; row.weekLoot = res.banked; }
    }
    await env.SAVES.put(key, JSON.stringify(save));
    await env.SAVES.put(`dboard:${s.id}`, JSON.stringify(row));
    return json({ ok: true, result: res, save, weekDepth: row.week === wk ? row.weekDepth : 0 });
  }

  if (p === "/api/drain/push" && post) {
    const body = await request.json().catch(() => null);
    const i = Number(body && body.sector);
    if (!Number.isInteger(i) || i < 0 || i >= SECTORS.length) return json({ error: "No such sector." }, 400);
    const crew = await myCrewId(env, s.id);
    if (!crew) return json({ error: "Join a crew first." }, 400);
    if (save.charge < PUSH_COST) return json({ error: "Not enough charge." }, 400);
    const sk = `dsec:${wk}:${i}`;
    const sec = (await env.SAVES.get(sk, { type: "json" })) || { c: {} };
    const row = sec.c[crew.cid] || { n: crew.name, p: 0, m: [] };
    row.n = crew.name; row.p += PUSH_POINTS;
    if (!row.m.includes(s.id)) row.m.push(s.id);
    sec.c[crew.cid] = row;
    save.charge -= PUSH_COST;
    await env.SAVES.put(sk, JSON.stringify(sec), { expirationTtl: 21 * 864e3 });
    await env.SAVES.put(key, JSON.stringify(save));
    return json({ ok: true, charge: save.charge, chargeAt: save.chargeAt });
  }

  return json({ error: "not found" }, 404);
}
