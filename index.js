// Idle Depths — Cloudflare Worker (static assets + /api routes)
import { readSession, makeSession, cookieHeader, json } from "./_session.js";
import { weekKey, weekEnds, prevWeekKey } from "./_week.js";

const TITLES = { "": "", coalhand: "Coalhand", ironjaw: "Ironjaw", silverback: "Gravewalker", abyssal: "Throne-touched", gemhunter: "Gem hunter", sealed: "Debt-free", lamplighter: "Lamplighter", wyrmslayer: "Wyrmslayer", cardsharp: "Card sharp", regular: "Regular", champion: "Weekly champion", beneath: "Throne-keeper" };

export default {
  async fetch(request, env) {
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
      const data = {
        all: [...rows].sort((a, b) => b.score - a.score).slice(0, 10),
        week: rows.map(r => ({ ...r, score: r.week === wk ? Math.max(0, r.score - (r.weekBase || 0)) : 0 })).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 10),
        champs: rows.filter(r => r.prevWeek === pk && r.prevScore > 0).sort((a, b) => b.prevScore - a.prevScore).slice(0, 3).map(r => ({ id: r.id, name: r.name })),
        weekEnds: weekEnds(),
      };
      await env.SAVES.put("cache:board", JSON.stringify({ at: Date.now(), data }), { expirationTtl: 120 });
      return json(data);
    }

    // ---- everything below needs a session ----
    const s = await readSession(request, env.SESSION_SECRET);

    if (p === "/api/me") return json(s ? { id: s.id, name: s.name } : null);
    if (!s) return json({ error: "not logged in" }, 401);

    if (p === "/api/load") return json(await env.SAVES.get(`save:${s.id}`, { type: "json" }) || null);

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
      await env.SAVES.put(`save:${s.id}`, JSON.stringify(body));
      await env.SAVES.put(`board:${s.id}`, JSON.stringify({
        id: s.id, name: custom || s.name, title: TITLES[pr.title] || "", shirt: col(pr.shirt), hat: col(pr.hat),
        keeps: Math.min(20, Array.isArray(body.story && body.story.keeps) ? body.story.keeps.length : 0),
        score, depth: (body.depth || 0) + 1, oil: body.oil || 0, week, weekBase, prevWeek, prevScore,
      }));
      return json({ ok: true });
    }

    return json({ error: "not found" }, 404);
  },
};
