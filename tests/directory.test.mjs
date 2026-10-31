import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  GAME_INFO, addVerifiedLocations, haversineMiles, inOhio, listGames,
  normalizeDirectory, selectSchools, validateLocationResponse,
} from "../src/directory.mjs";

const fixture = JSON.parse(fs.readFileSync(new URL("../fixtures/demo-directory.json", import.meta.url), "utf8"));
const clone = () => structuredClone(fixture);

test("validates sanitized public participation records and counts", () => {
  const directory = normalizeDirectory(clone());
  assert.equal(directory.schools.length, 14);
  assert.ok(directory.schools.every((school) => school.confirmedTeams > 0));
  assert.ok(directory.schools.every((school) => !Object.hasOwn(school, "coachEmail")));
  assert.ok(listGames(directory.schools).includes("rl"));
});

test("rejects a coach/contact field rather than leaking it to the page", () => {
  const bad = clone();
  bad.schools[0].coachEmail = "private@example.invalid";
  assert.throws(() => normalizeDirectory(bad), /Unexpected private/);
});

test("rejects an unknown top-level status/finance field", () => {
  const bad = clone();
  bad.paymentDetails = { paid: true };
  assert.throws(() => normalizeDirectory(bad), /Unexpected private/);
});

test("rejects pending/incorrect team counts and repeated program identities", () => {
  const wrong = clone();
  wrong.schools[0].confirmedTeams = 11;
  assert.throws(() => normalizeDirectory(wrong), /Team count/);
  const duplicated = clone();
  duplicated.schools[1].schoolProgramId = duplicated.schools[0].schoolProgramId;
  assert.throws(() => normalizeDirectory(duplicated), /duplicate school identifier/);
  const negative = clone();
  negative.schools[0].games[0].confirmedTeams = -2;
  assert.throws(() => normalizeDirectory(negative), /Invalid confirmed-team count/);
});

test("enforces reviewed local-only school logo asset paths", () => {
  const bad = clone();
  bad.schools[0].logoPath = "https://someone-else.example/tracker.png";
  assert.throws(() => normalizeDirectory(bad), /logo path/);
  const okay = clone();
  okay.schools[0].logoPath = "assets/schools/verified-logo.webp";
  assert.equal(normalizeDirectory(okay).schools[0].logoPath, okay.schools[0].logoPath);
});

test("adds school coordinates by stable NCES ID without inventing a location", () => {
  const raw = clone();
  delete raw.schools[0].latitude;
  delete raw.schools[0].longitude;
  delete raw.schools[0].locationSource;
  raw.schools[0].ncesSchoolId = "390000000001";
  const normalized = normalizeDirectory(raw);
  const mapped = addVerifiedLocations(normalized, {
    byNces: { "390000000001": { latitude: 41.04, longitude: -81.70, source: "NCES EDGE public school point 2024-25" } },
    bySchoolId: {},
  });
  assert.equal(mapped.schools[0].latitude, 41.04);
  assert.equal(mapped.schools[0].locationSource, "NCES EDGE public school point 2024-25");
  assert.equal(mapped.schools[1].latitude, normalized.schools[1].latitude);
  const noMatch = addVerifiedLocations(normalized, { byNces: {}, bySchoolId: {} });
  assert.equal(noMatch.schools[0].latitude, undefined);
});

test("filters high school/middle school separately and by game", () => {
  const { schools } = normalizeDirectory(clone());
  const hs = selectSchools(schools, { levels: ["high_school"], game: "rl" });
  assert.ok(hs.schools.length > 0);
  assert.ok(hs.schools.every((x) => x.level === "high_school" && x.games.some((g) => g.code === "rl")));
  const ms = selectSchools(schools, { levels: ["middle_school"], game: "minecraftBedwars" });
  assert.ok(ms.schools.length > 0);
  assert.ok(ms.schools.every((x) => x.level === "middle_school"));
  assert.equal(selectSchools(schools, { levels: [] }).schools.length, 0);
});

test("radius uses straight-line distance; excludes unknown coordinates without faking them", () => {
  const { schools } = normalizeDirectory(clone());
  const origin = { latitude: 41.012, longitude: -81.600 };
  const near = selectSchools(schools, { origin, radius: 10, sort: "nearest" });
  assert.ok(near.schools.length >= 3);
  assert.ok(near.schools.every((x) => x.distance <= 10));
  for (let i = 1; i < near.schools.length; i++) assert.ok(near.schools[i].distance >= near.schools[i - 1].distance);
  const unknown = schools.map((x, i) => i === 0 ? { ...x, latitude: undefined, longitude: undefined } : x);
  const filtered = selectSchools(unknown, { origin, radius: 100 });
  assert.equal(filtered.unlocated, 1);
  assert.equal(filtered.schools.some((x) => x.schoolProgramId === schools[0].schoolProgramId), false);
  assert.ok(haversineMiles(origin, origin) < 1e-9);
});

test("ZIP/full-address location results are validated and Ohio-bound", () => {
  assert.equal(validateLocationResponse({ latitude: 41.01, longitude: -81.60, displayName: "Barberton, OH", matchType: "postal_code" }).matchType, "postal_code");
  assert.throws(() => validateLocationResponse({ latitude: 30, longitude: -84, displayName: "Outside Ohio" }), /outside Ohio/);
  assert.equal(inOhio(41, -82), true);
  assert.equal(inOhio(37, -82), false);
});

test("game abbreviations remain compact and accessible labels exist", () => {
  assert.equal(GAME_INFO.ssbu.short, "SSBU");
  assert.equal(GAME_INFO.ssbu.name, "Super Smash Bros. Ultimate");
  assert.equal(GAME_INFO.marvelRivals.short, "MR");
});

test("all approved radii preserve game/level filters and exclude unknown locations", () => {
  const { schools } = normalizeDirectory(clone());
  const origin = { latitude: 41.012, longitude: -81.600 };
  const unknown = { ...schools[0], latitude: undefined, longitude: undefined };
  for (const radius of [10, 25, 50, 75, 100]) {
    const result = selectSchools([unknown, ...schools.slice(1)], { origin, radius, game: "rl", levels: ["high_school"] });
    assert.ok(result.schools.every((s) => s.distance <= radius && s.level === "high_school" && s.games.some((g) => g.code === "rl")));
    assert.ok(result.schools.every((s) => s.schoolProgramId !== unknown.schoolProgramId));
  }
  assert.throws(() => validateLocationResponse({ latitude: 41, longitude: -82, displayName: "Ohio", matchType: "guess" }), /match type/);
});

test("reviewed private-school campus coordinate overrides", () => {
  const locations = JSON.parse(fs.readFileSync(new URL("../assets/locations.json", import.meta.url), "utf8"));
  assert.equal(Object.keys(locations.byNces).length, 3611);
  assert.equal(Object.keys(locations.bySchoolId).length, 16);
  for (const [id, point] of Object.entries(locations.bySchoolId)) {
    assert.match(id, /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
    assert.equal(inOhio(point.latitude, point.longitude), true);
    assert.match(point.source, /Census geocoder 2026-10-31; official school campus; OEDS IRN [0-9]{6}$/);
  }
  const hsId = "84f91951-78c6-4baa-82e9-a9b21934b591";
  const msId = "60928d90-39c2-43c5-b50a-12da13d725a3";
  assert.notEqual(locations.bySchoolId[hsId].latitude, locations.bySchoolId[msId].latitude);
  const raw = clone();
  raw.schools[0].schoolId = hsId;
  delete raw.schools[0].latitude;
  delete raw.schools[0].longitude;
  delete raw.schools[0].locationSource;
  const normalized = normalizeDirectory(raw);
  const mapped = addVerifiedLocations(normalized, locations);
  assert.equal(mapped.schools[0].latitude, locations.bySchoolId[hsId].latitude);
  assert.equal(mapped.schools[0].longitude, locations.bySchoolId[hsId].longitude);
  const result = selectSchools(mapped.schools, { origin: {latitude: 39.28, longitude: -84.34}, radius: 10 });
  assert.equal(result.schools.some(s => s.schoolId === hsId), true);
});
