/**
 * ESO Team Finder public data contract. No auth, coach, student, payment,
 * document, or Program Application fields are accepted here.
 * Pure module: shared by the frontend and node:test without a build step.
 */

export const GAME_INFO = Object.freeze({
  apex: { name: "Apex Legends", short: "APEX" },
  brawlStars: { name: "Brawl Stars", short: "BS" },
  clashRoyale: { name: "Clash Royale", short: "CR" },
  fortnite: { name: "Fortnite", short: "FN" },
  madden26: { name: "Madden NFL 26", short: "M26" },
  marioKart8D: { name: "Mario Kart 8 Deluxe", short: "MK8" },
  marvelRivals: { name: "Marvel Rivals", short: "MR" },
  minecraftBedwars: { name: "Minecraft Bedwars", short: "MC" },
  overwatch: { name: "Overwatch 2", short: "OW2" },
  pokemonScarletViolet: { name: "Pokémon Scarlet/Violet", short: "PKMN" },
  r6siege: { name: "Rainbow Six Siege", short: "R6" },
  rl: { name: "Rocket League", short: "RL" },
  ssbu: { name: "Super Smash Bros. Ultimate", short: "SSBU" },
  valorant: { name: "Valorant", short: "VAL" },
});

const TOP_KEYS = new Set(["schemaVersion", "academicYear", "competitionPeriod", "generatedAt", "sourceObservedAt", "schools"]);
const SCHOOL_KEYS = new Set(["schoolId", "schoolProgramId", "name", "city", "state", "level", "ncesSchoolId", "confirmedTeams", "games", "latitude", "longitude", "locationSource", "logoPath"]);
const GAME_KEYS = new Set(["code", "confirmedTeams"]);
const LOC_KEYS = new Set(["latitude", "longitude", "source"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NCES = /^\d{12}$/;
const LEVELS = new Set(["high_school", "middle_school"]);

function plain(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}
function exactKeys(object, allowed, name) {
  if (!plain(object)) throw new Error(`Invalid ${name} record`);
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) throw new Error(`Unexpected private or unsupported ${name} field: ${key}`);
  }
}
function requiredString(value, field, limit = 180) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > limit) throw new Error(`Invalid ${field}`);
  return value.trim();
}
function isoDate(value, field) {
  const raw = requiredString(value, field, 45);
  if (!/\d{4}-\d\d-\d\dT\d\d:\d\d/.test(raw) || !Number.isFinite(Date.parse(raw))) throw new Error(`Invalid ${field}`);
  return raw;
}
export function inOhio(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= 38.3 && latitude <= 42.3 && longitude >= -85.0 && longitude <= -80.25;
}
function safeLogoPath(value) {
  if (value == null) return undefined;
  if (typeof value !== "string" || !/^assets\/schools\/[a-z0-9_-]+\.(png|svg|webp)$/i.test(value)) throw new Error("Invalid school logo path");
  return value;
}

export function normalizeDirectory(payload) {
  exactKeys(payload, TOP_KEYS, "directory");
  if (payload.schemaVersion !== 1) throw new Error("Unsupported public directory schema");
  const academicYear = requiredString(payload.academicYear, "academic year", 20);
  if (!/^\d{4}-\d{4}$/.test(academicYear)) throw new Error("Invalid academic year");
  const competitionPeriod = requiredString(payload.competitionPeriod, "period", 48);
  const generatedAt = isoDate(payload.generatedAt, "generatedAt");
  const sourceObservedAt = isoDate(payload.sourceObservedAt, "sourceObservedAt");
  if (!Array.isArray(payload.schools) || payload.schools.length > 5000) throw new Error("Invalid school collection");
  const ids = new Set();
  const schools = payload.schools.map((item) => {
    exactKeys(item, SCHOOL_KEYS, "school");
    const schoolId = requiredString(item.schoolId, "schoolId", 36);
    const schoolProgramId = requiredString(item.schoolProgramId, "schoolProgramId", 36);
    if (!UUID.test(schoolId) || !UUID.test(schoolProgramId) || ids.has(schoolProgramId)) throw new Error("Invalid or duplicate school identifier");
    ids.add(schoolProgramId);
    const name = requiredString(item.name, "school name");
    const city = requiredString(item.city, "school city", 100);
    if (item.state !== "OH" || !LEVELS.has(item.level)) throw new Error("Invalid school state or level");
    const ncesSchoolId = item.ncesSchoolId == null ? undefined : requiredString(item.ncesSchoolId, "NCES", 12);
    if (ncesSchoolId && !NCES.test(ncesSchoolId)) throw new Error("Invalid NCES identifier");
    if (!Array.isArray(item.games) || !item.games.length || item.games.length > 40) throw new Error("Invalid school games");
    const codes = new Set();
    const games = item.games.map((game) => {
      exactKeys(game, GAME_KEYS, "game");
      const code = requiredString(game.code, "game code", 45);
      if (!/^[a-zA-Z0-9_-]+$/.test(code) || codes.has(code)) throw new Error("Invalid or duplicate game code");
      codes.add(code);
      if (!Number.isSafeInteger(game.confirmedTeams) || game.confirmedTeams <= 0) throw new Error("Invalid confirmed-team count");
      return { code, confirmedTeams: game.confirmedTeams };
    });
    const confirmedTeams = games.reduce((sum, game) => sum + game.confirmedTeams, 0);
    if (confirmedTeams !== item.confirmedTeams || confirmedTeams <= 0) throw new Error("Team count does not reconcile to games");
    const hasLat = item.latitude !== undefined && item.latitude !== null;
    const hasLon = item.longitude !== undefined && item.longitude !== null;
    if (hasLat !== hasLon || (hasLat && !inOhio(item.latitude, item.longitude))) throw new Error("Invalid school coordinates");
    if (hasLat && (!item.locationSource || typeof item.locationSource !== "string")) throw new Error("Coordinates require a source");
    return {
      schoolId, schoolProgramId, name, city, state: "OH", level: item.level,
      ncesSchoolId, confirmedTeams, games,
      latitude: hasLat ? item.latitude : undefined,
      longitude: hasLon ? item.longitude : undefined,
      locationSource: hasLat ? requiredString(item.locationSource, "location source", 120) : undefined,
      logoPath: safeLogoPath(item.logoPath),
    };
  });
  return { schemaVersion: 1, academicYear, competitionPeriod, generatedAt, sourceObservedAt, schools };
}

export function addVerifiedLocations(directory, locations) {
  if (!plain(locations) || !plain(locations.byNces) || !plain(locations.bySchoolId)) throw new Error("Invalid locations registry");
  return {
    ...directory,
    schools: directory.schools.map((school) => {
      if (inOhio(school.latitude, school.longitude)) return school;
      const match = locations.bySchoolId[school.schoolId] ||
        (school.ncesSchoolId ? locations.byNces[school.ncesSchoolId] : null);
      if (!match) return school;
      exactKeys(match, LOC_KEYS, "location");
      if (!inOhio(match.latitude, match.longitude)) throw new Error("Invalid location registry coordinates");
      return { ...school, latitude: match.latitude, longitude: match.longitude, locationSource: requiredString(match.source, "coordinate source", 120) };
    }),
  };
}

export function haversineMiles(a, b) {
  const R = 3958.7613;
  const toRadians = (n) => n * Math.PI / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function listGames(schools) {
  const codes = new Set(schools.flatMap((school) => school.games.map((game) => game.code)));
  return [...codes].sort((a, b) => (GAME_INFO[a]?.name || a).localeCompare(GAME_INFO[b]?.name || b));
}

export function selectSchools(schools, { levels = ["high_school", "middle_school"], game = "all", origin = null, radius = "all", sort = "nearest" } = {}) {
  const selectedLevels = new Set(levels);
  const limit = radius === "all" ? Infinity : Number(radius);
  if (!(limit === Infinity || (Number.isFinite(limit) && limit >= 0))) throw new Error("Invalid distance filter");
  const keyed = schools.filter((school) => selectedLevels.has(school.level) &&
    (game === "all" || school.games.some((item) => item.code === game)));
  let unlocated = 0;
  const filtered = keyed.flatMap((school) => {
    const hasPosition = inOhio(school.latitude, school.longitude);
    const distance = origin && hasPosition ? haversineMiles(origin, school) : null;
    if (origin && limit < Infinity && distance === null) { unlocated++; return []; }
    if (origin && limit < Infinity && distance > limit) return [];
    return [{ ...school, distance }];
  });
  filtered.sort((a, b) => {
    if (sort === "teamCount") return b.confirmedTeams - a.confirmedTeams || a.name.localeCompare(b.name);
    if (sort === "school") return a.name.localeCompare(b.name);
    if (origin && sort === "nearest") return (a.distance ?? Infinity) - (b.distance ?? Infinity) || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
  return { schools: filtered, unlocated, totalMatchingWithoutRadius: keyed.length };
}

export function validateLocationResponse(raw) {
  if (!plain(raw) || Object.keys(raw).some((k) => !["latitude", "longitude", "displayName", "matchType"].includes(k))) throw new Error("Invalid location response");
  if (!inOhio(raw.latitude, raw.longitude)) throw new Error("Location is outside Ohio");
  if (!["postal_code", "street_address"].includes(raw.matchType)) throw new Error("Invalid location match type");
  return { latitude: raw.latitude, longitude: raw.longitude, displayName: requiredString(raw.displayName, "matched location", 180), matchType: raw.matchType };
}
