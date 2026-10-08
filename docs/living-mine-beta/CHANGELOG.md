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
