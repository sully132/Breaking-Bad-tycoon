# -*- coding: utf-8 -*-
# v44 — Événements en chaîne multi-lieux : 3 chaînes, 5 nouveaux événements
import re, io

def rd(p):
    with io.open(p, encoding="utf-8") as f: return f.read()

def wr(p, s):
    with io.open(p, "w", encoding="utf-8") as f: f.write(s)

def rep(s, old, new, n=1, tag=""):
    c = s.count(old)
    assert c == n, "ANCRE %r : %d occurrences (attendu %d) [%s]" % (old[:60], c, n, tag)
    return s.replace(old, new)

# ============================== js/data.js ==============================
s = rd("js/data.js")

# (a) chainNext sur les 3 événements déclencheurs v43
s = rep(s, 'id: "plazaConcert", loc: "plaza", emoji: "🎸", weight: 5, type: "choice",',
          'id: "plazaConcert", loc: "plaza", emoji: "🎸", weight: 5, type: "choice",\n    chainNext: "turfThreat",', 1, "plazaConcert chain")
s = rep(s, 'id: "railStrike", loc: "rail", emoji: "🚂", weight: 5, type: "auto",',
          'id: "railStrike", loc: "rail", emoji: "🚂", weight: 5, type: "auto",\n    chainNext: "cargoHijack",', 1, "railStrike chain")
s = rep(s, 'id: "heatwave", loc: "villa", emoji: "🔥", weight: 6, type: "auto",',
          'id: "heatwave", loc: "villa", emoji: "🔥", weight: 6, type: "auto",\n    chainNext: "methylamineDeal",', 1, "heatwave chain")

# (b) 5 nouveaux événements de chaîne (weight 0 → jamais tirés au hasard, uniquement en chaîne)
old = '''      log("🌾 Contrats de récolte signés. +25 000$ propre, respect +2.", "good");
    },
  },
);
'''
new = old + '''
// ------------------------------------------------------------
// v44 — ÉVÉNEMENTS EN CHAÎNE MULTI-LIEUX (weight 0 = uniquement via chainNext)
// ------------------------------------------------------------
EVENTS.push(
  {
    id: "cargoHijack", loc: "junkyard", emoji: "🚚", weight: 0, type: "choice",
    title: "Cargaison bloquée",
    text: "Un semi-remorque immobilisé par la grève croupit à la casse. Old Joe : « Personne n'est venu le chercher. Personne ne le cherchera. »",
    choices: [
      {
        label: "Vider le camion (+40 000$ sale, Chaleur +6)",
        apply(s) {
          s.dirty += 40_000;
          addHeat(6);
          log("🚚 Cargaison écoulée dans la nuit. +40 000$ sale, chaleur +6.", "good");
        },
      },
      {
        label: "Prévenir le chauffeur (Respect +2)",
        apply(s) {
          s.respect = cap(s.respect + 2, 0, 100);
          log("🚚 Le chauffeur récupère son camion et se tait. Respect +2.", "good");
        },
      },
    ],
    chainNext: "deaSting",
  },
  {
    id: "deaSting", loc: "dea", emoji: "🚔", weight: 0, type: "choice",
    cond: (s) => s.day >= 8,
    title: "Piège de la DEA",
    text: "Hank a retracé le camion volé. Le parking de la DEA est vide… beaucoup trop vide. C'est une souricière.",
    choices: [
      {
        label: "Payer Saul (−20 000$, Chaleur −8)",
        can: (s) => s.cash >= 20_000,
        apply(s) {
          s.cash -= 20_000;
          s.heat = cap(s.heat - 8, 0, 100);
          log("🚔 Saul a « un problème de procédure » au bureau. Chaleur −8.", "good");
        },
      },
      {
        label: "Nier en bloc",
        apply(s) {
          if (Math.random() < 0.5) {
            s.respect = cap(s.respect + 3, 0, 100);
            log("🚔 Aucune preuve, aucune accusation. Respect +3.", "good");
          } else {
            addHeat(10);
            log("🚔 Ils ont des photos de la casse. Chaleur +10.", "bad");
          }
        },
      },
    ],
  },
  {
    id: "methylamineDeal", loc: "superlab", emoji: "🧪", weight: 0, type: "choice",
    title: "Offre de méthylamine",
    text: "La canicule a forcé un concurrent à brader ses réserves. Un bidon de méthylamine qualité pharmaceutique est à saisir.",
    choices: [
      {
        label: "Acheter le bidon (−25 000$, Stock +6 kg, Pureté +2)",
        can: (s) => s.cash >= 25_000,
        apply(s) {
          s.cash -= 25_000;
          s.stock = Math.min(stockCap(), s.stock + 6);
          s.purity = cap(s.purity + 2, 0, 100);
          log("🧪 Précurseur de haut niveau en réserve. Stock +6 kg, pureté +2.", "good");
        },
      },
      {
        label: "Refuser poliment",
        apply(s) {
          log("🧪 Vous déclinez. Le bidon disparaît dans la nature.", "info");
        },
      },
    ],
  },
  {
    id: "turfThreat", loc: "corner", emoji: "⚠️", weight: 0, type: "choice",
    title: "Sale temps sur le coin",
    text: "Des dealers inconnus vendent sur VOTRE coin de rue. Ils vous regardent en souriant.",
    choices: [
      {
        label: "Les chasser (Respect +4, Chaleur +5)",
        apply(s) {
          s.respect = cap(s.respect + 4, 0, 100);
          addHeat(5);
          log("⚠️ Le coin reverdit à votre couleur. Respect +4, chaleur +5.", "good");
        },
      },
      {
        label: "Encaisser la paix (+10 000$ sale, Respect −2)",
        apply(s) {
          s.dirty += 10_000;
          s.respect = cap(s.respect - 2, 0, 100);
          log("⚠️ Ils paient pour rester. +10 000$ sale, respect −2.", "info");
        },
      },
    ],
    chainNext: "turfMeet",
  },
  {
    id: "turfMeet", loc: "tuco", emoji: "🏜️", weight: 0, type: "choice",
    title: "Rendez-vous dans le désert",
    text: "Le chef des intrus vous convoque au milieu du désert. Deux voitures, moteurs tournants, hommes armés.",
    choices: [
      {
        label: "Intimider (Respect +6, Chaleur +8)",
        apply(s) {
          s.respect = cap(s.respect + 6, 0, 100);
          addHeat(8);
          log("🏜️ Ils sont repartis en marche arrière. Respect +6, chaleur +8.", "good");
        },
      },
      {
        label: "Payer un tribut (−15 000$, Chaleur +1)",
        can: (s) => s.cash >= 15_000,
        apply(s) {
          s.cash -= 15_000;
          s.heat = cap(s.heat + 1, 0, 100);
          log("🏜️ Tribut versé, guerre évitée. −15 000$.", "info");
        },
      },
    ],
  },
);
'''
s = rep(s, old, new, 1, "EVENTS harvest")

# (c) EVENT_VISITORS — looks des 5 nouveaux
old = '''  harvest: CHAR_LOOKS.gus,
};'''
new = '''  harvest: CHAR_LOOKS.gus,
  // v44 — visiteurs des chaînes
  cargoHijack: { shirt: "#5a6a4a", pants: "#3a3a30", cap: "#2a3a2a", beard: "#3a3a2a" },
  deaSting: CHAR_LOOKS.hank,
  methylamineDeal: CHAR_LOOKS.lydia,
  turfThreat: { shirt: "#7a2a3a", pants: "#26262e", gold: true, loud: true },
  turfMeet: CHAR_LOOKS.tuco,
};'''
s = rep(s, old, new, 1, "EVENT_VISITORS v44")

# (d) EVENT_QUOTES — 5 clés (42 → 47)
old = '''const EVENT_QUOTES = {
  labInspector: ['''
new = '''const EVENT_QUOTES = {
  cargoHijack: ["Ce camion appartient au domaine du silence.", "On vide ça avant le lever du jour."],
  deaSting: ["Sortez les mains. Lentement.", "Ce camion vous a mené droit à moi."],
  methylamineDeal: ["Un bidon. Qualité pharma. Pas une goutte de plus.", "Ce bidon n'a jamais existé. Compris ?"],
  turfThreat: ["Ce coin est à nous maintenant.", "Le grand chef veut te rencontrer. Seul."],
  turfMeet: ["Alors c'est toi, le fameux cuisinier ?", "Tu paies, ou tu disparais. Choisis."],
  labInspector: ['''
s = rep(s, old, new, 1, "EVENT_QUOTES v44")

# (e) CHAR_NAMES — 5 noms (27 → 32)
old = '''const CHAR_NAMES = {
  labInspector: "Inspecteur"'''
new = '''const CHAR_NAMES = {
  cargoHijack: "Chauffeur", deaSting: "Hank", methylamineDeal: "Lydia",
  turfThreat: "Dealer", turfMeet: "Tuco",
  labInspector: "Inspecteur"'''
s = rep(s, old, new, 1, "CHAR_NAMES v44")

# (f) EV_MOODS — humeurs des chaînes
old = '''const EV_MOODS = {
  labInspector: "worried"'''
new = '''const EV_MOODS = {
  cargoHijack: "worried", deaSting: "angry", methylamineDeal: "worried",
  turfThreat: "angry", turfMeet: "angry",
  labInspector: "worried"'''
s = rep(s, old, new, 1, "EV_MOODS v44")

# (g) EVENT_REPLIES — 3 répliques à deux voix
old = '''const EVENT_REPLIES = {
  villaParty: { who: "Mike"'''
new = '''const EVENT_REPLIES = {
  deaSting: { who: "Saul", text: "Pas un mot. Pas un geste. Je m'occupe de tout." },
  turfThreat: { who: "Jesse", text: "Yo, c'est NOTRE coin, ils peuvent pas faire ça !" },
  turfMeet: { who: "Tuco", text: "Touchez à son coin et je vous fais goûter au bitume !" },
  villaParty: { who: "Mike"'''
s = rep(s, old, new, 1, "EVENT_REPLIES v44")

# (h) EV_SOUNDS — sons des chaînes
old = '''const EV_SOUNDS = {
  railStrike: "alarm"'''
new = '''const EV_SOUNDS = {
  deaSting: "alarm", turfMeet: "shot", methylamineDeal: "crystal",
  cargoHijack: "cash", turfThreat: "horn",
  railStrike: "alarm"'''
s = rep(s, old, new, 1, "EV_SOUNDS v44")

wr("js/data.js", s)

# ============================== js/game.js ==============================
s = rd("js/game.js")

# (i) hook chaîne dans flushSceneEvents + fonction queueChainEvent
old = '''  if (ev.type === "choice") {
    showEventModal(ev);
  } else {
    ev.apply(state);
    spawnPopup(ev.emoji + " " + ev.title, "info");
  }
}
'''
new = '''  if (ev.type === "choice") {
    showEventModal(ev);
  } else {
    ev.apply(state);
    spawnPopup(ev.emoji + " " + ev.title, "info");
  }
  if (typeof queueChainEvent === "function") { try { queueChainEvent(ev.chainNext); } catch (e) {} } // v44
}

// v44 : chaînes d'événements multi-lieux — l'étape suivante se déclenche sur un autre lieu
function queueChainEvent(id) {
  if (!id) return;
  const ev = EVENTS.find((e) => e.id === id);
  if (!ev || !hasSceneStage(ev)) return;
  if (ev.cond && !ev.cond(state)) return;
  if (!Array.isArray(state.sceneEvents)) state.sceneEvents = [];
  if (state.sceneEvents.includes(ev.id)) return;
  state.sceneEvents.push(ev.id);
  if (state.stats) state.stats.sceneEventsSeen = (state.stats.sceneEventsSeen || 0) + 1;
  const locDef = MAP_LOCATIONS.find((l) => l.id === ev.loc);
  log(`🔗 ${ev.emoji} ${ev.title} — ${locDef ? locDef.name : "en ville"}. L'affaire continue !`, "event");
  if (typeof spawnPopup === "function") spawnPopup(`🔗 ${ev.emoji} ${locDef ? locDef.name : "Suite"} : l'affaire continue !`, "info");
}
'''
s = rep(s, old, new, 1, "flushSceneEvents hook")

wr("js/game.js", s)

# ============================== js/locscene.js ==============================
s = rd("js/locscene.js")

# (j) hook chaîne dans cineFinish (avant le save)
old = '''      if (typeof render === "function") render();
    }
    if (typeof save === "function") save();
  }'''
new = '''      if (typeof render === "function") render();
    }
    if (typeof queueChainEvent === "function") { try { queueChainEvent(ev.chainNext); } catch (e) {} } // v44 : chaîne
    if (typeof save === "function") save();
  }'''
s = rep(s, old, new, 1, "cineFinish hook")

wr("js/locscene.js", s)

# ============================== smoke.test.js ==============================
s = rd("smoke.test.js")
s = rep(s, 'Object.keys(D.EVENT_QUOTES).length === 42 ? "OK (42)"', 'Object.keys(D.EVENT_QUOTES).length === 47 ? "OK (47)"', 1, "quotes count v44")
s = rep(s, 'Object.keys(D.CHAR_NAMES).length === 27 ? "OK (27)"', 'Object.keys(D.CHAR_NAMES).length === 32 ? "OK (32)"', 1, "charnames count v44")
s = rep(s, "heisenberg-v43", "heisenberg-v44", s.count("heisenberg-v43"), "sw cache refs")
s = rep(s, "SW cache v43:", "SW cache v44:", s.count("SW cache v43:"), "sw labels")
s = rep(s, "flushSceneEvents, rollSceneEvents", "flushSceneEvents, rollSceneEvents, queueChainEvent", 1, "X_GAME export")

old = 'console.log("SMOKE TEST PASSE");'
new = '''// v44 : chaînes d'événements multi-lieux
const v44ids = ["cargoHijack", "deaSting", "methylamineDeal", "turfThreat", "turfMeet"];
console.log("événements chaîne v44:", v44ids.every((id) => D.EVENTS.some((e) => e.id === id)) ? "OK (5)" : "FAIL");
console.log("liens de chaîne:", D.EVENTS.find((e) => e.id === "railStrike").chainNext === "cargoHijack" && D.EVENTS.find((e) => e.id === "heatwave").chainNext === "methylamineDeal" && D.EVENTS.find((e) => e.id === "plazaConcert").chainNext === "turfThreat" ? "OK (3)" : "FAIL");
console.log("chaîne hors pool aléatoire:", v44ids.every((id) => { const e = D.EVENTS.find((x) => x.id === id); return e && !e.weight; }) ? "OK" : "FAIL");
console.log("queueChainEvent:", typeof G.queueChainEvent === "function" ? "OK" : "FAIL");
console.log("SW cache v44:", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v44") ? "OK" : "FAIL");

console.log("SMOKE TEST PASSE");'''
s = rep(s, old, new, 1, "smoke tail v44")
wr("smoke.test.js", s)

# ============================== sw.js / index.html ==============================
s = rd("sw.js")
s = rep(s, 'const CACHE = "heisenberg-v43";', 'const CACHE = "heisenberg-v44";', 1, "sw cache")
wr("sw.js", s)

s = rd("index.html")
s = rep(s, "Heisenberg Tycoon v43 — fan game non officielle", "Heisenberg Tycoon v44 — fan game non officielle", 1, "index version")
wr("index.html", s)

# ============================== RESUME.md ==============================
s = rd("RESUME.md")
old_re = re.compile(r"- \*\*v43 \(courante\)[^\n]*")
m = old_re.search(s)
assert m, "RESUME : ligne v43 (courante) introuvable"
new_line = "- **v44 (courante) : événements en chaîne multi-lieux — 3 chaînes narratives (grève → cargaison volée → piège de la DEA, canicule → offre de méthylamine, concert → sale temps sur le coin → rendez-vous dans le désert), 5 nouveaux événements exclusifs en chaîne avec lien 🔗 « L'affaire continue ! ».**"
s = s[:m.start()] + new_line + s[m.end():]
wr("RESUME.md", s)

# ============================== ROADMAP.md ==============================
s = rd("ROADMAP.md")
old = """- [ ] Prochaines pistes : contrats express à durée limitée, événements en chaîne multi-lieux, difficulté adaptive selon la progression"""
new = old + """

## Phase 24 — Événements en chaîne multi-lieux (v44) ✅ LIVRÉE (v44)
- [x] Système de chaînes : un événement résolu déclenche l'étape suivante sur un AUTRE lieu (lien 🔗 « L'affaire continue ! ») *(livré en v44)*
- [x] Chaîne « Cargaison bloquée » : grève des aiguilleurs → vol du camion à la casse → piège de la DEA (Saul ou poker face) *(livré en v44)*
- [x] Chaîne « Précurseur » : canicule → offre de méthylamine au superlab (stock +6 kg, pureté +2) *(livré en v44)*
- [x] Chaîne « Guerre de territoire » : concert de la plaza → dealers intrus sur le coin → rendez-vous dans le désert (intimidation ou tribut) *(livré en v44)*
- [ ] Prochaines pistes : contrats express à durée limitée, chaîne de prestige post-reset, difficulté adaptive selon la progression"""
s = rep(s, old, new, 1, "ROADMAP phase24")

wr("ROADMAP.md", s)

print("PATCH v44 APPLIQUE")
