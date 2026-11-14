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
- **v11 (courante) : LA CARTE EST L'ÉCRAN PRINCIPAL — chaque lieu s'ouvre en VRAIE SCÈNE PLEIN ÉCRAN animée (`js/locscene.js`, 17 décors canvas distincts jour/nuit : désert RV, banlieue, lave-auto, Pollos, laverie de nuit, cabinet Saul, cabane Tuco, casse, plaza, DEA, jardin Hank, appart de Jane, salon de manucure, coin de rue, hacienda d'Éladio, gare de fret, tour du cartel) avec personnages vectoriels (`CHAR_LOOKS`, 18 apparences : chapeau, casquette, lunettes, barbe, combinaison hazmat…), bottom-sheet d'actions réutilisant les interactions/dialogues, panneau d'affaire (niveau + taux/s) avec billets volants et collecte au tap, 5 nouveaux lieux (nails, corner, villa, rail, hq), les 10 affaires rattachées à un lieu de carte, nav réordonnée (Carte en premier, onglet par défaut)**

## 8. Idées pour la suite (non implémentées)

- Boosts temporaires type « pub récompensée » (simulateur de pub ×4 pendant 60 s)
- Étages/étages à la Idle Miner : ascenseur/entrepôt entre le labo et la vente
- Événements temporaires de fin de semaine avec économie dédiée
- Citations aléatoires de personnages au démarrage de chaque jour
- Sauvegarde cloud (export/import de la save en JSON)
- Personnages animés dans les scènes (marche, gestures) et dialogues en bulle dans la scène
- Mini-jeux par lieu (cuiser au rythme, négocier avec Tuco)
