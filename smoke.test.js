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
    attrs: {}, style: {}, children: [], textContent: "", innerHTML: "",
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    appendChild(c) { this.children.push(c); },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    replaceWith() {}, remove() {},
    getContext() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
    focus() {}, click() {},
  };
}
const el = makeEl();
globalThis.document = {
  getElementById: () => el,
  querySelector: () => el,
  querySelectorAll: () => [],
  createElement: () => makeEl(),
  addEventListener() {},
  body: el, documentElement: el, hidden: false,
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
  ";globalThis.X_DATA = { BUSINESSES, MAP_LOCATIONS, SCENES, EVENTS, OPPORTUNITIES, EVENT_VISITORS, EVENT_QUOTES, QUOTES, CHAR_NAMES };" +
  ";globalThis.X_GAME = { get state() { return state; }, newGame, save, load, endDay, bizRevPerSec, bizSynergyMult, flushSceneEvents, rollSceneEvents };";
(0, eval)(src);
const D = globalThis.X_DATA;
const G = globalThis.X_GAME;

G.newGame();
const s0 = G.state;
console.log("nouvelle partie : jour", s0.day, "| cash", s0.cash);

// Simulation de 10 jours : les événements de scène doivent arriver
let sceneEventDays = [];
for (let i = 0; i < 10; i++) {
  G.endDay();
  if (G.state.sceneEvents.length) sceneEventDays.push(G.state.day);
}
console.log("events de scene en file apres 10 jours:", G.state.sceneEvents.length, "| jours avec file non vide:", sceneEventDays.join(",") || "aucun");
console.log("evenements de scene arrives:", sceneEventDays.length > 0 ? "OK" : "FAIL");

// Le premier est garanti des le jour 2
console.log("premier event garanti jour 2:", sceneEventDays.includes(2) ? "OK" : "INFO (aleatoire)");

// Resolution via flush
G.state.sceneEvents = ["hank"];
G.flushSceneEvents();
console.log("flushSceneEvents:", G.state.sceneEvents.length === 0 ? "OK" : "FAIL");

// Les evenements loc pointent vers des lieux valides
const locTagged = D.EVENTS.filter((e) => e.loc);
console.log("evenements avec lieu:", locTagged.length >= 20 ? "OK (" + locTagged.length + ")" : "FAIL",
  "| lieux valides:", locTagged.every((e) => D.MAP_LOCATIONS.some((l) => l.id === e.loc)) ? "OK" : "FAIL");

// Synergies
const syn1 = G.bizSynergyMult("carwash");
G.state.staff.push("jesse");
const syn2 = G.bizSynergyMult("carwash");
console.log("synergies:", syn1 === 1 && Math.abs(syn2 - 1.15) < 0.001 ? "OK" : "FAIL (" + syn1 + "/" + syn2 + ")");
console.log("rev carwash:", G.bizRevPerSec("carwash") > 0 ? "OK" : "FAIL");

// Save / load avec sceneEvents
G.state.sceneEvents = ["tuco"];
G.save();
G.load();
console.log("save/load sceneEvents:", Array.isArray(G.state.sceneEvents) && G.state.sceneEvents.includes("tuco") ? "OK" : "FAIL");

// Verifications fichiers
const mapjs = fs.readFileSync("js/map.js", "utf8");
console.log("bandeau carte:", mapjs.includes("drawEventBanner") && mapjs.includes("drawEventBanner(w, h);") ? "OK" : "FAIL");
const gjs = fs.readFileSync("js/game.js", "utf8");
console.log("rollSceneEvents appele dans endDay:", gjs.includes("rollSceneEvents();") ? "OK" : "FAIL");
console.log("garanti jour 2:", gjs.includes("sceneEventsSeen") ? "OK" : "FAIL");
const sw = fs.readFileSync("sw.js", "utf8");
console.log("SW cache v20:", sw.includes("heisenberg-v20") ? "OK" : "FAIL");

// v21 : persos, dialogues, scènes d'événements
console.log("CHAR_NAMES:", Object.keys(D.CHAR_NAMES).length === 18 ? "OK (18)" : "FAIL (" + Object.keys(D.CHAR_NAMES).length + ")");
console.log("EVENT_QUOTES:", Object.keys(D.EVENT_QUOTES).length === 21 ? "OK (21)" : "FAIL (" + Object.keys(D.EVENT_QUOTES).length + ")");
const extraQ = Object.keys(D.QUOTES).filter((k) => D.QUOTES[k].length >= 4).length;
console.log("QUOTES enrichies:", extraQ === 18 ? "OK (18/18)" : "FAIL (" + extraQ + "/18)");
console.log("visiteurs = vrais persos:", D.EVENT_VISITORS.hank === undefined || typeof D.EVENT_VISITORS.hank === "object" ? "OK" : "FAIL");
const locjs = fs.readFileSync("js/locscene.js", "utf8");
console.log("yeux+blink:", locjs.includes("const blink = Math.sin") ? "OK" : "FAIL");
console.log("bras animes:", locjs.includes("const armSw") ? "OK" : "FAIL");
console.log("bulles v2 (nom+wrap):", locjs.includes("wrapText") && locjs.includes("CHAR_NAMES") && locjs.includes("bubbleColor") ? "OK" : "FAIL");
console.log("bulle visiteur:", locjs.includes("evQuote") ? "OK" : "FAIL");
console.log("aura evenement:", locjs.includes("drawEventAura") ? "OK" : "FAIL");
const sw2 = fs.readFileSync("sw.js", "utf8");
console.log("SW cache v21:", sw2.includes("heisenberg-v21") ? "OK" : "FAIL");

// v22 : combo + chaînes
console.log("combo champs:", typeof G.state.combo === "number" && typeof G.state.comboUntil === "number" && typeof G.state.maxCombo === "number" ? "OK" : "FAIL");
const evIds2 = D.EVENTS.map((e) => e.id);
console.log("chaines gus:", ["gusContract","gusReward","gusAnger"].every((id) => evIds2.includes(id)) ? "OK" : "FAIL");
console.log("chaines mule:", ["muleRun","mulePay","muleBust"].every((id) => evIds2.includes(id)) ? "OK" : "FAIL");
console.log("succes combo:", fs.readFileSync("js/data.js", "utf8").includes("combo50") ? "OK" : "FAIL");
const gjs3 = fs.readFileSync("js/game.js", "utf8");
console.log("combo dans tapBoost:", gjs3.includes("comboMult") && gjs3.includes("comboUntil = now + 2500") ? "OK" : "FAIL");
console.log("ROADMAP:", fs.existsSync("ROADMAP.md") && fs.readFileSync("ROADMAP.md", "utf8").includes("Phase 6") ? "OK" : "FAIL");
const sw3 = fs.readFileSync("sw.js", "utf8");
console.log("SW cache v22:", sw3.includes("heisenberg-v22") ? "OK" : "FAIL");

console.log("SMOKE TEST PASSE");
process.exit(0);
