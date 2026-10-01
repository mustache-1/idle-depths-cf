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

### Tycoon mine (the Mine tab)
The default tab is an idle-tycoon mine: shafts dig into deposits, an elevator carries ore up, a hauler takes it to market, and the slowest of the three sets your income. Foremen automate each area, milestones double output, and Descend resets the mine for permanent embers.
```
public/drain/mine.js       ← economy and simulation (pure; the Worker imports it too)
public/drain/minescene.js  ← canvas drawing
public/drain/mineui.js     ← controls, loop, save
```
`/api/drain/mine` and `/api/drain/mine/save` store `dmine:<id>`. The server refuses saves whose cash exceeds earnings minus what the upgrades cost, or whose lifetime grows faster than the mine's steady income allows.

## Cold Call Cove (idle-depths.com/scam)
A solo prototype of a call-center comedy game: you cold-call fictional townspeople and sell them nonsense for pretend doubloons. Quota, boss patrols, peeking at a caller's screen, three days.
```
public/scam/index.html   ← the game
public/scam/callers.js   ← cast + products (shared with the Worker)
src/scam.js              ← POST /api/scam/talk
```
- **Scripted mode** works out of the box, for everyone.
- **AI mode** (callers are played by Claude Haiku): add an `ANTHROPIC_API_KEY` secret to the Worker. Only logged-in players get AI callers. Set `SCAM_AI=off` as a variable to switch it off. The server caps calls per player and rejects deals the character hasn't warmed up to.

## v2 (idle-depths.com/v2)
A playable preview of the next version, built on the real game's UI: a rebuilt Mine, a pixel-art Camp, a survival Dive, Forge, Guilds and the Audit, tied together by a status strip. It is a sandbox: it never reads or writes real saves (no /api calls, in-memory storage), so progress doesn't persist.
```
tools/v2/        sources (parts, css, panels) and build.py
public/v2/       the generated page
```
Rebuild with `python3 tools/v2/build.py`. The output is a frozen copy of public/index.html plus the v2 additions; the Camp engine is public/drain/mine.js.
