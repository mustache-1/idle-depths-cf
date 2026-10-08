# Changelog

- Added isolated Living Mine HTML/CSS, renderer, economy, UI, typed wire contracts and original atlas.
- Added original source-controlled art generator; rebuild with `python3 tools/living-mine-beta/art.py`.
- Added authoritative per-player beta Worker routes and Durable Object, without adding any production bindings.
- Added separate local/preview Wrangler config, audit/architecture/deployment documentation and automated tests.
- Added narrow root router dispatch and service-worker beta exclusion. Production HTML and existing save logic unchanged.
- Fixed an epoch-timestamp precision issue discovered during browser offline/construction testing; added regression coverage.

## Settlement scene correction

- Use the user's supplied underground settlement image unchanged as the default Camp scene, instead of the simple generated room layout.
- Add five positioned, touch-friendly facility controls with live levels and construction countdowns, linked to real facility upgrades.
- Add Settlement / Mine view switching; gallery selection opens the existing side-view mine.
- Preserve the supplied art as a background foundation for later layered animation and visual building upgrades. This image is user-supplied artwork, not a newly authored tileset.
- Re-run Firefox gameplay, image loading, facility hotspot and mobile touch checks; preserve the current screenshot.

## Workers mine directly in the settlement

- Removed the separate Mine scene option from the beta interface.
- Added an original pixel worker renderer over the exact supplied settlement background; every owned miner has a persistent, distinct slot, up to all 40 miners.
- Workers swing picks at the scene's crystals and added coal/copper seams, take short hauling trips and pause when storage fills.
- Added accessible clickable ore deposits tied to the existing manual mining action and visible hit feedback.
- Added animated hauling cart, worker count/status, and reduced-motion poses; no frame-based rewards or save migration.
- Surveying galleries stays inside the settlement and selects the related ore type instead of switching scenes.
- Added animation/position tests and updated browser tests to assert worker spawning, motion, direct ore clicks and no Mine option.
