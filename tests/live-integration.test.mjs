import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import * as contract from "../src/directory.mjs";

// Minimal DOM adapter exercises the shipped script's fetch and event wiring without a browser dependency.
class Element {
  constructor() {
    this.children = [];
    this.dataset = {};
    this.listeners = {};
    this.value = "all";
    this.checked = true;
    this.classList = { toggle() {} };
  }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.append(child); return child; }
  replaceChildren(...children) { this.children = children; }
  setAttribute() {}
  addEventListener(name, callback) { this.listeners[name] = callback; }
  get firstChild() { return this.children[0]; }
}

test("address controls cannot submit natively before boot or with JavaScript disabled", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  // With no form owner, neither Enter nor a button can submit the raw address.
  assert.doesNotMatch(html, /<form\b/i);
  assert.match(html, /<div\b[^>]*id="filters"[^>]*role="search"/);
  const address = html.match(/<input\b[^>]*id="address"[^>]*>/)[0];
  assert.doesNotMatch(address, /\bform=/);
  assert.match(html, /<button\b[^>]*id="search"[^>]*type="button"/);
});

test("shipped frontend loads live endpoints, refreshes, retains failed snapshots and works without map libraries", async () => {
  const elements = new Map();
  const byId = (id) => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const document = {
    hidden: false, getElementById: byId,
    createElement: () => new Element(), createDocumentFragment: () => new Element(),
    createTextNode: (textContent) => Object.assign(new Element(), { textContent }),
  };
  byId("sort").value = "nearest";
  byId("address").value = "43001";
  const requests = [];
  const data = JSON.parse(fs.readFileSync(new URL("../fixtures/demo-directory.json", import.meta.url)));
  let snapshot = { ...data, schools: data.schools.slice(0, 1) };
  let failDirectory = false;
  let timer;
  let interval;
  const window = {
    addEventListener() {},
    setInterval(callback, ms) { timer = callback; interval = ms; return 1; },
  };
  const fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    if (url === "assets/site-config.json") return Response.json({
      directoryEndpoint: "https://register.esportsohio.org/api/public/team-directory",
      geocodeEndpoint: "https://register.esportsohio.org/api/public/team-directory/geocode",
      refreshMinutes: 10,
    });
    if (url === "assets/locations.json") return Response.json({ byNces: {}, bySchoolId: {} });
    if (String(url).includes("/geocode?")) return Response.json({ latitude: 41, longitude: -82, displayName: "Synthetic Ohio ZIP", matchType: "postal_code" });
    assert.equal(url, "https://register.esportsohio.org/api/public/team-directory");
    return failDirectory ? new Response("", { status: 503 }) : Response.json(snapshot);
  };
  const source = fs.readFileSync(new URL("../assets/site.js", import.meta.url), "utf8")
    .replace(/^import\s*\{[\s\S]*?from "\.\.\/src\/directory\.mjs";\n/, "");
  const context = vm.createContext({ ...contract, document, window, fetch,
    location: { hostname: "teams.esportsohio.org", search: "" },
    URL, URLSearchParams, AbortController, setTimeout, clearTimeout, Node: Element,
    console: { error() {} },
  });
  vm.runInContext(source, context);
  assert.equal(byId("search").listeners.click, undefined, "Search is inert while boot awaits configuration");
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  for (let i = 0; i < 10 && !timer; i++) await settle();
  assert.equal(byId("results-count").textContent, "1 program statewide");
  assert.equal(byId("map-fallback").hidden, false);
  assert.match(byId("freshness").textContent, /LeagueOS observed:/);
  assert.equal(interval, 600000);

  snapshot = { ...data, schools: data.schools.slice(0, 2) };
  await byId("refresh").listeners.click();
  assert.equal(byId("results-count").textContent, "2 programs statewide");
  assert.ok(requests.every(({ options }) => options.credentials === "omit"));
  assert.ok(requests.every(({ url }) => !url.includes("fixtures/")));

  const beforeHidden = requests.length;
  document.hidden = true;
  timer();
  assert.equal(requests.length, beforeHidden);
  document.hidden = false;
  snapshot = { ...data, schools: data.schools.slice(0, 3) };
  timer();
  for (let i = 0; i < 5; i++) await settle();
  assert.equal(byId("results-count").textContent, "3 programs statewide");

  failDirectory = true;
  await byId("refresh").listeners.click();
  assert.equal(byId("results-count").textContent, "3 programs statewide");
  assert.match(byId("notice").textContent, /Showing the last loaded directory/);
  let prevented = 0;
  await byId("search").listeners.click({ preventDefault() { prevented++; } });
  assert.match(requests.at(-1).url, /\/geocode\?query=43001$/);
  assert.match(byId("notice").textContent, /Searching near Synthetic Ohio ZIP/);
  byId("address").value = "123 Synthetic Street, Synthetic City, OH";
  const beforeEnter = requests.length;
  await byId("address").listeners.keydown({ key: "x" });
  await byId("address").listeners.keydown({ key: "Enter", isComposing: true });
  assert.equal(requests.length, beforeEnter);
  await byId("address").listeners.keydown({ key: "Enter", preventDefault() { prevented++; } });
  assert.equal(new URL(requests.at(-1).url).searchParams.get("query"), byId("address").value);
  assert.equal(prevented, 2);
  assert.equal(context.location.search, "");
  assert.equal(byId("search").disabled, false);
});
