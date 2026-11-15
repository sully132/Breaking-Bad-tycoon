# Heisenberg Tycoon — Résumé du projet (transfert IA)

> Fan game **tycoon/idle** inspirée de Breaking Bad. Jeu web mobile-first (PWA installable + APK via Bubblewrap/TWA).
> Ce document permet à n'importe quelle IA (ou humain) de reprendre le projet sans contexte préalable.

## 1. Identité

- **Nom** : Heisenberg Tycoon (v10)
- **Thème** : Breaking Bad — tu es Walter White, tu bâtis un empire à Albuquerque
- **Langue** : français
- **Plateforme cible** : mobile Android d'abord (Redmi Note 15 Pro de l'utilisateur), desktop OK
- **Repo GitHub** : https://github.com/sully132/Breaking-Bad-tycoon (branche `main`, servi via GitHub Pages)
- **APK** : généré avec Bubblewrap (TWA) pointant vers la PWA — l'utilisateur l'installe sur son téléphone
- **Positionnement voulu par l'utilisateur** : « un mix de ce qui se fait de mieux dans les idle tycoons Android, surtout niveau carte et mise en scène » — références : AdVenture Capitalist (lieux à niveler, managers, multiplicateurs), Idle Miner Tycoon (carte, chaîne de production), Egg Inc.

## 2. Stack technique (volontairement minimaliste)

- **Zéro dépendance, zéro build** : HTML + CSS + JS vanilla (ES6), canvas 2D pour les scènes/carte.
- Fichiers :
  - `index.html` — splash, menu principal, onglets, modales, overlay
  - `css/style.css` — tout le style (thème vert/bleu meth, notation Breaking Bad « Br Ba »)
  - `js/data.js` — **TOUTES les données éditables** (labos, équipe, affaires, événements, dialogues, carte, missions, succès, boutique légende)
  - `js/game.js` — moteur : état, économie, boucle jour/PA, idle, empire, contrats, événements, prestige, UI, sauvegarde
  - `js/scene.js` — scène animée canvas du labo (taper = boost, cristal doré, FX)
  - `js/map.js` — carte interactive d'Albuquerque (canvas) : lieux, interactions, dialogues, badges d'affaires
  - `js/sfx.js` — sons via WebAudio (générés, pas de fichiers audio)
  - `js/app.js` — coquille app : splash, menu, onglets, badges, PWA install, plein écran, vibrations
  - `sw.js` — service worker cache-first (bump `CACHE` à chaque release : `heisenberg-v10`)
  - `manifest.json`, `icon.svg`, `icon-maskable.svg` — PWA
- **Sauvegarde** : `localStorage`, clé `heisenberg-tycoon-save-v2`, auto-save à chaque action + `lastSeen` pour les gains hors ligne.
- **Pas de framework, pas de bundler** : pour tester en local `python3 -m http.server` puis ouvrir le navigateur (le SW exige https ou localhost).

## 3. Boucle de jeu (v10)

### 3.1 Boucle idle « Empire » (nouveau v10, cœur AdCap)
- Onglet **💼 Empire** : 10 affaires productrices d'argent **sale** en continu :
  1. Lave-auto A1A (possédé dès le début) → 2. Salon de manucure → 3. Réseau de rue → 4. Los Pollos Hermanos → 5. Casse de Old Joe → 6. Cabinet Saul → 7. Laverie industrielle → 8. Hacienda d'Éladio → 9. Export Tchéquie → 10. Cartel international
- Chaque affaire : `niveau` (revenu linéaire), coût suivant `baseCost × costMult^niveau`, **paliers ×2 aux niveaux 10/25/50/100/200/300/400** (`BUSINESS_MILESTONES`).
- Achat ×1 / ×10 / ×100 / MAX (sélecteur `buyAmount`).
- **Managers** (1 par affaire, personnages de la série : Walter Jr., Francesca, Badger, Lyle, Old Joe, Huell, Todd, Bolsa, Lydia, Gus) :
  - Sans manager : la réserve de revenus plafonne à **15 min** de production → collecte manuelle (clic sur l'icône).
  - Avec manager : réserve de **2 h** + production automatique + **gains hors ligne**.
- **Gains hors ligne** : au chargement, `checkOfflineEarnings()` compare `lastSeen` → modale « Pendant ton absence » avec collecte globale.
- Les affaires liées à un lieu de la carte (`locId`) affichent sur la carte : badge de niveau `N25` + **bulle dorée $** quand il y a à collecter (pulse à 50 % de la réserve), et un bouton « 💼 Gérer l'affaire » dans la modale du lieu.

### 3.2 Boucle narrative (cœur historique, conservé)
- **Jours + points d'action (PA)** : 3 PA/jour (+1 via boutique légende). Actions : Cuisiner, Vendre, Blanchir, Se faire discret.
- **Stock en kg**, **pureté**, **prix/kg** (20 000$ + pureté×400, modifié par respect/marché/série).
- **Argent sale → blanchiment → argent propre** (taux 65–98 %). Objectif : 10 000 000$ propres → victoire « SAY MY NAME », puis Mode Légende (objectif ×10) et **prestige** (1 🎭 / 5 M$ gagnés, +10 % permanent par point, boutique de légende 🪙).
- **Chaleur DEA 0–100** : ventes/cuissons sauvages augmentent, se cacher/Saul/Caméras baissent. À 100 → descente : arrestation (game over) sauf Saul (amende 100 000$).
- **Contrats** : clients (Krazy-8, Tuco, Cartel…) demandent X kg en Y jours → gros bonus.
- **Événements aléatoires** (fin de journée, ~15 %+chaleur de chance) : choix narratifs, chaînes d'événements (`scheduleEvent`), 25+ événements.
- **Carte d'Albuquerque** : 12 lieux avec interactions quotidiennes (PA ou gratuit, 1×/jour) + dialogues de personnages (Jesse, Skyler, Saul, Gus, Mike, Tuco, Hank, Jane, Walter Jr., Marie…).
- **Missions quotidiennes** (3/jour, dont « collecter 8 fois les revenus »), **succès** (23), **cristal doré** (toutes les 45 s sur la scène, jackpot aléatoire), **frénésie ×2** (30 s), **série de ventes** (+2 % prix/jour d'affilée), **marché fluctuant** (70–140 %).
- **Scène labo** : canvas animé, taper = gain de cash instantané, FX cuisson/vente/blanchiment.

### 3.3 Synergies à connaître
- `launderVolume()` augmente avec le niveau du lave-auto (+2 500/niveau) et de la laverie industrielle (+25 000/niveau).
- `bizRevPerSec` est boosté par : prestige (legendMult), respect (+0,4 %/point), frénésie ×2.
- Empires de façade nombreux → +chaleur quotidienne (min(10, niveaux/30)) : la discrétion reste un arbitrage.
- Coût des affaires payé en argent **propre** ; revenus en argent **sale** → le blanchiment reste le goulot d'étranglement narratif.

## 4. Structure de l'état (save)

```js
{
  day, ap, cash (propre), dirty (sale), stock (kg), purity, heat, respect,
  labLevel, capBonus, market, staff: ["jesse", ...], upgrades: ["mask", ...],
  flags: { cookPenalty, priceBonus, precursorDiscount },
  stats: { cooked, sold, laundered, contractsDone, totalEarned },
  achievements: [], contract, contractCooldown, goal, endless,
  taps, investments: { street: n, ... }, legendPoints, prestiges, streak,
  soldToday, frenzyUntil (perf.now ms), pendingEvents: [{id, days}],
  goldenCaught, visitedToday: { "locId:interId": true }, legendCoins, legendUpgrades: {},
  dailyMissions: { day, list: [{id, progress, claimed}] },
  businesses: { carwash: { level, manager, pooled }, ... },   // v10
  buyAmount: "1"|"10"|"100"|"max",                            // v10
  lastSeen: <epoch ms>,                                       // v10
  gameOver, victory, log: [{day, msg, kind}]
}
```

## 5. Équilibrage (points de réglage dans js/data.js)

- `BUSINESSES` : `baseCost`, `costMult` (1.09 → 1.19), `baseRev`, `cycle` (2 → 120 s), `unlock(state)`, `manager.cost`.
- `BUSINESS_MILESTONES` : paliers ×2.
- `POOL_CAP_MANAGED` (7 200 s) / `POOL_CAP_RAW` (900 s) : durée de réserve.
- `LABS`, `STAFF`, `UPGRADES`, `INVESTMENTS`, `EVENTS` (+weight), `DAILY_MISSIONS`, `LEGEND_UPGRADES`, `PRESTIGE_MIN_EARNED` (5 M$).
- Affichage des gros nombres : `fmtMoney()` dans game.js (k$/M$/Md$/T$/Qa$).

## 6. Comment lancer / tester

```bash
# local
python3 -m http.server 8000
# → http://localhost:8000

# vérifier la syntaxe JS
node --check js/*.js

# smoke test logique (stubs DOM, aucun navigateur requis)
# voir le test passé en session v10 : chargé data.js + game.js avec stubs document/localStorage
```

Le jeu est jouable sur GitHub Pages (URL du repo). L'APK (Bubblewrap/TWA) charge la même URL : **toute modification poussée sur `main` met à jour l'app installée** (le SW se met à jour au 2e lancement grâce au bump de `CACHE`).

## 7. Historique des versions

- v1 : boucle jour/PA, labos, équipe, événements, victoire 10 M$
- v2 : save v2, ajustements
- v3 : contrats clients
- v4 : idle 5 s, investissements répétables, prestige, succès, marché
- v5 : carte interactive d'Albuquerque (canvas), interactions, dialogues
- v6 : lieux + dialogues supplémentaires, PWA (manifest, SW, icônes), coquille mobile (onglets, badges)
- v7 : missions quotidiennes, boutique de légende, frénésie, cristal doré, série de ventes, +événements
- v8 : carte décorée (soleil, nuages, montagnes, voitures, rivière), sons, haptique
- v9 : menu principal, splash screen, thème, polish carte
- v10 : système EMPIRE — 10 affaires productrices à niveler avec paliers ×2, 10 managers qui automatisent, gains hors ligne avec modale de retour, achat ×1/×10/×100/MAX, badges de niveau + bulles de collecte sur la carte, 4 succès + 1 mission, formatage des gros nombres (k$ → Qa$)
- v11 : LA CARTE EST L'ÉCRAN PRINCIPAL — chaque lieu s'ouvre en vraie scène plein écran animée (`js/locscene.js`, 17 décors canvas jour/nuit, personnages vectoriels `CHAR_LOOKS`, bottom-sheet d'actions, panneau d'affaire avec billets volants et collecte au tap, 5 nouveaux lieux, 10 affaires rattachées à un lieu, nav réordonnée)
- v12 : ÉVÉNEMENTS + OPPORTUNITÉS + SCÈNES VIVANTES — 12 nouveaux événements (course, junkie, cousin + chaîne `cousinBetrayal`, camion de poulet, blackout, balance DEA, planque, rachat, santé, équipe de rue, protection Mike), opportunités éphémères dorées sur la carte (`state.opps`, 1-3/jour, 5 types dans `OPPORTUNITIES`, collecte au tap, succès « Œil de lynx »), bulles de dialogue auto + citations au tap (`QUOTES`), boost au tap sur les affaires, oiseaux/tumbleweed/vignette
- v13 : scènes vivantes (persos qui marchent, citations du matin), coup de pub ×4 (60 s / recharge 10 min), export/import de sauvegarde
- v14 : passe graphismes (persos avec ombres/contours/reflets, montagnes lointaines, texture de sol, pins médaillon, polish UI verre dépoli)
- v15 : CYCLE JOUR/NUIT TEMPS RÉEL — le ciel des scènes ET de la carte suit l'heure du téléphone (`timePhase()` : nuit 20h-5h, aube 5h-7h30, jour, crépuscule 18h-20h, teintes superposées), lucioles dans les scènes extérieures la nuit, étoiles filantes occasionnelles (`updateShootingStar`)
- v16 : passe design UI — splash animé (fond dérivant, logo pulsant, titre dégradé), boutons menu enrichis, statbar en chips colorées par type (good/warn/blue), cards avec liseré supérieur dégradé par rareté, journal avec bordure latérale colorée par type, bottom-sheet des scènes avec poignée de drag et en-tête affiné, boutons de scènes/modales en dégradé, polish biz-row et modales, scrollbars discrètes.
- v17 : graphismes de scènes enrichis + nouveaux événements — météo dynamique (pluie et orage avec nuages sombres, éclairs et pluie animée sur les scènes extérieures, tirée à l'ouverture de chaque scène), extras de décor par scène (désert : poteaux électriques et rochers, carwash : mousse et brosse rotative, restaurant : enseigne Los Pollos lumineuse, rue : néon clignotant, police : gyrophares, industriel : clôture et barils), personnages avec jambes animées en marchant, 8 nouveaux événements (comboDeal, galeHelp, thinIce, bbqNeighbor, tortuga, methHeads, cousins Salamanca, lydiaDemand) et 2 nouvelles opportunités dorées (scanner de la police, client pressé).
- v18 : événements intégrés aux scènes — 21 événements rattachés à un lieu précis (`loc:`) avec apparences de visiteurs dédiées (`EVENT_VISITORS`) ; quand un événement tombe, il est mis en file (`state.sceneEvents`) avec toast « va sur place ! », badge ❗ pulsant sur le pin de la carte, visiteur dessiné dans la scène avec marqueur ❗ pulsant au-dessus de la tête ; on le déclenche en tapant le visiteur ou via le bouton dédié dans le bottom-sheet ; fallback : les événements non réglés sont résolus au endDay suivant (`flushSceneEvents`).
- v19 : notifications d'événements + rééquilibrage des affaires — fréquence des événements doublée (30 % + chaleur/300), badge de nav Carte incluant les événements en scène en attente, toast de fin de journée listant les événements non réglés ; synergies d'affaires : chaque affaire gagne des bonus d'équipe (`crew` : ex. Gus +25 % à Los Pollos, Lydia +30 % à l'export, Saul +30 % au cabinet) et d'équipement (`gear` : ex. Lavages A1A +50 %, Réseau de distribution +35-50 %), revenus multipliés par la pureté (0.9 + pureté/400) et par l'état du marché ; ligne « Synergies » affichée dans la modale d'affaire.
- v20 : événements de scène enfin visibles — tirage dédié `rollSceneEvents()` à chaque fin de journée (55 % + chaleur/400, file limitée à 2, premier événement GARANTI dès le jour 2 via `stats.sceneEventsSeen`), bandeau rouge pulsant dessiné en haut de la carte (« ❗ Titre — Lieu ») en plus du badge ❗ sur le pin et du badge de nav.
- v21 : personnages, dialogues et scènes d'événements enrichis — personnages avec yeux qui clignent et bras qui balancent en marchant ; bulles de dialogue réécrites (étiquette avec le nom du personnage via `CHAR_NAMES`, texte multi-lignes, bordure colorée unique par personnage) ; 1 réplique ajoutée à chacun des 18 personnages ; les visiteurs d'événements sont maintenant les vrais personnages (Hank, Tuco, Gus, Lydia, Jesse via `CHAR_LOOKS`) et parlent dans une bulle dédiée (`EVENT_QUOTES`, 21 événements) ; aura rouge pulsante sur les bords de la scène tant qu'un événement attend.
- v22 : Phase 1 de la ROADMAP — combo de tap (taps enchaînés < 2,5 s = multiplicateur jusqu'à ×2, paliers 🔥x10 / 🔥🔥x25 Respect +2 / 💥x50 +5000$, succès combo25 et combo50) et chaînes d'événements à conséquences différées (Livraison express de Gus → récompense J+3 ou colère J+2 ; Convoyage cartel → paie J+2 puis chaleur J+4).
- v23 : Phase 2 de la ROADMAP — étages du Superlab (-1/-2/-3 : +25% cuisson, +10% affaires chacun, panneau « ascenseur » dans la scène), collection de 8 reliques à bonus passifs (garantie jour 5), vitrine 🗄️ dans le menu, prestige enrichi (🏬 Franchises secrètes, 🍀 Étoile filante), succès floors3 et relic4.
- v24 : Phase 3 de la ROADMAP — un monde vivant : parallaxe au doigt sur la carte (4 plans, retour élastique), trafic enrichi (7 véhicules + avion cargo), météo sur la carte (pluie/orage avec éclairs), ambiance sonore par scène en WebAudio (vent, usine, ville, pluie).
- v25 : Phase 4 de la ROADMAP — le récit : 3 arcs narratifs (⚗️ L'Ascension, 🚔 La Traque, 🍗 L'Empire) de 5 chapitres, récompenses par chapitre, cinématiques plein écran en fin d'arc, journal d'histoire 📖 dans le menu.
- v26 : Phase 5 de la ROADMAP — la rétention : tutoriel 3 écrans skippable, 6 événements exclusifs de week-end + revenus ×1,15 le samedi/dimanche, streak de connexion réelle (+2 000$/jour consécutif, max 20 000$), écran de fin détaillé (10 stats + moment fort).
- v27 : Phase 6 de la ROADMAP — la finition : équilibrage simulé 100 jours (balance.test.js, bot actif RNG seedé) — objectif 150 000 000$, baseRev des affaires tardives rééquilibrées (payback croissant ×2,2 par palier), costMult durcis (1,21→1,31), blanchiment auto-scalant à 4 s de revenus → victoire simulée jour 54, sans arrestation, chaleur max 83 ; migration des anciennes parties (objectif 10M → 150M, mode Légende préservé) ; DPR adaptatif (2 → 1,5 → 1 selon fps mesuré) + pause canvas/ambiance en arrière-plan ; accessibilité (cibles ≥ 44 px, focus visible, prefers-reduced-motion, pas de zoom double-tap) ; éclairage dynamique sur les 17 scènes (halos de lampes la nuit, rayons de soleil le jour). PLAN COMPLET (6 phases) LIVRÉ.

## 8. Idées pour la suite (non implémentées)

- Boosts temporaires type « pub récompensée » (simulateur de pub ×4 pendant 60 s)
- Étages/étages à la Idle Miner : ascenseur/entrepôt entre le labo et la vente
- Événements temporaires de fin de semaine avec économie dédiée
- Citations aléatoires de personnages au démarrage de chaque jour
- Sauvegarde cloud (export/import de la save en JSON)
- Personnages animés dans les scènes (marche, gestures) et dialogues en bulle dans la scène
- Mini-jeux par lieu (cuiser au rythme, négocier avec Tuco)
- v28 : mini-jeux par lieu (Cuisson de précision, Négociation avec Tuco), 9 nouveaux événements + 4 week-ends à thème, scènes d'événements animées (entrée marchée, faisceau, braises, bannière, flash).
- v29 : Phase 8 — maîtrise & récompenses : 3e mini-jeu Vente express, 4 succès mini-jeux avec stats, 4 nouveaux événements, karaoké de Badger.
- v30 : passe graphisme majeure — ciels riches (étoiles, lune à cratères, soleil triple halo), nuages volumétriques, sols détaillés, poussières de jour, brume d'aube, grain de film, carte à ciel selon l'heure réelle.
- v31 : cinéma & personnages — cinématique d'événement (bandes cinémascope, sous-titres typewriter avec nom du locuteur, tap pour avancer), 18 personnages refaits (carnations, moustaches, badge, colliers, tabliers, vestes), silhouettes de premier plan par décor.
- v32 : vivant & émotions — expressions faciales (sourcils + bouche selon l'humeur), jambes articulées avec genou, humeurs contextuelles, cinématiques story en mode cinéma (letterbox, locuteur en or, typewriter).
- v33 : cinématiques vivantes — bips de dialogue pendant les sous-titres, visiteur en pose bras croisés, persos qui s'arrêtent et regardent l'événement, bulles auto coupées, furieux qui crient.
- **v34 (courante) : plan de réalisateur — caméra de cinématique (zoom + pan vers le visiteur, UI plein écran intacte), répliques à deux voix (un perso de la scène répond au visiteur : Walter face à Tuco, Jesse, Saul, Hank, Lydia, Skyler, Mike), nappe musicale de tension synthétique pendant toutes les cinématiques (événements + story).**
