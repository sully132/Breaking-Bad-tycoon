# -*- coding: utf-8 -*-
import re

# ================= ROADMAP.md (nouveau fichier) =================
roadmap = """# 🗺️ ROADMAP — Heisenberg Tycoon

> Plan de développement pour faire de Heisenberg Tycoon un jeu d'exception.
> Chaque phase = 1 à 2 versions livrées sur `main`. Critères de réussite définis à l'avance.

## État actuel (v21)
Boucle idle/tycoon complète : labo au tap, 10 affaires à niveler avec managers et synergies
(équipe/équipement/pureté/marché), carte interactive à 17 lieux, scènes plein écran animées
(cycle jour/nuit, météo, personnages vivants), 62 événements dont 21 joués DANS les scènes
avec visiteurs célèbres et répliques, opportunités dorées, coup de pub ×4, prestige, boutique
légende, missions quotidiennes, succès, PWA installable.

---

## Phase 1 — Boucle addictive (v22)
**Objectif : donner envie de garder le doigt sur l'écran.**
- [x] **Combo de tap** : taps enchaînés < 2,5 s → multiplicateur progressif jusqu'à ×2,
      paliers annoncés (🔥 x10, 🔥🔥 x25, 💥 x50), record `maxCombo` + succès dédié.
- [x] **Chaînes d'événements à conséquences différées** : Contrat de Gus (accepter →
      récompense J+3 / refuser → colère de Gus J+2) et Convoyage cartel (paie J+2,
      chaleur J+4). Les choix d'aujourd'hui créent les événements de demain.
- **Critère de réussite** : un joueur actif voit un événement de scène par jour, et le tap
  rapporte sensiblement plus en combo qu'en tapotement dispersé.

## Phase 2 — Progression longue (v23)
**Objectif : un horizon à plusieurs semaines.**
- [ ] **Étages d'empire** (à la Idle Miner) : le Superlab gagne des sous-sols (-1, -2, -3)
      chacun avec un multiplicateur global et son propre visuel dans la scène.
- [ ] **Collection d'objets légendaires** (plaque d'immatriculation, tortue, chapeau…) à
      trouver via opportunités rares, chacun avec un bonus passif et une vitrine dans le menu.
- [ ] **Prestige enrichi** : arbres de légende à 3 branches avec paliers intermédiaires.
- **Critère** : un objectif clair toutes les 2-3 sessions.

## Phase 3 — Un monde vivant (v24)
**Objectif : la carte doit respirer.**
- [ ] **Parallaxe au doigt** sur la carte (2-3 plans de profondeur).
- [ ] **Trafic animé** : voitures qui circulent entre les lieux, avion cargo occasionnel.
- [ ] **Météo sur la carte** (cohérente avec les scènes) + transitions douces.
- [ ] **Ambiance sonore par scène** : nappes générées en WebAudio (vent désert, ville, usine).
- **Critère** : on ouvre la carte juste pour la regarder vivre.

## Phase 4 — Récit (v25)
**Objectif : une vraie saison jouable.**
- [ ] **3 arcs narratifs** (Enquête Hank, Guerre de cartel, Chute de Gus) en 4-5 étapes
      chacun, déclenchés par la progression (jours, respect, chaleur), avec choix persistants
      et 2 fins par arc.
- [ ] **Cinématiques simples** : dialogues séquencés en plein écran avec personnages animés.
- [ ] **Journal narratif** récapitulant les chapitres débloqués.
- **Critère** : le joueur raconte sa partie (« j'ai trahi Gus au chapitre 3 »).

## Phase 5 — Rétention (v26)
**Objectif : revenir chaque jour.**
- [ ] **Tutoriel contextuel** (3 écrans max, skippable) pour les nouvelles parties.
- [ ] **Événements de fin de semaine** (week-end = pool d'événements exclusifs + bonus).
- [ ] **Objectif quotidien renouvelé** + récompense de connexion (streak de jours réels).
- [ ] **Écran de fin de partie détaillé** (stats, records, plus beau moment).
- **Critère** : D1/D7 visibles dans les stats de sauvegarde.

## Phase 6 — Finition (v27+)
**Objectif : qualité perçue de jeu du Play Store.**
- [ ] **Passe d'équilibrage globale** validée par simulation (100 jours joués par script).
- [ ] **Performance** : profiler les scènes, cap DPR adaptatif, 60 fps sur mid-range.
- [ ] **Accessibilité** : tailles de cible ≥ 44 px, contrastes, option réduction d'animations.
- [ ] **Nouvelle passe graphique** sur les 17 scènes (détails, éclairage dynamique).
- **Critère** : aucune baisse de fps notable, équilibrage sans trou de 2 jours.

---

## Règles de livraison (inchangées)
- Push direct sur `main`, version bumpée (`sw.js` CACHE + index.html + RESUME.md).
- `node --check` + smoke test Node avant chaque push.
- Sauvegarde toujours compatible : migration dans `load()` pour tout nouveau champ.
"""
open("ROADMAP.md", "w", encoding="utf-8").write(roadmap)
print("ROADMAP.md OK")

# ================= game.js : combo de tap =================
s = open("js/game.js", encoding="utf-8").read()

def rep(old, new, n=1):
    global s
    assert s.count(old) == n, "game.js ancre x%d: %r" % (s.count(old), old[:70])
    s = s.replace(old, new)

rep("    taps: 0,\n", "    taps: 0,\n    combo: 0,\n    comboUntil: 0,\n    maxCombo: 0,\n")

rep("    if (!Array.isArray(state.sceneEvents)) state.sceneEvents = [];",
"""    if (!Array.isArray(state.sceneEvents)) state.sceneEvents = [];
    if (typeof state.combo !== "number") state.combo = 0;
    if (typeof state.comboUntil !== "number") state.comboUntil = 0;
    if (typeof state.maxCombo !== "number") state.maxCombo = 0;""")

old_tap = """  const mult = frenzyActive() ? 2 : 1;
  const gain = Math.max(TAP_CASH_MIN, Math.round(pricePerKg() * TAP_CASH_RATE)) * mult;
  state.cash += gain;
  spawnPopup(`+${fmt(gain)}$`, "money");
  playSfx("tap");
  if (state.taps % 25 === 0) {
    state.respect = cap(state.respect + 1, 0, 100);
    spawnPopup("La rue vous remarque ! Respect +1", "info");
  }"""
new_tap = """  const mult = frenzyActive() ? 2 : 1;
  // v22 : combo de tap — enchaîner les taps (< 2,5 s) monte le multiplicateur
  const now = Date.now();
  if (now < (state.comboUntil || 0)) state.combo += 1;
  else state.combo = 1;
  state.comboUntil = now + 2500;
  if (state.combo > (state.maxCombo || 0)) state.maxCombo = state.combo;
  if (state.combo === 10) spawnPopup("🔥 COMBO x" + state.combo + " !", "combo");
  else if (state.combo === 25) { spawnPopup("🔥🔥 MÉGA COMBO x25 !", "combo"); toast("🔥🔥 MÉGA COMBO", "La rue retient ton nom. Respect +2."); state.respect = cap(state.respect + 2, 0, 100); }
  else if (state.combo === 50) { spawnPopup("💥 combo x50 !!", "combo"); toast("💥 IMBATTABLE", "Combo x50 ! Récompense : 5 000$."); state.cash += 5_000; }
  const comboMult = 1 + Math.min(state.combo, 25) * 0.04;
  const gain = Math.max(TAP_CASH_MIN, Math.round(pricePerKg() * TAP_CASH_RATE * comboMult)) * mult;
  state.cash += gain;
  spawnPopup(`+${fmt(gain)}$${state.combo >= 3 ? " 🔥x" + state.combo : ""}`, "money");
  playSfx("tap");
  if (state.taps % 25 === 0) {
    state.respect = cap(state.respect + 1, 0, 100);
    spawnPopup("La rue vous remarque ! Respect +1", "info");
  }"""
rep(old_tap, new_tap)

open("js/game.js", "w", encoding="utf-8").write(s)
print("game.js OK")

# ================= data.js : chaînes d'événements + succès combo =================
s = open("js/data.js", encoding="utf-8").read()

old_ev = """    id: "lydiaDemand", emoji: "📋", weight: 5,"""
new_ev = """    id: "gusContract", emoji: "🐔", weight: 5,
    type: "choice",
    cond(s) { return s.staff.includes("gus") && s.day >= 20; },
    title: "Livraison express pour Gus",
    text: "« Une livraison prioritaire. Discrétion absolue. La récompense sera à la hauteur. »",
    choices: [
      {
        label: "Accepter la livraison (récompense dans 3 jours)",
        apply(s) {
          scheduleEvent("gusReward", 3);
          log("🐔 Livraison acceptée. Gus attendra 3 jours...", "event");
        },
      },
      {
        label: "Refuser (Respect −8, Gus s'en souviendra)",
        apply(s) {
          s.respect = cap(s.respect - 8, 0, 100);
          scheduleEvent("gusAnger", 2);
          log("🐔 Refus noté. Gus n'oublie rien. Respect −8.", "bad");
        },
      },
    ],
  },
  {
    id: "gusReward", emoji: "💰", weight: 0,
    type: "auto",
    title: "Gus tient parole",
    text: "La livraison s'est parfaitement déroulée. L'enveloppe est épaisse.",
    apply(s) {
      const g = 40_000 + s.day * 5_000;
      s.dirty += g;
      s.respect = cap(s.respect + 5, 0, 100);
      log(`💰 Gus récompense votre loyauté : +${fmt(g)}$ sale, Respect +5.`, "good");
    },
  },
  {
    id: "gusAnger", emoji: "🐔", weight: 0,
    type: "auto",
    title: "Gus se venge",
    text: "« Vous m'avez déçu. Les conséquences seront... éducatives. »",
    apply(s) {
      addHeat(8);
      s.respect = cap(s.respect - 5, 0, 100);
      s.purity = cap(s.purity - 3, 0, 100);
      log("🐔 La colère de Gus coûte cher : Chaleur +8, Respect −5, Pureté −3.", "bad");
    },
  },
  {
    id: "muleRun", emoji: "🚐", weight: 4,
    type: "choice",
    cond(s) { return s.day >= 30; },
    title: "Convoyage pour le cartel",
    text: "Un intermédiaire propose un convoyage bien payé... mais qui ne passe pas inaperçu.",
    choices: [
      {
        label: "Prendre le volant (gros paie J+2, chaleur J+4)",
        apply(s) {
          scheduleEvent("mulePay", 2);
          scheduleEvent("muleBust", 4);
          log("🚐 Convoyage accepté. L'argent dans 2 jours... la chaleur aussi.", "event");
        },
      },
      {
        label: "Rester prudent (Respect −5)",
        apply(s) {
          s.respect = cap(s.respect - 5, 0, 100);
          log("🚐 Vous déclinez. Le cartel note votre prudence. Respect −5.", "bad");
        },
      },
    ],
  },
  {
    id: "mulePay", emoji: "💵", weight: 0,
    type: "auto",
    title: "Convoyage réussi",
    text: "La marchandise est arrivée. Le paiement aussi.",
    apply(s) {
      const g = 60_000 + s.day * 6_000;
      s.dirty += g;
      log(`💵 Convoyage payé : +${fmt(g)}$ sale.`, "good");
    },
  },
  {
    id: "muleBust", emoji: "🚔", weight: 0,
    type: "auto",
    title: "Retombées du convoyage",
    text: "Un contrôle routier a intercepté un véhicule similaire. La DEA creuse.",
    apply(s) {
      addHeat(12);
      log("🚔 Le convoyage laisse des traces : Chaleur +12.", "bad");
    },
  },
  {
    id: "lydiaDemand", emoji: "📋", weight: 5,"""
assert s.count(old_ev) == 1
s = s.replace(old_ev, new_ev)

# succès combo
old_ach = '  { id: "streak7", icon: "🔥", name: "Série chaude", desc: "Vendre 7 jours de suite", check: (s) => s.streak >= 7, reward: { cash: 25_000 } }'
new_ach = old_ach + """,
  { id: "combo25", icon: "🔥", name: "Sous pression", desc: "Atteindre un combo de 25 taps", check: (s) => (s.maxCombo || 0) >= 25, reward: { cash: 15_000 } },
  { id: "combo50", icon: "💥", name: "Doigts d'or", desc: "Atteindre un combo de 50 taps", check: (s) => (s.maxCombo || 0) >= 50, reward: { respect: 8 } }"""
assert s.count(old_ach) == 1
s = s.replace(old_ach, new_ach)

open("js/data.js", "w", encoding="utf-8").write(s)
print("data.js OK")

# ================= versions + RESUME =================
s = open("sw.js", encoding="utf-8").read()
old = 'const CACHE = "heisenberg-v21";'
assert s.count(old) == 1
open("sw.js", "w", encoding="utf-8").write(s.replace(old, 'const CACHE = "heisenberg-v22";'))

s = open("index.html", encoding="utf-8").read()
old = "Heisenberg Tycoon v21"
assert s.count(old) == 1
open("index.html", "w", encoding="utf-8").write(s.replace(old, "Heisenberg Tycoon v22"))

s = open("RESUME.md", encoding="utf-8").read()
m = re.search(r"- \*\*v21 \(courante\)[^\n]*", s)
assert m, "ligne v21 introuvable"
v21line = m.group(0)
v21plain = "- v21 : " + re.sub(r"^\- \*\*v21 \(courante\)\s*:\s*", "", v21line).rstrip("*").rstrip()
s = s.replace(v21line, v21plain + "\n- **v22 (courante) : Phase 1 de la ROADMAP (voir ROADMAP.md) — combo de tap (taps enchaînés < 2,5 s = multiplicateur jusqu'à ×2, paliers 🔥x10 / 🔥🔥x25 avec Respect +2 / 💥x50 avec 5 000$, record `maxCombo` + succès combo25 et combo50) et chaînes d'événements à conséquences différées (Livraison express de Gus → récompense J+3 ou colère J+2 ; Convoyage cartel → paie J+2 puis chaleur J+4).**")
open("RESUME.md", "w", encoding="utf-8").write(s)
print("versions + RESUME OK")
