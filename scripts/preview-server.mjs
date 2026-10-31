// Loopback-only development server. Not included in the GitHub Pages build.
// Mirror the production geocoder through public Census endpoints, without
// credentials, a staging authentication bypass, or request logging.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const zipEndpoint = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2025/MapServer/2/query";
const streetEndpoint = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";
const files = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/assets/site-config.json", "assets/site-config.json"],
  ["/assets/locations.json", "assets/locations.json"],
  ["/assets/site.css", "assets/site.css"],
  ["/assets/site.js", "assets/site.js"],
  ["/assets/eso-logo.png", "assets/eso-logo.png"],
  ["/src/directory.mjs", "src/directory.mjs"],
  ["/fixtures/demo-directory.json", "fixtures/demo-directory.json"],
]);
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};
function respond(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  });
  res.end(body);
}
function error(res, status) {
  respond(res, status, JSON.stringify({ error: status === 503 ? "service_unavailable" : "request_rejected" }));
}
function validQuery(query) {
  return query.length >= 5 && query.length <= 180 &&
    !/[\x00-\x1f\x7f<>]/.test(query) &&
    (/^\d{5}$/.test(query) || /^\d+\s+.{3,}/.test(query)) &&
    !/\bp\.?\s*o\.?\s*box\b/i.test(query);
}
function validLocation(data) {
  return data && typeof data === "object" &&
    Number.isFinite(data.latitude) && data.latitude >= 38.3 && data.latitude <= 42.3 &&
    Number.isFinite(data.longitude) && data.longitude >= -85 && data.longitude <= -80.25 &&
    typeof data.displayName === "string" && data.displayName.length > 0 && data.displayName.length <= 180 &&
    ["postal_code", "street_address"].includes(data.matchType);
}

export function createPreviewServer({ fetcher = fetch } = {}) {
  return createServer(async (req, res) => {
    if (req.method !== "GET") return error(res, 405);
    let url;
    try { url = new URL(req.url, "http://localhost"); }
    catch { return error(res, 400); }
    if (url.pathname === "/api/preview/geocode") {
      const entries = [...url.searchParams.entries()];
      const query = url.searchParams.get("query")?.trim() ?? "";
      if (entries.length !== 1 || entries[0][0] !== "query" || !validQuery(query)) return error(res, 400);
      const zip = /^\d{5}$/.test(query);
      if (zip && !/^(43|44|45)\d{3}$/.test(query)) return error(res, 404);
      const upstreamUrl = new URL(zip ? zipEndpoint : streetEndpoint);
      upstreamUrl.search = new URLSearchParams(zip ? {
        f: "json", where: `ZCTA5='${query}'`, outFields: "ZCTA5,INTPTLAT,INTPTLON", returnGeometry: "false",
      } : { address: query, benchmark: "Public_AR_Current", format: "json" }).toString();
      try {
        const upstream = await fetcher(upstreamUrl, {
          headers: { accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(8000),
        });
        if (!upstream.ok) return error(res, 503);
        const data = await upstream.json();
        let location;
        if (zip) {
          if (data.error) return error(res, 503);
          if (data.features?.length !== 1 || data.features[0].attributes?.ZCTA5 !== query) return error(res, 404);
          const row = data.features[0].attributes;
          location = {
            latitude: Number(row.INTPTLAT), longitude: Number(row.INTPTLON),
            displayName: `${query}, Ohio (Census ZIP area)`, matchType: "postal_code",
          };
        } else {
          const matches = data.result?.addressMatches;
          if (!Array.isArray(matches)) return error(res, 503);
          if (matches.length !== 1) return error(res, 404);
          const match = matches[0];
          if (match.addressComponents?.state !== "OH" || typeof match.addressComponents?.city !== "string") return error(res, 404);
          location = {
            latitude: match.coordinates?.y, longitude: match.coordinates?.x,
            displayName: `${match.addressComponents.city}, OH`, matchType: "street_address",
          };
        }
        if (!validLocation(location)) return error(res, 503);
        return respond(res, 200, JSON.stringify(location));
      } catch { return error(res, 503); }
    }
    const relative = files.get(url.pathname) ||
      (/^\/assets\/schools\/[a-z0-9_-]+\.(png|svg|webp)$/i.test(url.pathname) ? url.pathname.slice(1) : null);
    if (!relative) return error(res, 404);
    try {
      const body = await readFile(join(root, relative));
      return respond(res, 200, body, contentTypes[extname(relative)] || "application/octet-stream");
    } catch { return error(res, 404); }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createPreviewServer().listen(8765, "127.0.0.1", () => {
    console.log("ESO local Team Finder preview: http://localhost:8765/?preview=1");
    console.log("Sample school records; address geocoding uses public Census endpoints.");
  });
}
