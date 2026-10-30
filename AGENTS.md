# ESO Team Finder — approved MVP

The controlling mockup is the October 30, 2026 screenshot provided by Matt, not any substitute generated design. The official ESO logo is `assets/eso-logo.png`.

This is a **standalone public static site** intended for GitHub Pages at teams.esportsohio.org; the private registration dashboard is a separate repository and remains the data authority.

## Deliver MVP only

- Current confirmed ESO 2026-27 Sponsored Season programs from synchronized LeagueOS team records; never count pending, retired, historical, or mini-season teams. High School and Middle School remain distinct.
- Responsive school map and compact sortable list, HS/MS/game filters, address or ZIP location, 10/25/50/75/100 mile straight-line radius, explicit data source freshness, manual Refresh and bounded automatic refresh.
- Use real ESO logo and navy/gray/white. Minimal public header; no full website navigation. Small game tags or reviewed game logos. Generic markers now; optional school logo paths later.
- No coach/contact/student information, payment data, registration status details, credentials, private endpoint, or synthetic demo records in public output.
- Historical mode, school logo collection, new hosting services and website overhaul are deferred. Do not introduce new paid dependencies.

## Guardrails

- Preserve existing working frontend, tests and mockup fidelity. Small, coherent changes, focused validation first; never rebuild the whole project without a demonstrated reason.
- Public data must be server-side allowlisted by the private registration dashboard backend; client-side filtering does not protect private records. Do not initiate LeagueOS provider sync from public website requests.
- Never push, merge, publish Pages, edit DNS, alter hosted database/Vercel, create agents, or incur new paid services without Matt's explicit separate authorization. Local implementation and tests only at this stage.
- Source-to-production verification, release and privacy review are separate gates. Print a precise summary of changes, tests, missing evidence and next authorization.
