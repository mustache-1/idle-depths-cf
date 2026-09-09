import { weekKey, weekEnds, prevWeekKey } from "./_week.js";

// Inlined so this route has no dependency on _session.js. A failed import here
// throws at module load, which surfaces as Cloudflare error 1101 with no detail.
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const parse = t => { try { return t ? JSON.parse(t) : null; } catch { return null; } };

export const onRequestGet = async ({ env }) => {
  try {
    if (!env.SAVES) return json({ error: "KV binding SAVES is not configured." }, 500);

    // Read as text and parse defensively: .get(..., {type:"json"}) throws on a
    // corrupt value, which would take the whole leaderboard down until the TTL expired.
    const cached = parse(await env.SAVES.get("cache:board"));
    if (cached && cached.data && Date.now() - cached.at < 60000) return json(cached.data);

    const rows = [];
    let cursor;
    do {
      const page = await env.SAVES.list({ prefix: "board:", cursor, limit: 1000 });
      for (const k of page.keys) {
        const v = parse(await env.SAVES.get(k.name));   // one bad row must not kill the board
        if (v && typeof v.score === "number") rows.push(v);
      }
      cursor = page.list_complete ? null : page.cursor;
    } while (cursor);

    const wk = weekKey(), pk = prevWeekKey();
    const data = {
      all: [...rows].sort((a, b) => b.score - a.score).slice(0, 10),
      week: rows
        .map(r => ({ ...r, score: r.week === wk ? Math.max(0, r.score - (r.weekBase || 0)) : 0 }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10),
      champs: rows
        .filter(r => r.prevWeek === pk && r.prevScore > 0)
        .sort((a, b) => b.prevScore - a.prevScore)
        .slice(0, 3)
        .map(r => ({ id: r.id, name: r.name })),
      weekEnds: weekEnds(),
    };

    await env.SAVES.put("cache:board", JSON.stringify({ at: Date.now(), data }), { expirationTtl: 120 });
    return json(data);
  } catch (e) {
    return json({
      error: String((e && e.message) || e),
      stack: String((e && e.stack) || "").split("\n").slice(0, 4),
    }, 500);
  }
};
