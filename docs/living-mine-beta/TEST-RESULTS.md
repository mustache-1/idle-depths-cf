# Verification results

Run during implementation, 8 October 2026.

| Check | Actual result |
|---|---|
| Node shared simulation / economy / world / Worker unit suite | 12 tests passed, 0 failed |
| Seeded chamber generation | 1,000 seeds × 24 chambers; deterministic, all parent links reachable |
| Offline simulation | Partition equivalence, storage cap, construction, discoveries, rollback clock, no duplicate earnings |
| Cloud validation unit tests | Signed session, origin/method/body checks, rate limit, corrupted save rejection, concurrent duplicate action and stale revision |
| Production route regression | Static asset dispatch and unauthenticated `/api/me` unchanged; beta unavailable without its binding |
| Firefox actual browser suite | Passed startup/nonblank scene, manual mining, hiring, refresh, offline returns, construction, discoveries, contracts, haul, shafts, chambers |
| Backup | Actual browser download and validated file restore passed |
| Responsive / touch | Firefox 390×844 and 844×390, touch taps, no horizontal overflow |
| Accessibility | Reduced-motion setting and keyboard path available; not a full accessibility audit |
| Performance sample | 120 canvas renders, 40 logical miners / 18 visible sprites, 24 chambers, 1.46ms mean on test desktop. Not a mobile hardware measurement |
| Worker packaging | Wrangler 4.148.0 deploy **dry-run** passed: 73.55 KiB bundle / 22.45 KiB gzip, correct Durable Object binding; no deployment |
| Actual local Workers runtime / SQLite persistence | Attempted, blocked before startup: `uv_interface_addresses returned Unknown system error 1`. Unit transaction tests passed, but this integration test did not pass |
| Chromium | Browser executable unavailable |
| WebKit / iPhone Safari | WebKit launch failed: missing `libgstreamer-1.0.so.0`; real iPhone not tested |
| Android Chrome | Not tested |
| Syntax and git diff | Node syntax checks and `git diff --check` passed |
| Production Cloudflare deployment / live regression | Not run; approval required |

Cloudflare release gates remain in README. Browser screenshots show fixture progression, not claims about actual production player data. Node tests use a transaction test double; they do not establish Cloudflare-runtime persistence.

Settlement scene follow-up: supplied JPEG matched byte-for-byte; Firefox reference-image loading, five facility selectors, view switching and mobile hotspot taps passed. Shared-rules suite still passes all 12 tests. Updated desktop renderer sample: 1.52ms per frame; exact run results printed by the browser suite. The supplied scene background remains static.

Unified settlement worker pass: all 14 Node tests passed, including unique in-bounds positions for 40 miners and active/idle/reduced-motion poses. Native canvas rendering confirmed 40 workers with a 1.28ms mean render over 120 frames on this desktop environment; this is not a browser/mobile performance claim. Local browser suite could not run because no browser executable was available and the official Chromium download returned an invalid archive. A cloud-browser verification attempt stalled and was interrupted before page inspection; no new interactive browser-test success is claimed for this pass. Cloudflare branch deployment succeeded for the worker pass. Live asset verification is separate from interactive browser QA.
