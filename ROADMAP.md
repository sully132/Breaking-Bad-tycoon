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

## Phase 18 — Ouverture & collection (v38) ✅ LIVRÉE (v38)
- [x] Cinématique d'intro jouée une seule fois au lancement de la première partie *(livré en v38)*
- [x] Album complet des événements : grille X/N dans le journal, inconnus en ???, rejouables une fois découverts *(livré en v38)*
- [ ] Prochaines pistes : récompenses de collection (bonus par palier d'événements découverts), cinématique de fin de semaine, succès liés à l'album

## Phase 19 — Détails & vie de fond (v39) ✅ LIVRÉE (v39)
- [x] Props par décor : poteaux télégraphiques (fil qui vibre), clôtures + poubelles, aspirateurs de carwash, voiture garée + panneau, benne + barrière, feu tricolore + borne à incendie, banc + horloge de gare, château d'eau *(livré en v39)*
- [x] Persos vivants : pupilles qui suivent le visiteur pendant les cinématiques, léger penché de curiosité *(livré en v39)*
- [x] Récompenses d'album : paliers 25/50/75/100% → +3/6/10/15% de revenus permanents, toast + son doré à chaque palier *(livré en v39)*
- [ ] Prochaines pistes : succès liés à l'album, ombres portées dynamiques selon l'heure, animaux de fond (chiens, corbeaux)

## Phase 20 — Trophées & faune (v40) ✅ LIVRÉE (v40)
- [x] Succès d'album : Collectionneur (25%), Archiviste d'Albuquerque (50%), Mémoire vivante (100%, 250 000$) *(livré en v40)*
- [x] Faune de fond : corbeaux sur les fils (désert), chien qui traverse (banlieue), pigeons qui picorent (ville) *(livré en v40)*
- [x] Ombres portées dynamiques : direction et longueur selon l'heure réelle du soleil *(livré en v40)*
- [ ] Prochaines pistes : saison des pluies visible sur plusieurs jours, événements qui modifient les décors de façon persistante, oiseaux qui s'envolent au tap

## Phase 21 — Traces & interactions (v41) ✅ LIVRÉE (v41)
- [x] Oiseaux interactifs : corbeaux et pigeons s'envolent au tap (ailes battantes, dispersion) *(livré en v41)*
- [x] Chien interactif : sprint + « Ouaf ! » quand on le touche *(livré en v41)*
- [x] Flaques après la pluie : formées au retour du beau temps, reflet du ciel, séchage progressif (~45 s) *(livré en v41)*
- [ ] Prochaines pistes : traces de pas dans les flaques, herbe qui pousse selon les jours, ombres des nuages qui glissent au sol

## Phase 22 — Ciel & saisons (v42) ✅ LIVRÉE (v42)
- [x] Saisons réelles : hiver (neige + teinte froide), automne (feuilles mortes + teinte chaude), printemps (teinte verte), été (neutre) *(livré en v42)*
- [x] Ombres de nuages qui glissent lentement au sol dans les scènes extérieures *(livré en v42)*
- [ ] Prochaines pistes : neige qui s'accumule sur les toits, événements de saison (tempête de neige, récolte), décor de carte teinté par saison

## Phase 23 — Gros plan gameplay (v43) ✅ LIVRÉE (v43)
- [x] 6 nouveaux événements de scène : inspection du superlab (soudoyer ou tenter sa chance), cuivre à la casse (vendre ou stocker), info DEA au salon d'ongles, concert sur la plaza (vendre dans la foule ou profiter), fête au domaine (négocier ou rester discret), grève des aiguilleurs (marché en hausse) *(livré en v43)*
- [x] 3 événements de saison liés au calendrier réel : tempête de neige en hiver (chaleur −10), canicule en été (pureté +4), récolte d'automne (+25 000$) *(livré en v43)*
- [x] 2 succès d'événements : Témoin de tout (10 événements vus) et Toujours au courant (40 événements vus) *(livré en v43)*
- [ ] Prochaines pistes : contrats express à durée limitée, événements en chaîne multi-lieux, difficulté adaptive selon la progression

## Phase 24 — Événements en chaîne multi-lieux (v44) ✅ LIVRÉE (v44)
- [x] Système de chaînes : un événement résolu déclenche l'étape suivante sur un AUTRE lieu (lien 🔗 « L'affaire continue ! ») *(livré en v44)*
- [x] Chaîne « Cargaison bloquée » : grève des aiguilleurs → vol du camion à la casse → piège de la DEA (Saul ou poker face) *(livré en v44)*
- [x] Chaîne « Précurseur » : canicule → offre de méthylamine au superlab (stock +6 kg, pureté +2) *(livré en v44)*
- [x] Chaîne « Guerre de territoire » : concert de la plaza → dealers intrus sur le coin → rendez-vous dans le désert (intimidation ou tribut) *(livré en v44)*
- [ ] Prochaines pistes : contrats express à durée limitée, chaîne de prestige post-reset, difficulté adaptive selon la progression

## Phase 25 — Approfondissement des événements de scène (v45) ✅ LIVRÉE (v45)
- [x] Chaîne « L'Empire » en 4 étapes : le plan de Saul → investissement industriel au superlab → réseau de rue → le conseil de l'empire *(livré en v45)*
- [x] Indicateur d'étape dans le banner des scènes : 🔗 titre + « étape 2/3 » pour les événements en chaîne *(livré en v45)*
- [x] 3 nouveaux événements aléatoires : contrat de flotte au carwash, panne du fourgon (bricolage 50/50), prêche surprise sur la plaza *(livré en v45)*
- [x] Succès « Maître des chaînes » : mener les 3 chaînes à leur terme (+50 000$, +15 respect) *(livré en v45)*
- [ ] Prochaines pistes : contrats express à durée limitée, chaîne de prestige post-reset, événements qui modifient les décors de façon persistante

## Phase 26 — Cinématiques de niveau cinéma (v46) ✅ LIVRÉE (v46)
- [x] Ambiance : spotlight théâtral au centre, grain de film animé, vignette renforcée pendant les cinématiques *(livré en v46)*
- [x] Secousse d'écran au déclenchement des événements dramatiques (coup de feu, alarme) *(livré en v46)*
- [x] Médaillon du locuteur : pop d'entrée (easeOutBack) + respiration douce *(livré en v46)*
- [x] Sous-titres vivants : boîte qui glisse à chaque réplique, soulignement doré animé sous le nom, points de progression des répliques *(livré en v46)*
- [x] Fix : le médaillon était recouvert par la boîte de sous-titres (calque inversé depuis v35) *(livré en v46)*
- [ ] Prochaines pistes : plan large/plan poitrine alternés (zoom variable par réplique), flou d'arrière-plan, réactions des passants pendant la cinématique

## Phase 27 — Montage cinéma (v47) ✅ LIVRÉE (v47)
- [x] Plans de caméra alternés par réplique : plan d'établissement (large), plan moyen sur la narration, plan poitrine sur les dialogues (zoom ×1,16 + pan renforcé vers le locuteur) *(livré en v47)*
- [x] Transitions douces entre les plans (lissage 8%/frame) au lieu de coupures sèches de zoom *(livré en v47)*
- [x] Retour progressif au cadre neutre quand la cinématique se termine *(livré en v47)*
- [x] Roulis de caméra (légère rotation) pendant la secousse dramatique *(livré en v47)*
- [ ] Prochaines pistes : flou d'arrière-plan sur les plans poitrine, réactions des passants pendant la cinématique, contrats express à durée limitée

## Phase 28 — Passants réactifs & contrats express (v48) ✅ LIVRÉE (v48)
- [x] Les passants s'écartent prudemment du visiteur pendant les cinématiques *(livré en v48)*
- [x] Marque de réaction (! doré si tension, ? bleu sinon) au-dessus du passant le plus proche *(livré en v48)*
- [x] Contrats express : petites livraisons chronométrées en TEMPS RÉEL (10 minutes), paiement ×2,2 immédiat, apparition quotidienne aléatoire *(livré en v48)*
- [x] Succès « Livreur express » : 5 contrats express réussis (+30 000$, +5 respect) *(livré en v48)*
- [ ] Prochaines pistes : contrats express visibles sur la carte, chaîne de prestige post-reset, flou d'arrière-plan sur les plans poitrine

## Phase 29 — Cohérence des persos & labo sur la carte (v49) ✅ LIVRÉE (v49)
- [x] Déduplication des personnages : si le visiteur d'événement est déjà dans la scène (Tuco au désert, Hank à la DEA…), c'est le perso de la scène qui porte l'événement — plus de doublons *(livré en v49)*
- [x] Caméra et tap redirigés vers le vrai perso de la scène quand il porte l'événement *(livré en v49)*
- [x] Bouton « 🔬 Ouvrir le labo » dans le bottom-sheet du RV et du superlab — accès direct à la production depuis la carte *(livré en v49)*
- [x] Description du RV mise à jour : le camping car est ton labo mobile *(livré en v49)*
- [ ] Prochaines pistes : contrats express visibles sur la carte, chaîne de prestige post-reset, flou d'arrière-plan sur les plans poitrine
## Phase 30 — Revue cohérence & express visible (v50) ✅ LIVRÉE (v50)
- [x] Le locuteur parle en bulle dans la scène pendant les cinématiques : si le perso du dialogue est présent à l'écran (Tuco au désert, Hank à la DEA, Saul au bureau…), c'est lui qui parle en bulle au-dessus de sa tête, en synchronisation avec le texte de la boîte de sous-titres *(livré en v50)*
- [x] Bulle du locuteur effacée proprement à la fin de chaque cinématique *(livré en v50)*
- [x] Badge ⚡ sur l'onglet Empire quand un contrat express chronométré est en cours — impossible de rater une livraison en cours *(livré en v50)*
- [ ] Prochaines pistes : chaîne de prestige post-reset, fondu d'arrière-plan des plans poitrine, passe équilibrage selon retours réels
## Phase 31 — Profondeur de champ cinéma (v51) ✅ LIVRÉE (v51)
- [x] Voile radial doux derrière le locuteur sur les plans poitrine : l'arrière-plan s'assombrit, le regard se concentre sur le perso qui parle *(livré en v51)*
- [x] Profondeur de champ simulée sans blur — zéro coût pour la perf mobile *(livré en v51)*
- [x] Intensité du voile lissée (8 %/frame) : apparition/disparition en fondu synchronisée avec les transitions de plans *(livré en v51)*
- [ ] Prochaines pistes : chaîne de prestige post-reset, passe équilibrage selon retours réels du joueur
## Phase 32 — Le labo au niveau du reste du jeu (v52) ✅ LIVRÉE (v52)
- [x] Doublon de Jesse corrigé : il n'apparaît plus deux fois dans le RV *(livré en v52)*
- [x] Équipe du labo redessinée avec les looks des scènes (CHAR_LOOKS) : combinaisons hazmat dans le RV, Walter qui devient Heisenberg au jour 8, Mike/Saul/Gus/Todd/Lydia identiques à leurs scènes *(livré en v52)*
- [x] Moteur de persos du labo enrichi : vestes, cravates, barbes, moustaches, casquettes, tabliers, badges, colliers, cheveux longs, contours et ombres portées *(livré en v52)*
- [x] Cycle jour/nuit du labo en TEMPS RÉEL (synchronisé avec la carte et les scènes) *(livré en v52)*
- [x] Bulles de dialogue au tap sur chaque membre de l'équipe du labo *(livré en v52)*
- [x] Badge « ! » doré pulsant au-dessus du labo quand un événement RV/superlab est en attente — tap = ouvre directement la scène *(livré en v52)*
- [x] Lucioles la nuit dans le labo *(livré en v52)*
- [ ] Prochaines pistes : chaîne de prestige post-reset, passe équilibrage selon retours réels du joueur
## Phase 33 — Fix « labo vert » (v53) ✅ LIVRÉE (v53)
- [x] Le canevas du labo restait vide (fond vert) : l'onglet Labo est caché au chargement donc le canevas mesurait 0×0, et `resize` n'était jamais rappelé *(livré en v53)*
- [x] `resize` exporté de scene.js et appelé à l'ouverture de l'onglet Labo *(livré en v53)*
- [x] Auto-réparation dans la boucle de rendu : tant que le canevas est vide, le dimensionnement est retenté *(livré en v53)*
- [ ] Prochaines pistes : chaîne de prestige post-reset, passe équilibrage selon retours réels du joueur
## Phase 34 — Fix « événement annoncé mais rien sur la scène » (v54) ✅ LIVRÉE (v54)
- [x] Cause trouvée : le flush de fin de journée consommait le premier événement de la file comme une modale instantanée HORS scène — l'événement était annoncé puis disparaissait avant la visite *(livré en v54)*
- [x] Les événements avec une scène dédiée ne sont plus jamais consommés hors scène : ils attendent le joueur dans leur scène *(livré en v54)*
- [x] Le popup de fin de journée liste les LIEUX où les événements attendent *(livré en v54)*
- [x] Le badge « ! » pulsant au-dessus du visiteur est maintenant tappable (avant : le tap à côté du perso était raté) *(livré en v54)*
- [x] L'événement se déclenche automatiquement ~1 s après l'entrée dans la scène — plus besoin de savoir qu'il faut taper le visiteur *(livré en v54)*
- [ ] Prochaines pistes : chaîne de prestige post-reset, passe équilibrage selon retours réels du joueur
## Phase 35 — Fix majeur : bottom-sheet mort depuis la v49 (v55) ✅ LIVRÉE (v55)
- [x] Cause trouvée avec le nouveau harnais runtime : `const loc = loc()` dans buildSheet — la variable locale masquait la fonction helper et s'appelait elle-même (ReferenceError TDZ), le bottom-sheet ne se construisait plus depuis la v49 *(livré en v55)*
- [x] Conséquences corrigées : bouton d'événement, interactions, coup de pub, mini-jeux, labo — toutes les actions de scène fonctionnent à nouveau *(livré en v55)*
- [x] Nouveau filet permanent `runtime.test.js` : charge les 8 scripts dans l'ordre du jeu, pumppe les vraies boucles de rendu (labo, carte, 17 scènes), joue une cinématique complète au clavier/souris simulés *(livré en v55)*
- [x] Deuxième bombe trouvée par le harnais : `cineOn` déclarée DANS la boucle for de drawCharRow mais utilisée après — ReferenceError à chaque frame de chaque scène, la boucle draw() mourait net (décor figé, aucun perso, aucun événement visible) *(livré en v55)*
- [ ] Prochaines pistes : chaîne de prestige post-reset, passe équilibrage selon retours réels du joueur
## Phase 36 — Événements à choix jouables dans les scènes (v56) ✅ LIVRÉE (v56)
- [x] Cause trouvée par le harnais runtime : la modale de choix s'ouvrait DERRIÈRE la scène plein écran (z-index 50 contre 90 pour #locscene) — invisible, impossible de choisir *(livré en v56)*
- [x] La modale (et l'overlay de fin) passe au-dessus de la scène et des mini-jeux (z-index 120) *(livré en v56)*
- [x] Nouveau test runtime complet : événement à choix « rats » au superlab — cinématique auto, modale visible, clic sur un choix, effets appliqués, modale fermée *(livré en v56)*
- [ ] Prochaines pistes : chaîne de prestige post-reset, passe équilibrage selon retours réels du joueur
## Phase 37 — Des choix qui pèsent (v57) ✅ LIVRÉE (v57)
- [x] 6 nouveaux événements à choix à fort impact : indicateur DEA (payer / faire chanter / refuser → suivi « grillé »), tribut du cartel (payer / refuser / saisir → riposte ou paix différée), propriétaire fouineur (acheter la maison / soudoyer / intimider), étudiante surdouée (embaucher / astuce / présenter à Gus) *(livré en v57)*
- [x] Les conséquences différées sont ANNONCÉES : scheduleEvent accepte une note, affichée « ⏳ … » dans le journal quand l'événement se programme *(livré en v57)*
- [x] Test runtime complet : refus du tribut → riposte du cartel programmée avec sa note *(livré en v57)*
- [ ] Prochaines pistes : chaîne de prestige post-reset, passe équilibrage selon retours réels du joueur
