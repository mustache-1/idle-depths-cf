import { json } from "./_session.js";
import { weekKey, weekEnds, prevWeekKey } from "./_week.js";

export const onRequestGet = async ({ env }) => {
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
};
