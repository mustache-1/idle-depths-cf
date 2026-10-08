# Changelog

- Added isolated Living Mine HTML/CSS, renderer, economy, UI, typed wire contracts and original atlas.
- Added original source-controlled art generator; rebuild with `python3 tools/living-mine-beta/art.py`.
- Added authoritative per-player beta Worker routes and Durable Object, without adding any production bindings.
- Added separate local/preview Wrangler config, audit/architecture/deployment documentation and automated tests.
- Added narrow root router dispatch and service-worker beta exclusion. Production HTML and existing save logic unchanged.
- Fixed an epoch-timestamp precision issue discovered during browser offline/construction testing; added regression coverage.
