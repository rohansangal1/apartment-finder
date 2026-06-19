# `/api` — serverless functions (Phase 1+)

This folder is intentionally **empty of logic in Phase 0**. It exists so the
move from in-browser mock data → real external APIs is *additive*, not a
restructure.

## Why a backend is needed here (and not before)

Two forces, both in Phase 1:

1. **Secret keys.** RentCast, TravelTime, and Google keys cannot live in browser
   code — anyone can read them in dev tools and run up the bill. Every external
   call must go through serverless functions we control.
2. **Cost control via caching.** These APIs bill per call, so cache aggressively
   in a durable store (Vercel KV / Upstash, then the Phase 2 Postgres):
   - Geocoded addresses — cache forever (coordinates never change).
   - Commute times keyed by `(originHash, listingId, mode)` — long TTL.
   - Ratings per building — ~1 week TTL.

## Planned endpoints

| Endpoint | Responsibility |
|----------|----------------|
| `POST /api/search` | Orchestrate: listings (RentCast) → geocode + commute (TravelTime) → ratings (Places) → score → ranked results. Mirrors `src/lib/searchService.js`, which is deliberately written to lift straight into here. |
| `GET /api/commute` | Progressive hydration: fill commute after listings render. |
| `GET /api/rating` | Progressive hydration: fill ratings after listings render. |

Plus: per-IP **rate limiting** and a daily **budget guard / circuit breaker**.

## How the client switches over

The UI only ever imports from `src/lib/dataClient`. To go live:

1. Add `src/lib/dataClient/apiClient.js` exporting the same
   `getListings / getCommute / getRating / geocode` methods, but calling these
   endpoints via `fetch`.
2. Set `VITE_DATA_SOURCE=api`.

No view or component changes — that's the whole point of the abstraction.
