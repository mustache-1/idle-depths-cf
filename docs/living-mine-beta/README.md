# IDLE DEPTHS — Living Mine beta

Implemented on `feature/living-mine-beta`, based on main commit f8894b2. Not deployed. This is a tested first playable beta, not completion of the full art/content roadmap.

## Play locally

From the repository root, run `python3 -m http.server 8080 --directory public`, then open http://localhost:8080/living-mine-beta/. This serves device play only. Node 22+ runs the shared-rules and Worker tests: `node --test tests/living-mine-beta/engine.test.mjs`. Browser tests: install Playwright and a supported browser, then `CODEX_PRIMARY_RUNTIME_NODE_MODULES=/path/to/node_modules node tests/living-mine-beta/browser.cjs`. The browser suite starts its own server on port 8080; stop other servers first. In this environment it used the installed Firefox executable; adjust that fallback on other machines. For full local Worker testing use `npx wrangler dev --config wrangler.living-mine-beta.toml`.

The future intended URL is https://idle-depths.com/living-mine-beta/. It is not live as a result of this work.

## Built

- Shared deterministic elapsed-time economy and server action replay; one starting miner always generates income.
- Manual mining, four crew/equipment upgrades, eight shafts, up to 24 seeded connected chambers, four biome palettes.
- Interactive gallery map, six discovery types, persistent journal and production rewards.
- Four one-time contracts, Ashcombe debt payments and persistent lantern oil bonuses.
- Five functional facilities with timed construction, production/storage/transport effects and visible room changes; eight furniture placements.
- Original reproducible 24px sprite atlas, animated workers, carts, lift, drill, mineral clusters, lamps, furniture and rock tiles.
- Device autosave, previous-save fallback, corrupt-save quarantine, validated backup import/export, offline production up to 8h plus 4h per bunkhouse level.
- Isolated authenticated cloud routes and a SQLite-backed Durable Object per player; authoritative timestamps, input limits, origin checks, request IDs, revision checks, transactions, rate limits and one prior cloud backup.
- Desktop/mobile layouts, keyboard mining, touch controls, reduced-motion mode. Social disabled, with a typed future data contract. No gang endpoints or pretend working controls.

## Architecture and isolation

`public/living-mine-beta/engine.js` owns pure economy/world rules. `renderer.js` renders original atlas sprites to an integer-grid canvas at 24 fps (1 fps reduced motion), capped at 18 visible miner sprites. `ui.js` owns UI and persistence adapters. `schema.ts` describes the wire format for native clients; implementation remains dependency-free ESM JavaScript, compatible with the repository. No Swift rewrite and no new runtime rendering dependency.

Guest key: `idle-depths:living-mine:v1`, with `:backup` and `:damaged` recovery keys. Guest state is intentionally not authoritative and cannot be imported into cloud play. Keep guest play to one tab. Cloud endpoints: GET `/api/living-mine/state`, POST `/api/living-mine/action`. Auth reuses the existing signed HttpOnly Discord session. Sign in through the main website and return to beta; the existing callback returns to the production homepage. No production account creation or OAuth changes.

Cloud identity: `living-mine-v1:<session.id>` in binding `LIVING_MINE`; state/backup/receipts/rate stay inside that player's object. Client sends `{requestId,revision,action}`, never accepted balances or timestamps. IDs for other players are not accepted. No production KV access occurs on beta routes. Existing wrangler.toml and production KV binding are unchanged. Without the beta binding, cloud requests return a safe 503 and device play works. Cloud failure does not silently substitute a guest save.

Output is capped by transport; ore fills storage and stops earning until carts are dispatched. Offline earnings use full production at the same rates; construction and discoveries split the time interval at event boundaries. Browser closure requires no running timer. No reset prestige: debt payoff increases oil and preserves the world. Server mutations reconcile offline time first. Rendering motion is illustrative, not a separate resource authority.

## Existing content decisions

| Original mechanic | Beta handling |
|---|---|
| Lord Ashcombe and debt | Adapted to a 5,000-crown initial debt, scaling payments and oil rewards |
| Pickaxes, crew, machinery | Adapted to a smaller test economy with visible workers and drills |
| Lantern oil | Persistent +10% production and manual swing bonus per flask |
| Prestige | Adapted to debt settlements that preserve the discovered world |
| Contracts | Four milestone contracts; repeatable rotating contracts remain future work |
| Storylines/keepsakes | Six journal finds, Ashcombe button and Wyrm scale; full original stories not imported |
| Deep Wyrm | Lore and deep exploration milestone; boss combat remains future work |
| Wardens, wheel, streaks, daily quests | Temporarily excluded to validate idle mining before combat/minigames |
| Existing sprites | Original new atlas; no assets or engines from other game variants |

## Audit

Repository inventory: 41 tracked files at baseline; production monolithic HTML, Worker router, signed-session helper, KV-backed saves/boards/crews, static assets, root service worker and Wrangler config. No AGENTS.md, package manifest, lockfile or GitHub Actions pipeline was present. README describes Cloudflare dashboard builds using `npx wrangler deploy`. Dashboard branch configuration, secrets and deployment history are not accessible here and were not verified. Other existing variants were inventoried only, left unchanged and not imported. Reusable production identity and session logic were inspected; beta uses no production saves.

Two narrow production-file changes: early `/api/living-mine/*` dispatch/class export, and root service-worker exclusion for `/living-mine-beta`. The latter prevents beta navigation from poisoning the root homepage cache. Static entrypoint, existing APIs and existing config remain intact.

## Deployment — approval required

Do not merge or deploy this branch until approved. Creating/pushing a feature branch must not be configured to deploy the production Worker; confirm this in Cloudflare dashboard first.

1. Review branch diff and local beta. Export existing account backups as your normal precaution; no migration is performed.
2. Verify Cloudflare Builds production branch is `main`, preview branch behavior, current Worker bindings and existing migration history. These cannot be inferred from git.
3. Run `npx wrangler deploy --dry-run --config wrangler.living-mine-beta.toml` and local Worker smoke tests. Preview config is a separate Worker, not the production name, and omits production KV entirely.
4. With your explicit approval, deploy the separate preview Worker using that config. Set a preview-only SESSION_SECRET if exercising authenticated APIs with a test session. Its full production routes are not supported because production KV is intentionally not bound; play only the beta route there. Existing Discord callback configuration is not changed.
5. Validate cloud play with real Durable Object storage: two simultaneous tabs, offline return, interrupted requests, backup, rate limit, server restart and test session expiry. Verify actual iPhone Safari and Android Chrome.
6. After production approval, add the `LIVING_MINE` binding and a **new** `new_sqlite_classes = ["LivingMinePlayer"]` migration to existing production wrangler.toml. Choose a migration tag after reviewing deployed history; do not replace previous migrations or KV configuration. Preview config includes the declaration as an example.
7. Merge approved changes and deploy with existing production process. Verify `/`, `/api/me`, `/api/load`, `/api/save`, existing assets and beta route. Use a test account for production save checks, never an arbitrary player's data.
8. On failure, roll back Worker version/code. Retain the beta namespace and all production KV data; do not remove migrations or delete data as a rollback shortcut.

## Known limitations / next work

This is the first playable implementation. The small atlas and two-tier side-view camp are substantially simpler than the detailed isometric reference; it is not final production-quality artwork. World generation is a bounded connected gallery tree, with no collision-based free movement, flooded passage obstacles or branching exploration choices. Deposits label chambers; coal/copper currently share ore/crown value. Discoveries have a common 3% production bonus rather than individual research trees. Crystals are collectibles without a spending tree. No full Wyrm combat, complete stories, gang multiplayer or SwiftUI application. Facility levels change furnishings after level two, not bespoke art at every level. Device timestamps are not cheat-resistant; only cloud time is server-authoritative. Multiple guest tabs are not coordinated. Cloud receipts retain 128 IDs; stale revisions prevent old retries from repeating rewards. Prior cloud save is stored, but operator recovery is manual. No cloud save import/reset endpoints.

Wrangler dry-run packaging passed. Local runtime testing was attempted but startup failed with `uv_interface_addresses returned Unknown system error 1`; see TEST-RESULTS.md. Actual iPhone Safari, Android Chrome, real Cloudflare deployment, Discord roundtrip and Durable Object runtime integration have not passed here and remain release gates. Firefox mobile viewport/touch tests are not a substitute for those devices. No changes have been deployed to the live website.
