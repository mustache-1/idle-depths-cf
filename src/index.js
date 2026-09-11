// Idle Depths — Cloudflare Worker (static assets + /api routes)
import { readSession, makeSession, cookieHeader, json } from "./_session.js";
import { weekKey, weekEnds, prevWeekKey } from "./_week.js";

// ---- seasons ----
// The all-time board ranks on `lifetime`, which is written fresh from the player's save on
// every autosave. Deleting the board:* rows therefore resets nothing — the next save puts
// the identical score straight back. The only honest way to start the board over without
// touching anyone's save is a baseline: when a player's era rolls over, record where their
// lifetime stood, and rank the new season on everything mined since.
//
// The 1.5^depth economy makes old and new scores incomparable, which is why season 2 opens
// here. Nothing is deleted: each player keeps their final season-1 score, and the board
// serves it under `legacy`. To undo this, set ERA back to 1 — the old baselines are ignored
// and every original score returns intact.
const ERA = 2;
const ERA_NAMES = { 1: "Beta · Ashcombe's ledger", 2: "Season 1 · The deep economy" };

const TITLES = { "": "", coalhand: "Coalhand", ironjaw: "Ironjaw", silverback: "Gravewalker", abyssal: "Throne-touched", gemhunter: "Gem hunter", sealed: "Debt-free", lamplighter: "Lamplighter", wyrmslayer: "Wyrmslayer", cardsharp: "Card sharp", regular: "Regular", champion: "Weekly champion", beneath: "Throne-keeper" };

// Set once per isolate; a deploy replaces the isolate, so it never goes stale.
let BUILD_ID = null;

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (e) {
      return json({
        error: String((e && e.message) || e),
        where: new URL(request.url).pathname,
        stack: String((e && e.stack) || "").split("\n").slice(0, 4),
      }, 500);
    }
  },
};

async function handle(request, env) {
  {
    const url = new URL(request.url);
    const p = url.pathname;
    if (!p.startsWith("/api/")) return env.ASSETS.fetch(request);

    // ---- login ----
    if (p === "/api/login") {
      const u = new URL("https://discord.com/oauth2/authorize");
      u.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
      u.searchParams.set("redirect_uri", `${url.origin}/api/callback`);
      u.searchParams.set("response_type", "code");
      u.searchParams.set("scope", "identify");
      return Response.redirect(u.toString(), 302);
    }

    // ---- callback ----
    if (p === "/api/callback") {
      const code = url.searchParams.get("code");
      if (!code) return Response.redirect(url.origin, 302);
      const tok = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: env.DISCORD_CLIENT_ID,
          client_secret: env.DISCORD_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: `${url.origin}/api/callback`,
        }),
      }).then(r => r.json());
      if (!tok.access_token) return new Response("Discord login failed. Go back and try again.", { status: 400 });
      const user = await fetch("https://discord.com/api/users/@me", { headers: { authorization: `Bearer ${tok.access_token}` } }).then(r => r.json());
      return new Response(null, { status: 302, headers: { location: url.origin, "set-cookie": cookieHeader(await makeSession(user, env.SESSION_SECRET)) } });
    }

    // ---- one-shot wipe (admin) ----
    // Player progress lives in KV, not in the repo, so pushing to GitHub cannot reset it.
    // This is the deploy-friendly way to do it: set a WIPE_KEY secret, POST to this route,
    // then DELETE THE SECRET. With no WIPE_KEY set the route does not exist at all, which
    // is the state it should be in every day except the one you use it.
    //
    //   curl -X POST "https://<your-domain>/api/wipe?key=<WIPE_KEY>&dry=1"   <- counts only
    //   curl -X POST "https://<your-domain>/api/wipe?key=<WIPE_KEY>"         <- deletes
    //
    // ?keep=board  leaves the leaderboard rows alone, so the Beta standings survive.
    // ?keep=crews  leaves crew: and crewof: alone, so nobody has to re-form a crew.
    if (p === "/api/wipe") {
      if (!env.WIPE_KEY) return json({ error: "not found" }, 404);
      if (request.method !== "POST") return json({ error: "POST only" }, 405);
      const given = url.searchParams.get("key") || "";
      // constant-time-ish compare so the secret can't be probed a character at a time
      if (given.length !== env.WIPE_KEY.length) return json({ error: "no" }, 403);
      let diff = 0;
      for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ env.WIPE_KEY.charCodeAt(i);
      if (diff !== 0) return json({ error: "no" }, 403);

      const keep = (url.searchParams.get("keep") || "").split(",");
      const dry = url.searchParams.get("dry") === "1";
      const prefixes = ["save:"];
      if (!keep.includes("board")) prefixes.push("board:");
      if (!keep.includes("crews")) prefixes.push("crew:", "crewof:");

      const counts = {};
      let deleted = 0;
      for (const pre of prefixes) {
        let cursor, n = 0;
        for (;;) {
          const page = await env.SAVES.list({ prefix: pre, cursor, limit: 1000 });
          for (const k of page.keys) { n++; if (!dry) await env.SAVES.delete(k.name); }
          if (page.list_complete) break;
          cursor = page.cursor;
        }
        counts[pre] = n; deleted += n;
      }
      // the caches and the feed are derived, so they always go - they rebuild on their own
      if (!dry) for (const k of ["feed", "cache:board", "cache:crews", "cache:feedseed"]) await env.SAVES.delete(k);

      return json({ ok: true, dry, deleted, counts }, 200, { "cache-control": "no-store" });
    }

    // ---- version (public) ----
    // This used to report the ETag of index.html. That header is not dependable enough
    // to hang a forced reload on - it can survive a deploy, and it can go missing - so
    // players stayed on the old build. Hash the actual bytes instead: the id changes
    // when and only when the file changes.
    //
    // BUILD_ID is module scope, so it is computed once per isolate and every deploy
    // gets fresh isolates. That makes this one digest per cold start, not per request.
    if (p === "/api/version") {
      try {
        if (!BUILD_ID) {
          const r = await env.ASSETS.fetch(new Request(`${url.origin}/index.html`, { method: "GET" }));
          const buf = await r.arrayBuffer();
          const digest = await crypto.subtle.digest("SHA-256", buf);
          BUILD_ID = [...new Uint8Array(digest).slice(0, 10)]
            .map((b) => b.toString(16).padStart(2, "0")).join("");
        }
        return json({ build: BUILD_ID }, 200, { "cache-control": "no-store" });
      } catch (e) {
        return json({ build: "" }, 200, { "cache-control": "no-store" });
      }
    }

    // ---- logout ----
    if (p === "/api/logout")
      return new Response(null, { status: 302, headers: { location: url.origin, "set-cookie": cookieHeader("") } });

    // ---- board (public) ----
    if (p === "/api/board") {
      const cached = await env.SAVES.get("cache:board", { type: "json" });
      if (cached && Date.now() - cached.at < 60000) return json(cached.data);
      const rows = [];
      let cursor;
      do {
        const page = await env.SAVES.list({ prefix: "board:", cursor, limit: 1000 });
        for (const k of page.keys) { const v = await env.SAVES.get(k.name, { type: "json" }); if (v) rows.push(v); }
        cursor = page.list_complete ? null : page.cursor;
      } while (cursor);
      const wk = weekKey(), pk = prevWeekKey();
      // A player who hasn't saved since the rollover still carries the old era, so their
      // season-2 total is 0 until they next play — same rule the weekly board already uses.
      const seasonScore = r => (r.era === ERA ? Math.max(0, r.score - (r.eraBase || 0)) : 0);
      const data = {
        all: rows.map(r => ({ ...r, score: seasonScore(r) })).filter(r => r.score > 0)
          .sort((a, b) => b.score - a.score).slice(0, 10),
        // season 1 is kept, not deleted: a row that never saw a rollover still has its
        // original score, and one that did has it banked in prevEraScore
        legacy: rows.map(r => ({ ...r, score: r.prevEra ? (r.prevEraScore || 0) : (r.era ? 0 : r.score) }))
          .filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 10),
        era: ERA, eraName: ERA_NAMES[ERA] || `Season ${ERA}`,
        legacyName: ERA_NAMES[ERA - 1] || `Season ${ERA - 1}`,
        week: rows.map(r => ({ ...r, score: r.week === wk ? Math.max(0, r.score - (r.weekBase || 0)) : 0 })).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 10),
        champs: rows.filter(r => r.prevWeek === pk && r.prevScore > 0).sort((a, b) => b.prevScore - a.prevScore).slice(0, 3).map(r => ({ id: r.id, name: r.name })),
        weekEnds: weekEnds(),
      };
      await env.SAVES.put("cache:board", JSON.stringify({ at: Date.now(), data }), { expirationTtl: 120 });
      return json(data);
    }

    // ---- crew board (public) ----
    if (p === "/api/crews") {
      const cached = await env.SAVES.get("cache:crews", { type: "json" });
      if (cached && Date.now() - cached.at < 60000) return json(cached.data);
      const rows = [];
      let cur;
      do {
        const page = await env.SAVES.list({ prefix: "crew:", cursor: cur, limit: 1000 });
        for (const k of page.keys) {
          const c = await env.SAVES.get(k.name, { type: "json" });
          if (!c || !Array.isArray(c.members) || !c.members.length) continue;
          rows.push({
            id: c.id, name: c.name || "Crew", size: c.members.length,
            digs: c.digsDone || 0, full: c.fullWeeks || 0, xp: Math.floor(c.xp || 0),
            lead: (c.members.find(m => m.id === c.owner) || c.members[0]).name,
          });
        }
        cur = page.list_complete ? null : page.cursor;
      } while (cur);
      // Digs cleared is the thing a crew earns together; xp only breaks ties.
      const data = { crews: rows.sort((a, b) => b.digs - a.digs || b.full - a.full || b.xp - a.xp).slice(0, 15) };
      await env.SAVES.put("cache:crews", JSON.stringify({ at: Date.now(), data }), { expirationTtl: 120 });
      return json(data);
    }

    // ---- global feed (public read) ----
    // One rolling KV key holding the last FEED_MAX entries. Read-modify-write, so
    // two events landing in the same instant can drop one — acceptable for a feed,
    // and it keeps this to a single KV write per milestone instead of one key each.
    const FEED_MAX = 30;
    const FEED_COOLDOWN = 30000;   // per-player, enforced against the feed itself (no extra KV read)
    const readFeed = async () => {
      const v = await env.SAVES.get("feed", { type: "json" });
      return Array.isArray(v) ? v : [];
    };

    if (p === "/api/feed" && request.method === "GET") {
      const feed = await readFeed();
      // A brand-new feed reads as broken. Top it up with where people actually are,
      // derived from the board records that already exist — no invented entries.
      if (feed.length < 8) {
        let seed = await env.SAVES.get("cache:feedseed", { type: "json" });
        if (!Array.isArray(seed)) {
          const rows = [];
          const page = await env.SAVES.list({ prefix: "board:", limit: 1000 });
          for (const k of page.keys) {
            const v = await env.SAVES.get(k.name, { type: "json" });
            if (v && v.name) rows.push({ id: v.id, name: String(v.name).slice(0, 24), n: v.depth || 1, s: v.score || 0 });
          }
          seed = rows.sort((a, b) => b.n - a.n || b.s - a.s).slice(0, 10).map(r => ({ kind: "at", id: r.id, name: r.name, n: r.n }));
          // Cached hard: this costs a list + a read per player, so it must not run per request.
          await env.SAVES.put("cache:feedseed", JSON.stringify(seed), { expirationTtl: 600 });
        }
        const seen = new Set(feed.map(e => e.id));
        for (const e of seed) { if (feed.length >= 12) break; if (!seen.has(e.id)) { feed.push(e); seen.add(e.id); } }
      }
      return json({ feed });
    }

    // ---- everything below needs a session ----
    const s = await readSession(request, env.SESSION_SECRET);

    if (p === "/api/me") return json(s ? { id: s.id, name: s.name } : null);
    if (!s) return json({ error: "not logged in" }, 401);

    if (p === "/api/load") return json(await env.SAVES.get(`save:${s.id}`, { type: "json" }) || null);

    // ---- crew (up to 4 players, shared xp pool, join by short code) ----
    const crewIdFor = async id => env.SAVES.get(`crewof:${id}`);
    const loadCrew = async id => id ? env.SAVES.get(`crew:${id}`, { type: "json" }) : null;
    // The roster used to store the raw Discord username while the leaderboard shows the
    // player's chosen display name, so the same person appeared under two different names
    // in two places. The board row already holds the name they picked - use that.
    const shownName = async id => {
      const b = await env.SAVES.get(`board:${id}`, { type: "json" });
      return (b && b.name) || null;
    };
    const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const newCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");

    // Touch "last seen" at most once an hour, so reading the crew page is not a KV write storm.
    const touchSeen = crew => {
      crew.seen = crew.seen || {};
      const last = crew.seen[s.id] || 0;
      if (Date.now() - last < 3600000) return false;
      crew.seen[s.id] = Date.now();
      return true;
    };

    if (p === "/api/crew") {
      const cid = await crewIdFor(s.id);
      const crew = await loadCrew(cid);
      if (!crew) return json(null);
      if (touchSeen(crew)) await env.SAVES.put(`crew:${cid}`, JSON.stringify(crew));
      return json(crew);
    }


    if (p === "/api/crew/create") {
      if (request.method !== "POST") return json({ error: "POST only" }, 405);
      if (await crewIdFor(s.id)) return json({ error: "You're already in a crew." }, 400);
      const body = await request.json().catch(() => ({}));
      const name = (typeof body.name === "string" && body.name.trim().slice(0, 24)) || `${s.name}'s crew`;
      let id; for (let i = 0; i < 5; i++) { id = newCode(); if (!(await env.SAVES.get(`crew:${id}`))) break; }
      const crew = { id, name, owner: s.id, members: [{ id: s.id, name: (await shownName(s.id)) || s.name }], xp: 0, pick: 0, shift: 0, created: Date.now() };
      await env.SAVES.put(`crew:${id}`, JSON.stringify(crew));
      await env.SAVES.put(`crewof:${s.id}`, id);
      return json(crew);
    }

    if (p === "/api/crew/join") {
      if (request.method !== "POST") return json({ error: "POST only" }, 405);
      if (await crewIdFor(s.id)) return json({ error: "You're already in a crew." }, 400);
      const body = await request.json().catch(() => ({}));
      const code = (typeof body.code === "string" ? body.code.trim().toUpperCase() : "");
      const crew = await loadCrew(code);
      if (!crew) return json({ error: "No crew with that code." }, 404);
      if (crew.members.length >= 4) return json({ error: "That crew is full." }, 400);
      if (crew.members.some(m => m.id === s.id)) return json({ error: "You're already in that crew." }, 400);
      crew.members.push({ id: s.id, name: (await shownName(s.id)) || s.name });
      await env.SAVES.put(`crew:${crew.id}`, JSON.stringify(crew));
      await env.SAVES.put(`crewof:${s.id}`, crew.id);
      return json(crew);
    }

    if (p === "/api/crew/leave") {
      if (request.method !== "POST") return json({ error: "POST only" }, 405);
      const cid = await crewIdFor(s.id);
      const crew = await loadCrew(cid);
      await env.SAVES.delete(`crewof:${s.id}`);
      if (!crew) return json({ ok: true });
      crew.members = crew.members.filter(m => m.id !== s.id);
      if (crew.members.length === 0) await env.SAVES.delete(`crew:${cid}`);
      else { if (crew.owner === s.id) crew.owner = crew.members[0].id; await env.SAVES.put(`crew:${cid}`, JSON.stringify(crew)); }
      return json({ ok: true });
    }

    if (p === "/api/crew/rename") {
      if (request.method !== "POST") return json({ error: "POST only" }, 405);
      const cid = await crewIdFor(s.id);
      const crew = await loadCrew(cid);
      if (!crew) return json({ error: "Not in a crew." }, 400);
      if (crew.owner !== s.id) return json({ error: "Only the crew lead can rename the crew." }, 403);
      const body = await request.json().catch(() => ({}));
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 24) : "";
      if (!/^[A-Za-z0-9 '._-]{2,24}$/.test(name)) return json({ error: "Use 2-24 letters, numbers or spaces." }, 400);
      crew.name = name;
      await env.SAVES.put(`crew:${cid}`, JSON.stringify(crew));
      await env.SAVES.delete("cache:crews");
      return json(crew);
    }

    if (p === "/api/crew/kick") {
      if (request.method !== "POST") return json({ error: "POST only" }, 405);
      const cid = await crewIdFor(s.id);
      const crew = await loadCrew(cid);
      if (!crew) return json({ error: "Not in a crew." }, 400);
      if (crew.owner !== s.id) return json({ error: "Only the crew lead can remove members." }, 403);
      const body = await request.json().catch(() => ({}));
      const target = String(body.id || "");
      if (target === s.id) return json({ error: "Hand the crew over before you leave." }, 400);
      if (!crew.members.some(m => m.id === target)) return json({ error: "They're not in this crew." }, 404);
      crew.members = crew.members.filter(m => m.id !== target);
      if (crew.seen) delete crew.seen[target];
      if (crew.dig && crew.dig.by) delete crew.dig.by[target];
      await env.SAVES.put(`crew:${cid}`, JSON.stringify(crew));
      // Only clear their pointer if it still points here — they may have rejoined elsewhere.
      if ((await env.SAVES.get(`crewof:${target}`)) === cid) await env.SAVES.delete(`crewof:${target}`);
      await env.SAVES.delete("cache:crews");
      return json(crew);
    }

    if (p === "/api/crew/promote") {
      if (request.method !== "POST") return json({ error: "POST only" }, 405);
      const cid = await crewIdFor(s.id);
      const crew = await loadCrew(cid);
      if (!crew) return json({ error: "Not in a crew." }, 400);
      if (crew.owner !== s.id) return json({ error: "Only the crew lead can hand it over." }, 403);
      const body = await request.json().catch(() => ({}));
      const target = String(body.id || "");
      if (!crew.members.some(m => m.id === target)) return json({ error: "They're not in this crew." }, 404);
      crew.owner = target;
      await env.SAVES.put(`crew:${cid}`, JSON.stringify(crew));
      await env.SAVES.delete("cache:crews");
      return json(crew);
    }

    if (p === "/api/crew/xp") {
      if (request.method !== "POST") return json({ error: "POST only" }, 405);
      const cid = await crewIdFor(s.id);
      const crew = await loadCrew(cid);
      if (!crew) return json({ error: "Not in a crew." }, 400);
      const body = await request.json().catch(() => ({}));
      const amount = Math.max(0, Math.min(20000, Number(body.amount) || 0));
      crew.xp += amount;
      // Cheap place to keep your own roster name current if you renamed yourself: this
      // route already loads and writes the crew, and only the member themselves calls it.
      const me = crew.members.find(m => m.id === s.id), nm = await shownName(s.id);
      if (me && nm && me.name !== nm) me.name = nm;
      await env.SAVES.put(`crew:${cid}`, JSON.stringify(crew));
      return json(crew);
    }

    // ---- crew dig: one shared weekly target, per-member contribution ----
    // Server-side so a member can see who actually showed up. Reset is lazy:
    // the first request in a new ISO week rolls the board over.
    const DIG_GOALS = [
      { id: "haul",  name: "Clear the east gallery", verb: "hauled", need: 240000 },
      { id: "props", name: "Set the roof props",     verb: "carried", need: 180000 },
      { id: "flood", name: "Pump out the low seam",  verb: "drained", need: 320000 },
      { id: "vein",  name: "Follow the deep vein",   verb: "cut",     need: 400000 },
    ];
    const rollDig = crew => {
      const wk = weekKey();
      if (crew.dig && crew.dig.week === wk) return false;
      if (crew.dig && crew.dig.total >= crew.dig.need) crew.digsDone = (crew.digsDone || 0) + 1;
      // Deterministic from the week + crew id, so every member sees the same job.
      let n = 0; for (const ch of (wk + crew.id)) n = (n * 31 + ch.charCodeAt(0)) % 9973;
      const g = DIG_GOALS[n % DIG_GOALS.length];
      crew.dig = { week: wk, id: g.id, name: g.name, verb: g.verb,
                   need: g.need * Math.max(1, crew.members.length), total: 0, by: {}, paid: false };
      return true;
    };

    if (p === "/api/crew/dig") {
      if (request.method !== "POST") return json({ error: "POST only" }, 405);
      const cid = await crewIdFor(s.id);
      const crew = await loadCrew(cid);
      if (!crew) return json({ error: "Not in a crew." }, 400);
      const body = await request.json().catch(() => ({}));
      const amount = Math.max(0, Math.min(500000, Number(body.amount) || 0));
      const rolled = rollDig(crew);
      const seen = touchSeen(crew);
      if (amount > 0) {
        crew.dig.total += amount;
        crew.dig.by[s.id] = (crew.dig.by[s.id] || 0) + amount;
      }
      const hit = crew.dig.total >= crew.dig.need && !crew.dig.paid;
      if (hit) {
        crew.dig.paid = true;
        crew.xp += 4000 * crew.members.length;
        crew.digsDone = (crew.digsDone || 0) + 1;
        // A week where everyone contributed counts double toward the crew's standing.
        if (crew.members.every(m => (crew.dig.by[m.id] || 0) > 0)) crew.fullWeeks = (crew.fullWeeks || 0) + 1;
      }
      if (rolled || seen || amount > 0 || hit) await env.SAVES.put(`crew:${cid}`, JSON.stringify(crew));
      return json({ ...crew, justFinished: hit });
    }

    if (p === "/api/crew/upgrade") {
      if (request.method !== "POST") return json({ error: "POST only" }, 405);
      const cid = await crewIdFor(s.id);
      const crew = await loadCrew(cid);
      if (!crew) return json({ error: "Not in a crew." }, 400);
      const body = await request.json().catch(() => ({}));
      const id = body.id === 1 ? 1 : 0;
      const cost = id === 0 ? 6000 * (crew.pick + 1) : 12000 * (crew.shift + 1);
      if (crew.xp < cost) return json({ error: "Not enough crew xp." }, 400);
      crew.xp -= cost;
      if (id === 0) crew.pick += 1; else crew.shift += 1;
      await env.SAVES.put(`crew:${cid}`, JSON.stringify(crew));
      return json(crew);
    }

    // The client sends a kind and a number, never a message. The text is built
    // here so a modified client can't post arbitrary strings into a public feed.
    if (p === "/api/feed") {
      if (request.method !== "POST") return json({ error: "POST only" }, 405);
      const body = await request.json().catch(() => null);
      const kind = body && body.kind;
      const n = Math.floor(Number(body && body.n) || 0);
      if (!["debt", "depth", "wyrm", "win"].includes(kind)) return json({ error: "bad kind" }, 400);
      if (n < 0 || n > 1e15) return json({ error: "bad n" }, 400);

      const feed = await readFeed();
      const mine = feed.find(e => e.id === s.id);
      if (mine && Date.now() - mine.t < FEED_COOLDOWN) return json({ ok: true, skipped: "cooldown" });

      const board = (await env.SAVES.get(`board:${s.id}`, { type: "json" })) || {};
      const name = board.name || s.name || "A miner";
      feed.unshift({ t: Date.now(), id: s.id, name: String(name).slice(0, 24), kind, n });
      await env.SAVES.put("feed", JSON.stringify(feed.slice(0, FEED_MAX)));
      return json({ ok: true });
    }

    if (p === "/api/save") {
      if (request.method !== "POST") return json({ error: "POST only" }, 405);
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object" || JSON.stringify(body).length > 30000) return json({ error: "bad save" }, 400);
      const pr = body.profile || {};
      const custom = typeof pr.name === "string" && /^[A-Za-z0-9 ._-]{2,24}$/.test(pr.name.trim()) ? pr.name.trim() : "";
      const col = v => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : undefined);
      const score = Math.floor(body.lifetime || 0);
      const prev = (await env.SAVES.get(`board:${s.id}`, { type: "json" })) || {};
      const wk = weekKey();
      let { week, weekBase, prevWeek, prevScore } = prev;
      if (week !== wk) {
        if (week) { prevWeek = week; prevScore = Math.max(0, (prev.score || 0) - (weekBase || 0)); }
        week = wk; weekBase = score;
      }
      // Same shape as the weekly rollover, one tier up. A row with no era at all is a
      // season-1 player: their whole score to date becomes their season-1 result.
      let { era, eraBase, prevEra, prevEraScore } = prev;
      if (era !== ERA) {
        if (prev.id) {
          prevEra = era || 1;
          prevEraScore = Math.max(0, (prev.score || 0) - (eraBase || 0));
        }
        era = ERA; eraBase = score;
      }
      await env.SAVES.put(`save:${s.id}`, JSON.stringify(body));
      await env.SAVES.put(`board:${s.id}`, JSON.stringify({
        id: s.id, name: custom || s.name, title: TITLES[pr.title] || "", shirt: col(pr.shirt), hat: col(pr.hat),
        keeps: Math.min(20, Array.isArray(body.story && body.story.keeps) ? body.story.keeps.length : 0),
        score, depth: (body.depth || 0) + 1, oil: body.oil || 0, week, weekBase, prevWeek, prevScore,
        era, eraBase, prevEra, prevEraScore,
      }));
      return json({ ok: true });
    }

    return json({ error: "not found" }, 404);
  }
}
