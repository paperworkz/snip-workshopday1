# Snip backend

A zero-dependency Bun URL shortener. Links are stored in memory and are cleared
when the server restarts.

## Run

```sh
bun start
```

The server listens on port `3000` by default. Configure `PORT` to change it.
`BASE_URL` controls the origin in returned short URLs. If it is unset, the
server uses `https://$RAILWAY_PUBLIC_DOMAIN` when available, otherwise
`http://localhost:$PORT`.

Set `PUBLIC_DIR` to serve static files alongside the API. `/` serves
`index.html`; existing files take precedence over short-link codes.

## API

| Method | Path | Result |
| --- | --- | --- |
| `POST` | `/api/links` | Accepts `{ "url": "https://example.com" }`; returns `201` and `{ code, url, shortUrl, hits, createdAt }`, or `400` with `{ error }` for invalid input. |
| `GET` | `/api/links` | Returns all links in the same shape. |
| `GET` | `/:code` | Redirects with `302` and increments `hits`; returns `404` for an unknown code. |

All responses support cross-origin browser requests. The server answers
`OPTIONS` preflights with the allowed methods and headers.
