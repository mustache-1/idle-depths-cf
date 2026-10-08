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
