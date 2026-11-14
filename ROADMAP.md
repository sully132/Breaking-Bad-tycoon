# 🗺️ ROADMAP — Heisenberg Tycoon

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

## Phase 2 — Progression longue (v23) ✅ LIVRÉE
**Objectif : un horizon à plusieurs semaines.**
- [x] **Étages d'empire** (à la Idle Miner) : le Superlab gagne des sous-sols (-1, -2, -3)
      chacun avec un multiplicateur global et son propre visuel dans la scène. *(livré en v23)*
- [x] **Collection d'objets légendaires** (plaque d'immatriculation, tortue, chapeau…) à
      trouver via opportunités rares, chacun avec un bonus passif et une vitrine dans le menu. *(livré en v23)*
- [x] **Prestige enrichi** : arbres de légende à 3 branches avec paliers intermédiaires. *(livré en v23 : améliorations 🏬 biz et 🍀 luck)*
- **Critère** : un objectif clair toutes les 2-3 sessions.

## Phase 3 — Un monde vivant (v24) ✅ LIVRÉE
**Objectif : la carte doit respirer.**
- [x] **Parallaxe au doigt** sur la carte (4 plans de profondeur, retour élastique). *(livré en v24)*
- [x] **Trafic animé** : 7 véhicules (dont 2 verticaux), avion cargo avec traînée toutes les ~45 s. *(livré en v24)*
- [x] **Météo sur la carte** : pluie/orage avec éclairs, ré-tirée à chaque retour sur la carte. *(livré en v24)*
- [x] **Ambiance sonore par scène** : nappes WebAudio par décor (vent désert, usine, ville…) + nappe pluie, démarrage/arrêt avec la scène. *(livré en v24)*
- **Critère** : on ouvre la carte juste pour la regarder vivre.

## Phase 4 — Récit (v25) ✅ LIVRÉE
**Objectif : une vraie saison jouable.**
- [x] **3 arcs narratifs** (Enquête Hank, Guerre de cartel, Chute de Gus) en 4-5 étapes
      chacun, déclenchés par la progression (jours, respect, chaleur), avec choix persistants
      et 2 fins par arc. *(livré en v25 : L'Ascension, La Traque, L'Empire — 5 chapitres chacun, déclenchés par jours/cuissons/respect/chaleur/affaires, récompenses à chaque chapitre)*
- [x] **Cinématiques simples** : séquences plein écran (icônes + répliques, fondu, tap pour avancer) à la fin de chaque arc. *(livré en v25)*
- [x] **Journal narratif** récapitulant les chapitres débloqués. *(livré en v25 : menu 📖 Histoire + entrées 📖 dans le journal)*
- **Critère** : le joueur raconte sa partie (« j'ai trahi Gus au chapitre 3 »).

## Phase 5 — Rétention (v26) ✅ LIVRÉE
**Objectif : revenir chaque jour.**
- [x] **Tutoriel contextuel** (3 écrans max, skippable) pour les nouvelles parties. *(livré en v26 : 3 modales après le splash, bouton Passer)*
- [x] **Événements de fin de semaine** (week-end = pool d'événements exclusifs + bonus). *(livré en v26 : 6 événements samedi/dimanche + revenus ×1,15 le week-end)*
- [x] **Objectif quotidien renouvelé** + récompense de connexion (streak de jours réels). *(livré en v26 : streak de connexions réelles, +2 000$ par jour consécutif, plafonné à 20 000$)*
- [x] **Écran de fin de partie détaillé** (stats, records, plus beau moment). *(livré en v26 : 10 stats + « moment fort » calculé)*
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
