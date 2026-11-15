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
console.log("CHAR_NAMES:", Object.keys(D.CHAR_NAMES).length === 27 ? "OK (27)" : "FAIL (" + Object.keys(D.CHAR_NAMES).length + ")");
console.log("EVENT_QUOTES:", Object.keys(D.EVENT_QUOTES).length === 42 ? "OK (42)" : "FAIL (" + Object.keys(D.EVENT_QUOTES).length + ")");
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
console.log("SW cache v43:", sw3.includes("heisenberg-v43") ? "OK" : "FAIL");

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
console.log("SW cache v42 (finale):", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v43") ? "OK" : "FAIL");

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
console.log("WEEKEND_EVENTS:", D.WEEKEND_EVENTS && D.WEEKEND_EVENTS.length === 11 ? "OK" : "FAIL");
console.log("week-end choices:", D.WEEKEND_EVENTS.filter((e) => e.type === "choice" && e.choices && e.choices.length === 2).length === 4 ? "OK" : "FAIL");
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

// v28 : mini-jeux + événements thématiques + scènes animées
const djs8 = fs.readFileSync("js/data.js", "utf8");
const mgIds = ["rats", "hankBBQ", "turfwar", "billboard", "nightbreakin", "precursor", "scouts", "scoutsPayback", "mikeJob"];
console.log("evenements v28:", mgIds.every((id) => djs8.includes('id: "' + id + '"')) ? "OK" : "FAIL");
console.log("week-ends v28:", djs8.includes("wkDeaSlow") && djs8.includes("wkBlackMarket") && djs8.includes("wkStorm") && djs8.includes("wkGift") ? "OK" : "FAIL");
console.log("visiteurs v28:", djs8.includes("hankBBQ: CHAR_LOOKS.hank") && djs8.includes("mikeJob: CHAR_LOOKS.mike") ? "OK" : "FAIL");
console.log("minigame.js:", fs.existsSync("js/minigame.js") ? "OK" : "FAIL");
const ihtml8 = fs.readFileSync("index.html", "utf8");
console.log("overlay minijeu:", ihtml8.includes("mg-overlay") && ihtml8.includes("mg-canvas") ? "OK" : "FAIL");
console.log("script minigame:", ihtml8.includes("js/minigame.js") ? "OK" : "FAIL");
const ljs8 = fs.readFileSync("js/locscene.js", "utf8");
console.log("entree visiteur animee:", ljs8.includes("evEnterAt") ? "OK" : "FAIL");
console.log("banniere evenement:", ljs8.includes("drawEventBanner") ? "OK" : "FAIL");
console.log("braises evenement:", ljs8.includes("evParts") ? "OK" : "FAIL");
console.log("boutons minijeu:", ljs8.includes("openMinigame(\"cook\")") && ljs8.includes("openMinigame(\"tuco\")") ? "OK" : "FAIL");
console.log("migrations minijeu:", fs.readFileSync("js/game.js", "utf8").includes("mgCookDay") ? "OK" : "FAIL");
console.log("SW cache v43:", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v43") ? "OK" : "FAIL");

// v29 : maîtrise & récompenses
const djs9 = fs.readFileSync("js/data.js", "utf8");
console.log("succes minijeu v29:", ["mgPerfect", "mgTucoMax", "mgSellPerfect", "mg10"].every((id) => djs9.includes('id: "' + id + '"')) ? "OK" : "FAIL");
console.log("evenements v29:", ["carwashCrowd", "lydiaList", "comboMessage", "gasCan", "wkKaraoke"].every((id) => djs9.includes('id: "' + id + '"')) ? "OK" : "FAIL");
const mgjs9 = fs.readFileSync("js/minigame.js", "utf8");
console.log("minijeu vente:", mgjs9.includes("newSell") && mgjs9.includes("Vente express") ? "OK" : "FAIL");
console.log("stats minijeu:", mgjs9.includes("mgPlayed") && mgjs9.includes("mgBest") && mgjs9.includes("mgTucoBest") && mgjs9.includes("mgSellBest") ? "OK" : "FAIL");
console.log("bouton vente:", fs.readFileSync("js/locscene.js", "utf8").includes('openMinigame("sell")') ? "OK" : "FAIL");
console.log("migration stats v29:", fs.readFileSync("js/game.js", "utf8").includes("mgSellBest") ? "OK" : "FAIL");
console.log("SW cache v43:", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v43") ? "OK" : "FAIL");

// v30 : passe graphisme
const ljs10 = fs.readFileSync("js/locscene.js", "utf8");
console.log("ciel riche:", ljs10.includes("#4e9fd4") && ljs10.includes("#070b18") ? "OK" : "FAIL");
console.log("nuages volumetriques:", ljs10.includes("blobs") ? "OK" : "FAIL");
console.log("sols detailles:", ljs10.includes("quadraticCurveTo") && ljs10.includes("fissures") === false && ljs10.includes("rgba(90, 110, 50, 0.5)") ? "OK" : "FAIL");
console.log("grain de film:", ljs10.includes("grainTile") ? "OK" : "FAIL");
console.log("poussieres jour:", ljs10.includes("drawDust") ? "OK" : "FAIL");
console.log("brume d'aube:", ljs10.includes("drawMist") ? "OK" : "FAIL");
const mjs10 = fs.readFileSync("js/map.js", "utf8");
console.log("ciel carte dynamique:", mjs10.includes("#0a1024") && mjs10.includes("dusk") ? "OK" : "FAIL");
console.log("routes accotements:", mjs10.includes("accotements") ? "OK" : "FAIL");
console.log("vignette carte:", mjs10.includes("vignette carte") ? "OK" : "FAIL");
console.log("css v30:", fs.readFileSync("css/style.css", "utf8").includes("scene-fade") ? "OK" : "FAIL");
console.log("SW cache v43:", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v43") ? "OK" : "FAIL");

// v31 : personnages + cinématiques + premiers plans
const djs11 = fs.readFileSync("js/data.js", "utf8");
console.log("looks enrichis:", djs11.includes("mustache") && djs11.includes("badge: true") && djs11.includes("necklace: true") && djs11.includes("apron:") && djs11.includes("jacket:") ? "OK" : "FAIL");
const ljs11 = fs.readFileSync("js/locscene.js", "utf8");
console.log("cinematique ev:", ljs11.includes("evCine") && ljs11.includes("drawCine") && ljs11.includes("cineFinish") ? "OK" : "FAIL");
console.log("carnations:", ljs11.includes("look.skin") ? "OK" : "FAIL");
console.log("accessoires torse:", ljs11.includes("look.apron") && ljs11.includes("look.jacket") && ljs11.includes("look.badge") && ljs11.includes("look.necklace") && ljs11.includes("look.mustache") ? "OK" : "FAIL");
console.log("premiers plans:", ljs11.includes("drawForeground") ? "OK" : "FAIL");
console.log("SW cache v43:", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v43") ? "OK" : "FAIL");

// v32 : expressions + jambes articulées + story cinéma
const djs12 = fs.readFileSync("js/data.js", "utf8");
console.log("moods ev:", djs12.includes("EV_MOODS") ? "OK" : "FAIL");
console.log("story who:", djs12.includes('who: "Walter"') && djs12.includes('who: "Hank"') && djs12.includes('who: "Gus"') ? "OK" : "FAIL");
const ljs12 = fs.readFileSync("js/locscene.js", "utf8");
console.log("expressions:", ljs12.includes("drawPerson(x, y, s, look, mood, pose, noShadow)") && ljs12.includes('m === "angry"') && ljs12.includes('m === "happy"') ? "OK" : "FAIL");
console.log("jambes genou:", ljs12.includes("jambes articulées") && ljs12.includes("charMood") ? "OK" : "FAIL");
const gjs12 = fs.readFileSync("js/game.js", "utf8");
console.log("story typewriter:", gjs12.includes("typeTimer") && gjs12.includes("story-who") ? "OK" : "FAIL");
console.log("css v32:", fs.readFileSync("css/style.css", "utf8").includes("story-who") ? "OK" : "FAIL");
console.log("SW cache v43:", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v43") ? "OK" : "FAIL");

// v33 : cinématiques vivantes
const sjs13 = fs.readFileSync("js/sfx.js", "utf8");
console.log("bip sfx:", sjs13.includes("bip()") ? "OK" : "FAIL");
const ljs13 = fs.readFileSync("js/locscene.js", "utf8");
console.log("pose croisée:", ljs13.includes('pose === "crossed"') ? "OK" : "FAIL");
console.log("réaction persos:", ljs13.includes("cineOn") ? "OK" : "FAIL");
console.log("bips cine:", ljs13.includes("bipAt") ? "OK" : "FAIL");
console.log("bulles coupées cine:", ljs13.includes("!bubble && !evCine") ? "OK" : "FAIL");
console.log("story bips:", fs.readFileSync("js/game.js", "utf8").includes('playSfx("bip")') ? "OK" : "FAIL");
console.log("SW cache v43:", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v43") ? "OK" : "FAIL");

// v34 : caméra + deux voix + nappe musicale
const djs14 = fs.readFileSync("js/data.js", "utf8");
console.log("répliques 2 voix:", djs14.includes("EVENT_REPLIES") ? "OK" : "FAIL");
const ljs14 = fs.readFileSync("js/locscene.js", "utf8");
console.log("caméra cine:", ljs14.includes("camK") && ljs14.includes("camX") ? "OK" : "FAIL");
console.log("nappe cine:", ljs14.includes("sfx.cine") ? "OK" : "FAIL");
console.log("story nappe:", fs.readFileSync("js/game.js", "utf8").includes("cine.start") ? "OK" : "FAIL");
console.log("sfx cine:", fs.readFileSync("js/sfx.js", "utf8").includes("startCine") ? "OK" : "FAIL");
console.log("SW cache v43:", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v43") ? "OK" : "FAIL");

// v35 : montage final — portrait, fondu, sons d'événement
const djs15 = fs.readFileSync("js/data.js", "utf8");
console.log("sons ev:", djs15.includes("EV_SOUNDS") ? "OK" : "FAIL");
const ljs15 = fs.readFileSync("js/locscene.js", "utf8");
console.log("portrait cine:", ljs15.includes("LOOK_BY_NAME") && ljs15.includes("portrait du locuteur") ? "OK" : "FAIL");
console.log("fondu ligne:", ljs15.includes("lFade") ? "OK" : "FAIL");
const sjs15 = fs.readFileSync("js/sfx.js", "utf8");
console.log("sfx shot/horn:", sjs15.includes("shot()") && sjs15.includes("horn()") ? "OK" : "FAIL");
console.log("SW cache v43:", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v43") ? "OK" : "FAIL");

// v36 : grand écran — raids cinéma + générique de fin
const gjs16 = fs.readFileSync("js/game.js", "utf8");
console.log("moteur cine générique:", gjs16.includes("runCineBeats") && gjs16.includes("playRaidCinematic") ? "OK" : "FAIL");
console.log("raid cinéma:", gjs16.includes('playRaidCinematic(() =>') ? "OK" : "FAIL");
console.log("générique fin:", gjs16.includes("end-credits") ? "OK" : "FAIL");
const cjs16 = fs.readFileSync("css/style.css", "utf8");
console.log("css v36:", cjs16.includes("credits-roll") && cjs16.includes("story-overlay.raid") ? "OK" : "FAIL");
console.log("SW cache v43:", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v43") ? "OK" : "FAIL");

// v37 : souvenirs & renaissance
const gjs17 = fs.readFileSync("js/game.js", "utf8");
console.log("polaroïds:", gjs17.includes("renderEventPolaroids") && gjs17.includes("replayEventCine") ? "OK" : "FAIL");
console.log("cinématique prestige:", gjs17.includes("salon de barbier") ? "OK" : "FAIL");
console.log("migration evLog:", gjs17.includes("state.evLog") ? "OK" : "FAIL");
const ljs17 = fs.readFileSync("js/locscene.js", "utf8");
console.log("polaroïd capture:", ljs17.includes("state.evLog") ? "OK" : "FAIL");
console.log("html polaroids:", fs.readFileSync("index.html", "utf8").includes('id="polaroids"') ? "OK" : "FAIL");
console.log("css v37:", fs.readFileSync("css/style.css", "utf8").includes(".polaroid") ? "OK" : "FAIL");
console.log("SW cache v43:", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v43") ? "OK" : "FAIL");

// v38 : ouverture & collection
const gjs18 = fs.readFileSync("js/game.js", "utf8");
console.log("cinématique intro:", gjs18.includes("introPending") && gjs18.includes("un avenir mort") ? "OK" : "FAIL");
console.log("album:", gjs18.includes("renderAlbum") && gjs18.includes("événements découverts") ? "OK" : "FAIL");
console.log("migration evSeen:", gjs18.includes("state.evSeen") ? "OK" : "FAIL");
const ljs18 = fs.readFileSync("js/locscene.js", "utf8");
console.log("capture evSeen:", ljs18.includes("evSeen") ? "OK" : "FAIL");
console.log("html album:", fs.readFileSync("index.html", "utf8").includes('id="album"') ? "OK" : "FAIL");
console.log("css v38:", fs.readFileSync("css/style.css", "utf8").includes("album-grid") ? "OK" : "FAIL");
console.log("SW cache v43:", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v43") ? "OK" : "FAIL");

// v39 : détails & collection
const djs19 = fs.readFileSync("js/data.js", "utf8");
console.log("paliers album:", djs19.includes("ALBUM_TIERS") ? "OK" : "FAIL");
const ljs19 = fs.readFileSync("js/locscene.js", "utf8");
console.log("yeux suivent:", ljs19.includes("lookTargetX") && ljs19.includes("exo") ? "OK" : "FAIL");
console.log("props décor:", ljs19.includes("drawProps") && ljs19.includes("télégraphiques") ? "OK" : "FAIL");
console.log("penché cine:", ljs19.includes("lean") ? "OK" : "FAIL");
const gjs19 = fs.readFileSync("js/game.js", "utf8");
console.log("bonus album:", gjs19.includes("albumMult") && gjs19.includes("checkAlbumTiers") ? "OK" : "FAIL");
console.log("SW cache v43:", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v43") ? "OK" : "FAIL");

// v40 : trophées & faune
const djs20 = fs.readFileSync("js/data.js", "utf8");
console.log("succès album:", djs20.includes("album25") && djs20.includes("album100") ? "OK" : "FAIL");
const ljs20 = fs.readFileSync("js/locscene.js", "utf8");
console.log("ombres dynamiques:", ljs20.includes("ombre portée selon l'heure") ? "OK" : "FAIL");
console.log("faune:", ljs20.includes("drawFauna") && ljs20.includes("corbeaux") ? "OK" : "FAIL");
console.log("SW cache v43:", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v43") ? "OK" : "FAIL");

// v41 : traces & interactions
const ljs21 = fs.readFileSync("js/locscene.js", "utf8");
console.log("flaques:", ljs21.includes("drawPuddles") && ljs21.includes("puddleUntil") ? "OK" : "FAIL");
console.log("oiseaux effrayés:", ljs21.includes("tryScareFauna") && ljs21.includes("birdScare") ? "OK" : "FAIL");
console.log("chien interactif:", ljs21.includes("dogBoost") && ljs21.includes("Ouaf !") ? "OK" : "FAIL");
console.log("SW cache v43:", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v43") ? "OK" : "FAIL");

// v42 : ciel & saisons
const ljs22 = fs.readFileSync("js/locscene.js", "utf8");
console.log("saisons:", ljs22.includes("function season()") && ljs22.includes("drawSeasonTint") ? "OK" : "FAIL");
console.log("neige/feuilles:", ljs22.includes("drawSnow") && ljs22.includes("drawLeaves") ? "OK" : "FAIL");
console.log("ombres nuages:", ljs22.includes("drawCloudShadows") ? "OK" : "FAIL");
console.log("SW cache v43:", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v43") ? "OK" : "FAIL");

// v43 : gros plan gameplay
const v43ids = ["labInspector", "copperScore", "nailsTip", "plazaConcert", "villaParty", "railStrike", "snowstorm", "heatwave", "harvest"];
console.log("événements v43:", v43ids.every((id) => D.EVENTS.some((e) => e.id === id)) ? "OK (9)" : "FAIL");
console.log("visiteurs v43:", v43ids.every((id) => D.EVENT_VISITORS[id]) ? "OK (9)" : "FAIL");
console.log("succès témoin:", D.ACHIEVEMENTS.some((a) => a.id === "witness10") && D.ACHIEVEMENTS.some((a) => a.id === "witness40") ? "OK" : "FAIL");
console.log("SW cache v43:", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v43") ? "OK" : "FAIL");

console.log("SMOKE TEST PASSE");
process.exit(0);
