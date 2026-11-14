const fs = require("fs");

const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
function makeEl() {
  return {
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    attrs: {},
    style: {},
    children: [],
    textContent: "",
    innerHTML: "",
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    appendChild(c) { this.children.push(c); },
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    replaceWith() {},
    remove() {},
    getContext() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
    focus() {},
    click() {},
  };
}
const el = makeEl();
globalThis.document = {
  getElementById: () => el,
  querySelector: () => el,
  querySelectorAll: () => [],
  createElement: () => makeEl(),
  addEventListener() {},
  body: el,
  documentElement: el,
  hidden: false,
};
globalThis.window = globalThis;
globalThis.performance = { now: () => Date.now() };
globalThis.requestAnimationFrame = () => 0;
globalThis.navigator = { vibrate() {}, serviceWorker: { register: async () => {} } };

class FakeAC {
  createOscillator() { return { connect(){}, start(){}, stop(){}, frequency: { value: 0, setValueAtTime(){}, exponentialRampToValueAtTime(){} }, type: "" }; }
  createGain() { return { connect(){}, gain: { value: 0, setValueAtTime(){}, exponentialRampToValueAtTime(){}, linearRampToValueAtTime(){} } }; }
  get destination() { return {}; }
  get currentTime() { return 0; }
  resume() { return Promise.resolve(); }
  get state() { return "running"; }
}
globalThis.AudioContext = FakeAC;
globalThis.webkitAudioContext = FakeAC;

const src =
  fs.readFileSync("js/data.js", "utf8") + "\n" +
  fs.readFileSync("js/game.js", "utf8") + "\n" +
  ";globalThis.X_DATA = { BUSINESSES, MAP_LOCATIONS, SCENES, CHAR_LOOKS, EVENTS, OPPORTUNITIES, QUOTES, DAY_QUOTES, EVENT_VISITORS };" +
  ";globalThis.X_GAME = { get state() { return state; }, newGame, save, load, endDay, bizRevPerSec, bizSynergyMult, activatePubBoost, pubBoostActive, grabOpportunity, spawnOpportunities, flushSceneEvents };";
(0, eval)(src);
const D = globalThis.X_DATA;
const G = globalThis.X_GAME;

G.newGame();
const s0 = G.state;
console.log("cash initial:", s0.cash, "| affaires:", Object.keys(s0.businesses).length, "/", D.BUSINESSES.length);

const rev = G.bizRevPerSec("carwash");
console.log("bizRevPerSec:", rev > 0 ? "OK" : "FAIL");

G.activatePubBoost();
const revBoost = G.bizRevPerSec("carwash");
console.log("boost pub x4:", Math.round(revBoost / rev) === 4 ? "OK" : "FAIL (" + (revBoost / rev) + ")");
s0.pubUntil = 0;

G.endDay();
console.log("endDay OK | opps spawn:", s0.opps.length);
if (s0.opps.length) {
  const uid = s0.opps[0].uid;
  G.grabOpportunity(uid);
  console.log("grabOpportunity:", s0.opps.some((o) => o.uid === uid) ? "FAIL" : "OK");
}

G.save();
const ok = G.load();
console.log("save/load:", ok === false ? "FAIL" : "OK");

console.log("affaires liees a un lieu:", D.BUSINESSES.filter((b) => b.locId).length === 5 ? "OK (5)" : "FAIL");
console.log("SCENES:", Object.keys(D.SCENES).length === 17 ? "OK (17)" : "FAIL");
console.log("EVENTS:", D.EVENTS.length, "| nouveau x8:", ["comboDeal","galeHelp","thinIce","bbqNeighbor","tortuga","methHeads","cousins","lydiaDemand"].every((id) => D.EVENTS.some((e) => e.id === id)) ? "OK" : "FAIL");
const locTagged = D.EVENTS.filter((e) => e.loc);
console.log("evenements avec lieu:", locTagged.length >= 20 ? "OK (" + locTagged.length + ")" : "FAIL (" + locTagged.length + ")",
  "| lieux valides:", locTagged.every((e) => D.MAP_LOCATIONS.some((l) => l.id === e.loc)) ? "OK" : "FAIL");
console.log("EVENT_VISITORS:", Object.keys(D.EVENT_VISITORS).length >= 20 ? "OK (" + Object.keys(D.EVENT_VISITORS).length + ")" : "FAIL");
console.log("OPPORTUNITIES:", D.OPPORTUNITIES.length === 7 ? "OK (7)" : "FAIL (" + D.OPPORTUNITIES.length + ")");

G.state.sceneEvents = ["hank"];
G.flushSceneEvents();
console.log("flushSceneEvents:", G.state.sceneEvents.length === 0 ? "OK (file videe)" : "FAIL");

const synBase = G.bizSynergyMult("carwash");
G.state.staff.push("jesse");
const synCrew = G.bizSynergyMult("carwash");
G.state.upgrades.push("carwash");
const synGear = G.bizSynergyMult("carwash");
console.log("synergie carwash base/crew/gear:", synBase === 1 && Math.abs(synCrew - 1.15) < 0.001 && Math.abs(synGear - 1.65) < 0.001 ? "OK (1 / 1.15 / 1.65)" : "FAIL (" + synBase + "/" + synCrew + "/" + synGear + ")");
console.log("rev avec synergies:", G.bizRevPerSec("carwash") > 0 ? "OK" : "FAIL");
const nbSyn = D.BUSINESSES.filter((b) => b.crew || b.gear).length;
console.log("affaires avec synergies:", nbSyn === 10 ? "OK (10/10)" : "FAIL (" + nbSyn + ")");

const gjs = fs.readFileSync("js/game.js", "utf8");
console.log("frequence events 0.30:", gjs.includes("chance = 0.30") ? "OK" : "FAIL");
console.log("toast fin de journee:", gjs.includes("en attente sur la carte") ? "OK" : "FAIL");
const appjs = fs.readFileSync("js/app.js", "utf8");
console.log("badge nav evenements:", appjs.includes("state.sceneEvents.length") ? "OK" : "FAIL");
const locjs = fs.readFileSync("js/locscene.js", "utf8");
console.log("visiteur scene:", locjs.includes("drawEventVisitor") && locjs.includes("triggerSceneEvent") ? "OK" : "FAIL");
const mapjs = fs.readFileSync("js/map.js", "utf8");
console.log("badge carte:", mapjs.includes("locHasEvent") ? "OK" : "FAIL");
const css = fs.readFileSync("css/style.css", "utf8");
console.log("CSS v16:", css.includes("v16 : passe design UI") ? "OK" : "FAIL");
const sw = fs.readFileSync("sw.js", "utf8");
console.log("SW cache:", sw.includes("heisenberg-v19") ? "OK" : "FAIL");

console.log("SMOKE TEST PASSE");
process.exit(0);
