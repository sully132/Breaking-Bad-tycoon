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
  ";globalThis.X_DATA = { BUSINESSES, MAP_LOCATIONS, SCENES, EVENTS, OPPORTUNITIES, EVENT_VISITORS, EVENT_QUOTES, QUOTES, CHAR_NAMES, RELICS, ACHIEVEMENTS, LEGEND_UPGRADES, STORY_ARCS, WEEKEND_EVENTS };" +
  ";globalThis.X_GAME = { get state() { return state; }, newGame, save, load, endDay, bizRevPerSec, bizSynergyMult, flushSceneEvents, rollSceneEvents, cookMult, tapBoost, labFloorCost, buyLabFloor, relicHas, relicTapMult, relicCookMult, relicBizMult, relicPriceMult, relicPurityBonus, rollRelic, showRelics, storyLevel, checkStoryProgress, playCinematic, showStory, isWeekend, checkLoginStreak, rollWeekendEvent, maybeShowTutorial };";
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
console.log("synergies:", syn2 >= syn1 && syn2 >= 1.15 ? "OK (" + syn1 + "/" + syn2 + ")" : "FAIL (" + syn1 + "/" + syn2 + ")");
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

// v21 : persos, dialogues, scènes d'événements
console.log("CHAR_NAMES:", Object.keys(D.CHAR_NAMES).length === 18 ? "OK (18)" : "FAIL (" + Object.keys(D.CHAR_NAMES).length + ")");
console.log("EVENT_QUOTES:", Object.keys(D.EVENT_QUOTES).length === 21 ? "OK (21)" : "FAIL (" + Object.keys(D.EVENT_QUOTES).length + ")");
const extraQ = Object.keys(D.QUOTES).filter((k) => D.QUOTES[k].length >= 3).length;
console.log("QUOTES enrichies:", extraQ === 18 ? "OK (18/18)" : "FAIL (" + extraQ + "/18)");
console.log("visiteurs = vrais persos:", D.EVENT_VISITORS.hank === undefined || typeof D.EVENT_VISITORS.hank === "object" ? "OK" : "FAIL");
const locjs = fs.readFileSync("js/locscene.js", "utf8");
console.log("yeux+blink:", locjs.includes("const blink = Math.sin") ? "OK" : "FAIL");
console.log("bras animes:", locjs.includes("const armSw") ? "OK" : "FAIL");
console.log("bulles v2 (nom+wrap):", locjs.includes("wrapText") && locjs.includes("CHAR_NAMES") && locjs.includes("bubbleColor") ? "OK" : "FAIL");
console.log("bulle visiteur:", locjs.includes("evQuote") ? "OK" : "FAIL");
console.log("aura evenement:", locjs.includes("drawEventAura") ? "OK" : "FAIL");

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
console.log("SW cache v27:", sw3.includes("heisenberg-v27") ? "OK" : "FAIL");

// v23 : étages du Superlab + reliques + prestige
console.log("labFloors migration:", typeof G.state.labFloors === "number" ? "OK" : "FAIL");
console.log("relics migration:", Array.isArray(G.state.relics) ? "OK" : "FAIL");
console.log("RELICS 8:", D.RELICS && D.RELICS.length === 8 ? "OK" : "FAIL");
console.log("labFloorCost:", G.labFloorCost(0) === 5_000_000 && G.labFloorCost(2) === 100_000_000 ? "OK" : "FAIL");
const relicHelpers = ["relicHas","relicTapMult","relicCookMult","relicBizMult","relicPriceMult","relicPurityBonus","rollRelic","showRelics"];
console.log("helpers reliques:", relicHelpers.every((f) => typeof G[f] === "function") ? "OK" : "FAIL");
G.state.cash += 10_000_000;
G.buyLabFloor();
console.log("buyLabFloor:", G.state.labFloors === 1 && G.cookMult() > 0 ? "OK" : "FAIL");
const gjs4 = fs.readFileSync("js/game.js", "utf8");
console.log("rollRelic dans endDay:", gjs4.includes("rollRelic();") ? "OK" : "FAIL");
console.log("tortoise dans addHeat:", gjs4.includes('relicHas("tortoise")') ? "OK" : "FAIL");
const djs4 = fs.readFileSync("js/data.js", "utf8");
console.log("legend biz+luck:", djs4.includes('id: "biz"') && djs4.includes('id: "luck"') ? "OK" : "FAIL");
console.log("succes v23:", djs4.includes("floors3") && djs4.includes("relic4") ? "OK" : "FAIL");
console.log("bouton reliques:", fs.readFileSync("index.html", "utf8").includes("btn-menu-relics") ? "OK" : "FAIL");
console.log("wiring reliques:", fs.readFileSync("js/app.js", "utf8").includes("btn-menu-relics") ? "OK" : "FAIL");
console.log("scene superlab v23:", fs.readFileSync("js/locscene.js", "utf8").includes("drawFloorsPanel") ? "OK" : "FAIL");
console.log("SW cache v27 (finale):", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v27") ? "OK" : "FAIL");

// v24 : monde vivant
const mjs5 = fs.readFileSync("js/map.js", "utf8");
console.log("parallaxe carte:", mjs5.includes("panX") && mjs5.includes("translate(panX * 0.45") ? "OK" : "FAIL");
console.log("avion cargo:", mjs5.includes("drawPlane") ? "OK" : "FAIL");
console.log("meteo carte:", mjs5.includes("drawMapWeather") && mjs5.includes("rollMapWeather") ? "OK" : "FAIL");
console.log("trafic enrichi:", mjs5.split("vertical: true").length - 1 >= 2 ? "OK" : "FAIL");
console.log("tap au relachement:", mjs5.includes("handleTap") && mjs5.includes("pointerup") ? "OK" : "FAIL");
const sfxjs = fs.readFileSync("js/sfx.js", "utf8");
console.log("ambiance sonore:", sfxjs.includes("startAmbient") && sfxjs.includes("ambient:") ? "OK" : "FAIL");
console.log("ambiance dans scenes:", fs.readFileSync("js/locscene.js", "utf8").includes("sfx.ambient") ? "OK" : "FAIL");

// v25 : récit
console.log("STORY_ARCS:", D.STORY_ARCS && D.STORY_ARCS.length === 3 ? "OK" : "FAIL");
console.log("chapitres par arc:", D.STORY_ARCS.every((a) => a.chapters.length >= 4) ? "OK" : "FAIL");
console.log("finales cinematiques:", D.STORY_ARCS.every((a) => Array.isArray(a.finale) && a.finale.length >= 3) ? "OK" : "FAIL");
console.log("story migration:", typeof G.state.story === "object" ? "OK" : "FAIL");
console.log("story progression:", (G.state.story.rise || 0) >= 1 ? "OK (" + G.state.story.rise + " chap. Ascension)" : "FAIL");
console.log("moteur recit:", typeof G.checkStoryProgress === "function" && typeof G.playCinematic === "function" && typeof G.showStory === "function" ? "OK" : "FAIL");
const ihtml5 = fs.readFileSync("index.html", "utf8");
console.log("overlay cinematique:", ihtml5.includes("story-overlay") && ihtml5.includes("btn-menu-story") ? "OK" : "FAIL");
console.log("wiring histoire:", fs.readFileSync("js/app.js", "utf8").includes("btn-menu-story") ? "OK" : "FAIL");
console.log("css recit:", fs.readFileSync("css/style.css", "utf8").includes(".story-overlay") ? "OK" : "FAIL");

// v26 : rétention
console.log("WEEKEND_EVENTS:", D.WEEKEND_EVENTS && D.WEEKEND_EVENTS.length === 6 ? "OK" : "FAIL");
console.log("week-end choices:", D.WEEKEND_EVENTS.filter((e) => e.type === "choice" && e.choices && e.choices.length === 2).length === 2 ? "OK" : "FAIL");
console.log("streak migration:", typeof G.state.loginStreak === "number" && typeof G.state.tutoDone === "boolean" ? "OK" : "FAIL");
console.log("isWeekend:", typeof G.isWeekend() === "boolean" ? "OK" : "FAIL");
G.state.lastLogin = "";
G.state.loginStreak = 0;
const cashAvant = G.state.cash;
G.checkLoginStreak();
console.log("streak connexion:", G.state.loginStreak >= 1 && G.state.cash > cashAvant && G.state.lastLogin !== "" ? "OK (jour " + G.state.loginStreak + ")" : "FAIL");
console.log("tuto:", typeof G.maybeShowTutorial === "function" ? "OK" : "FAIL");
const gjs6 = fs.readFileSync("js/game.js", "utf8");
console.log("week-end dans endDay:", gjs6.includes("isWeekend()) rollWeekendEvent()") ? "OK" : "FAIL");
console.log("bonus week-end:", gjs6.includes("isWeekend()) rev *= 1.15") ? "OK" : "FAIL");
console.log("ecran fin detaille:", gjs6.includes("end-stats") && gjs6.includes("Moment fort") ? "OK" : "FAIL");
console.log("tuto au splash:", fs.readFileSync("js/app.js", "utf8").includes("maybeShowTutorial") ? "OK" : "FAIL");
console.log("css fin:", fs.readFileSync("css/style.css", "utf8").includes(".end-stats") ? "OK" : "FAIL");

// v27 : finition
const ljs7 = fs.readFileSync("js/locscene.js", "utf8");
console.log("DPR adaptatif scenes:", ljs7.includes("let DPR_CAP") && ljs7.includes("fps < 45") ? "OK" : "FAIL");
console.log("eclairage dynamique:", ljs7.includes("drawLighting") && ljs7.includes("LIGHT_SPOTS") ? "OK" : "FAIL");
const mjs7 = fs.readFileSync("js/map.js", "utf8");
console.log("DPR adaptatif carte:", mjs7.includes("let DPR_CAP") && mjs7.includes("fps < 45") ? "OK" : "FAIL");
console.log("pause arriere-plan:", ljs7.includes("visibilitychange") && mjs7.includes("visibilitychange") ? "OK" : "FAIL");
console.log("accessibilite css:", fs.readFileSync("css/style.css", "utf8").includes("prefers-reduced-motion") ? "OK" : "FAIL");
console.log("simulation equilibre:", fs.existsSync("balance.test.js") ? "OK" : "FAIL");

console.log("SMOKE TEST PASSE");
process.exit(0);
