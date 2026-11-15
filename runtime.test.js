// runtime.test.js — harnais d'exécution : charge TOUS les scripts dans l'ordre
// du jeu, fait tourner les vraies boucles de rendu (labo, carte, scènes, cine)
// et simule les taps. Attrape les erreurs RUNTIME que les tests texte ne voient pas.
const fs = require("fs");

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(name + ": OK");
  } catch (e) {
    failures++;
    console.log(name + ": FAIL — " + (e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e));
  }
}

// ---------- stubs ----------
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};

function makeCtx(canvas) {
  const t = {};
  const gradient = { addColorStop() {} };
  return new Proxy(t, {
    get(target, k) {
      if (k in target) return target[k];
      if (k === "canvas") return canvas;
      if (k === "createLinearGradient" || k === "createRadialGradient" || k === "createPattern") return () => gradient;
      if (k === "measureText") return (s) => ({ width: String(s == null ? "" : String(s)).length * 7 });
      if (k === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
      return () => {};
    },
    set(target, k, v) { target[k] = v; return true; },
  });
}

function makeEl(id) {
  const el = {
    id: id || "", tag: "div", attrs: {}, style: {}, dataset: {}, children: [],
    textContent: "", innerHTML: "", value: "", disabled: false, hidden: false,
    width: 0, height: 0, clientWidth: 390, clientHeight: 280,
    _listeners: {},
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      toggle(c, force) { if (force === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else if (force) this._s.add(c); else this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    addEventListener(ev, fn) { (el._listeners[ev] = el._listeners[ev] || []).push(fn); },
    removeEventListener() {},
    dispatch(ev, arg) { (el._listeners[ev] || []).slice().forEach((fn) => fn(arg)); },
    appendChild(c) { el.children.push(c); return c; },
    removeChild() {}, remove() {}, replaceWith() {},
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 390, height: 280, right: 390, bottom: 280 }; },
    getContext() { return el._ctx || (el._ctx = makeCtx(el)); },
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    insertAdjacentHTML() {}, focus() {}, click() {}, blur() {},
  };
  return el;
}

const registry = {};
const domListeners = {};
globalThis.document = {
  getElementById: (id) => (registry[id] || (registry[id] = makeEl(id))),
  querySelector: () => makeEl(),
  querySelectorAll: () => [],
  createElement: (tag) => makeEl(tag),
  createElementNS: () => makeEl(),
  addEventListener(ev, fn) { (domListeners[ev] = domListeners[ev] || []).push(fn); },
  removeEventListener() {},
  body: makeEl("body"),
  documentElement: makeEl("html"),
  hidden: false,
};

function fireDom(ev, arg) { (domListeners[ev] || []).forEach((fn) => fn(arg)); }

// rAF pump — on contrôle les frames manuellement
let rafQueue = [];
globalThis.requestAnimationFrame = (fn) => { rafQueue.push(fn); return rafQueue.length; };
globalThis.cancelAnimationFrame = () => {};
function pump(n) {
  for (let i = 0; i < n; i++) {
    const q = rafQueue;
    rafQueue = [];
    q.forEach((fn) => { try { fn(); } catch (e) { throw e; } });
  }
}
// pump tolérant : capture la première erreur et continue
let pumpError = null;
function pumpSafe(n) {
  for (let i = 0; i < n; i++) {
    const q = rafQueue;
    rafQueue = [];
    for (const fn of q) {
      try { fn(); } catch (e) { if (!pumpError) pumpError = e; }
    }
    if (pumpError) return;
  }
}

globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });
globalThis.scrollTo = () => {};
globalThis.devicePixelRatio = 2;
globalThis.innerWidth = 390;
globalThis.innerHeight = 700;
globalThis.performance = { now: () => Date.now() };
globalThis.navigator = { vibrate() {}, serviceWorker: { register: async () => {} } };
globalThis.location = { hash: "" };
globalThis.setInterval = () => 0; // pas de timers persistants dans le harnais
globalThis.clearInterval = () => {};

class FakeAC {
  createOscillator() { return { connect(){}, start(){}, stop(){}, frequency: { value: 0, setValueAtTime(){}, exponentialRampToValueAtTime(){}, linearRampToValueAtTime(){} }, type: "" }; }
  createGain() { return { connect(){}, gain: { value: 0, setValueAtTime(){}, exponentialRampToValueAtTime(){}, linearRampToValueAtTime(){} } }; }
  get destination() { return {}; }
  get currentTime() { return 0; }
  resume() { return Promise.resolve(); }
  get state() { return "running"; }
}
globalThis.AudioContext = FakeAC;
globalThis.webkitAudioContext = FakeAC;

// ---------- chargement de TOUS les scripts dans l'ordre du jeu ----------
const files = ["js/data.js", "js/sfx.js", "js/scene.js", "js/game.js", "js/map.js", "js/locscene.js", "js/minigame.js", "js/app.js"];
const src = files.map((f) => fs.readFileSync(f, "utf8")).join("\n;\n") +
  "\n;globalThis.XG = { get state() { return state; }, newGame, endDay, save, load, render, bizRevPerSec, queueChainEvent, showEventModal: (typeof showEventModal === 'function' ? showEventModal : null), __locs: MAP_LOCATIONS.map((l) => l.id) };";

check("chargement de tous les scripts", () => {
  (0, eval)(src);
});

check("DOMContentLoaded (inits labo/carte/locscene/app)", () => {
  fireDom("DOMContentLoaded", {});
});

check("30 frames de rendu global", () => {
  pumpSafe(30);
  if (pumpError) { const e = pumpError; pumpError = null; throw e; }
});

check("newGame + render complet", () => {
  XG.newGame();
  XG.render();
});

check("render avec contrat express actif (badge ⚡)", () => {
  XG.state.express = { kg: 3, reward: 12000, until: Date.now() + 600000, client: "Test" };
  XG.render();
  XG.state.express = null;
  XG.render();
});

// tour de toutes les scènes de lieux
check("ouverture + 90 frames de chaque lieu (" + (typeof MAP_LOCATIONS !== "undefined" ? "via eval" : "XG") + ")", () => {
  const locs = XG.__locs || [];
  if (!locs.length) throw new Error("pas de lieux exposés");
  for (const id of locs) {
    pumpError = null;
    window.openLocScene(id);
    pumpSafe(90);
    if (pumpError) { const e = pumpError; pumpError = null; throw new Error(id + " → " + e.message + " @ " + (e.stack || "").split("\n")[1]); }
    window.closeLocScene();
    pumpSafe(5);
    if (pumpError) { const e = pumpError; pumpError = null; throw new Error("close " + id + " → " + e.message); }
  }
});

(async () => {
  // événement complet : file → ouverture → auto-cine → taps → fin
  check("événement complet dans la scène (auto-déclenchement + cine + fin)", async () => {
    XG.state.sceneEvents = ["hank"];
    window.openLocScene("rv");
    pumpSafe(20);
    await new Promise((r) => setTimeout(r, 1400)); // auto-trigger v54 (1,1 s)
    pumpSafe(40); // la cine tourne
    const cv = registry["locscene-canvas"];
    if (!cv) throw new Error("canvas locscene manquant");
    for (let i = 0; i < 14; i++) {
      cv.dispatch("pointerdown", { clientX: 195, clientY: 140, pointerId: 1 });
      pumpSafe(6);
      if (pumpError) { const e = pumpError; pumpError = null; throw new Error("tap " + i + " → " + e.message + " @ " + (e.stack || "").split("\n")[1]); }
    }
    pumpSafe(30);
    if (pumpError) { const e = pumpError; pumpError = null; throw new Error("fin cine → " + e.message + " @ " + (e.stack || "").split("\n")[1]); }
    window.closeLocScene();
    pumpSafe(5);
    if (pumpError) { const e = pumpError; pumpError = null; throw new Error("close → " + e.message); }
    XG.state.sceneEvents = [];
  });

  // tap sur un perso de scène (bulles QUOTES)
  check("tap sur perso de scène (bulle + mood)", () => {
    window.openLocScene("house");
    pumpSafe(30);
    const cv = registry["locscene-canvas"];
    cv.dispatch("pointerdown", { clientX: 70, clientY: 190, pointerId: 1 });
    pumpSafe(20);
    window.closeLocScene();
    pumpSafe(5);
    if (pumpError) { const e = pumpError; pumpError = null; throw new Error(e.message + " @ " + (e.stack || "").split("\n")[1]); }
  });

  // carte : rendu + tap
  check("carte : 60 frames + tap", () => {
    pumpSafe(60);
    const cv = registry["map-canvas"];
    if (cv) cv.dispatch("pointerdown", { clientX: 200, clientY: 200, pointerId: 1 });
    pumpSafe(10);
    if (pumpError) { const e = pumpError; pumpError = null; throw new Error(e.message + " @ " + (e.stack || "").split("\n")[1]); }
  });

  // labo : rendu + tap + événement en attente
  check("labo : 60 frames + tap + badge événement", () => {
    XG.state.sceneEvents = ["hank"]; // événement rv → badge « ! » au-dessus du bâtiment
    pumpSafe(60);
    const cv = registry["game-canvas"];
    if (cv) {
      cv.dispatch("pointerdown", { clientX: 195, clientY: 60, pointerId: 1 }); // zone badge
      pumpSafe(10);
      cv.dispatch("pointerdown", { clientX: 195, clientY: 200, pointerId: 1 }); // zone équipe
      pumpSafe(10);
    }
    XG.state.sceneEvents = [];
    if (pumpError) { const e = pumpError; pumpError = null; throw new Error(e.message + " @ " + (e.stack || "").split("\n")[1]); }
  });

  // événement à CHOIX : cine → modale VISIBLE au-dessus de la scène → clic sur un choix
  check("événement à choix : modale visible + choix cliquable (fix z-index v56)", async () => {
    XG.state.sceneEvents = ["rats"]; // choice, superlab
    window.openLocScene("superlab");
    pumpSafe(20);
    await new Promise((r) => setTimeout(r, 1400)); // auto-déclenchement v54
    pumpSafe(40);
    const cv = registry["locscene-canvas"];
    for (let i = 0; i < 14; i++) {
      cv.dispatch("pointerdown", { clientX: 195, clientY: 140, pointerId: 1 });
      pumpSafe(6);
    }
    pumpSafe(30);
    if (pumpError) { const e = pumpError; pumpError = null; throw new Error("cine → " + e.message); }
    const modal = registry["modal"];
    if (!modal || modal.classList.contains("hidden")) throw new Error("la modale de choix est restée invisible (z-index ou autre)");
    const mc = registry["modal-choices"];
    const btn = mc && mc.children && mc.children[0];
    if (!btn) throw new Error("aucun bouton de choix dans la modale");
    const cashBefore = XG.state.cash;
    (btn._listeners.click || []).forEach((fn) => fn({}));
    if (!modal.classList.contains("hidden")) throw new Error("la modale ne se ferme pas après le choix");
    XG.state.sceneEvents = [];
    window.closeLocScene();
    pumpSafe(5);
  });

  // endDay complet ×3 avec événements en file
  check("3 × endDay avec événements de scène en file", () => {
    XG.state.sceneEvents = ["hank", "tuco"];
    for (let d = 0; d < 3; d++) XG.endDay();
    XG.state.sceneEvents = [];
  });

  console.log(failures === 0 ? "RUNTIME TEST PASSE" : "RUNTIME TEST: " + failures + " ECHEC(S)");
  process.exit(failures === 0 ? 0 : 1);
})();
