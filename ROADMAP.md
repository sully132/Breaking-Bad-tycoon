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

## Phase 6 — Finition (v27+) ✅ LIVRÉE
**Objectif : qualité perçue de jeu du Play Store.**
- [x] **Passe d'équilibrage globale** validée par simulation (100 jours joués par script). *(livré en v27 : balance.test.js — bot actif RNG seedé, victoire ≤ 100 jours, aucune arrestation, progression continue)*
- [x] **Performance** : profiler les scènes, cap DPR adaptatif, 60 fps sur mid-range. *(livré en v27 : DPR adaptatif 2 → 1,5 → 1 selon fps mesuré toutes les 2 s, pause des canvas + ambiance sonore quand l'app est en arrière-plan)*
- [x] **Accessibilité** : tailles de cible ≥ 44 px, contrastes, option réduction d'animations. *(livré en v27 : cibles tactiles ≥ 44 px, focus visible, prefers-reduced-motion, suppression du zoom double-tap)*
- [x] **Nouvelle passe graphique** sur les 17 scènes (détails, éclairage dynamique). *(livré en v27 : éclairage dynamique — halos de lampes la nuit, rayons de soleil le jour, sur toutes les scènes)*
- **Critère** : aucune baisse de fps notable, équilibrage sans trou de 2 jours.

---

## Règles de livraison (inchangées)
- Push direct sur `main`, version bumpée (`sw.js` CACHE + index.html + RESUME.md).
- `node --check` + smoke test Node avant chaque push.
- Sauvegarde toujours compatible : migration dans `load()` pour tout nouveau champ.

## Phase 7 — Contenu additionnel (v28+) ✅ LIVRÉE (v28)
- [x] Mini-jeux par lieu : ⚗️ Cuisson de précision (RV / Superlab) et 🤝 Négociation avec Tuco — récompenses quotidiennes, cooldown par jour *(livré en v28)*
- [x] 9 nouveaux événements (rats, BBQ de Hank, guerre de trottoir, panneau de Saul, effraction, méthylamine, éclaireurs + chaîne, Mike) *(livré en v28)*
- [x] 4 nouveaux week-ends à thème (DEA au ralenti, marché noir, orage, cadeau de Jesse) *(livré en v28)*
- [x] Scènes d'événements animées : entrée marchée du visiteur, faisceau de lumière, braises flottantes, badge « ! » à ondes, bannière glissante, flash au déclenchement, événements plus fréquents (65%) *(livré en v28)*

## Phase 8 — Maîtrise & récompenses (v29) ✅ LIVRÉE (v29)
- [x] 3e mini-jeu : 🥫 Vente express (scène Réseau de rue) — négocie le prix avec 3 clients *(livré en v29)*
- [x] 4 succès mini-jeux : Main de chimiste (Grade S), Partenaire de Tuco (×4,0), Trois clients trois deals, Joueur né (10 mini-jeux) *(livré en v29)*
- [x] 4 nouveaux événements : embouteillage au lave-auto, la liste de Lydia, Combo a un plan, jerrican premium *(livré en v29)*
- [x] 1 nouveau week-end : 🎤 Karaoké de Badger *(livré en v29)*
- [x] Suivi des performances mini-jeux (meilleurs scores, nombre de parties jouées) *(livré en v29)*

## Phase 10 — Passe graphisme majeure (v30) ✅ LIVRÉE (v30)
- [x] Ciels riches : dégradés 3 arrêts, 70 étoiles scintillantes avec croix brillantes, lune à cratères et halo, soleil à triple halo rayonnant *(livré en v30)*
- [x] Nuages volumétriques : base sombre, sommet clair, ombre portée au sol *(livré en v30)*
- [x] Sols détaillés : cailloux avec reflet, fissures, touffes d'herbe *(livré en v30)*
- [x] Ambiance : poussières dans la lumière le jour, brume d'aube, grain de film dans les scènes *(livré en v30)*
- [x] Carte : ciel selon l'heure réelle (nuit étoilée, aube, crépuscule), routes avec accotements, vignette *(livré en v30)*
- [x] UI : fondu d'ouverture des scènes, poignée du bottom-sheet, boutons de scène affinés, mini-jeux dorés *(livré en v30)*

## Phase 11 — Cinéma & personnages (v31) ✅ LIVRÉE (v31)
- [x] Cinématique d'événement : bandes cinémascope, assombrissement, sous-titres au typewriter avec nom du locuteur, tap pour révéler/avancer, ré-entrée du visiteur au centre *(livré en v31)*
- [x] Personnages plus distinctifs : carnations variées, moustaches, badge de flic, colliers, tabliers, vestes ouvertes, revers de costume, cravates colorées *(livré en v31)*
- [x] 18 apparences retravaillées : chaque perso a sa signature (Walter tablier + moustache, Heisenberg veste noire, Hank badge, Gus moustache, Mike barbe grise + veste, Tuco moustache + chaîne…) *(livré en v31)*
- [x] Premiers plans en silhouette par décor (cactus, lampadaire allumé, barils, pneus, barrières, buissons) *(livré en v31)*

## Phase 12 — Vivant & émotions (v32) ✅ LIVRÉE (v32)
- [x] Expressions faciales : sourcils + bouche dessinés selon l'humeur (neutre, content, furieux, inquiet, cri) *(livré en v32)*
- [x] Humeurs contextuelles : persos contents quand on les tape, visiteurs d'événement avec l'humeur de leur événement (Tuco furieux, junkie inquiet, Hank BBQ content…) *(livré en v32)*
- [x] Jambes articulées : cuisse + tibia avec genou qui plie, marche plus naturelle *(livré en v32)*
- [x] Cinématiques story en mode cinéma : letterbox, locuteur en or, texte au typewriter avec caret, tap = compléter la ligne puis avancer *(livré en v32)*
- [ ] Prochaines pistes : scènes d'arrière-plan animées pendant les cinématiques, doublage sonore (bips type Animal Crossing), réactions des autres persos pendant un événement

## Phase 13 — Cinématiques vivantes (v33) ✅ LIVRÉE (v33)
- [x] Bips de dialogue pendant les sous-titres (cinématiques d'événement + story) *(livré en v33)*
- [x] Pose bras croisés du visiteur pendant la cinématique ; les persos furieux crient au moment de leur réplique *(livré en v33)*
- [x] Les persos de la scène s'arrêtent de marcher et regardent l'événement avec l'humeur adaptée *(livré en v33)*
- [x] Bulles de dialogue auto coupées pendant les cinématiques *(livré en v33)*
- [ ] Prochaines pistes : caméra (zoom/pan léger pendant les cinématiques), répliques à deux voix (visiteur + perso de la scène), nappes musicales de cinématique

## Phase 14 — Plan de réalisateur (v34) ✅ LIVRÉE (v34)
- [x] Caméra de cinématique : zoom + pan vers le visiteur, retour au cadre normal à la fin *(livré en v34)*
- [x] Répliques à deux voix : un perso de la scène répond au visiteur (10 événements couverts) *(livré en v34)*
- [x] Nappe musicale de tension synthétique pendant les cinématiques (événements + story) *(livré en v34)*
- [ ] Prochaines pistes : cut/fondu entre lignes de cinématique, gros plan sur le locuteur (portrait dessiné), bruitages d'ambiance par événement

## Phase 15 — Montage final (v35) ✅ LIVRÉE (v35)
- [x] Portrait du locuteur en médaillon doré à côté des sous-titres (tête dessinée via drawPerson, clignements inclus) *(livré en v35)*
- [x] Fondu rapide entre chaque ligne de cinématique (cut au montage) *(livré en v35)*
- [x] Bruitages signature par événement : coups de feu (guerre de territoire, cambriolage), klaxon (course de rue), alarme (rats, filaire, blackout), cristal (précurseurs), caisse (ventes) *(livré en v35)*
- [ ] Prochaines pistes : générique de fin animé à la victoire, photos « polaroid » des événements dans le journal, mode cinéma pour les raids DEA

## Phase 16 — Grand écran (v36) ✅ LIVRÉE (v36)
- [x] Raids DEA en mode cinéma : cinématique rouge (gyrophares + Hank « ENCLEVEZ TOUT ! ») avant la résolution *(livré en v36)*
- [x] Moteur de cinématique DOM générique (runCineBeats) partagé par les arcs story et les raids *(livré en v36)*
- [x] Générique de fin animé à la victoire : crédits qui défilent avec le casting de l'empire *(livré en v36)*
- [ ] Prochaines pistes : cinématique de prestige (nouvelle identité), photos polaroïd des événements dans le journal, statistiques de fin enrichies

## Phase 17 — Souvenirs & renaissance (v37) ✅ LIVRÉE (v37)
- [x] Polaroïds d'événements : les 24 derniers événements archivés dans le journal, toucher un polaroïd rejoue toute la cinématique (sous-titres, portraits, musique) *(livré en v37)*
- [x] Cinématique de prestige : le salon de barbier avant chaque nouvelle identité *(livré en v37)*
- [ ] Prochaines pistes : album photo complet (tous les événements découverts), cinématique de début de partie, doublage musical des arcs
