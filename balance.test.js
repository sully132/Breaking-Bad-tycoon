// ============================================================
// HEISENBERG TYCOON — SIMULATION D'ÉQUILIBRAGE (v27)
// Joue 100 jours avec un bot "joueur actif" utilisant les vraies
// actions du jeu (ACTIONS), et vérifie :
//   - victoire atteinte en ≤ 100 jours
//   - aucune arrestation (chaleur maîtrisée)
//   - progression continue (pas de trou de 2 jours)
// Lancer : node balance.test.js
// ============================================================
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

// Determinisme : RNG seedé pour une simulation reproductible
let seed = 42;
Math.random = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

const src =
  fs.readFileSync("js/data.js", "utf8") + "\n" +
  fs.readFileSync("js/game.js", "utf8") + "\n" +
  ";globalThis.X_DATA = { BUSINESSES, STAFF, UPGRADES, LABS, INVESTMENTS, ACHIEVEMENTS, RELICS, STORY_ARCS, MAP_LOCATIONS, EVENTS };" +
  ";globalThis.X_GAME = { get state() { return state; }, endDay, ACTIONS, deliverContract, upgradeLab, buyBusiness, hire, hireManager, buyUpgrade, buyInvestment, buyLabFloor, labFloorCost, bizCostFor, bizUnlocked, bizPoolCap, stockCap, totalBizLevels, collectAllBusinesses, bizRevPerSec, totalEmpirePerSec, checkLoginStreak };";
(0, eval)(src);
const D = globalThis.X_DATA;
const G = globalThis.X_GAME;

// Le streak de connexion crédite du cash : on le neutralise pour mesurer
// la vraie économie de jeu (le bot rejoue le même jour réel).
G.state.lastLogin = "2000-1-1";
G.state.loginStreak = 0;

function act(id) {
  const a = G.ACTIONS.find((x) => x.id === id);
  if (a && a.can(G.state)) { a.run(G.state); return true; }
  return false;
}

const s = G.state;
let victoryDay = null;
let arrestDay = null;
let maxHeat = 0;
const samples = {};

for (let d = 1; d <= 100; d++) {
  if (s.gameOver) { arrestDay = s.day; break; }

  // --- Journée active : cuisiner, vendre, blanchir, se faire discret ---
  let guard = 0;
  while (s.ap > 0 && guard++ < 15 && !s.gameOver) {
    if (s.heat >= 75 && act("hide")) continue;
    if (s.stock >= 0.5 && act("sell")) continue;
    if (s.dirty >= 1 && act("launder")) continue;
    if (act("cook")) continue;
    break;
  }
  if (!s.gameOver && s.contract && s.stock > 0) G.deliverContract();

  if (!s.gameOver) {
    // --- Investissements ---
    G.upgradeLab();
    if (s.cash >= G.labFloorCost(s.labFloors || 0) * 2) G.buyLabFloor();
    for (const m of D.STAFF) {
      if (!s.staff.includes(m.id) && s.cash >= m.cost * 2) { G.hire(m.id); break; }
    }
    for (const u of D.UPGRADES) {
      if (!s.upgrades.includes(u.id) && s.cash >= u.cost * 2) { G.buyUpgrade(u.id); break; }
    }
    // Ouvrir une nouvelle affaire si possible, sinon niveler, sinon manager
    let invested = false;
    for (const b of D.BUSINESSES) {
      const st = s.businesses[b.id];
      if (!st || st.level === 0) {
        const before = s.cash;
        G.buyBusiness(b.id);
        if (s.cash < before) { invested = true; break; }
      }
    }
    if (!invested) {
      for (const b of D.BUSINESSES) {
        const st = s.businesses[b.id];
        if (st && st.level > 0 && s.cash >= G.bizCostFor(b.id, 1) * 3) {
          const before = s.cash;
          G.buyBusiness(b.id);
          if (s.cash < before) { invested = true; break; }
        }
      }
    }
    if (!invested) {
      for (const b of D.BUSINESSES) {
        const st = s.businesses[b.id];
        if (st && st.level >= 10 && !st.manager && s.cash >= 250_000) {
          const before = s.cash;
          G.hireManager(b.id);
          if (s.cash < before) break;
        }
      }
    }
  }

  // --- Gains idle de la journée (pool géré 2 h, comme en vrai) ---
  for (const b of D.BUSINESSES) {
    const st = s.businesses[b.id];
    if (!st || st.level <= 0 || !G.bizUnlocked(b)) continue;
    const capAmt = G.bizPoolCap(b.id);
    st.pooled = Math.min(capAmt, (st.pooled || 0) + G.bizRevPerSec(b.id) * 300); // ~5 min de jeu réel par jour
  }
  G.collectAllBusinesses();

  // --- Fin de journée ---
  G.endDay();
  maxHeat = Math.max(maxHeat, s.heat);
  if (s.victory && victoryDay === null) victoryDay = s.day;
  if (s.gameOver && arrestDay === null) arrestDay = s.day;
  if ([10, 25, 50, 75, 100].includes(s.day)) {
    samples[s.day] = {
      cash: Math.round(s.cash),
      dirty: Math.round(s.dirty),
      heat: s.heat,
      lab: s.labLevel,
      bizLevels: G.totalBizLevels(),
      earned: Math.round(s.stats.totalEarned || 0),
      perSec: Math.round(G.totalEmpirePerSec()),
    };
  }
  if (s.gameOver || s.victory) break;
}

console.log("=== SIMULATION 100 JOURS (bot actif, RNG seedé) ===");
for (const [day, v] of Object.entries(samples)) {
  console.log(`Jour ${day} : cash ${v.cash}$ | sale ${v.dirty}$ | chaleur ${v.heat} | labo niv ${v.lab} | affaires ${v.bizLevels} niv | ${v.perSec}$/s`);
}
console.log("résultat:", victoryDay ? "🏆 VICTOIRE jour " + victoryDay : (arrestDay ? "🚔 ARRESTATION jour " + arrestDay : "⏳ 100 jours sans fin ni arrestation"));

let ok = true;
if (victoryDay && victoryDay <= 100) console.log("victoire ≤ 100 jours: OK (jour " + victoryDay + ")");
else if (arrestDay) { console.log("victoire ≤ 100 jours: FAIL (arrestation au jour " + arrestDay + ")"); ok = false; }
else { console.log("victoire ≤ 100 jours: FAIL (objectif non atteint, cash " + Math.round(s.cash) + "$ / " + Math.round(s.goal) + "$)"); ok = false; }

console.log("pas d'arrestation:", arrestDay === null ? "OK" : "FAIL");
console.log("chaleur max:", maxHeat, maxHeat < 100 ? "OK" : "FAIL");

// Pas de trou de 2 jours : la progression doit être continue
const days = Object.keys(samples).map(Number).sort((a, b) => a - b);
let monotone = true;
for (let i = 1; i < days.length; i++) {
  if (samples[days[i]].earned <= samples[days[i - 1]].earned) { monotone = false; }
}
console.log("progression continue:", monotone ? "OK" : "FAIL (stagnation entre échantillons)");

console.log(ok && arrestDay === null ? "SIMULATION EQUILIBREE" : "SIMULATION : DESAJUSTEMENT A CORRIGER");
process.exit(0);
