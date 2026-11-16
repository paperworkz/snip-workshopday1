# Snip frontend

Angular 19 client for Snip's shared URL-shortening API. This branch is an independent
source tree; `main` mounts it as the `frontend` submodule.

## Run and build

Use Node 20.11.1+, 22, or another version supported by Angular 19, with npm.
Run `npm install`, start the backend on port 3000, then run `npm start`.
Open http://localhost:4200. Angular proxies `/api/**` to http://127.0.0.1:3000.
Production uses relative `/api` requests so the generated Bun bundle serves both
the UI and API on the same origin.

- `npm run build`: production output in `dist/snip-frontend/browser` (required by the bundle builder).
- `npm test -- --watch=false --browsers=ChromeHeadless`: component/API tests; requires Chrome,
  or `CHROME_BIN` pointing to an installed Chromium-compatible browser.

The form accepts HTTP/HTTPS URLs, blocks repeat submissions while pending, displays
inline API/network errors, and refreshes the table after creation. Use Refresh to
update hit counts. Links open in a new tab; navigation increments the backend hit
count. All records disappear when the backend restarts.

## Shared API

- `POST /api/links` with `{ "url": "https://example.com" }` returns
  `201 { code, url, shortUrl, hits, createdAt }`, or `400 { error: string }`.
- `GET /api/links` returns an array of the same records.
- `GET /:code` redirects with 302 and increments hits, or returns 404.

Keep the project name and build output path unchanged. Commit and push frontend
changes here, then update the frontend submodule pointer on `main`. Never hand-edit
generated `bundle` files.
