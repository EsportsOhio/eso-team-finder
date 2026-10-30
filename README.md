# Esports Ohio Team Finder — standalone frontend candidate

**Status (October 30, 2026):** Local integration candidate in `EsportsOhio/eso-team-finder`; read-only endpoints and an unapplied migration are prepared in the separate private `Esports-Ohio/registration-dashboard` checkout. No push, hosted migration, deployment, production integration verification, or DNS change has occurred. See [local review evidence](docs/local-implementation-review.md).

## Approved scope

The controlling design is the **user-approved October 30 screenshot**, with Esports Ohio's actual supplied logo. The referenced `docs/approved-visual-reference.png` is absent from this checkout; this change preserves the existing HTML/CSS. Current season only: a map, compact participating-school table, HS/MS and game filters, address/ZIP search, straight-line distance, and no coach/contact/student data. School logos on markers are optional future data (`logoPath`). Historical mode and full ESO site navigation are deliberately deferred.

## Local commands

From the project folder:

```bash
npm test
npm run build
npm run serve
```

Open `http://localhost:8765/?preview=1` to inspect the **local-only sample list**. It is intentionally labeled illustrative and is NOT an ESO production directory. Without `?preview=1`, the site requests the configured dashboard endpoints. The local endpoint implementation has not been deployed.

`npm run build` produces an allowlisted `dist/` for GitHub Pages publication; **the local preview file and sample fixtures are never copied to `dist/`**. Hosting and DNS are separate, not yet authorized steps. This implementation currently loads Leaflet and markercluster from a CDN and OSM raster map tiles; offline previews can show a map fallback. Map operation/availability has **not** been verified end-to-end in production.

## Public data contract

The read-only authoritative source is the ESO registration dashboard's *already synchronized* LeagueOS team-registration table. `assets/site-config.json` currently names the proposed public endpoints:

- `GET https://register.esportsohio.org/api/public/team-directory`
- `GET https://register.esportsohio.org/api/public/team-directory/geocode?query=...`

**Neither endpoint is claimed to operate publicly today.** The feed is specified by `src/directory.mjs`. The backend projection allowlists fields server-side, and the client validates the response again. `assets/locations.json` contains 3,611 Ohio NCES EDGE public-school points from the 2024–25 collection, matched only by exact NCES ID. Missing IDs remain unlocated. The registry contains coordinates and source labels, not participation records.

The frontend fetches new school data on initial load, on **Refresh data**, and every **10 minutes while visible**. These fetches must not trigger provider-side LeagueOS refresh jobs or additional invoices. The endpoint's cache/freshness policy must allow newly confirmed schools to appear in bounded time after the authoritative registration-dashboard sync.

## Deployment candidate

Use an ESO-owned GitHub Pages public site with a verified custom domain `teams.esportsohio.org` only after specific release approval. The Actions Pages workflow should upload the output of `npm run build` (`dist/`), not the source folder. The map UI still requires a reliable tile/CDN policy review before production publication; OSM's public tile servers are best effort, not a guaranteed hosting contract.

## Tests, privacy and known blockers

- `npm test` tests schema strictness, rejected contact/financial fields, correct counts, location lookup safety, filters, and distances.
- Client-side privacy validation is defense in depth; public backend SELECT/projected JSON **must never expose private fields**.
- The local feed, CORS, Census lookup, NCES registry, refresh behavior and privacy checks are implemented. Production reconciliation, campus exceptions, independent security review, and desktop/mobile map acceptance remain open.
- No production data, finance, LeagueOS, or credentials are included in this archive.

See [local review evidence](docs/local-implementation-review.md) for validation, limits, and separately gated release work.
