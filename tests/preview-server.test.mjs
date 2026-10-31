import test from "node:test";
import assert from "node:assert/strict";
import { createPreviewServer } from "../scripts/preview-server.mjs";
import { normalizeDirectory, selectSchools, validateLocationResponse } from "../src/directory.mjs";

async function withServer(fetcher, testCase) {
  const server = createPreviewServer({ fetcher });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = "http://127.0.0.1:" + server.address().port;
  try { return await testCase(url); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test("sample preview serves fixture and proxies only safe public Census geocoding", async () => {
  const calls = [];
  const mock = async (url, options) => {
    calls.push({ url: url.toString(), options });
    return Response.json({ features: [{ attributes: {
      ZCTA5: "44314", INTPTLAT: "41.012", INTPTLON: "-81.6",
    } }] });
  };
  await withServer(mock, async (base) => {
    const page = await fetch(base + "/?preview=1");
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Find teams near you/);
    const fixture = await fetch(base + "/fixtures/demo-directory.json");
    const data = normalizeDirectory(await fixture.json());
    assert.equal(data.schools.length, 14);
    const input = await fetch(base + "/api/preview/geocode?query=44314");
    assert.equal(input.status, 200);
    const point = validateLocationResponse(await input.json());
    const nearby = selectSchools(data.schools, { origin: point, radius: 25, sort: "nearest" });
    assert.ok(nearby.schools.length > 0);
    assert.ok(nearby.schools.every((school) => Number.isFinite(school.distance)));
    assert.match(calls[0].url, /^https:\/\/tigerweb\.geo\.census\.gov\/arcgis\/rest\/services\/TIGERweb\/tigerWMS_ACS2025\/MapServer\/2\/query\?/);
    assert.equal(new URL(calls[0].url).searchParams.get("where"), "ZCTA5='44314'");
    assert.deepEqual(calls[0].options.headers, { accept: "application/json" });
    assert.equal(calls[0].options.redirect, "error");
    assert.equal((await fetch(base + "/README.md")).status, 404);
    assert.equal((await fetch(base + "/api/preview/geocode?query=44314&other=1")).status, 400);
    assert.equal((await fetch(base + "/api/preview/geocode?query=short")).status, 400);
    assert.equal(calls.length, 1, "unsafe inputs must not contact geocoder");
  });
});

test("preview geocode rejects unsafe Census responses and projects only safe fields", async () => {
  await withServer(async () => Response.json({ features: [{ attributes: { ZCTA5: "44314", INTPTLAT: "100", INTPTLON: "-81.6", privateEmail: "hidden@example.invalid" } }] }), async (base) => {
    const response = await fetch(base + "/api/preview/geocode?query=44314");
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "service_unavailable" });
  });
  const calls = [];
  await withServer(async (url) => {
    calls.push(url.toString());
    return Response.json({ result: { addressMatches: [{
      coordinates: { x: -81.6, y: 41.012 },
      addressComponents: { city: "AKRON", state: "OH", zip: "44314", person: "not public" },
    }] }, privateEmail: "hidden@example.invalid" });
  }, async (base) => {
    const response = await fetch(base + "/api/preview/geocode?query=100%20Example%20St%20Akron%20OH");
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.deepEqual(Object.keys(data), ["latitude", "longitude", "displayName", "matchType"]);
    assert.equal(data.displayName, "AKRON, OH");
    assert.equal(new URL(calls[0]).origin, "https://geocoding.geo.census.gov");
  });
});
