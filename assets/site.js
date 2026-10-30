import {
  GAME_INFO, addVerifiedLocations, inOhio, listGames, normalizeDirectory,
  selectSchools, validateLocationResponse,
} from "../src/directory.mjs";

const byId = (id) => document.getElementById(id);
const elements = {
  address: byId("address"), radius: byId("radius"), game: byId("game"),
  highSchool: byId("high-school"), middleSchool: byId("middle-school"),
  sort: byId("sort"), search: byId("search"), refresh: byId("refresh"),
  notice: byId("notice"), results: byId("schools"), count: byId("results-count"),
  foot: byId("results-foot"), freshness: byId("freshness"),
  mapFallback: byId("map-fallback"),
};
const localPreview = ["localhost", "127.0.0.1"].includes(location.hostname) &&
  new URLSearchParams(location.search).get("preview") === "1";
let configuration;
let directory;
let locations;
let origin = null;
let map = null;
let layer = null;
let searchCircle = null;
let markers = new Map();
let focusedPopup = null;
let refreshTimer = null;

function labelGame(code) { return GAME_INFO[code]?.name || code; }
function shortGame(code) { return GAME_INFO[code]?.short || code.slice(0, 5).toUpperCase(); }
function setNotice(message, error = false) {
  elements.notice.textContent = message;
  elements.notice.classList.toggle("error", error);
  elements.notice.hidden = !message;
}
function asDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York",
  }).format(new Date(value)) + " ET";
}
async function fetchJSON(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store", credentials: "omit", ...options });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timeout); }
}
function toggleBusy(busy) {
  elements.refresh.disabled = busy;
  elements.refresh.textContent = busy ? "Refreshing…" : "Refresh data";
}

function ensureMap() {
  if (map) return true;
  const L = window.L;
  if (!L) {
    elements.mapFallback.hidden = false;
    return false;
  }
  map = L.map("map", {
    scrollWheelZoom: false,
    zoomControl: true,
    maxBounds: [[37.7, -85.7], [42.7, -79.7]],
    maxBoundsViscosity: 0.8,
  }).setView([40.35, -82.83], 7);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
    maxZoom: 17, minZoom: 6,
  }).addTo(map);
  layer = typeof L.markerClusterGroup === "function" ? L.markerClusterGroup({
    spiderfyOnMaxZoom: true, showCoverageOnHover: false,
    maxClusterRadius: 45, disableClusteringAtZoom: 14,
  }) : L.layerGroup();
  map.addLayer(layer);
  window.addEventListener("resize", () => map.invalidateSize());
  return true;
}

function createPin(school) {
  const L = window.L;
  const isMs = school.level === "middle_school";
  let inside = `<span aria-hidden="true">${isMs ? "MS" : "HS"}</span>`;
  // This is a local, reviewed asset path only; never load arbitrary external URLs.
  if (school.logoPath) inside = `<img src="${school.logoPath}" alt="" />`;
  return L.divIcon({
    className: "", html: `<div class="eso-pin${isMs ? " ms" : ""}">${inside}</div>`,
    iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -18],
  });
}
function clearMap() {
  if (layer) layer.clearLayers();
  if (searchCircle) { map.removeLayer(searchCircle); searchCircle = null; }
  markers.clear();
}
function renderMap(schools) {
  if (!ensureMap()) return;
  const L = window.L;
  clearMap();
  for (const school of schools) {
    if (!inOhio(school.latitude, school.longitude)) continue;
    const marker = L.marker([school.latitude, school.longitude], { icon: createPin(school), title: school.name });
    const popup = document.createElement("div");
    const title = document.createElement("p"); title.className = "popup-school"; title.textContent = school.name;
    const details = document.createElement("p"); details.className = "popup-info";
    details.textContent = `${school.city} · ${school.level === "high_school" ? "High school" : "Middle school"} · ${school.confirmedTeams} confirmed teams`;
    const jump = document.createElement("button"); jump.type = "button"; jump.className = "popup-button";
    jump.textContent = "View in school list";
    jump.addEventListener("click", () => byId(`row-${school.schoolProgramId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    popup.append(title, details, jump);
    marker.bindPopup(popup);
    markers.set(school.schoolProgramId, marker);
    layer.addLayer(marker);
  }
  const zoomForSearch = origin && elements.radius.value !== "all";
  if (zoomForSearch) {
    searchCircle = L.circle([origin.latitude, origin.longitude], {
      radius: Number(elements.radius.value) * 1609.344, color: "#000080",
      fillColor: "#3f65dd", fillOpacity: .1, weight: 1.5,
    }).addTo(map);
    map.fitBounds(searchCircle.getBounds(), { padding: [22, 22], maxZoom: 11 });
  } else if (origin) map.setView([origin.latitude, origin.longitude], 9);
  else if (schools.length) map.setView([40.35, -82.83], 7);
}
function focusSchool(schoolProgramId) {
  const marker = markers.get(schoolProgramId);
  if (!map || !marker) return;
  const run = () => { marker.openPopup(); document.querySelector(".map-section")?.scrollIntoView({ behavior: "smooth", block: "center" }); };
  if (layer?.zoomToShowLayer) layer.zoomToShowLayer(marker, run);
  else { map.setView(marker.getLatLng(), Math.max(map.getZoom(), 11)); run(); }
}

function makeText(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = value;
  return node;
}
function makeGames(school) {
  const codes = school.games.map((game) => game.code);
  const chosen = elements.game.value;
  if (chosen !== "all" && codes.includes(chosen)) {
    codes.splice(codes.indexOf(chosen), 1); codes.unshift(chosen);
  }
  const box = makeText("div", "game-icons", "");
  const MAX = 7;
  for (const code of codes.slice(0, MAX)) {
    const tag = makeText("span", "game-icon", shortGame(code));
    tag.title = labelGame(code);
    tag.setAttribute("aria-label", labelGame(code));
    box.appendChild(tag);
  }
  if (codes.length > MAX) {
    const remaining = codes.length - MAX;
    const node = makeText("span", "game-overflow", `+${remaining}`);
    node.title = codes.slice(MAX).map(labelGame).join(", ");
    box.appendChild(node);
  }
  return box;
}
function cell(value, className = "") {
  const td = document.createElement("td");
  if (className) td.className = className;
  if (typeof value === "string") td.textContent = value;
  else if (value instanceof Node) td.appendChild(value);
  return td;
}
function currentSelection() {
  const levels = [];
  if (elements.highSchool.checked) levels.push("high_school");
  if (elements.middleSchool.checked) levels.push("middle_school");
  return selectSchools(directory.schools, {
    levels, game: elements.game.value, origin,
    radius: elements.radius.value, sort: elements.sort.value,
  });
}
function renderSchools() {
  if (!directory) return;
  const { schools, unlocated, totalMatchingWithoutRadius } = currentSelection();
  const fragment = document.createDocumentFragment();
  if (!schools.length) {
    const tr = document.createElement("tr");
    tr.appendChild(cell("No confirmed schools match these filters. Try a larger radius or another game.", "empty-row"));
    tr.firstChild.colSpan = 6;
    fragment.appendChild(tr);
  }
  for (const school of schools) {
    const tr = document.createElement("tr");
    tr.id = `row-${school.schoolProgramId}`;
    tr.dataset.school = school.schoolId;
    const name = cell("", "school-name");
    if (inOhio(school.latitude, school.longitude)) {
      const button = makeText("button", "", school.name);
      button.type = "button";
      button.setAttribute("aria-label", `Show ${school.name} on the map`);
      button.addEventListener("click", () => focusSchool(school.schoolProgramId));
      name.appendChild(button);
    } else name.textContent = school.name;
    const city = cell(school.city);
    const program = cell(makeText("span", `program-tag${school.level === "middle_school" ? " ms" : ""}`, school.level === "middle_school" ? "Middle school" : "High school"));
    const teams = cell(`${school.confirmedTeams} team${school.confirmedTeams === 1 ? "" : "s"}`, "team-count");
    const games = cell(makeGames(school));
    const distance = cell(school.distance == null ? "—" : `${school.distance.toFixed(1)} mi`, "distance");
    tr.append(name, city, program, teams, games, distance);
    fragment.append(tr);
  }
  elements.results.replaceChildren(fragment);
  const qualifier = origin && elements.radius.value !== "all" ? ` within ${elements.radius.value} miles` : " statewide";
  elements.count.textContent = `${schools.length} program${schools.length === 1 ? "" : "s"}${qualifier}`;
  if (unlocated) {
    elements.foot.textContent = `${unlocated} additional matching program${unlocated === 1 ? "" : "s"} lack${unlocated === 1 ? "s" : ""} verified coordinates and cannot be included in this radius. Clear the location search to view all programs.`;
  } else if (!origin) elements.foot.textContent = "Enter a location to calculate distance. Schools with both high school and middle school programs appear once per program.";
  else elements.foot.textContent = `Showing ${schools.length} of ${totalMatchingWithoutRadius} matching programs. Distances are straight-line, not driving miles.`;
  renderMap(schools);
}
function updateGameOptions() {
  const selected = elements.game.value;
  const fragment = document.createDocumentFragment();
  const all = document.createElement("option"); all.value = "all"; all.textContent = "All games"; fragment.append(all);
  for (const code of listGames(directory.schools)) {
    const option = document.createElement("option"); option.value = code; option.textContent = labelGame(code);
    fragment.appendChild(option);
  }
  elements.game.replaceChildren(fragment);
  elements.game.value = listGames(directory.schools).includes(selected) ? selected : "all";
}
async function loadDirectory(manual = false) {
  toggleBusy(true);
  try {
    const url = localPreview ? "fixtures/demo-directory.json" : configuration.directoryEndpoint;
    const data = normalizeDirectory(await fetchJSON(url));
    if (data.academicYear !== "2026-2027" || data.competitionPeriod !== "sponsored-fall") throw new Error("Unexpected directory season");
    directory = addVerifiedLocations(data, locations);
    const [startYear, endYear] = directory.academicYear.split("-");
    byId("season-label").textContent = `Current ${startYear.slice(-2)}–${endYear.slice(-2)}`;
    updateGameOptions();
    renderSchools();
    elements.freshness.textContent = `LeagueOS observed: ${asDate(directory.sourceObservedAt)} · Directory fetched: ${asDate(new Date().toISOString())}`;
    const ageMs = Date.now() - Date.parse(directory.sourceObservedAt);
    if (localPreview) setNotice("LOCAL PREVIEW — sample records and illustrative coordinates, not a live ESO directory.");
    else if (ageMs > 7 * 24 * 3600 * 1000) setNotice("Team observations are more than seven days old. Check LeagueOS for current status.");
    else if (manual) setNotice("Current directory data refreshed from ESO's latest synchronized records.");
    else setNotice("");
  } catch (error) {
    console.error("Team Finder directory unavailable", error);
    setNotice(directory
      ? "Refresh failed. Showing the last loaded directory; its observation time is shown below. Try Refresh data again."
      : "The current team directory cannot be loaded right now. Try refreshing the page. No team statuses have been inferred.", true);
    if (!directory) {
      elements.count.textContent = "Current school data unavailable";
      const tr = document.createElement("tr"); const td = cell("Unable to display verified schools until the data feed is available.", "empty-row"); td.colSpan = 6;
      tr.appendChild(td); elements.results.replaceChildren(tr);
      ensureMap();
    }
  } finally { toggleBusy(false); }
}

async function searchAddress(event) {
  event.preventDefault();
  const query = elements.address.value.trim();
  if (!query) {
    origin = null;
    setNotice("Showing statewide schools. Enter an address or ZIP code for nearby results.");
    renderSchools();
    return;
  }
  elements.search.disabled = true;
  elements.search.textContent = "Searching…";
  try {
    if (query.length > 180) throw new Error("Address too long");
    const url = new URL(configuration.geocodeEndpoint);
    url.searchParams.set("query", query);
    const resolved = validateLocationResponse(await fetchJSON(url.toString()));
    origin = resolved;
    setNotice(`Searching near ${resolved.displayName}. Distances are straight-line miles.`);
    renderSchools();
  } catch (error) {
    console.error("Team Finder location search unavailable", error);
    setNotice("The location could not be resolved. Try a full street address or five-digit Ohio ZIP code.", true);
  } finally {
    elements.search.disabled = false;
    elements.search.replaceChildren(makeText("span", "", "⌕"), document.createTextNode(" Search"));
  }
}

async function boot() {
  elements.count.textContent = "Loading current participating schools…";
  try {
    configuration = await fetchJSON("assets/site-config.json");
    locations = await fetchJSON("assets/locations.json");
    if (!configuration || !/^https:\/\//.test(configuration.directoryEndpoint) || !/^https:\/\//.test(configuration.geocodeEndpoint)) throw new Error("Invalid public endpoint configuration");
    await loadDirectory();
    elements.search.addEventListener("click", searchAddress);
    elements.address.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.isComposing && !elements.search.disabled) return searchAddress(event);
    });
    elements.refresh.addEventListener("click", () => loadDirectory(true));
    for (const control of [elements.highSchool, elements.middleSchool, elements.game, elements.radius, elements.sort]) {
      control.addEventListener("change", () => renderSchools());
    }
    const minutes = Math.max(5, Math.min(60, Number(configuration.refreshMinutes) || 10));
    refreshTimer = window.setInterval(() => { if (!document.hidden && !localPreview) void loadDirectory(); }, minutes * 60000);
    window.addEventListener("pagehide", () => { if (refreshTimer) clearInterval(refreshTimer); });
  } catch (error) {
    console.error("Team Finder could not start", error);
    setNotice("The Team Finder is temporarily unavailable.", true);
    elements.count.textContent = "Unable to load school data";
  }
}
void boot();
