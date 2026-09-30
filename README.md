# Idle Depths — Cloudflare Worker

Static game + API routes in one Worker. Free tier covers this easily.

## Repo layout
```
wrangler.toml        ← config (put your KV id here)
src/index.js         ← API router (/api/*)
src/_session.js      ← signed cookie sessions
src/_week.js         ← ISO week helpers
public/index.html    ← the game
public/manifest.json, icon-*.png, _headers
```

## Setup
1. **KV id** — dashboard → Storage & databases → KV → open `IDLE_DEPTHS` → Settings → copy the **Namespace ID**. Paste it into `wrangler.toml` where it says `PASTE_YOUR_KV_NAMESPACE_ID_HERE`, then commit.
2. **Secrets** — Worker → Settings → Variables and secrets → add as *Secret*:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `SESSION_SECRET` (any long random string)
3. **Deploy command** — Settings → Build → make sure it's `npx wrangler deploy` (the default).
4. **Domain** — Worker → Settings → Domains & Routes → Add → Custom domain → `idle-depths.com`.
5. **Discord** — Developer Portal → OAuth2 → Redirects → add `https://idle-depths.com/api/callback` → Save Changes.

## Notes
- Saves: KV keys `save:<discord id>`; leaderboard rows `board:<discord id>`.
- Board is cached 60s to stay inside the free KV read limit.
- To update the game later, replace `public/index.html` and commit.

## The Drain (idle-depths.com/drain)
A full rework that lives beside the old game under `/drain`. Same Worker, same KV namespace, same Discord login and crews; its own keys (`dsave:`, `dboard:`, `dsec:`) so old saves are never touched.
```
public/drain/index.html   ← the game
public/drain/engine.js    ← rules, shared: the browser plays with it, the Worker replays with it
src/drain.js              ← /api/drain/* (load, run, rig, buy, push, sectors, board)
```
- Dives are checked server-side: the client sends the seed and the list of choices, the Worker replays them and only then banks loot and updates the board.
- Weekly shaft: seed `W:<ISO week>`, same forks for everyone, ranks the weekly board.
- Crew sectors reuse `/api/crew/*` for membership; last week's payout is claimed on the next `/api/drain/load`.
- No new setup: nothing to configure in Cloudflare or Discord. Deploy as usual.
