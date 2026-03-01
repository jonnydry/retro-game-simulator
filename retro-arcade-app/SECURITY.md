# Security Notes

This app treats ROM files and downloaded emulator assets as untrusted input.

## Current Safeguards

- Dreamcast setup downloads are restricted to an HTTPS allowlist.
- Redirects are validated and capped.
- `flycast-wasm.data` is checksum-pinned (SHA-256).
- `webgl2-compat.js` is pinned to a specific upstream ref and checksum.
- Manual ROM imports and watch-folder imports reject files larger than 512 MiB.
- Dev/preview server responses include defensive headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: no-referrer`
  - restrictive `Permissions-Policy`
- Runtime CSP is set in `index.html` for static deploy safety.
- External font fetches were removed (no Google Fonts runtime dependency).

## Operations

- Run smoke tests:
  - `npm test`
- Audit production deps:
  - `npm run audit:prod`

## Updating Dreamcast Checksum Pins

If the trusted flycast asset changes intentionally:

1. Download it with `npm run setup-dreamcast`.
2. Compute hash:
   - `shasum -a 256 public/dreamcast-data/cores/flycast-wasm.data`
3. Update `DREAMCAST_FLYCAST_SHA256` default in `scripts/setup-dreamcast.js`.
4. Run `npm test` and `npm run build`.

You can temporarily override the expected checksum while validating a change:

- `DREAMCAST_FLYCAST_SHA256=<sha256> npm run setup-dreamcast`
- `DREAMCAST_WEBGL2_PATCH_REF=<ref> DREAMCAST_WEBGL2_PATCH_SHA256=<sha256> npm run setup-dreamcast`

## Recommended Production Headers

At your deployment layer (reverse proxy/CDN), add:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy` tuned for emulator/iframe usage
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
