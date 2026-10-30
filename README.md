# Esports Ohio Team Finder — standalone frontend candidate

**Status (October 30, 2026):** Local frontend implemented and unit tested; no live production integration, public deployment, repository push, or DNS change has been performed. GitHub verified the new public repository `EsportsOhio/eso-team-finder` exists and is empty. Import this source into that exact repository locally. The private backend is owned by `Esports-Ohio` (different namespace). See the bounded Codex task in `docs/CODEX-HANDOFF.md`.

## Approved scope

This uses the **user-approved October 30 screenshot** in `docs/approved-visual-reference.png`, with Esports Ohio's actual supplied logo. Current season only: a map, compact participating-school table, HS/MS and game filters, address/ZIP search, straight-line distance, and no coach/contact/student data. School logos on markers are optional future data (`logoPath`). Historical mode and full ESO site navigation are deliberately deferred.

## Local commands

From the project folder:

```bash
npm test
npm run build
npm run serve
```

Open `http://localhost:8765/?preview=1` to inspect the **local-only sample list**. It is intentionally labeled illustrative and is NOT an ESO production directory. Without `?preview=1`, the site attempts the not-yet-implemented public endpoints described below and displays a truthful unavailable state.

`npm run build` produces an allowlisted `dist/` for GitHub Pages publication; **the local preview file and sample fixtures are never copied to `dist/`**. Hosting and DNS are separate, not yet authorized steps. Preview screenshots are under `docs/`. Note: this implementation currently loads Leaflet and markercluster from a CDN and OSM raster map tiles; offline previews can show a map fallback. Map operation/availability has **not** been verified end-to-end in production.

## Planned data contract

The read-only authoritative source is the ESO registration dashboard's *already synchronized* LeagueOS team-registration table. `assets/site-config.json` currently names the proposed public endpoints:

- `GET https://register.esportsohio.org/api/public/team-directory`
- `GET https://register.esportsohio.org/api/public/team-directory/geocode?query=...`

**Neither endpoint is claimed to exist or operate today.** The expected feed is specified by `src/directory.mjs` and exemplified only by `fixtures/demo-directory.json`; application must validate exact whitelisted fields before publication, not rely on client-side validation for confidentiality. A separate `assets/locations.json` can hold independently verified school coordinates indexed by NCES ID or canonical school ID.

The frontend fetches new school data on initial load, on **Refresh data**, and every **10 minutes while visible**. These fetches must not trigger provider-side LeagueOS refresh jobs or additional invoices. The endpoint's cache/freshness policy must allow newly confirmed schools to appear in bounded time after the authoritative registration-dashboard sync.

## Deployment candidate

Use an ESO-owned GitHub Pages public site with a verified custom domain `teams.esportsohio.org` only after specific release approval. The Actions Pages workflow should upload the output of `npm run build` (`dist/`), not the source folder. The map UI still requires a reliable tile/CDN policy review before production publication; OSM's public tile servers are best effort, not a guaranteed hosting contract.

## Tests, privacy and known blockers

- `npm test` tests schema strictness, rejected contact/financial fields, correct counts, location lookup safety, filters, and distances.
- Client-side privacy validation is defense in depth; public backend SELECT/projected JSON **must never expose private fields**.
- Live public feed, origin-specific CORS, address search, verified school coordinates, and production map visualization remain to be implemented/accepted.
- No production data, finance, LeagueOS, or credentials are included in this archive.

See `docs/CODEX-HANDOFF.md` for precise implementation and acceptance scope.
