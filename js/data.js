// ============================================================
// HEISENBERG TYCOON — Données de jeu
// Tous les contenus éditables : labos, équipe, améliorations,
// événements. Modifier ici suffit pour équilibrer le jeu.
// ============================================================

const SAVE_KEY = "heisenberg-tycoon-save-v2";

// Objectif de victoire : argent propre accumulé
const VICTORY_CASH = 150_000_000; // v27 : équilibrage simulé — victoire visée ~jour 60-90 en jeu actif

// Points d'action par jour
const AP_PER_DAY = 3;

// Bonus de "tap" sur la scène : fraction du prix du kg, plancher en $
const TAP_CASH_RATE = 0.02;
const TAP_CASH_MIN = 50;

// ------------------------------------------------------------
// LABOS — niveau suivant = index + 1
// cook : kg produits par action "Cuisiner" (de base)
// cap  : stock maximum (kg)
// ------------------------------------------------------------
const LABS = [
  { name: "RV grise", emoji: "🚐", cook: 0.6, cap: 2,   cost: 0 },
  { name: "Labo de Jesse", emoji: "🏚️", cook: 1.5, cap: 5,  cost: 30_000 },
  { name: "Superlab de Gus", emoji: "🧪", cook: 4,  cap: 15, cost: 250_000, requires: "gus" },
  { name: "Empire chimique", emoji: "🏭", cook: 10, cap: 40, cost: 1_500_000 },
];

// Coût des précurseurs par kg cuisiné
const PRECURSOR_COST_PER_KG = 4_000;

// ------------------------------------------------------------
// ÉQUIPE — effets passifs / modificateurs
// ------------------------------------------------------------
const STAFF = [
  {
    id: "jesse", name: "Jesse Pinkman", emoji: "🧢",
    cost: 0, salary: 500, rarity: "",
    desc: "+50% cuisson, −3 pureté. Il est dans le RV dès le début.",
    effect: { cookMult: 1.5, purity: -3 },
  },
  {
    id: "huell", name: "Huell Babineaux", emoji: "💼",
    cost: 30_000, salary: 1_500, rarity: "",
    desc: "+25% d'argent sur les ventes.",
    effect: { sellCashMult: 1.25 },
  },
  {
    id: "saul", name: "Saul Goodman", emoji: "⚖️",
    cost: 50_000, salary: 3_000, rarity: "rare",
    desc: "Blanchiment à 90%, vous protège en cas de descente.",
    effect: { launderRate: 0.9, arrestProtect: true },
  },
  {
    id: "todd", name: "Todd Alquist", emoji: "😐",
    cost: 60_000, salary: 2_000, rarity: "rare",
    desc: "+15% cuisson, +5 pureté. Poli, efficace, inquiétant.",
    effect: { cookMult: 1.15, purity: 5 },
  },
  {
    id: "mike", name: "Mike Ehrmantraut", emoji: "🎩",
    cost: 80_000, salary: 4_000, rarity: "rare",
    desc: "−8 chaleur/jour, ventes 40% moins risquées.",
    effect: { heatPerDay: -8, sellHeatMult: 0.6 },
  },
  {
    id: "gus", name: "Gus Fring", emoji: "🐔",
    cost: 200_000, salary: 8_000, rarity: "epic",
    desc: "Prix de vente +60%. Débloque le Superlab.",
    effect: { priceMult: 1.6, unlockSuperlab: true },
  },
  {
    id: "lydia", name: "Lydia Rodarte-Quayle", emoji: "📋",
    cost: 500_000, salary: 15_000, rarity: "legend",
    desc: "Marché tchèque : quantités vendues ×2.",
    effect: { sellMult: 2 },
  },
];

// ------------------------------------------------------------
// AMÉLIORATIONS — achats définitifs
// ------------------------------------------------------------
const UPGRADES = [
  { id: "mask", name: "Masques & combinaisons", emoji: "😷", cost: 15_000, rarity: "", desc: "+8 pureté." },
  { id: "gear", name: "Matériel de pro", emoji: "⚗️", cost: 40_000, rarity: "", desc: "+5 pureté, +20% cuisson." },
  { id: "methylamine", name: "Réservoir de méthylamine", emoji: "🛢️", cost: 60_000, rarity: "rare", desc: "+40% cuisson." },
  { id: "van", name: "Fourgon discret", emoji: "🚐", cost: 80_000, rarity: "rare", desc: "Les ventes génèrent 2× moins de chaleur." },
  { id: "carwash", name: "Lavages A1A", emoji: "🧽", cost: 100_000, rarity: "epic", desc: "Blanchiment +10% de taux, 4× plus de volume/jour." },
  { id: "cameras", name: "Caméras & gardes", emoji: "📹", cost: 120_000, rarity: "epic", desc: "−5 chaleur/jour, descentes moins graves." },
  { id: "generator", name: "Générateur industriel", emoji: "⚡", cost: 300_000, rarity: "epic", desc: "+25% cuisson, +10 pureté." },
  { id: "railnetwork", name: "Réseau de distribution", emoji: "🚚", cost: 800_000, rarity: "legend", desc: "Prix de vente +30%, ventes +50% de volume." },
];

// ------------------------------------------------------------
// ÉVÉNEMENTS aléatoires (tirés en fin de journée)
// type: "auto" (résolu immédiatement) ou "choice" (2 options)
// weight : probabilité relative. cond(state) optionnel.
// ------------------------------------------------------------
const EVENTS = [
  {
    id: "hank", loc: "rv", emoji: "🚔", weight: 10,
    type: "auto",
    title: "Hank Schrader est sur votre piste",
    text: "Un SUV orange traîne près du RV. La DEA resserre l'étau.",
    apply(s) { addHeat(18); log("🚔 Hank ratisse large. Chaleur +18.", "bad"); },
  },
  {
    id: "tuco", loc: "tuco", emoji: "🤯", weight: 8,
    type: "choice",
    title: "Tuco Salamanca veut sa part",
    text: "Tuco vous colle un revolver sur la tempe : « C'est du business, tonton ! »",
    choices: [
      {
        label: "Payer 20% de votre argent propre (Respect +5)",
        can(s) { return s.cash > 0; },
        apply(s) {
          const cut = Math.round(s.cash * 0.2);
          s.cash -= cut;
          s.respect += 5;
          log(`🤯 Tuco repart avec ${fmt(cut)}$. Respect +5.`, "bad");
        },
      },
      {
        label: "Refuser (Respect −10, risque sur le stock)",
        apply(s) {
          s.respect -= 10;
          addHeat(5);
          if (Math.random() < 0.35 && s.stock > 0) {
            const lost = Math.min(s.stock, 1);
            s.stock -= lost;
            log("🤯 Tuco pille le labo ! Vous perdez du stock.", "bad");
          } else {
            log("🤯 Tuco accepte... pour l'instant. Respect −10.", "bad");
          }
        },
      },
    ],
  },
  {
    id: "cartel", loc: "hq", emoji: "🇲🇽", weight: 7,
    type: "choice",
    cond(s) { return s.day >= 10; },
    title: "Le cartel propose un partenariat",
    text: "Un homme en costume impeccable vous propose un marché juteux... et dangereux.",
    choices: [
      {
        label: "Accepter (+120 000$ d'argent sale, Chaleur +15)",
        apply(s) {
          s.dirty += 120_000;
          addHeat(15);
          scheduleEvent("cartelRetaliation", 3);
          log("🇲🇽 Le cartel paie comptant. Chaleur +15. On vous recontactera...", "bad");
        },
      },
      {
        label: "Refuser poliment (Respect −5)",
        apply(s) {
          s.respect -= 5;
          log("🇲🇽 Vous déclinez. On s'en souviendra. Respect −5.", "bad");
        },
      },
    ],
  },
  {
    id: "deasurveillance", loc: "house", emoji: "👀", weight: 9,
    type: "choice",
    title: "La DEA surveille le quartier",
    text: "Une voiture garée depuis des heures, deux silhouettes avec des jumelles.",
    choices: [
      {
        label: "Payer un avocat d'urgence (5 000$, Chaleur −12)",
        can(s) { return s.cash >= 5_000; },
        apply(s) {
          s.cash -= 5_000;
          addHeat(-12);
          log("👀 L'avocat fait disparaître les soucis. Chaleur −12.", "good");
        },
      },
      {
        label: "Ignorer (Chaleur +10)",
        apply(s) { addHeat(10); log("👀 Vous continuez comme si de rien n'était. Chaleur +10.", "bad"); },
      },
    ],
  },
  {
    id: "methylamine", emoji: "🛢️", weight: 7,
    type: "auto",
    title: "Rupture de méthylamine",
    text: "Votre fournisseur a un problème. Prochaine cuisson divisée par deux.",
    apply(s) { s.flags.cookPenalty = 0.5; log("🛢️ Pénurie de précurseurs ! Prochaine cuisson ×0.5.", "bad"); },
  },
  {
    id: "press", emoji: "📰", weight: 6,
    type: "auto",
    title: "La rumeur de « Heisenberg » enfle",
    text: "La rue parle d'un cuisinier au produit bleu impérial.",
    apply(s) { s.respect += 12; log("📰 Votre légende grandit. Respect +12.", "good"); },
  },
  {
    id: "buyer", emoji: "🤝", weight: 6,
    type: "auto",
    title: "Un gros client se manifeste",
    text: "Un acheteur très motivé. Prix de vente +25% demain.",
    apply(s) { s.flags.priceBonus = 1.25; log("🤝 Gros client intéressé. Prix +25% demain.", "good"); },
  },
  {
    id: "robbery", loc: "corner", emoji: "🔪", weight: 6,
    type: "auto",
    title: "Cambriolage",
    text: "Des junkies ont forcé votre planque.",
    apply(s) {
      if (s.stock > 0) {
        const lost = Math.min(s.stock, Math.max(1, Math.round(s.stock * 0.3)));
        s.stock -= lost;
        log(`🔪 Cambriolage ! −${lost} kg de stock.`, "bad");
      } else {
        const lost = Math.round(s.dirty * 0.25);
        s.dirty -= lost;
        log(`🔪 Cambriolage ! −${fmt(lost)}$ d'argent sale.`, "bad");
      }
    },
  },
  {
    id: "streetsilent", emoji: "🤫", weight: 5,
    type: "auto",
    title: "La rue se tait",
    text: "Personne ne parle de vous aujourd'hui. La pression redescend.",
    apply(s) { addHeat(-10); log("🤫 Silence radio. Chaleur −10.", "good"); },
  },
  // ---------- Nouveaux événements ----------
  {
    id: "jesseRage", loc: "rv", emoji: "😤", weight: 7,
    type: "choice",
    cond(s) { return s.day >= 5; },
    title: "Jesse veut « gérer le quartier »",
    text: "Jesse veut régler ses comptes avec un gang rival, tout seul comme un grand.",
    choices: [
      {
        label: "Le laisser faire (Respect +8, Chaleur +8)",
        apply(s) {
          s.respect += 8;
          addHeat(8);
          log("😤 Jesse a fait le ménage. La rue respecte l'équipe. Respect +8, Chaleur +8.", "bad");
        },
      },
      {
        label: "Le calmer (Respect −3, rien ne se passe)",
        apply(s) {
          s.respect -= 3;
          log("😤 Vous jouez les pacificateurs. Jesse boude. Respect −3.", "bad");
        },
      },
    ],
  },
  {
    id: "qualityControl", emoji: "🔬", weight: 6,
    type: "auto",
    title: "Contrôle qualité",
    text: "Une analyse en laboratoire confirme la qualité de votre produit.",
    apply(s) {
      s.purity = cap(s.purity + 4, 0, 100);
      log("🔬 Pureté confirmée : +4. Le produit bleu fait sa réputation.", "good");
    },
  },
  {
    id: "equipmentTheft", emoji: "🧰", weight: 6,
    type: "choice",
    title: "Vol de matériel",
    text: "Des pièces essentielles ont disparu du labo pendant la nuit.",
    choices: [
      {
        label: "Racheter le matériel (−8 000$)",
        can(s) { return s.cash >= 8_000; },
        apply(s) {
          s.cash -= 8_000;
          log("🧰 Matériel racheté en urgence. −8 000$.", "bad");
        },
      },
      {
        label: "Improviser (Pureté −5)",
        apply(s) {
          s.purity = cap(s.purity - 5, 0, 100);
          log("🧰 Vous bricolez avec des casseroles. Pureté −5.", "bad");
        },
      },
    ],
  },
  {
    id: "blackMarket", loc: "junkyard", emoji: "🕶️", weight: 5,
    type: "auto",
    title: "Marché noir",
    text: "Un ancien contact vous revend de la marchandise confisquée.",
    apply(s) {
      const gain = Math.min(2, stockCap() - s.stock);
      if (gain > 0) {
        s.stock = Math.round((s.stock + gain) * 10) / 10;
        log(`🕶️ Stock mystérieux récupéré : +${gain.toFixed(1)} kg gratuits.`, "good");
      } else {
        s.respect += 4;
        log("🕶️ Stock plein, mais le contact vous doit une faveur. Respect +4.", "good");
      }
    },
  },
  {
    id: "informant", loc: "corner", emoji: "🐀", weight: 6,
    type: "choice",
    cond(s) { return s.staff.length >= 3; },
    title: "Un informateur dans l'équipe ?",
    text: "Mike soupçonne une taupe de la DEA parmi vos employés.",
    choices: [
      {
        label: "Payer le silence de tout le monde (−25 000$, Chaleur −15)",
        can(s) { return s.cash >= 25_000; },
        apply(s) {
          s.cash -= 25_000;
          addHeat(-15);
          log("🐀 Enveloppes pleines, bouches fermées. Chaleur −15.", "good");
        },
      },
      {
        label: "Faire le ménage (Respect −6, Chaleur −6)",
        apply(s) {
          s.respect -= 6;
          addHeat(-6);
          log("🐀 Licenciements secs et ambiance tendue. Respect −6, Chaleur −6.", "bad");
        },
      },
    ],
  },
  {
    id: "priceWar", emoji: "📉", weight: 6,
    type: "auto",
    title: "Guerre des prix",
    text: "Un rival casse les prix dans tout Albuquerque.",
    apply(s) { s.flags.priceBonus = 0.8; log("📉 Concurrence agressive : prix −20% demain.", "bad"); },
  },
  {
    id: "wannabe", emoji: "🧑‍🔬", weight: 5,
    type: "auto",
    title: "Une recrue surprise",
    text: "Un jeune chimier en galère propose de travailler pour la réputation.",
    apply(s) {
      s.respect += 3;
      s.flags.cookPenalty = Math.min(s.flags.cookPenalty, 1) * 1;
      log("🧑‍🔬 Nouveau visage au labo. Respect +3.", "good");
    },
  },
  {
    id: "cartelTribute", loc: "hq", emoji: "💀", weight: 6,
    type: "choice",
    cond(s) { return s.day >= 20; },
    title: "Le cartel exige un tribut",
    text: "« 50 000$ ou des ennuis. » Le message est clair.",
    choices: [
      {
        label: "Payer le tribut (−50 000$)",
        can(s) { return s.cash >= 50_000; },
        apply(s) {
          s.cash -= 50_000;
          s.respect += 4;
          log("💀 Tribut payé. Le cartel vous laisse tranquille... pour l'instant.", "bad");
        },
      },
      {
        label: "Refuser (Chaleur +12, Respect −8)",
        apply(s) {
          addHeat(12);
          s.respect -= 8;
          log("💀 Vous tenez tête au cartel. Des yeux se braquent sur vous. Chaleur +12.", "bad");
        },
      },
    ],
  },
  {
    id: "goodBatch", emoji: "💎", weight: 5,
    type: "auto",
    title: "Fournée exceptionnelle",
    text: "Une fournée parfaite, bleu translucide comme du verre.",
    apply(s) {
      s.purity = cap(s.purity + 6, 0, 100);
      log("💎 Fournée parfaite ! Pureté +6.", "good");
    },
  },
  {
    id: "raidWarning", loc: "dea", emoji: "🚨", weight: 10,
    type: "auto",
    cond(s) { return s.heat >= 55; },
    title: "Descente imminente",
    text: "Un contact de la police vous prévient : un raid se prépare !",
    apply(s) {
      addHeat(10);
      if (s.stock > 0) {
        const lost = Math.min(s.stock, s.stock * 0.3);
        s.stock = Math.round((s.stock - lost) * 10) / 10;
        log(`🚨 Panic move ! Stock brûlé : −${lost.toFixed(1)} kg. Chaleur +10.`, "bad");
      } else {
        log("🚨 Panic move ! Rien à saisir, ouf. Chaleur +10.", "bad");
      }
    },
  },
  {
    id: "cheapPrecursors", emoji: "🎁", weight: 6,
    type: "auto",
    title: "Précurseurs bon marché",
    text: "Un camion « perdu » de produits chimiques. Prochaine cuisson à moitié gratuite.",
    apply(s) { s.flags.precursorDiscount = 0.5; log("🎁 Précurseurs à −50% sur la prochaine cuisson !", "good"); },
  },
  {
    id: "streetParty", emoji: "🎉", weight: 5,
    type: "auto",
    title: "La rue célèbre votre produit",
    text: "Musique, barbecues, et votre nom partout sur les murs.",
    apply(s) {
      s.respect += 6;
      addHeat(4);
      log("🎉 Votre légende se fête dans tout le quartier. Respect +6, Chaleur +4.", "good");
    },
  },
  {
    id: "lawTightens", emoji: "📕", weight: 5,
    type: "auto",
    cond(s) { return s.day >= 15; },
    title: "Nouvelle loi anti-drogue",
    text: "L'État durcit la répression. Les contrôles se multiplient.",
    apply(s) {
      addHeat(12);
      log("📕 Répression renforcée. Chaleur +12.", "bad");
    },
  },
  {
    id: "rivalBust", emoji: "📺", weight: 6,
    type: "auto",
    title: "Un rival arrêté",
    text: "Un cuisinier concurrent est tombé. Le marché est à vous.",
    apply(s) {
      s.respect += 8;
      addHeat(-8);
      log("📺 Votre rival fait la une des infos. Le marché est à vous. Respect +8, Chaleur −8.", "good");
    },
  },
  // ---------- Événements v3 ----------
  {
    id: "tucoJail", emoji: "⛓️", weight: 6,
    type: "auto",
    cond(s) { return s.day >= 30; },
    title: "Tuco est derrière les barreaux",
    text: "La DEA a enfin attrapé Tuco Salamanca. Le quartier respire.",
    apply(s) { s.respect += 10; addHeat(-5); log("⛓️ Tuco en prison ! Respect +10, Chaleur −5.", "good"); },
  },
  {
    id: "gusMeeting", loc: "pollos", emoji: "🐔", weight: 7,
    type: "choice",
    cond(s) { return s.staff.includes("gus"); },
    title: "Gus vous convoque",
    text: "« Mon labo, mes règles. Mais je suis prêt à vous accorder ma confiance. »",
    choices: [
      {
        label: "Accepter ses conditions (Pureté +5, Chaleur −5)",
        apply(s) {
          s.purity = cap(s.purity + 5, 0, 100);
          addHeat(-5);
          log("🐔 Accord conclu avec Gus. Pureté +5, Chaleur −5.", "good");
        },
      },
      {
        label: "Rester indépendant (Respect −6)",
        apply(s) {
          s.respect -= 6;
          log("🐔 Gus le regrette, mais respecte votre choix. Respect −6.", "bad");
        },
      },
    ],
  },
  {
    id: "stashSeized", emoji: "📦", weight: 7,
    type: "auto",
    cond(s) { return s.heat >= 40; },
    title: "Une cachette saisie",
    text: "Les chiens de la DEA ont flairé une de vos planques.",
    apply(s) {
      const lost = Math.round(s.dirty * 0.2);
      s.dirty -= lost;
      log(`📦 Argent saisi dans la cachette : −${fmt(lost)}$ d'argent sale.`, "bad");
    },
  },
  {
    id: "newTerrain", emoji: "🏗️", weight: 5,
    type: "choice",
    title: "Un terrain à saisir",
    text: "Un entrepôt est à vendre, idéal pour stocker davantage.",
    choices: [
      {
        label: "Acheter l'entrepôt (−50 000$, Stock max +10 kg définitif)",
        can(s) { return s.cash >= 50_000; },
        apply(s) {
          s.cash -= 50_000;
          s.capBonus += 10;
          log("🏗️ Entrepôt acheté ! Stock max +10 kg.", "good");
        },
      },
      {
        label: "Passer son tour",
        apply(s) { log("🏗️ Trop cher pour aujourd'hui.", "info"); },
      },
    ],
  },
  {
    id: "purityDuel", loc: "superlab", emoji: "⚔️", weight: 6,
    type: "choice",
    title: "Défi de pureté",
    text: "Un chimiste rival parie 20 000$ que son produit est plus pur que le vôtre.",
    choices: [
      {
        label: "Relever le défi (mise : 20 000$)",
        can(s) { return s.cash >= 20_000; },
        apply(s) {
          s.cash -= 20_000;
          if (Math.random() < 0.6) {
            s.cash += 60_000;
            s.purity = cap(s.purity + 3, 0, 100);
            log("⚔️ Victoire écrasante ! +60 000$ et Pureté +3.", "good");
          } else {
            s.purity = cap(s.purity - 2, 0, 100);
            log("⚔️ Défaite amère. −20 000$ et Pureté −2.", "bad");
          }
        },
      },
      {
        label: "Refuser poliment (Respect −3)",
        apply(s) {
          s.respect -= 3;
          log("⚔️ Vous déclinez le duel. Respect −3.", "bad");
        },
      },
    ],
  },
  {
    id: "generatorBreakdown", emoji: "🔧", weight: 5,
    type: "auto",
    cond(s) { return s.upgrades.includes("generator"); },
    title: "Générateur en panne",
    text: "Le générateur industriel surchauffe et lâche en pleine cuisson.",
    apply(s) {
      s.purity = cap(s.purity - 4, 0, 100);
      s.flags.cookPenalty = 0.8;
      log("🔧 Générateur HS ! Pureté −4, prochaine cuisson ×0.8.", "bad");
    },
  },
  {
    id: "interview", emoji: "🎤", weight: 5,
    type: "choice",
    title: "Le journal local vous cherche",
    text: "Un reporter veut écrire sur « le cuisinier qui a changé la ville ».",
    choices: [
      {
        label: "Accepter l'interview (Respect +10, Chaleur +10)",
        apply(s) {
          s.respect += 10;
          addHeat(10);
          log("🎤 Article à la une ! Respect +10, Chaleur +10.", "bad");
        },
      },
      {
        label: "Rester dans l'ombre (Respect −4)",
        apply(s) {
          s.respect -= 4;
          log("🎤 Vous déclinez. La discrétion a un prix. Respect −4.", "bad");
        },
      },
    ],
  },
  {
    id: "wholesale", loc: "rail", emoji: "🏪", weight: 5,
    type: "auto",
    title: "Vente en gros",
    text: "Un distributeur régional veut un lot immédiatement, cash.",
    apply(s) {
      s.dirty += 60_000;
      addHeat(8);
      log("🏪 Vente en gros : +60 000$ d'argent sale. Chaleur +8.", "bad");
    },
  },
  {
    id: "comboDeal", loc: "corner", emoji: "⚙️", weight: 6,
    type: "choice",
    cond(s) { return s.stock >= 2; },
    title: "Commande combo",
    text: "Un revendeur veut 2 kg tout de suite, mais négocie sec : moitié prix contre fidélité.",
    choices: [
      {
        label: "Vendre 2 kg à moitié prix (Respect +8)",
        apply(s) {
          const lost = Math.min(2, s.stock);
          s.stock = Math.round((s.stock - lost) * 10) / 10;
          const gain = Math.round(pricePerKg() * 2 * 0.5);
          s.dirty += gain;
          s.respect = cap(s.respect + 8, 0, 100);
          log(`⚙️ Combo vendu : +${fmt(gain)}$ sale, Respect +8.`, "good");
        },
      },
      {
        label: "Garder tes prix (Respect −3)",
        apply(s) {
          s.respect = cap(s.respect - 3, 0, 100);
          log("⚙️ Le revendeur repart boudeur. Respect −3.", "bad");
        },
      },
    ],
  },
  {
    id: "galeHelp", loc: "superlab", emoji: "🧪", weight: 5,
    type: "choice",
    cond(s) { return s.day >= 15; },
    title: "Gale Boetticher propose son aide",
    text: "« Vos équipements sont... fonctionnels. J'ai des notes qui pourraient les sublimer. »",
    choices: [
      {
        label: "Acheter ses notes (25 000$, Pureté +6)",
        can(s) { return s.cash >= 25_000; },
        apply(s) {
          s.cash -= 25_000;
          s.purity = cap(s.purity + 6, 0, 100);
          log("🧪 Notes de Gale intégrées : Pureté +6.", "good");
        },
      },
      {
        label: "Décliner poliment",
        apply(s) {
          log("🧪 Gale hoche la tête, déçu. Rien ne change.", "event");
        },
      },
    ],
  },
  {
    id: "thinIce", emoji: "❄️", weight: 6,
    type: "auto",
    cond(s) { return s.heat >= 60; },
    title: "Glace mince",
    text: "Une voiture garée devant chez vous depuis deux jours. Personne n'en descend.",
    apply(s) {
      addHeat(6);
      log("❄️ Surveillance discrète... Chaleur +6. Pense à baisser la pression.", "bad");
    },
  },
  {
    id: "bbqNeighbor", emoji: "🍖", weight: 5,
    type: "choice",
    title: "Barbecue entre voisins",
    text: "Tes voisins t'invitent à leur barbecue. L'occasion de rester discret... ou pas.",
    choices: [
      {
        label: "Y aller avec des bières (3 000$, Respect +4, Chaleur −4)",
        can(s) { return s.cash >= 3_000; },
        apply(s) {
          s.cash -= 3_000;
          s.respect = cap(s.respect + 4, 0, 100);
          addHeat(-4);
          log("🍖 Barbecue réussi : le voisinage vous adore. Respect +4, Chaleur −4.", "good");
        },
      },
      {
        label: "Rester enfermé au labo (Respect −3)",
        apply(s) {
          s.respect = cap(s.respect - 3, 0, 100);
          log("🍖 Les voisins commencent à trouver ça bizarre... Respect −3.", "bad");
        },
      },
    ],
  },
  {
    id: "tortuga", loc: "tuco", emoji: "🐢", weight: 4,
    type: "auto",
    title: "Message de Tortuga",
    text: "Une tortue traverse tranquillement votre terrain... avec quelque chose de troublant sur le dos.",
    apply(s) {
      addHeat(9);
      s.respect = cap(s.respect - 2, 0, 100);
      log("🐢 Le cartel envoie un message. Chaleur +9, Respect −2.", "bad");
    },
  },
  {
    id: "methHeads", loc: "junkyard", emoji: "🧟", weight: 5,
    type: "choice",
    title: "Squatters devant le labo",
    text: "Deux accros se sont installés juste devant l'entrée. Ils attirent l'attention.",
    choices: [
      {
        label: "Les chasser gentiment (Respect −3, Chaleur −4)",
        apply(s) {
          s.respect = cap(s.respect - 3, 0, 100);
          addHeat(-4);
          log("🧟 Squatters déplacés. Moins de visites, mais la rue gronde. Respect −3, Chaleur −4.", "event");
        },
      },
      {
        label: "Les laisser faire (Respect +2, Chaleur +5)",
        apply(s) {
          s.respect = cap(s.respect + 2, 0, 100);
          addHeat(5);
          log("🧟 Ils font office de paravent... et d'aimant à flics. Respect +2, Chaleur +5.", "event");
        },
      },
    ],
  },
  {
    id: "cousins", loc: "villa", emoji: "💀", weight: 4,
    type: "choice",
    cond(s) { return s.day >= 40; },
    title: "Les cousins Salamanca",
    text: "Deux hommes en costume, silencieux, vous attendent. Le cartel envoie ses factures en nature.",
    choices: [
      {
        label: "Payer le tribut (60 000$, Respect +6)",
        can(s) { return s.cash >= 60_000; },
        apply(s) {
          s.cash -= 60_000;
          s.respect = cap(s.respect + 6, 0, 100);
          log("💀 Tribut payé. Les cousins repartent sans un mot. Respect +6.", "bad");
        },
      },
      {
        label: "Tenir tête (risqué)",
        apply(s) {
          if (Math.random() < 0.5) {
            s.respect = cap(s.respect + 15, 0, 100);
            log("💀 Ils reculent. Toute la rue vous respecte désormais. Respect +15.", "good");
          } else {
            const lost = Math.min(2, s.stock);
            s.stock = Math.round((s.stock - lost) * 10) / 10;
            addHeat(10);
            log("💀 Ça tourne mal : stock saisi, Chaleur +10.", "bad");
          }
        },
      },
    ],
  },
  {
    id: "gusContract", emoji: "🐔", weight: 5,
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
    id: "lydiaDemand", loc: "hq", emoji: "📋", weight: 5,
    type: "choice",
    cond(s) { return s.staff.includes("lydia"); },
    title: "Lydia serre la vis",
    text: "« Mes clients exigent de la régularité. Augmentez la cadence, ou je revois nos accords. »",
    choices: [
      {
        label: "Accepter la cadence (Respect +5, Chaleur +6)",
        apply(s) {
          s.respect = cap(s.respect + 5, 0, 100);
          addHeat(6);
          log("📋 Cadence acceptée : Lydia est satisfaite. Respect +5, Chaleur +6.", "event");
        },
      },
      {
        label: "Refuser (Respect −4)",
        apply(s) {
          s.respect = cap(s.respect - 4, 0, 100);
          log("📋 Lydia note votre refus dans son classeur coloré. Respect −4.", "bad");
        },
      },
    ],
  },
]

// Descente de police quand la chaleur atteint 100
const RAID = {
  title: "🚨 DESCENTE !",
  text: "Les gyrophares déchirent la nuit. La DEA encercle votre labo !",
  withSaul(s) {
    s.cash = Math.max(0, s.cash - 100_000);
    s.stock = 0;
    s.heat = 60;
    log("⚖️ Saul négocie ferme : amende colossale, stock saisi. Vous respirez encore.", "bad");
    return { title: "⚖️ Saul à la rescousse", text: "« C'est inadmissible, votre honneur ! » L'amende est salée (100 000$) et le stock saisi, mais vous êtes libre." };
  },
  withoutSaul(s) {
    s.gameOver = true;
    s.gameOverReason = "arrest";
    return null;
  },
};

// ------------------------------------------------------------
// CONTRATS — clients et génération des deals
// ------------------------------------------------------------
const CONTRACT_CLIENTS = [
  { emoji: "🧴", name: "Krazy-8" },
  { emoji: "🕶️", name: "Emilio" },
  { emoji: "🤵", name: "Don Eladio" },
  { emoji: "🐔", name: "Chaînes Los Pollos" },
  { emoji: "💀", name: "Le Cartel" },
  { emoji: "🧢", name: "Le gang de la rue" },
  { emoji: "🎩", name: "Un intermédiaire mystérieux" },
  { emoji: "🧑‍🍳", name: "Un cuisinier rival revendeur" },
];

// Délai (en jours) avant qu'un nouveau contrat apparaisse
const CONTRACT_COOLDOWN_DAYS = 2;

// v48 : clients des contrats express (livraisons chronométrées en temps réel)
const EXPRESS_CLIENTS = [
  { emoji: "🛹", name: "Skinny Pete" },
  { emoji: "🚲", name: "Brandon" },
  { emoji: "🕶️", name: "Emilio" },
  { emoji: "🎲", name: "Krazy-8" },
  { emoji: "🧢", name: "Un dealer de passage" },
];

// ------------------------------------------------------------
// SUCCÈS — check(s) est appelé avec l'état, reward appliqué à l'unlock
// ------------------------------------------------------------
const ACHIEVEMENTS = [
  { id: "firstkg", icon: "🥇", name: "Première fournée", desc: "Cuisiner 1 kg au total", check: (s) => s.stats.cooked >= 1, reward: { cash: 500 } },
  { id: "cook10", icon: "🍳", name: "Cuisinier sérieux", desc: "Cuisiner 10 kg au total", check: (s) => s.stats.cooked >= 10, reward: { cash: 2_000 } },
  { id: "cook100", icon: "⚗️", name: "Chimiste de génie", desc: "Cuisiner 100 kg au total", check: (s) => s.stats.cooked >= 100, reward: { cash: 20_000 } },
  { id: "sell10", icon: "💸", name: "Dealer de quartier", desc: "Vendre 10 kg", check: (s) => s.stats.sold >= 10, reward: { respect: 5 } },
  { id: "sell100", icon: "👑", name: "Baron de la drogue", desc: "Vendre 100 kg", check: (s) => s.stats.sold >= 100, reward: { respect: 10 } },
  { id: "launder", icon: "🧽", name: "Lavage clean", desc: "Blanchir 100 000$ au total", check: (s) => s.stats.laundered >= 100_000, reward: { cash: 5_000 } },
  { id: "team", icon: "👥", name: "Casting parfait", desc: "Recruter les 7 personnages", check: (s) => s.staff.length >= 7, reward: { cash: 50_000 } },
  { id: "empire", icon: "🏭", name: "Empire chimique", desc: "Atteindre le labo niveau 4", check: (s) => s.labLevel >= 3, reward: { respect: 10 } },
  { id: "purity99", icon: "💎", name: "99,1% pur", desc: "Atteindre 99% de pureté", check: () => purityNow() >= 99, reward: { cash: 100_000 } },
  { id: "million", icon: "🤑", name: "Millionnaire", desc: "1 000 000$ d'argent propre", check: (s) => s.cash >= 1_000_000, reward: {} },
  { id: "day50", icon: "📅", name: "Survivant", desc: "Atteindre le jour 50", check: (s) => s.day >= 50, reward: { respect: 5 } },
  { id: "respect80", icon: "🏙️", name: "Légende de la rue", desc: "Atteindre 80 de respect", check: (s) => s.respect >= 80, reward: { cash: 10_000 } },
  { id: "contracts3", icon: "📋", name: "Homme de parole", desc: "Réussir 3 contrats", check: (s) => s.stats.contractsDone >= 3, reward: { cash: 15_000 } },
  { id: "tapper", icon: "👆", name: "Doigt de fer", desc: "Taper 100 fois sur le labo", check: (s) => s.taps >= 100, reward: { cash: 10_000 } },
  { id: "victory", icon: "🏆", name: "SAY MY NAME", desc: "Atteindre l'objectif final", check: (s) => s.victory || s.endless, reward: {} },
];

// ------------------------------------------------------------
// v4 — INVESTISSEMENTS répétables (coût croissant, effet cumulatif)
// ------------------------------------------------------------
const INVESTMENTS = [
  { id: "street", icon: "🛣️", name: "Réseau de rue", desc: "+15% volume de vente / niveau", base: 8_000, growth: 1.7, max: 20 },
  { id: "chemists", icon: "👨‍🔬", name: "Chimistes", desc: "+10% cuisson / niveau", base: 12_000, growth: 1.75, max: 20 },
  { id: "marketing", icon: "📣", name: "Bouche-à-oreille", desc: "+3% prix de vente / niveau", base: 10_000, growth: 1.7, max: 20 },
  { id: "security", icon: "🛡️", name: "Sécurité", desc: "−1 chaleur/jour / niveau", base: 15_000, growth: 1.8, max: 10 },
  { id: "accountants", icon: "🏦", name: "Comptables", desc: "+2% taux de blanchiment / niveau", base: 20_000, growth: 1.8, max: 10 },
];

// ------------------------------------------------------------
// v4 — PRESTIGE (« Nouvelle identité »)
// 1 point de légende par tranche de PRESTIGE_MIN_EARNED gagnée (ventes brutes).
// Chaque point : +PRESTIGE_POINT_BONUS de cuisson et de prix, PERMANENT.
// ------------------------------------------------------------
const PRESTIGE_MIN_EARNED = 5_000_000;
const PRESTIGE_POINT_BONUS = 0.10;

// ------------------------------------------------------------
// v4 — Événements supplémentaires (weight 0 = uniquement déclenché en chaîne)
// ------------------------------------------------------------
EVENTS.push(
  {
    id: "cartelRetaliation", emoji: "🔫", weight: 0,
    type: "auto",
    title: "Représailles du cartel",
    text: "Vous aviez accepté leur marché... ils veulent plus que prévu.",
    apply(s) {
      addHeat(15);
      if (s.stock > 0) {
        const lost = Math.min(s.stock, s.stock * 0.3);
        s.stock = Math.round((s.stock - lost) * 10) / 10;
        log(`🔫 Le cartel se sert ! −${lost.toFixed(1)} kg. Chaleur +15.`, "bad");
      } else {
        log("🔫 Le cartel passe... et repart bredouille. Chaleur +15.", "bad");
      }
    },
  },
  {
    id: "mysteryPackage", emoji: "📦", weight: 4,
    type: "auto",
    title: "Colis anonyme",
    text: "Un paquet sans expéditeur est posé devant votre porte...",
    apply(s) {
      if (Math.random() < 0.5) {
        const gain = Math.min(3, stockCap() - s.stock);
        s.stock = Math.round((s.stock + gain) * 10) / 10;
        log(`📦 Colis mystère : +${gain.toFixed(1)} kg !`, "good");
      } else {
        s.dirty += 20_000;
        log("📦 Colis mystère : +20 000$ d'argent sale !", "good");
      }
    },
  },
  {
    id: "gusInspection", emoji: "🐔", weight: 5,
    type: "auto",
    cond(s) { return s.staff.includes("gus"); },
    title: "Inspection de Gus",
    text: "Gus passe le labo au peigne fin... et il est impressionné.",
    apply(s) {
      s.purity = cap(s.purity + 8, 0, 100);
      addHeat(-10);
      log("🐔 Gus valide la qualité. Pureté +8, Chaleur −10.", "good");
    },
  },
  {
    id: "muleRumor", emoji: "🐴", weight: 5,
    type: "auto",
    title: "Rumeur de mule",
    text: "On murmure que vos produits circulent jusqu'en Arizona.",
    apply(s) {
      s.respect += 5;
      addHeat(8);
      log("🐴 Votre réseau s'étend. Respect +5, Chaleur +8.", "bad");
    },
  },
  {
    id: "overbid", emoji: "📈", weight: 5,
    type: "auto",
    title: "Surenchère sur le marché",
    text: "Deux gros acheteurs se disputent votre marchandise.",
    apply(s) {
      s.market = cap(s.market + 0.2, 0.7, 1.4);
      log("📈 Le marché s'emballe ! Prix au plus haut.", "good");
    },
  },
  {
    id: "jesseLate", emoji: "⏰", weight: 5,
    type: "auto",
    title: "Jesse ne se pointe pas",
    text: "Réveil à midi, excuses douteuses. La cuisson prend du retard.",
    apply(s) {
      s.flags.cookPenalty = 0.9;
      log("⏰ Jesse en retard ! Prochaine cuisson ×0.9.", "bad");
    },
  }
);

// ------------------------------------------------------------
// v4 — Succès supplémentaires
// ------------------------------------------------------------
ACHIEVEMENTS.push(
  { id: "invest10", icon: "🏢", name: "Investisseur", desc: "Niveau 10 sur un investissement", check: (s) => Object.values(s.investments || {}).some((v) => v >= 10), reward: { cash: 50_000 } },
  { id: "prestige1", icon: "🎭", name: "Nouvelle identité", desc: "Changer d'identité une fois", check: (s) => s.prestiges >= 1, reward: {} },
  { id: "streak7", icon: "🔥", name: "Série chaude", desc: "Vendre 7 jours de suite", check: (s) => s.streak >= 7, reward: { cash: 25_000 } },
  { id: "combo25", icon: "🔥", name: "Sous pression", desc: "Atteindre un combo de 25 taps", check: (s) => (s.maxCombo || 0) >= 25, reward: { cash: 15_000 } },
  { id: "combo50", icon: "💥", name: "Doigts d'or", desc: "Atteindre un combo de 50 taps", check: (s) => (s.maxCombo || 0) >= 50, reward: { respect: 8 } }
);

// ------------------------------------------------------------
// v5 — CARTE INTERACTIVE d'Albuquerque
// x/y : position sur la carte (0..1). unlock(state) optionnel.
// interactions : { id, icon, label, apCost, effect(s), dialogue }
// apCost 0 = gratuit ; chaque lieu/interaction = 1 fois par jour.
// ------------------------------------------------------------
const MAP_LOCATIONS = [
  {
    id: "rv", name: "RV dans le désert", emoji: "🚙", x: 0.13, y: 0.3, color: "#d8c79b",
    desc: "Le RV grise, cloquamant sous le soleil. Ça sent le chou-fleur et la dangerosité. Ton labo mobile — ouvre-le depuis ici.",
    interactions: [
      {
        id: "cookwild", icon: "🍳", label: "Cuisson sauvage", apCost: 1,
        effect(s) {
          const space = stockCap() - s.stock;
          const kg = Math.min(lab().cook * cookMult() * 0.5, space);
          if (kg <= 0.05) { log("🍳 Stock plein, cuisson sauvage impossible.", "bad"); return; }
          s.stock = Math.round((s.stock + kg) * 10) / 10;
          s.stats.cooked = Math.round((s.stats.cooked + kg) * 10) / 10;
          addHeat(6);
          spawnPopup(`+${kg.toFixed(1)} kg (sauvage)`, "crystal");
          if (typeof scene !== "undefined" && scene) scene.FX.cook = performance.now();
          log(`🍳 Cuisson sauvage dans le désert : +${kg.toFixed(1)} kg. Chaleur +6.`, "good");
        },
      },
      {
        id: "scavenge", icon: "🔍", label: "Fouiller les alentours", apCost: 0,
        effect(s) {
          const roll = Math.random();
          if (roll < 0.4) {
            const cash = 300 + Math.floor(Math.random() * 700);
            s.cash += cash;
            spawnPopup(`+${fmt(cash)}$`, "money");
            log(`🔍 Trouvé dans le sable : ${fmt(cash)}$.`, "good");
          } else if (roll < 0.7 && s.stock < stockCap()) {
            s.stock = Math.round((s.stock + 0.5) * 10) / 10;
            log("🔍 Un bidon oublié : +0,5 kg.", "good");
          } else {
            log("🔍 Rien que des cailloux et un squelette d'ours.", "info");
          }
        },
      },
      {
        id: "talkJesse", icon: "💬", label: "Parler à Jesse", apCost: 0, dialogue: "jesse",
      },
    ],
  },
  {
    id: "house", name: "Maison des White", emoji: "🏠", x: 0.42, y: 0.36, color: "#d9e2ce",
    desc: "Piscine bleue, garage impeccable, et un dîner qui refroidit.",
    interactions: [
      {
        id: "rest", icon: "🛋️", label: "Se reposer un moment", apCost: 0,
        effect(s) {
          addHeat(-6);
          spawnPopup("Chaleur −6", "info");
          log("🛋️ Après-midi en famille, aucun appel suspect. Chaleur −6.", "good");
        },
      },
      {
        id: "talkSkyler", icon: "💬", label: "Parler à Skyler", apCost: 0, dialogue: "skyler",
      },
    ],
  },
  {
    id: "carwash", name: "Laverie A1A", emoji: "🧽", x: 0.63, y: 0.52, color: "#bcd7e8",
    desc: "A1A Car Wash : la meilleure laverie de la ville... et le pire endroit pour laver de l'argent.",
    interactions: [
      {
        id: "nightshift", icon: "🌅", label: "Shift de nuit (blanchiment +5%)", apCost: 1,
        effect(s) {
          const amount = Math.min(s.dirty, launderVolume());
          if (amount <= 0) { log("🌅 Aucun argent sale à laver.", "bad"); return; }
          const rate = Math.min(0.98, launderRate() + 0.05);
          const clean = Math.round(amount * rate);
          s.dirty -= amount;
          s.cash += clean;
          s.stats.laundered += amount;
          spawnPopup(`+${fmt(clean)}$ propres`, "money");
          if (typeof scene !== "undefined" && scene) scene.FX.launder = performance.now();
          log(`🌅 Shift de nuit : ${fmt(amount)}$ → ${fmt(clean)}$ propres (taux ${Math.round(rate * 100)}%).`, "good");
        },
      },
    ],
  },
  {
    id: "pollos", name: "Los Pollos Hermanos", emoji: "🍗", x: 0.78, y: 0.34, color: "#f2d38c",
    desc: "L'odeur de friture masque parfaitement celle de la méthylamine.",
    interactions: [
      {
        id: "order", icon: "📦", label: "Commander des précurseurs (−30% prix)", apCost: 1,
        effect(s) {
          s.flags.precursorDiscount = 0.7;
          log("📦 Livraison « de poulet » programmée. Précurseurs à −30%.", "good");
        },
      },
      {
        id: "watchGus", icon: "🐔", label: "Observer Gus", apCost: 0,
        effect(s) {
          if (hasStaff("gus")) {
            s.purity = cap(s.purity + 2, 0, 100);
            s.respect = cap(s.respect + 1, 0, 100);
            log("🐔 Gus vous montre un geste de préparation. Pureté +2, Respect +1.", "good");
          } else {
            s.respect = cap(s.respect + 1, 0, 100);
            log("🐔 Le gérant sourit. Tout est sous contrôle. Respect +1.", "good");
          }
        },
      },
      {
        id: "talkGus", icon: "💬", label: "Parler à Gus", apCost: 0, dialogue: "gus",
        cond: (s) => hasStaff("gus"),
      },
    ],
  },
  {
    id: "superlab", name: "Superlab", emoji: "🧪", x: 0.86, y: 0.62, color: "#c9d4dc",
    desc: "Une halle industrielle stérile, tenue par des gens en combinaison blanche.",
    unlock: (s) => s.labLevel >= 2,
    interactions: [
      {
        id: "industrial", icon: "⚗️", label: "Cuisson industrielle (×1,5)", apCost: 1,
        effect(s) {
          const space = stockCap() - s.stock;
          const kg = Math.min(lab().cook * cookMult() * 1.5, space);
          if (kg <= 0.05) { log("⚗️ Stock plein, cuisson industrielle impossible.", "bad"); return; }
          s.stock = Math.round((s.stock + kg) * 10) / 10;
          s.stats.cooked = Math.round((s.stats.cooked + kg) * 10) / 10;
          addHeat(5);
          spawnPopup(`+${kg.toFixed(1)} kg (industrie)`, "crystal");
          if (typeof scene !== "undefined" && scene) scene.FX.cook = performance.now();
          log(`⚗️ Cuisson industrielle : +${kg.toFixed(1)} kg. Chaleur +5.`, "good");
        },
      },
    ],
  },
  {
    id: "saul", name: "Bureau de Saul", emoji: "⚖️", x: 0.3, y: 0.6, color: "#e8cfa0",
    desc: "« Better Call Saul » clignote dans la vitrine. L'homme qui vous sauvera, contre facture.",
    unlock: (s) => hasStaff("saul"),
    interactions: [
      {
        id: "consult", icon: "🗣️", label: "Consultation juridique", apCost: 0,
        effect(s) {
          addHeat(-8);
          spawnPopup("Chaleur −8", "info");
          log("🗣️ Saul fait disparaître des pièces du dossier. Chaleur −8.", "good");
        },
      },
      {
        id: "offshore", icon: "🏝️", label: "Blanchiment offshore (+10% taux)", apCost: 1,
        effect(s) {
          const amount = Math.min(s.dirty, launderVolume() * 2);
          if (amount <= 0) { log("🏝️ Aucun argent sale à expédier.", "bad"); return; }
          const rate = Math.min(0.98, launderRate() + 0.1);
          const clean = Math.round(amount * rate);
          s.dirty -= amount;
          s.cash += clean;
          s.stats.laundered += amount;
          spawnPopup(`+${fmt(clean)}$ propres`, "money");
          log(`🏝️ Offshore (Cayman, naturellement) : ${fmt(amount)}$ → ${fmt(clean)}$.`, "good");
        },
      },
      {
        id: "talkSaul", icon: "💬", label: "Parler à Saul", apCost: 0, dialogue: "saul",
      },
    ],
  },
  {
    id: "tuco", name: "Désert de Tuco", emoji: "🤯", x: 0.08, y: 0.68, color: "#e0b48a",
    desc: "Une cabane isolée, une voiture calcinée, et un homme très imprévisible.",
    unlock: (s) => s.day >= 10,
    interactions: [
      {
        id: "deal", icon: "💰", label: "Deal à haut risque (prix ×1,6)", apCost: 1,
        effect(s) {
          if (s.stock < 1) { log("🤯 Il faut au moins 1 kg pour ce deal.", "bad"); return; }
          s.stock = Math.round((s.stock - 1) * 10) / 10;
          if (Math.random() < 0.25) {
            const lost = Math.min(s.stock, 2);
            s.stock = Math.round((s.stock - lost) * 10) / 10;
            addHeat(10);
            log(`🤯 Tuco a « oublié » son portefeuille... et pris ${lost.toFixed(1)} kg. Chaleur +10.`, "bad");
          } else {
            const revenue = Math.round(pricePerKg() * 1.6);
            s.dirty += revenue;
            s.stats.sold = Math.round((s.stats.sold + 1) * 10) / 10;
            s.stats.totalEarned += revenue;
            s.soldToday = true;
            addHeat(4);
            spawnPopup(`+${fmt(revenue)}$ (sale)`, "money");
            log(`🤯 Tuco paie comptant, prix ×1,6 : +${fmt(revenue)}$. Chaleur +4.`, "good");
          }
        },
      },
      {
        id: "talkTuco", icon: "💬", label: "Parler à Tuco", apCost: 0, dialogue: "tuco",
      },
    ],
  },
  {
    id: "junkyard", name: "Casse de Old Joe", emoji: "🔧", x: 0.52, y: 0.78, color: "#c4b8a8",
    desc: "Des carcasses à perte de vue. Parfait pour faire disparaître un RV.",
    interactions: [
      {
        id: "parts", icon: "🏗️", label: "Pièces pour agrandir le stock (−5 000$, +2 kg max)", apCost: 1,
        effect(s) {
          if ((s.capBonus || 0) >= 30) { log("🏗️ Vos planques sont déjà énormes.", "info"); return; }
          if (s.cash < 5_000) { log("🏗️ Pas assez d'argent propre (5 000$).", "bad"); return; }
          s.cash -= 5_000;
          s.capBonus = (s.capBonus || 0) + 2;
          log(`🏗️ Conteneurs achetés à la casse : stock max +2 kg (${stockCap()} kg total).`, "good");
        },
      },
      {
        id: "scrap", icon: "♻️", label: "Vendre de la ferraille", apCost: 0,
        effect(s) {
          const cash = 200 + Math.floor(Math.random() * 600);
          s.cash += cash;
          spawnPopup(`+${fmt(cash)}$`, "money");
          log(`♻️ Vente de ferraille : +${fmt(cash)}$.`, "good");
        },
      },
      {
        id: "talkMike", icon: "💬", label: "Parler à Mike", apCost: 0, dialogue: "mike",
        cond: (s) => hasStaff("mike"),
      },
    ],
  },
  {
    id: "plaza", name: "Place centrale", emoji: "🏙️", x: 0.55, y: 0.18, color: "#d5d9c8",
    desc: "La ville entière passe par ici. Les rumeurs aussi.",
    interactions: [
      {
        id: "rumors", icon: "👂", label: "Écouter les rumeurs", apCost: 0,
        effect(s) {
          s.market = cap(s.market + 0.05, 0.7, 1.4);
          log(`👂 Les rumeurs font grimper le marché : ${Math.round(s.market * 100)}%.`, "good");
        },
      },
      {
        id: "samples", icon: "🎁", label: "Distribuer des échantillons", apCost: 1,
        effect(s) {
          s.respect = cap(s.respect + 3, 0, 100);
          s.dirty += 10_000;
          addHeat(5);
          spawnPopup("Respect +3", "info");
          log("🎁 Échantillons gratuits dans la rue : Respect +3, +10 000$ sale. Chaleur +5.", "good");
        },
      },
    ],
  },
  {
    id: "dea", name: "Parking DEA", emoji: "🚔", x: 0.24, y: 0.14, color: "#c8ccd8",
    desc: "Le fourmobile orange de Hank est garé là. Mauvaise idée. Excellente idée.",
    unlock: (s) => s.heat >= 50,
    interactions: [
      {
        id: "distract", icon: "🎭", label: "Distraction (risqué)", apCost: 1,
        effect(s) {
          if (Math.random() < 0.5) {
            addHeat(-15);
            spawnPopup("Chaleur −15", "info");
            log("🎭 Un appel anonyme envoie la DEA de l'autre côté de la ville. Chaleur −15.", "good");
          } else {
            addHeat(8);
            log("🎭 Un agent vous a reconnu près du parking. Chaleur +8.", "bad");
          }
        },
      },
    ],
  },
];

// ------------------------------------------------------------
// v5 — DIALOGUES de personnages (tirés au hasard lors d'un « Parler à ... »)
// line.choices : { label, effect(s) }
// ------------------------------------------------------------
const DIALOGUES = {
  jesse: {
    name: "Jesse Pinkman", emoji: "🧢",
    lines: [
      {
        text: "« Ouais science ! T'as vu ça, M. White ? J'ai presque rien cassé aujourd'hui. »",
        choices: [
          { label: "« Fier de toi, Jesse. » (Respect +2)", effect(s) { s.respect = cap(s.respect + 2, 0, 100); } },
          { label: "« Retourne bosser. » (Respect −2)", effect(s) { s.respect = cap(s.respect - 2, 0, 100); } },
        ],
      },
      {
        text: "« Y'a un nouveau dans le quartier... il pose trop de questions. »",
        choices: [
          { label: "« Occupe-toi de lui. » (Respect +4, Chaleur +6)", effect(s) { s.respect = cap(s.respect + 4, 0, 100); addHeat(6); } },
          { label: "« On reste prudents. » (Chaleur −4)", effect(s) { addHeat(-4); } },
        ],
      },
      {
        text: "« Mon ami Combo dit qu'on pourrait vendre dans l'Est... plus loin, plus risqué. »",
        choices: [
          { label: "« On tente. » (+15 000$ sale, Chaleur +6)", effect(s) { s.dirty += 15_000; addHeat(6); } },
          { label: "« Pas encore. » (Respect −1)", effect(s) { s.respect = cap(s.respect - 1, 0, 100); } },
        ],
      },
    ],
  },
  skyler: {
    name: "Skyler White", emoji: "💁‍♀️",
    lines: [
      {
        text: "« Où tu étais toute la nuit, Walter ? »",
        choices: [
          { label: "« Au travail. Rien d'important. » (Chaleur −3)", effect(s) { addHeat(-3); } },
          { label: "« Ne pose pas de questions. » (Respect −3, Chaleur +2)", effect(s) { s.respect = cap(s.respect - 3, 0, 100); addHeat(2); } },
        ],
      },
      {
        text: "« On devrait refaire la cuisine... et payer la fac de Walter Jr. »",
        choices: [
          { label: "« Bientôt, promis. » (Respect +2)", effect(s) { s.respect = cap(s.respect + 2, 0, 100); } },
          { label: "« L'argent n'est pas tout. » (Respect −2)", effect(s) { s.respect = cap(s.respect - 2, 0, 100); } },
        ],
      },
    ],
  },
  saul: {
    name: "Saul Goodman", emoji: "⚖️",
    lines: [
      {
        text: "« Name's McGill. Je suis un avocat... tout à fait légal. »",
        choices: [
          { label: "« J'ai besoin d'un » meilleur « avocat. » (Chaleur −8)", effect(s) { addHeat(-8); } },
          { label: "« On verra plus tard. » (Rien)", effect() {} },
        ],
      },
      {
        text: "« Pour 10 000$, un témoin disparaît de la liste. Compris ? »",
        choices: [
          { label: "Payer (−10 000$, Chaleur −12)", can(s) { return s.cash >= 10_000; }, effect(s) { s.cash -= 10_000; addHeat(-12); } },
          { label: "Refuser (Chaleur +5)", effect(s) { addHeat(5); } },
        ],
      },
    ],
  },
  gus: {
    name: "Gus Fring", emoji: "🐔",
    lines: [
      {
        text: "« Je suis déçu. La qualité fluctue. Un empire exige la constance. »",
        choices: [
          { label: "« Cela ne se reproduira plus. » (Pureté +4)", effect(s) { s.purity = cap(s.purity + 4, 0, 100); } },
          { label: "« Mon produit, mes règles. » (Respect +3, Chaleur +3)", effect(s) { s.respect = cap(s.respect + 3, 0, 100); addHeat(3); } },
        ],
      },
      {
        text: "« Un homme de famille... c'est respectable. Nous dînerons un jour. »",
        choices: [
          { label: "« Avec plaisir. » (Respect +4)", effect(s) { s.respect = cap(s.respect + 4, 0, 100); } },
          { label: "« Je préfère rester discret. » (Chaleur −5)", effect(s) { addHeat(-5); } },
        ],
      },
    ],
  },
  mike: {
    name: "Mike Ehrmantraut", emoji: "🎩",
    lines: [
      {
        text: "« Vous voulez que ça reste propre ? Payez pour du propre. »",
        choices: [
          { label: "« Nommez votre prix. » (−15 000$, Chaleur −10)", can(s) { return s.cash >= 15_000; }, effect(s) { s.cash -= 15_000; addHeat(-10); } },
          { label: "« Je me débrouille. » (Chaleur +4)", effect(s) { addHeat(4); } },
        ],
      },
      {
        text: "« Half measures. Vous connaissez le problème des demi-mesures ? »",
        choices: [
          { label: "« Plus de demi-mesures. » (Respect +5, Chaleur +4)", effect(s) { s.respect = cap(s.respect + 5, 0, 100); addHeat(4); } },
          { label: "« La prudence d'abord. » (Chaleur −5)", effect(s) { addHeat(-5); } },
        ],
      },
    ],
  },
  tuco: {
    name: "Tuco Salamanca", emoji: "🤯",
    lines: [
      {
        text: "« TIGHT TIGHT TIGHT ! Ton produit, c'est de la bombe, tonton ! »",
        choices: [
          { label: "« Merci, ça fait plaisir. » (Respect +3)", effect(s) { s.respect = cap(s.respect + 3, 0, 100); } },
          { label: "« Alors paie le prix fort. » (+8 000$ sale)", effect(s) { s.dirty += 8_000; } },
        ],
      },
      {
        text: "« Des flics rôdent autour de ma cabane. T'as un problème avec ça ?! »",
        choices: [
          { label: "« On déménage. » (Chaleur −6)", effect(s) { addHeat(-6); } },
          { label: "« Calme-toi. » (Respect +2, Chaleur +5)", effect(s) { s.respect = cap(s.respect + 2, 0, 100); addHeat(5); } },
        ],
      },
    ],
  },
};

// ------------------------------------------------------------
// v6 — LIEUX SUPPLÉMENTAIRES (push sur la carte v5)
// ------------------------------------------------------------
MAP_LOCATIONS.push(
  {
    id: "hank", name: "Maison de Hank", emoji: "🌵", x: 0.9, y: 0.12, color: "#d9cfae",
    desc: "Barbecue, bières, et un beau-frère qui se prend pour Schrader Bratwurst.",
    unlock: (s) => s.day >= 5,
    interactions: [
      {
        id: "bbq", icon: "🍖", label: "Barbecue de famille", apCost: 0,
        effect(s) {
          s.respect = cap(s.respect + 2, 0, 100);
          addHeat(-3);
          log("🍖 Burger de Marie, compliments de Hank. Respect +2, Chaleur −3.", "good");
        },
      },
      {
        id: "garage", icon: "🔦", label: "Fouiner dans le garage (risqué)", apCost: 1,
        effect(s) {
          if (Math.random() < 0.5) {
            addHeat(-8);
            spawnPopup("Chaleur −8", "info");
            log("🔦 Tu glisses une note qui envoie Hank sur une fausse piste. Chaleur −8.", "good");
          } else {
            addHeat(6);
            log("🔦 Presque attrapé les mains dans les dossiers. Chaleur +6.", "bad");
          }
        },
      },
      {
        id: "talkHank", icon: "💬", label: "Parler à Hank", apCost: 0, dialogue: "hank",
        cond: (s) => s.respect >= 25,
      },
    ],
  },
  {
    id: "jane", name: "Appartement de Jane", emoji: "🎨", x: 0.72, y: 0.82, color: "#e3c9d8",
    desc: "Tapisseries, vinyles, et une locataire qui pose trop de bonnes questions.",
    unlock: (s) => s.day >= 7,
    interactions: [
      {
        id: "chill", icon: "🛋️", label: "Chiller avec Jesse", apCost: 0,
        effect(s) {
          if (!hasStaff("jesse")) { log("🛋️ Jesse n'est pas dans l'équipe.", "info"); return; }
          addHeat(-4);
          s.respect = cap(s.respect + 1, 0, 100);
          log("🛋️ Jesse repart la tête un peu moins pleine. Chaleur −4, Respect +1.", "good");
        },
      },
      {
        id: "painting", icon: "🖼️", label: "Revendre un tableau", apCost: 1,
        effect(s) {
          const cash = 800 + Math.floor(Math.random() * 900);
          s.dirty += cash;
          spawnPopup(`+${fmt(cash)}$ (sale)`, "money");
          log(`🖼️ Une « pièce de collection » écoulée : +${fmt(cash)}$ sale.`, "good");
        },
      },
      {
        id: "talkJane", icon: "💬", label: "Parler à Jane", apCost: 0, dialogue: "jane",
        cond: (s) => hasStaff("jesse"),
      },
    ],
  },
);

// ------------------------------------------------------------
// v6 — DIALOGUES SUPPLÉMENTAIRES
// ------------------------------------------------------------
Object.assign(DIALOGUES, {
  hank: {
    name: "Hank Schrader", emoji: "🌵",
    lines: [
      {
        text: "« Tu sais ce que c'est, un labo de meth ? Non ? Parce que moi, je commence à bien savoir. »",
        choices: [
          { label: "« Aucune idée, capitaine. » (Chaleur −4)", effect(s) { addHeat(-4); } },
          { label: "« Tu vas le choper, ce cuisinier ? » (Respect +3, Chaleur +3)", effect(s) { s.respect = cap(s.respect + 3, 0, 100); addHeat(3); } },
        ],
      },
      {
        text: "« Entre nous, ce Heisenberg... c'est un génie. Et ça me rend malade. »",
        choices: [
          { label: "« Tu finiras par l'avoir. » (Respect +4)", effect(s) { s.respect = cap(s.respect + 4, 0, 100); } },
          { label: "« Ou peut-être qu'il t'aura, toi. » (Respect −2, Chaleur −6)", effect(s) { s.respect = cap(s.respect - 2, 0, 100); addHeat(-6); } },
        ],
      },
    ],
  },
  jane: {
    name: "Jane Margolis", emoji: "🎨",
    lines: [
      {
        text: "« Ton pote Jesse, c'est mon voisin. Il raconte des trucs... intéressants. »",
        choices: [
          { label: "« Il exagère tout. » (Chaleur −3)", effect(s) { addHeat(-3); } },
          { label: "« Et toi, tu écoutes bien ? » (Respect +2, +5 000$ sale)", effect(s) { s.respect = cap(s.respect + 2, 0, 100); s.dirty += 5_000; } },
        ],
      },
      {
        text: "« Je dessine ce que je vois. Et là, je vois quelqu'un de très occupé. »",
        choices: [
          { label: "« L'art demande des sacrifices. » (Respect +3)", effect(s) { s.respect = cap(s.respect + 3, 0, 100); } },
          { label: "« Tu n'as rien vu. » (Chaleur −5)", effect(s) { addHeat(-5); } },
        ],
      },
    ],
  },
});


// ------------------------------------------------------------
// v7 — MISSIONS QUOTIDIENNES (3 tirées au hasard chaque jour)
// event : cook | sell | launder | contract | map | tap | golden | cooldown
// ------------------------------------------------------------
const DAILY_MISSIONS = [
  { id: "mCook", icon: "🍳", label: "Cuisiner 5 kg", event: "cook", goal: 5,
    desc: "Cuisine (action, carte ou production idle).",
    reward(s) { s.dirty += 15_000; }, rewardText: "+15 000$ sale" },
  { id: "mSell", icon: "💰", label: "Vendre 4 kg", event: "sell", goal: 4,
    desc: "Écoule ta marchandise dans la rue.",
    reward(s) { s.respect = cap(s.respect + 3, 0, 100); }, rewardText: "Respect +3" },
  { id: "mLaunder", icon: "🧽", label: "Blanchir 100 000$", event: "launder", goal: 100_000,
    desc: "Transforme l'argent sale en argent propre.",
    reward(s) { addHeat(-8); }, rewardText: "Chaleur −8" },
  { id: "mContract", icon: "📋", label: "Honorer un contrat", event: "contract", goal: 1,
    desc: "Livre une commande à temps.",
    reward(s) { s.cash += 20_000; }, rewardText: "+20 000$ propres" },
  { id: "mMap", icon: "🗺️", label: "3 interactions en ville", event: "map", goal: 3,
    desc: "Utilise la carte d'Albuquerque.",
    reward(s) { s.ap += 1; }, rewardText: "+1 PA" },
  { id: "mTap", icon: "👆", label: "20 taps sur le labo", event: "tap", goal: 20,
    desc: "Tape la scène pour booster la production.",
    reward(s) { s.cash += Math.max(1_000, Math.round(pricePerKg() * 0.5)); }, rewardText: "Cash bonus" },
  { id: "mGold", icon: "💎", label: "Attraper le cristal doré", event: "golden", goal: 1,
    desc: "Clique sur le cristal doré quand il apparaît.",
    reward(s) { s.purity = cap(s.purity + 3, 0, 100); }, rewardText: "Pureté +3" },
  { id: "mCool", icon: "🕵️", label: "Terminer sous 30 de chaleur", event: "cooldown", goal: 1,
    desc: "Passe une journée tranquille.",
    reward(s) { s.dirty += 10_000; }, rewardText: "+10 000$ sale" },
];

// ------------------------------------------------------------
// v7 — BOUTIQUE DE LÉGENDE (achetée avec les pièces du prestige)
// ------------------------------------------------------------
const LEGEND_UPGRADES = [
  { id: "cook", icon: "⚗️", name: "Cristalliseur amélioré", desc: "+15% de cuisson par niveau, permanent.", max: 3, cost: (lvl) => 1 + lvl },
  { id: "price", icon: "🎩", name: "Réputation Heisenberg", desc: "+15% sur le prix au kilo par niveau, permanent.", max: 3, cost: (lvl) => 1 + lvl },
  { id: "launder", icon: "🏝️", name: "Réseau offshore", desc: "+3% de taux de blanchiment par niveau.", max: 3, cost: (lvl) => 2 + lvl },
  { id: "vault", icon: "📦", name: "Planques supplémentaires", desc: "+5 kg de stock maximum par niveau.", max: 3, cost: (lvl) => 2 + lvl },
  { id: "stamina", icon: "⚡", name: "Endurance légendaire", desc: "+1 point d'action par jour.", max: 2, cost: (lvl) => 4 + lvl },
  { id: "cool", icon: "🕵️", name: "Antécédents effacés", desc: "−6% de chaleur gagnée par niveau.", max: 3, cost: (lvl) => 3 + lvl },
  { id: "biz", icon: "🏬", name: "Franchises secrètes", desc: "+8% de revenus d'affaires par niveau, permanent.", max: 3, cost: (lvl) => 2 + lvl },
  { id: "luck", icon: "🍀", name: "Étoile filante", desc: "+3% de chance de trouver une relique par niveau.", max: 3, cost: (lvl) => 2 + lvl },
];

// ------------------------------------------------------------
// v7 — ÉVÉNEMENTS SUPPLÉMENTAIRES
// ------------------------------------------------------------
EVENTS.push(
  {
    id: "copycat", emoji: "🎭", weight: 6, type: "choice",
    title: "Un rival copie ton bleu",
    text: "Un petit malin vend un produit bleuâtre de mauvaise qualité sous TON nom.",
    choices: [
      {
        label: "Le dénigrer publiquement (Respect +2, Marché −5%)",
        apply(s) {
          s.respect = cap(s.respect + 2, 0, 100);
          s.market = cap(s.market - 0.05, 0.7, 1.4);
          log("🎭 Le vrai bleu écrase l'imitation. Respect +2, Marché −5%.", "info");
        },
      },
      {
        label: "Lui rendre visite (Respect +5, Chaleur +6)",
        apply(s) {
          s.respect = cap(s.respect + 5, 0, 100);
          addHeat(6);
          log("🎭 Le rival a fermé boutique. Respect +5, Chaleur +6.", "good");
        },
      },
    ],
  },
  {
    id: "inspection", emoji: "🧾", weight: 6, type: "choice",
    title: "Contrôle de la laverie",
    text: "Un inspecteur du fisc passe à la laverie. Il trouve les comptes « intéressants ».",
    choices: [
      {
        label: "Payer un « arrangement » (−8 000$)",
        can(s) { return s.cash >= 8_000; },
        apply(s) {
          s.cash -= 8_000;
          addHeat(-4);
          log("🧾 Arrangement à l'amiable : −8 000$, Chaleur −4.", "info");
        },
      },
      {
        label: "Jouer la montre (risqué)",
        apply(s) {
          if (Math.random() < 0.5) {
            log("🧾 L'inspecteur repart, convaincu. Rien ne se passe.", "good");
          } else {
            addHeat(10);
            log("🧾 L'inspecteur a des doutes sérieux. Chaleur +10.", "bad");
          }
        },
      },
    ],
  },
  {
    id: "viral", emoji: "📱", weight: 5, type: "auto",
    title: "Vidéo virale",
    text: "Une vidéo de toi en train de « négocier » tourne sur les réseaux.",
    apply(s) {
      s.respect = cap(s.respect + 5, 0, 100);
      s.market = cap(s.market + 0.05, 0.7, 1.4);
      spawnPopup("Respect +5", "info");
      log("📱 Tu deviens une légende urbaine. Respect +5, Marché +5%.", "good");
    },
  },
  {
    id: "junkieTheft", emoji: "🕵️", weight: 7, type: "auto",
    title: "Vol dans une planque",
    text: "Un junkie a repéré une de tes planques...",
    apply(s) {
      const lost = Math.min(s.stock, 0.5 + Math.random());
      s.stock = Math.round((s.stock - lost) * 10) / 10;
      if (lost > 0) {
        spawnPopup(`−${lost.toFixed(1)} kg`, "spend");
        log(`🕵️ Vol : −${lost.toFixed(1)} kg de stock.`, "bad");
      } else {
        log("🕵️ Planque vide, le voleur repart bredouille.", "info");
      }
    },
  },
  {
    id: "streetRace", emoji: "🏎️", weight: 4, type: "choice",
    title: "Course sauvage",
    text: "Jesse veut prouver que la Toyota est plus rapide qu'elle n'en a l'air.",
    choices: [
      {
        label: "Laisser courir Jesse (Respect +3, Chaleur +5)",
        apply(s) {
          s.respect = cap(s.respect + 3, 0, 100);
          addHeat(5);
          log("🏎️ Victoire retentissante. Respect +3, Chaleur +5.", "good");
        },
      },
      {
        label: "Confisquer les clés (Chaleur −3, Respect −2)",
        apply(s) {
          addHeat(-3);
          s.respect = cap(s.respect - 2, 0, 100);
          log("🏎️ Jesse boude. Chaleur −3, Respect −2.", "info");
        },
      },
    ],
  },
);

// ------------------------------------------------------------
// v7 — NOUVEAUX DIALOGUES + interactions associées
// ------------------------------------------------------------
Object.assign(DIALOGUES, {
  walterjr: {
    name: "Walter White Jr.", emoji: "🧑",
    lines: [
      {
        text: "« Papa, t'es pas obligé de tout me raconter, mais t'as l'air différent ces temps-ci. »",
        choices: [
          { label: "« Je suis juste très occupé au travail. » (Chaleur −3)", effect(s) { addHeat(-3); } },
          { label: "« C'est le traitement. Ça me donne de l'énergie. » (Respect +2)", effect(s) { s.respect = cap(s.respect + 2, 0, 100); } },
        ],
      },
      {
        text: "« Flynn veut un coup main pour un projet... tu crois qu'on peut lever des fonds pour Hank ? »",
        choices: [
          { label: "« Bien sûr, fils. » (+5 000$ de « dons »)", effect(s) { s.dirty += 5_000; } },
          { label: "« Pas maintenant. » (Rien)", effect() {} },
        ],
      },
    ],
  },
  marie: {
    name: "Marie Schrader", emoji: "💜",
    lines: [
      {
        text: "« Walter ! Tu as vu le violet de mes nouvelles nappes ? Ça va avec le salon, non ? »",
        choices: [
          { label: "« Magnifique, Marie. » (Respect +2)", effect(s) { s.respect = cap(s.respect + 2, 0, 100); } },
          { label: "« Très... violet. » (Respect −1, Chaleur −2)", effect(s) { s.respect = cap(s.respect - 1, 0, 100); addHeat(-2); } },
        ],
      },
      {
        text: "« Hank parle tout seul de son Heisenberg. Ça m'inquiète, il ne dort plus. »",
        choices: [
          { label: "« Je vais lui parler. » (Chaleur −5)", effect(s) { addHeat(-5); } },
          { label: "« C'est un grand flic, il gère. » (Respect +3)", effect(s) { s.respect = cap(s.respect + 3, 0, 100); } },
        ],
      },
    ],
  },
});

const __house = MAP_LOCATIONS.find((l) => l.id === "house");
if (__house) __house.interactions.push({ id: "talkJr", icon: "💬", label: "Parler à Walter Jr.", apCost: 0, dialogue: "walterjr" });
const __hankLoc = MAP_LOCATIONS.find((l) => l.id === "hank");
if (__hankLoc) __hankLoc.interactions.push({ id: "talkMarie", icon: "💬", label: "Parler à Marie", apCost: 0, dialogue: "marie" });

// ============================================================
// v10 — EMPIRE : affaires productrices (boucle idle tycoon)
// Chaque affaire = un lieu qui rapporte de l'argent SALE en continu.
// level : niveau d'investissement (revenu linéaire)
// milestones : à 10/25/50/100/200/300/400 niveaux → revenu ×2
// manager : embaucher le personnage = production automatique
//          (sinon le stockage de revenus plafonne, collecte manuelle)
// ============================================================

const BUSINESS_MILESTONES = [10, 25, 50, 100, 200, 300, 400];

// Plafonds de stockage des revenus (en secondes de production)
const POOL_CAP_MANAGED = 7_200;   // 2 h avec manager
const POOL_CAP_RAW = 900;         // 15 min sans manager

const BUSINESSES = [
  {
    id: "carwash", name: "Lave-auto A1A", emoji: "🧽", locId: "carwash",
    desc: "Le tout premier front. Chaque voiture est un alibi.",
    baseCost: 250, costMult: 1.21, baseRev: 90, cycle: 2,
    crew: { jesse: 0.15 }, gear: { carwash: 0.5 },
    unlock: () => true,
    manager: { id: "m_jr", name: "Walter White Jr.", emoji: "🧢", cost: 12_000,
      quote: "« Je m'occupe de la caisse, papa. »" },
  },
  {
    id: "nails", name: "Salon de manucure", emoji: "💅",
    desc: "Vernis, faux ongles, et liasses dans le tiroir du fond.",
    baseCost: 3_500, costMult: 1.24, baseRev: 1_100, cycle: 5,
    crew: { huell: 0.2 },
    unlock: (s) => s.day >= 3,
    manager: { id: "m_francesca", name: "Francesca Liddy", emoji: "💁‍♀️", cost: 60_000,
      quote: "« Je note tout dans le registre. Le VRAI registre. »" },
  },
  {
    id: "street", name: "Réseau de rue", emoji: "🛴",
    desc: "Combo, Badger et les autres. Le produit descend dans la ville.",
    baseCost: 25_000, costMult: 1.25, baseRev: 9_600, cycle: 8,
    crew: { jesse: 0.1, huell: 0.1 }, gear: { van: 0.25, railnetwork: 0.35 },
    unlock: (s) => s.day >= 4,
    manager: { id: "m_badger", name: "Badger", emoji: "🦡", cost: 250_000,
      quote: "« Star Trek, c'est de la métaphysique, mec. »" },
  },
  {
    id: "pollos", name: "Los Pollos Hermanos", emoji: "🍗", locId: "pollos",
    desc: "Friture, sourire professionnel, et camions frigorifiques très bien remplis.",
    baseCost: 120_000, costMult: 1.26, baseRev: 1_500, cycle: 12,
    crew: { gus: 0.25 }, gear: { cameras: 0.2 },
    unlock: (s) => s.day >= 6,
    manager: { id: "m_lyle", name: "Lyle", emoji: "👱", cost: 800_000,
      quote: "« Le client d'abord. Toujours. C'est la politique. »" },
  },
  {
    id: "junkyard", name: "Casse de Old Joe", emoji: "🔧", locId: "junkyard",
    desc: "Pièces détachées le jour, preuves disparues la nuit.",
    baseCost: 500_000, costMult: 1.27, baseRev: 1_000, cycle: 20,
    crew: { todd: 0.2 }, gear: { generator: 0.25 },
    unlock: (s) => s.day >= 8,
    manager: { id: "m_joe", name: "Old Joe", emoji: "👨‍🔧", cost: 2_500_000,
      quote: "« On n'a jamais vu un RV ici. Jamais. »" },
  },
  {
    id: "saulbiz", name: "Cabinet Saul Goodman", emoji: "⚖️", locId: "saul",
    desc: "Des avocats, des caisses d'« associations caritatives », des factures imaginaires.",
    baseCost: 1_500_000, costMult: 1.27, baseRev: 1_300, cycle: 30,
    crew: { saul: 0.3 }, gear: { cameras: 0.15 },
    unlock: (s) => s.staff.includes("saul"),
    manager: { id: "m_huell", name: "Huell Babineaux", emoji: "💼", cost: 8_000_000,
      quote: "« Rien à déclarer. Rien du tout. »" },
  },
  {
    id: "laundry", name: "Laverie industrielle", emoji: "🏭", locId: "superlab",
    desc: "Le couvre-feu de Gus : de l'argent propre, à la chaîne.",
    baseCost: 6_000_000, costMult: 1.28, baseRev: 2_200, cycle: 45,
    crew: { todd: 0.15, mike: 0.2 }, gear: { methylamine: 0.3, generator: 0.2 },
    unlock: (s) => s.labLevel >= 2,
    manager: { id: "m_todd", name: "Todd Alquist", emoji: "😐", cost: 30_000_000,
      quote: "« Aucun problème, M. White. Aucun problème du tout. »" },
  },
  {
    id: "villa", name: "Hacienda d'Éladio", emoji: "🐄",
    desc: "Piscine, poulet rôti, et un cartel qui investit dans la légalité.",
    baseCost: 25_000_000, costMult: 1.29, baseRev: 4_200, cycle: 60,
    crew: { mike: 0.15 }, gear: { cameras: 0.15 },
    unlock: (s) => s.day >= 20,
    manager: { id: "m_bolsa", name: "Juan Bolsa", emoji: "🕴️", cost: 120_000_000,
      quote: "« La diplomatie, c'est aussi du business. »" },
  },
  {
    id: "rail", name: "Export Tchéquie", emoji: "🚂",
    desc: "Le train de Lydia : wagons scellés, douanes complices, Europe entière.",
    baseCost: 120_000_000, costMult: 1.30, baseRev: 9_000, cycle: 90,
    crew: { lydia: 0.3 }, gear: { railnetwork: 0.5 },
    unlock: (s) => s.staff.includes("lydia"),
    manager: { id: "m_lydia", name: "Lydia Rodarte-Quayle", emoji: "📋", cost: 600_000_000,
      quote: "« Ce n'est pas de la contrebande. C'est de la logistique. »" },
  },
  {
    id: "cartelbiz", name: "Cartel international", emoji: "🌎",
    desc: "Le sommet de la pyramide. Ton bleu sur trois continents.",
    baseCost: 800_000_000, costMult: 1.31, baseRev: 27_000, cycle: 120,
    crew: { gus: 0.2, lydia: 0.15 }, gear: { railnetwork: 0.4 },
    unlock: (s) => s.day >= 40,
    manager: { id: "m_gus", name: "Gus Fring", emoji: "🐔", cost: 4_000_000_000,
      quote: "« Je suis dans l'empire du bien-être. »" },
  },
];

// Mission supplémentaire liée à l'empire
DAILY_MISSIONS.push({
  id: "mCollect", icon: "💼", label: "Collecter 8 fois les revenus",
  event: "collect", goal: 8,
  desc: "Collecte l'argent de tes affaires (onglet Empire ou carte).",
  reward(s) { s.respect = cap(s.respect + 3, 0, 100); }, rewardText: "Respect +3",
});

// Succès supplémentaires liés à l'empire
ACHIEVEMENTS.push(
  { id: "biz5", icon: "🏬", name: "Franchisé", desc: "Posséder 5 affaires", check: (s) => Object.values(s.businesses || {}).filter((b) => b.level > 0).length >= 5, reward: { cash: 100_000 } },
  { id: "manager4", icon: "👔", name: "Ressources humaines", desc: "Embaucher 4 managers", check: (s) => Object.values(s.businesses || {}).filter((b) => b.manager).length >= 4, reward: { cash: 250_000 } },
  { id: "bizLevels100", icon: "🏙️", name: "Empire de façade", desc: "100 niveaux d'affaires cumulés", check: (s) => Object.values(s.businesses || {}).reduce((t, b) => t + b.level, 0) >= 100, reward: { respect: 8 } },
  { id: "bizLevels400", icon: "👑", name: "Magnat d'Albuquerque", desc: "400 niveaux d'affaires cumulés", check: (s) => Object.values(s.businesses || {}).reduce((t, b) => t + b.level, 0) >= 400, reward: { cash: 5_000_000 } },
);

// ============================================================
// v11 — LA CARTE COMME ÉCRAN PRINCIPAL + SCÈNES PAR LIEU
// Chaque affaire (BUSINESSES) est visible sur la carte.
// SCENES[locId] décrit la mise en scène dessinée en plein écran :
//   kind : décor principal (dessiné par js/locscene.js)
//   chars: personnages présents dans la scène
//   night: scène de nuit
// ============================================================

// Toutes les affaires ont un lieu sur la carte
(function () {
  const byId = {};
  MAP_LOCATIONS.forEach((l) => { byId[l.id] = l; });
  const links = [
    ["carwash", "carwash"], ["pollos", "pollos"], ["junkyard", "junkyard"],
    ["saulbiz", "saul"], ["laundry", "superlab"],
  ];
  for (const [bizId, locId] of links) {
    const b = BUSINESSES.find((x) => x.id === bizId);
    if (b) b.locId = locId;
  }
})();

// Nouveaux lieux-producteurs sur la carte (affaires sans emplacement)
MAP_LOCATIONS.push(
  {
    id: "nails", name: "Salon de manucure", emoji: "💅", x: 0.38, y: 0.84, color: "#e8c9d8",
    desc: "Vernis, faux ongles, et liasses dans le tiroir du fond.",
    unlock: (s) => s.day >= 3,
    interactions: [
      {
        id: "spa", icon: "🫧", label: "Séance détente (Chaleur −4)", apCost: 0,
        effect(s) { addHeat(-4); spawnPopup("Chaleur −4", "info"); log("🫧 Une manucure, un magazine, zéro soupçon. Chaleur −4.", "good"); },
      },
    ],
  },
  {
    id: "corner", name: "Coin de rue", emoji: "🛴", x: 0.2, y: 0.48, color: "#c9b89a",
    desc: "Combo, Badger et les autres. Le produit descend dans la ville.",
    unlock: (s) => s.day >= 4,
    interactions: [
      {
        id: "hustle", icon: "🚀", label: "Coups de fil (Respect +2)", apCost: 0,
        effect(s) { s.respect = cap(s.respect + 2, 0, 100); spawnPopup("Respect +2", "info"); log("🚀 Le réseau s'organise, la rue parle de toi. Respect +2.", "good"); },
      },
    ],
  },
  {
    id: "villa", name: "Hacienda d'Éladio", emoji: "🐄", x: 0.93, y: 0.8, color: "#e0c48a",
    desc: "Piscine, poulet rôti, et un cartel qui investit dans la légalité.",
    unlock: (s) => s.day >= 20,
    interactions: [
      {
        id: "toast", icon: "🥂", label: "Trinquer avec Don Eladio (Respect +3)", apCost: 0,
        effect(s) {
          s.respect = cap(s.respect + 3, 0, 100);
          addHeat(2);
          spawnPopup("Respect +3", "info");
          log("🥂 Eladio rit de tes blagues. Attention au verre de Zafiro Añejo. Respect +3, Chaleur +2.", "good");
        },
      },
    ],
  },
  {
    id: "rail", name: "Gare de fret", emoji: "🚂", x: 0.68, y: 0.08, color: "#b8c4cc",
    desc: "Le train de Lydia : wagons scellés, douanes complices, Europe entière.",
    unlock: (s) => s.staff.includes("lydia"),
    interactions: [
      {
        id: "manifest", icon: "📋", label: "Vérifier les manifests (Chaleur −3)", apCost: 0,
        effect(s) { addHeat(-3); spawnPopup("Chaleur −3", "info"); log("📋 Les papiers sont impeccables. Madrigal remercie. Chaleur −3.", "good"); },
      },
    ],
  },
  {
    id: "hq", name: "QG du Cartel", emoji: "🌎", x: 0.06, y: 0.12, color: "#8a94a8",
    desc: "Le sommet de la pyramide. Ton bleu sur trois continents.",
    unlock: (s) => s.day >= 40,
    interactions: [
      {
        id: "council", icon: "🗺️", label: "Conseil des barons (Respect +4, Chaleur +3)", apCost: 0,
        effect(s) {
          s.respect = cap(s.respect + 4, 0, 100);
          addHeat(3);
          spawnPopup("Respect +4", "info");
          log("🗺️ Autour de la table, on ne plaisante pas. Ton nom est respecté. Respect +4, Chaleur +3.", "good");
        },
      },
    ],
  },
);

// Rattacher les affaires aux nouveaux lieux
(function () {
  const links = [
    ["nails", "nails"], ["street", "corner"], ["villa", "villa"], ["rail", "rail"], ["cartelbiz", "hq"],
  ];
  for (const [bizId, locId] of links) {
    const b = BUSINESSES.find((x) => x.id === bizId);
    if (b) b.locId = locId;
  }
})();

// ------------------------------------------------------------
// Descriptions de scènes (dessinées en plein écran par js/locscene.js)
// kind : décor. chars : personnages. night : ambiance nocturne.
// ------------------------------------------------------------
const SCENES = {
  rv:         { kind: "desert",    chars: ["heisenberg", "jesse"] },
  house:      { kind: "suburb",    chars: ["skyler"] },
  carwash:    { kind: "carwash",   chars: ["walter"] },
  pollos:     { kind: "restaurant", chars: ["gus"] },
  superlab:   { kind: "industrial", chars: ["hazmat", "hazmat2"], night: true },
  saul:       { kind: "office",    chars: ["saul"] },
  tuco:       { kind: "desert2",   chars: ["tuco"], night: true },
  junkyard:   { kind: "junkyard",  chars: ["mike"] },
  plaza:      { kind: "plaza",     chars: [] },
  dea:        { kind: "police",    chars: ["hank"] },
  hank:       { kind: "backyard",  chars: ["hank", "marie"] },
  jane:       { kind: "apartment", chars: ["jane"], night: true },
  nails:      { kind: "salon",     chars: [] },
  corner:     { kind: "street",    chars: ["badger", "combo"] },
  villa:      { kind: "ranch",     chars: ["eladio"], night: true },
  rail:       { kind: "station",   chars: ["lydia"] },
  hq:         { kind: "tower",     chars: [], night: true },
};

// Apparences des personnages (dessin vectoriel simple)
const CHAR_LOOKS = {
  // v31 : skin, mustache, badge, necklace, apron, jacket, lapel — persos plus développés
  walter:     { shirt: "#4e7a2a", pants: "#8a7a5a", hair: "#2a2a2a", glasses: true, bald: true, mustache: "#4a3a2a", apron: "#8a9a4a", skin: "#e8b58a" },
  heisenberg: { shirt: "#3a5a20", pants: "#6a5a3a", hat: "#1a1a1a", glasses: true, beard: "#4a3a2a", bald: true, jacket: "#2e2e26", skin: "#e8b58a" },
  jesse:      { shirt: "#e8c93a", pants: "#3a3a44", hair: "#5a4a2a", beanie: "#2a2a2a", jacket: "#6a3a3a", skin: "#e8b58a" },
  skyler:     { shirt: "#7aa8c8", pants: "#4a5a6a", hair: "#c8a850", hairLong: true, necklace: true, skin: "#eec09a" },
  gus:        { shirt: "#e8c84a", pants: "#3a3a3a", tie: "#7a2a2a", hair: "#2a2a2a", glasses: true, mustache: "#2a2a2a", skin: "#a87848" },
  saul:       { shirt: "#e84848", pants: "#e8c84a", tie: "#2a4a8a", hair: "#4a3a2a", loud: true, lapel: true, skin: "#e8b58a" },
  mike:       { shirt: "#8a8a92", pants: "#4a4a52", flatCap: "#3a3a3a", hair: "#c8c8c8", beard: "#9a9a94", jacket: "#5a5a62", skin: "#dfb08e" },
  tuco:       { shirt: "#4a4a52", pants: "#2a2a2a", hat: "#2a2a2a", hair: "#2a2a2a", gold: true, mustache: "#2a2a2a", skin: "#b8845a" },
  hank:       { shirt: "#e8883a", pants: "#5a6a4a", cap: "#3a5a2a", hair: "#3a2a1a", mustache: "#3a2a1a", badge: true, skin: "#e8b58a" },
  marie:      { shirt: "#8a4a9a", pants: "#5a3a6a", hair: "#5a3a2a", hairLong: true, necklace: true, skin: "#eec09a" },
  jane:       { shirt: "#2a2a2a", pants: "#3a3a44", hair: "#1a1a1a", hairLong: true, necklace: true, jacket: "#3a2a3a", skin: "#eec09a" },
  badger:     { shirt: "#7a8a4a", pants: "#4a4a52", hair: "#3a2a1a", beard: "#3a2a1a", cap: "#4a4a3a", skin: "#e8b58a" },
  combo:      { shirt: "#c85a3a", pants: "#3a3a44", hair: "#2a2a2a", cap: "#2a2a2a", gold: true, skin: "#a87848" },
  todd:       { shirt: "#d8d8d0", pants: "#6a5a4a", hair: "#c8a850", apron: "#5a6a7a", skin: "#eec09a" },
  lydia:      { shirt: "#4a7a9a", pants: "#3a4a5a", hair: "#e8c84a", hairLong: true, necklace: true, skin: "#f0ccaa" },
  eladio:     { shirt: "#e8e8e0", pants: "#2a2a2a", hair: "#2a2a2a", gold: true, mustache: "#2a2a2a", skin: "#b8845a" },
  hazmat:     { shirt: "#f0f0e8", pants: "#f0f0e8", hazmat: true },
  hazmat2:    { shirt: "#f0f0e8", pants: "#f0f0e8", hazmat: true, beard: "#5a4a2a" },
};

// v21 : noms affichés dans les bulles de dialogue
const CHAR_NAMES = {
  saulPitch: "Saul", empireLab: "Cuisinier", empireDealer: "Recruteur",
  empireFinale: "Mike", carwashFleet: "Gérant", rvBreakdown: "Mécano",
  streetPreacher: "Prêcheur",
  cargoHijack: "Chauffeur", deaSting: "Hank", methylamineDeal: "Lydia",
  turfThreat: "Dealer", turfMeet: "Tuco",
  labInspector: "Inspecteur", copperScore: "Combo", nailsTip: "Cliente",
  plazaConcert: "Roadie", villaParty: "Don Eladio", railStrike: "Aiguilleur",
  snowstorm: "Voisin", heatwave: "Passant", harvest: "Contremaître",
  walter: "Walter White", heisenberg: "Heisenberg", jesse: "Jesse", skyler: "Skyler",
  gus: "Gus Fring", saul: "Saul", mike: "Mike", tuco: "Tuco", hank: "Hank",
  marie: "Marie", jane: "Jane", badger: "Badger", combo: "Combo", todd: "Todd",
  lydia: "Lydia", eladio: "Don Eladio", hazmat: "Cuisinier", hazmat2: "Apprenti",
};

// ============================================================
// v12 — ÉVÉNEMENTS SUPPLÉMENTAIRES, OPPORTUNITÉS DE CARTE,
//       CITATIONS DES PERSONNAGES
// ============================================================

EVENTS.push(
  {
    id: "streetrace", loc: "corner", emoji: "🏎️", weight: 5, type: "choice", cond: (s) => s.day >= 3,
    title: "Course sauvage dans ta rue",
    text: "Des caisses tunées déchirent le bitume devant le lave-auto. Les voisins filment.",
    choices: [
      {
        label: "Parier sur le mulet noir (5 000$)",
        can: (s) => s.cash >= 5_000,
        apply(s) {
          s.cash -= 5_000;
          if (Math.random() < 0.5) {
            s.dirty += 15_000;
            log("🏎️ Le mulet noir gagne ! +15 000$ d'argent sale.", "good");
          } else {
            log("🏎️ Le mulet finit dernier. Pari perdu.", "bad");
          }
        },
      },
      {
        label: "Appeler anonymement la police (Respect −2, Chaleur +3)",
        apply(s) {
          s.respect = cap(s.respect - 2, 0, 100);
          addHeat(3);
          log("🏎️ Les sirènes dispersent la course. La rue boude. Respect −2, Chaleur +3.", "info");
        },
      },
    ],
  },
  {
    id: "junkie", loc: "tuco", emoji: "🧟", weight: 6, type: "auto",
    title: "Un junkie dans le labo",
    text: "Tu surprends une silhouette qui fouille les étagères de la laverie.",
    apply(s) {
      if (s.stock > 0 && Math.random() < 0.5) {
        const lost = Math.min(s.stock, 0.5);
        s.stock = Math.round((s.stock - lost) * 10) / 10;
        log(`🧟 Tu l'attrapes au col ! Il lâche ${lost.toFixed(1)} kg.`, "bad");
      } else {
        log("🧟 Il s'enfuit les mains vides. Rien de perdu... cette fois.", "info");
      }
    },
  },
  {
    id: "cousin", emoji: "🤝", weight: 5, type: "choice", cond: (s) => s.day >= 6,
    title: "Un cousin veut entrer dans le business",
    text: "« J'suis pas bavard, promis ! » dit ton cousin en postant un selfie au labo.",
    choices: [
      {
        label: "L'embaucher (Respect +3, Chaleur +3)",
        apply(s) {
          s.respect = cap(s.respect + 3, 0, 100);
          addHeat(3);
          scheduleEvent("cousinBetrayal", 2 + Math.floor(Math.random() * 3));
          log("🤝 Le cousin est dans la team. On vous recontactera... Respect +3, Chaleur +3.", "info");
        },
      },
      {
        label: "Refuser sèchement (Respect −2)",
        apply(s) {
          s.respect = cap(s.respect - 2, 0, 100);
          log("🤝 Le cousin boude. La famille fera des commérages. Respect −2.", "info");
        },
      },
    ],
  },
  {
    id: "cousinBetrayal", emoji: "🗣️", weight: 0, type: "auto",
    title: "Le cousin a trop parlé",
    text: "Un selfie au labo, une story, un hashtag... La rumeur enfle.",
    apply(s) {
      addHeat(10);
      log("🗣️ Le cousin a raconté « l'histoire de sa vie » dans un bar. Chaleur +10.", "bad");
    },
  },
  {
    id: "chickenrun", emoji: "🍗", weight: 5, type: "auto", cond: (s) => s.day >= 8,
    title: "Camion de poulet suspect",
    text: "Los Pollos Hermanos « livre » un chargement à heure fixe. Couverture parfaite.",
    apply(s) {
      addHeat(-6);
      s.dirty += 5_000;
      log("🍗 Le camion de Gus passe à travers les contrôles. Chaleur −6, +5 000$ sale.", "good");
    },
  },
  {
    id: "blackout", emoji: "🔌", weight: 4, type: "auto",
    title: "Coupure de courant",
    text: "Albuquerque plonge dans le noir. Les cuves refroidissent...",
    apply(s) {
      s.flags.cookPenalty = 0.7;
      log("🔌 Production ralentie aujourd'hui (−30%). Le générateur ronronne.", "bad");
    },
  },
  {
    id: "wire", emoji: "🎙️", weight: 6, type: "choice", cond: (s) => s.day >= 12,
    title: "Une balance dans l'entourage",
    text: "Mike a repéré un micro mal dissimulé. Quelqu'un parle aux feds.",
    choices: [
      {
        label: "Mike « règle » le problème (10 000$)",
        can: (s) => s.cash >= 10_000,
        apply(s) {
          s.cash -= 10_000;
          addHeat(-10);
          log("🎙️ Problème réglé. Personne ne posera de questions. Chaleur −10.", "good");
        },
      },
      {
        label: "Tout déplacer d'urgence (−20% de stock)",
        apply(s) {
          const lost = Math.round(s.stock * 0.2 * 10) / 10;
          s.stock = Math.round((s.stock - lost) * 10) / 10;
          log(`🎙️ Déménagement éclair ! ${lost.toFixed(1)} kg abandonnés dans la course.`, "bad");
        },
      },
    ],
  },
  {
    id: "windfall", emoji: "🎰", weight: 3, type: "auto",
    title: "Une vieille planque retrouvée",
    text: "Un sac sous une dalle, derrière une ancienne planque que tout le monde avait oubliée.",
    apply(s) {
      const gain = 5_000 + s.day * 2_000;
      s.dirty += gain;
      log(`🎰 Planque oubliée : +${fmt(gain)}$ d'argent sale !`, "good");
    },
  },
  {
    id: "rivalbuy", emoji: "💼", weight: 4, type: "choice", cond: (s) => s.day >= 10,
    title: "Un concurrent rachète le secteur",
    text: "Un réseau bien habillé propose de payer ton territoire... en billets neufs.",
    choices: [
      {
        label: "Vendre le secteur (+60 000$ sale, Respect −4)",
        apply(s) {
          s.dirty += 60_000;
          s.respect = cap(s.respect - 4, 0, 100);
          log("💼 Tu signes. La rue murmure. +60 000$ sale, Respect −4.", "info");
        },
      },
      {
        label: "Rester le roi de la rue (Respect +3)",
        apply(s) {
          s.respect = cap(s.respect + 3, 0, 100);
          log("💼 Tu restes. La rue respecte les têtus. Respect +3.", "good");
        },
      },
    ],
  },
  {
    id: "health", emoji: "🩺", weight: 4, type: "choice", cond: (s) => s.day >= 15,
    title: "Cette toux qui revient",
    text: "Une toux sèche, profonde, qui ne part pas. Le miroir ne ment pas.",
    choices: [
      {
        label: "Consulter en cachette (15 000$)",
        can: (s) => s.cash >= 15_000,
        apply(s) {
          s.cash -= 15_000;
          addHeat(-2);
          log("🩺 Diagnostic sous faux nom. Prends soin de toi. Chaleur −2.", "info");
        },
      },
      {
        label: "Ignorer et travailler",
        apply(s) {
          s.respect = cap(s.respect + 1, 0, 100);
          log("🩺 Tu tousse pendant la cuisson. « C'est rien. » Respect +1 (pour le cran).", "info");
        },
      },
    ],
  },
  {
    id: "jessesales", emoji: "🛴", weight: 6, type: "auto", cond: (s) => (s.businesses && (s.businesses.street?.level || 0) > 0),
    title: "L'équipe de rue cartonne",
    text: "Badger et Combo enchaînent les ventes au coin de la rue.",
    apply(s) {
      const gain = 2_000 + 500 * (s.businesses.street?.level || 1);
      s.dirty += gain;
      log(`🛴 Bonne journée pour l'équipe de rue : +${fmt(gain)}$ sale.`, "good");
    },
  },
  {
    id: "mikeprotection", emoji: "🛡️", weight: 5, type: "choice", cond: (s) => s.day >= 14,
    title: "Mike propose ses services",
    text: "« Deux mille. Pas de cadavres, pas de questions. »",
    choices: [
      {
        label: "Payer la protection (10 000$, Chaleur −8)",
        can: (s) => s.cash >= 10_000,
        apply(s) {
          s.cash -= 10_000;
          addHeat(-8);
          log("🛡️ Mike surveille tout. On dort mieux. Chaleur −8.", "good");
        },
      },
      {
        label: "Se débrouiller seul (Chaleur +4)",
        apply(s) {
          addHeat(4);
          log("🛡️ Tu refuses l'aide de Mike. La nuit sera longue. Chaleur +4.", "info");
        },
      },
    ],
  },
);

// ------------------------------------------------------------
// OPPORTUNITÉS éphémères sur la carte (v12)
// Apparaissent chaque matin, disparaissent le soir.
// Le joueur doit les toucher avant la fin de la journée.
// ------------------------------------------------------------
const OPPORTUNITIES = [
  {
    id: "stash", icon: "💰", label: "Planque oubliée",
    apply(s) { const g = 2_000 + s.day * 1_500; s.dirty += g; spawnPopup(`+${fmt(g)}$ sale`, "money"); log(`💰 Planque oubliée : +${fmt(g)}$ d'argent sale.`, "good"); },
  },
  {
    id: "tip", icon: "🕵️", label: "Bon tuyau",
    apply(s) { addHeat(-5); spawnPopup("Chaleur −5", "info"); log("🕵️ Un tuyau de dernière minute fait retomber la pression. Chaleur −5.", "good"); },
  },
  {
    id: "respect", icon: "🗣️", label: "Bouche à oreille",
    apply(s) { s.respect = cap(s.respect + 2, 0, 100); spawnPopup("Respect +2", "info"); log("🗣️ La rue parle de toi en bien. Respect +2.", "good"); },
  },
  {
    id: "supplier", icon: "📦", label: "Fournisseur de passage",
    apply(s) {
      const g = Math.min(2, Math.max(0, stockCap() - s.stock));
      if (g > 0) { s.stock = Math.round((s.stock + g) * 10) / 10; spawnPopup(`+${g} kg`, "money"); log(`📦 Un fournisseur de passage écoule ${g} kg.`, "good"); }
      else { s.dirty += 5_000; spawnPopup("+5 000$ sale", "money"); log("📦 Stock plein : le fournisseur paie pour rien. +5 000$ sale.", "good"); }
    },
  },
  {
    id: "trap", icon: "🚓", label: "Trop beau pour être vrai ?",
    apply(s) {
      if (Math.random() < 0.4) { addHeat(8); spawnPopup("Chaleur +8", "bad"); log("🚓 C'était une voiture de police ! Demi-tour rapide. Chaleur +8.", "bad"); }
      else { const g = 3_000 + s.day * 1_000; s.dirty += g; spawnPopup(`+${fmt(g)}$ sale`, "money"); log(`🚓 Juste un acheteur pressé : +${fmt(g)}$ sale.`, "good"); }
    },
  },
  {
    id: "scanner", icon: "📻", label: "Scanner de la police",
    apply(s) { addHeat(-8); spawnPopup("Chaleur −8", "info"); log("📻 Le scanner révèle un contrôle près de votre zone. Vous soufflez. Chaleur −8.", "good"); },
  },
  {
    id: "fastcash", icon: "💸", label: "Client pressé",
    apply(s) { const g = 1_500 + s.day * 900; s.dirty += g; spawnPopup(`+${fmt(g)}$ sale`, "money"); log(`💸 Un client paie comptant sans négocier : +${fmt(g)}$ sale.`, "good"); },
  },
];

// ------------------------------------------------------------
// v28 — ÉVÉNEMENTS SUPPLÉMENTAIRES (thématiques)
// ------------------------------------------------------------
EVENTS.push(
  {
    id: "rats", loc: "superlab", emoji: "🐀", weight: 5, type: "choice",
    title: "Des rongeurs dans la laverie",
    text: "Une colonie de rats s'est installée derrière les machines. Elles rongent les sacs sous vide.",
    choices: [
      {
        label: "Exterminateur professionnel (−15 000$)",
        can: (s) => s.cash >= 15_000,
        apply(s) {
          s.cash -= 15_000;
          s.purity = cap(s.purity + 3, 0, 100);
          log("🐀 Laverie dératisée. Pureté +3 — plus une griffe sur les sacs.", "good");
        },
      },
      {
        label: "Poser des pièges toi-même (risqué)",
        apply(s) {
          if (Math.random() < 0.5) {
            log("🐀 Tes pièges font l'affaire. Rien de perdu.", "good");
          } else {
            s.purity = cap(s.purity - 2, 0, 100);
            log("🐀 Un sac a morflé. Pureté −2.", "bad");
          }
        },
      },
    ],
  },
  {
    id: "hankBBQ", loc: "house", emoji: "🍖", weight: 5, type: "choice", cond: (s) => s.day >= 4,
    title: "Barbecue chez Hank",
    text: "Hank t'invite à son barbecue de l'agence. Marie a refait sa fameuse salade de raisins... à la tequila.",
    choices: [
      {
        label: "Y aller, bras ouverts (Respect +4)",
        apply(s) {
          s.respect = cap(s.respect + 4, 0, 100);
          if (Math.random() < 0.4) {
            addHeat(5);
            log("🍖 Hank a trop parlé boulot. Respect +4... mais Chaleur +5.", "info");
          } else {
            log("🍖 Bons steaks, bons ragots. Respect +4.", "good");
          }
        },
      },
      {
        label: "Décliner (Respect −1, Chaleur −2)",
        apply(s) {
          s.respect = cap(s.respect - 1, 0, 100);
          addHeat(-2);
          log("🍖 Tu as « un rendez-vous ». La DEA baisse la garde. Respect −1, Chaleur −2.", "info");
        },
      },
    ],
  },
  {
    id: "turfwar", loc: "corner", emoji: "🥊", weight: 5, type: "choice", cond: (s) => s.day >= 5,
    title: "Guerre de trottoir",
    text: "Une bande rivale vend devant TON coin de rue. Leurs tarifs cassent les tiens.",
    choices: [
      {
        label: "Payer le tribut (−8 000$)",
        can: (s) => s.cash >= 8_000,
        apply(s) {
          s.cash -= 8_000;
          log("🥊 Tribut payé. La bande va vendre ailleurs. La paix a un prix.", "info");
        },
      },
      {
        label: "Envoyer tes hommes (Respect +5, risque)",
        apply(s) {
          if (Math.random() < 0.6) {
            s.respect = cap(s.respect + 5, 0, 100);
            log("🥊 La bande a plié bagage. Le quartier sait qui est le patron. Respect +5.", "good");
          } else {
            addHeat(9);
            log("🥊 La dispute a attiré une patrouille. Chaleur +9.", "bad");
          }
        },
      },
    ],
  },
  {
    id: "billboard", loc: "saul", emoji: "📺", weight: 4, type: "choice", cond: (s) => s.day >= 6,
    title: "Saul veut t'afficher en 4x3",
    text: "« Un panneau publicitaire, c'est de la légitimité, amigo. » Saul a déjà le visuel : toi, en costume.",
    choices: [
      {
        label: "Payer la campagne (−25 000$, Marché +20%)",
        can: (s) => s.cash >= 25_000,
        apply(s) {
          s.cash -= 25_000;
          s.market = cap(s.market + 0.2, 0.7, 1.6);
          log("📺 Ta tête sur le 4x3. La demande grimpe. Marché +20%.", "good");
        },
      },
      {
        label: "Rester discret (Respect −1)",
        apply(s) {
          s.respect = cap(s.respect - 1, 0, 100);
          log("📺 Saul boude : « L'humilité, c'est pour les moines. » Respect −1.", "info");
        },
      },
    ],
  },
  {
    id: "nightbreakin", loc: "carwash", emoji: "🔦", weight: 4, type: "auto",
    title: "Effraction nocturne",
    text: "Les caméras ont filmé deux silhouettes qui forcent la porte arrière du lave-auto, 3h du matin.",
    apply(s) {
      const managed = s.businesses && s.businesses.carwash && s.businesses.carwash.manager;
      if (managed) {
        s.respect = cap(s.respect + 2, 0, 100);
        log("🔦 Ton manager a déclenché l'alarme. Les rôdeurs ont déguerpi. Respect +2.", "good");
      } else if (s.cash > 0) {
        const lost = Math.min(s.cash * 0.05, 20_000);
        s.cash -= lost;
        log("🔦 On t'a sifflé " + fmt(Math.round(lost)) + "$ dans la caisse. Embauche un manager...", "bad");
      } else {
        log("🔦 Rien à voler. Les rôdeurs sont repartis déçus.", "info");
      }
    },
  },
  {
    id: "precursor", loc: "rail", emoji: "🛢️", weight: 5, type: "choice",
    title: "Bidons douteux à la station",
    text: "Un routier propose des bidons de méthylamine « tombés du camion ». Prix d'ami.",
    choices: [
      {
        label: "Acheter les bidons (−30 000$, Stock +8 kg)",
        can: (s) => s.cash >= 30_000,
        apply(s) {
          s.cash -= 30_000;
          s.stock = Math.min(stockCap(), s.stock + 8);
          log("🛢️ Stock +8 kg. Ne demande pas d'où ça vient.", "good");
        },
      },
      {
        label: "Refuser poliment",
        apply(s) {
          log("🛢️ Trop risqué. Le routier siffle en s'en allant.", "info");
        },
      },
    ],
  },
  {
    id: "scouts", loc: "villa", emoji: "🗺️", weight: 4, type: "choice", cond: (s) => s.day >= 10,
    title: "Éclaireurs au péage",
    text: "Deux voitures teintées ont photographié ta villa depuis la colline. Des éclaireurs, pas des touristes.",
    choices: [
      {
        label: "Acheter leur silence (−40 000$)",
        can: (s) => s.cash >= 40_000,
        apply(s) {
          s.cash -= 40_000;
          log("🗺️ Photos brûlées. Les voitures ont disparu.", "good");
        },
      },
      {
        label: "Les laisser observer (Chaleur +6)",
        apply(s) {
          addHeat(6);
          scheduleEvent("scoutsPayback", 3 + Math.floor(Math.random() * 3));
          log("🗺️ Tu les ignores. Mauvaise idée, probablement. Chaleur +6.", "bad");
        },
      },
    ],
  },
  {
    id: "scoutsPayback", emoji: "💀", weight: 0, type: "auto",
    title: "Visite des éclaireurs",
    text: "Ils ont tout noté : les horaires, les camions, les sorties de la laverie.",
    apply(s) {
      addHeat(12);
      log("💀 Les éclaireurs ont tout rapporté. Chaleur +12.", "bad");
    },
  },
  {
    id: "mikeJob", loc: "hq", emoji: "🎩", weight: 4, type: "choice", cond: (s) => s.heat >= 20,
    title: "Mike propose un « nettoyage »",
    text: "« Vos problèmes de chaleur ? Je connais des gens qui font oublier des choses. » Tarif : sec.",
    choices: [
      {
        label: "Confier le travail (−20 000$, Chaleur −10)",
        can: (s) => s.cash >= 20_000,
        apply(s) {
          s.cash -= 20_000;
          addHeat(-10);
          log("🎩 Mike a « parlé » aux bonnes personnes. Chaleur −10.", "good");
        },
      },
      {
        label: "Gérer seul",
        apply(s) {
          log("🎩 Mike hausse les épaules : « Vos funérailles. »", "info");
        },
      },
    ],
  },
);

// ------------------------------------------------------------
// v29 — SUCCÈS MINI-JEUX
// ------------------------------------------------------------
ACHIEVEMENTS.push(
  { id: "mgPerfect", icon: "🧪", name: "Main de chimiste", desc: "Grade S à la Cuisson de précision", check: (s) => (s.stats.mgBest || 0) >= 6, reward: { respect: 5 } },
  { id: "mgTucoMax", icon: "🤝", name: "Partenaire de Tuco", desc: "×4,0 de multiplicateur en négociation", check: (s) => (s.stats.mgTucoBest || 0) >= 4, reward: { cash: 50_000 } },
  { id: "mgSellPerfect", icon: "🥫", name: "Trois clients, trois deals", desc: "Vente express parfaite (3/3)", check: (s) => (s.stats.mgSellBest || 0) >= 6, reward: { cash: 25_000 } },
  { id: "mg10", icon: "🎯", name: "Joueur né", desc: "Jouer 10 mini-jeux", check: (s) => (s.stats.mgPlayed || 0) >= 10, reward: { respect: 5 } },
);

// ------------------------------------------------------------
// v40 — SUCCÈS ALBUM (collection d'événements)
// ------------------------------------------------------------
ACHIEVEMENTS.push(
  { id: "album25", icon: "📕", name: "Collectionneur", desc: "Découvrir 25% de l'album", check: (s) => (s.albumTier || 0) >= 1, reward: { cash: 10_000 } },
  { id: "album50", icon: "📗", name: "Archiviste d'Albuquerque", desc: "Découvrir 50% de l'album", check: (s) => (s.albumTier || 0) >= 2, reward: { respect: 8 } },
  { id: "album100", icon: "📚", name: "Mémoire vivante", desc: "Compléter tout l'album", check: (s) => (s.albumTier || 0) >= 4, reward: { cash: 250_000 } },
);
// v43 — succès d'événements
ACHIEVEMENTS.push(
  { id: "witness10", icon: "👀", name: "Témoin de tout", desc: "Assister à 10 événements de scène", check: (s) => ((s.stats && s.stats.sceneEventsSeen) || 0) >= 10, reward: { cash: 20_000 } },
  { id: "witness40", icon: "🎬", name: "Toujours au courant", desc: "Assister à 40 événements de scène", check: (s) => ((s.stats && s.stats.sceneEventsSeen) || 0) >= 40, reward: { respect: 10 } },
);
// v45 — succès des chaînes
ACHIEVEMENTS.push(
  { id: "chainMaster", icon: "🔗", name: "Maître des chaînes", desc: "Mener les 3 chaînes d'événements à leur terme", check: (s) => !!(s.evSeen && s.evSeen.deaSting && s.evSeen.methylamineDeal && s.evSeen.turfMeet), reward: { cash: 50_000, respect: 15 } },
);
// v48 — succès des contrats express
ACHIEVEMENTS.push(
  { id: "express5", icon: "⚡", name: "Livreur express", desc: "Réussir 5 contrats express", check: (s) => ((s.stats && s.stats.expressDone) || 0) >= 5, reward: { cash: 30_000, respect: 5 } },
);

// ------------------------------------------------------------
// v29 — ÉVÉNEMENTS SUPPLÉMENTAIRES
// ------------------------------------------------------------
EVENTS.push(
  {
    id: "carwashCrowd", loc: "carwash", emoji: "🚗", weight: 5, type: "auto", cond: (s) => s.day >= 3,
    title: "Embouteillage au lave-auto",
    text: "Samedi improvisé : la file de voitures s'étire jusqu'au carrefour.",
    apply(s) {
      const lvl = (s.businesses && s.businesses.carwash && s.businesses.carwash.level) || 1;
      const gain = 500 + 300 * lvl;
      s.dirty += gain;
      log("🚗 Rush au lave-auto : +" + fmt(gain) + "$ sale.", "good");
    },
  },
  {
    id: "lydiaList", loc: "hq", emoji: "📋", weight: 4, type: "choice", cond: (s) => s.day >= 12,
    title: "La liste de Lydia",
    text: "Lydia déroule une liste de consignes aussi longue que ton bras. « Chaque détail compte. »",
    choices: [
      {
        label: "Suivre la liste à la lettre (Pureté +2, Chaleur +4)",
        apply(s) {
          s.purity = cap(s.purity + 2, 0, 100);
          addHeat(4);
          log("📋 Procédures respectées au gramme près. Pureté +2, Chaleur +4.", "info");
        },
      },
      {
        label: "Improviser (Marché +10%, Respect +2)",
        apply(s) {
          s.market = cap(s.market + 0.1, 0.7, 1.6);
          s.respect = cap(s.respect + 2, 0, 100);
          log("📋 Tu fais à ta façon — et ça marche. Marché +10%, Respect +2. Lydia grince des dents.", "good");
        },
      },
    ],
  },
  {
    id: "comboMessage", loc: "corner", emoji: "🛴", weight: 5, type: "choice", cond: (s) => s.day >= 4,
    title: "Combo a un plan",
    text: "« Un pote revend un lot en bloc, prix cassé. On achète, on découpe, on revend. T'assures le cash ? »",
    choices: [
      {
        label: "Financer le plan (−5 000$, gain aléatoire)",
        can: (s) => s.cash >= 5_000,
        apply(s) {
          s.cash -= 5_000;
          if (Math.random() < 0.55) {
            s.dirty += 20_000;
            log("🛴 Le lot est écoulé en une soirée. +20 000$ sale.", "good");
          } else {
            log("🛴 Le « pote » a disparu avec le lot. Perte sèche.", "bad");
          }
        },
      },
      {
        label: "Refuser (Respect −1)",
        apply(s) {
          s.respect = cap(s.respect - 1, 0, 100);
          log("🛴 Combo boude. « C'est toi qui vois, yo. » Respect −1.", "info");
        },
      },
    ],
  },
  {
    id: "gasCan", loc: "rv", emoji: "⛽", weight: 4, type: "choice",
    title: "Jerrican premium",
    text: "Un routier te propose un jerrican d'essence « stabilisée » — parfaite pour une cuisson propre.",
    choices: [
      {
        label: "Acheter le jerrican (−5 000$, Pureté +2, Stock +2 kg)",
        can: (s) => s.cash >= 5_000,
        apply(s) {
          s.cash -= 5_000;
          s.purity = cap(s.purity + 2, 0, 100);
          s.stock = Math.min(stockCap(), s.stock + 2);
          log("⛽ Carburant premium : pureté +2, stock +2 kg.", "good");
        },
      },
      {
        label: "Laisser le jerrican",
        apply(s) {
          log("⛽ Le routier repart en sifflant.", "info");
        },
      },
    ],
  },
);

// ------------------------------------------------------------
// v43 — GROS PLAN GAMEPLAY : 6 événements de scène + 3 événements de saison
// ------------------------------------------------------------
EVENTS.push(
  {
    id: "labInspector", loc: "superlab", emoji: "🧾", weight: 5, type: "choice",
    cond: (s) => s.day >= 5,
    title: "Inspection surprise",
    text: "Un inspecteur des normes fouille le superlab, presse-papiers en main. Il lève un sourcil : « Cet équipement n'est pas homologué… »",
    choices: [
      {
        label: "Soudoyer (−30 000$, Chaleur −6)",
        can: (s) => s.cash >= 30_000,
        apply(s) {
          s.cash -= 30_000;
          s.heat = cap(s.heat - 6, 0, 100);
          log("🧾 L'inspecteur signe un rapport immaculé. Chaleur −6.", "good");
        },
      },
      {
        label: "Jouer la carte de la franchise",
        apply(s) {
          if (Math.random() < 0.5) {
            s.respect = cap(s.respect + 2, 0, 100);
            log("🧾 Il est impressionné par votre rigueur. Respect +2.", "good");
          } else {
            addHeat(6);
            log("🧾 Rapport défavorable transmis à la DEA. Chaleur +6.", "bad");
          }
        },
      },
    ],
  },
  {
    id: "copperScore", loc: "junkyard", emoji: "🔧", weight: 6, type: "choice",
    title: "Fil de cuivre en vrac",
    text: "Old Joe a sorti des bobines de cuivre d'une épave. « Ça se vend bien, ou ça te sert. Choisis vite. »",
    choices: [
      {
        label: "Vendre le cuivre (+15 000$ sale, Chaleur +4)",
        apply(s) {
          s.dirty += 15_000;
          addHeat(4);
          log("🔧 Cuivre revendu au noir. +15 000$ sale, chaleur +4.", "good");
        },
      },
      {
        label: "Garder pour le labo (Stock +3 kg)",
        apply(s) {
          s.stock = Math.min(stockCap(), s.stock + 3);
          log("🔧 Les bobines alimentent le labo. Stock +3 kg.", "good");
        },
      },
    ],
  },
  {
    id: "nailsTip", loc: "nails", emoji: "💅", weight: 5, type: "auto",
    title: "On-dit au salon",
    text: "Deux clientes papotent sous les sèche-ongles : une rumeur fait retomber la pression sur vous.",
    apply(s) {
      s.heat = cap(s.heat - 5, 0, 100);
      log("💅 Rumeur apaisante au salon. Chaleur −5.", "good");
    },
  },
  {
    id: "plazaConcert", loc: "plaza", emoji: "🎸", weight: 5, type: "choice",
    chainNext: "turfThreat",
    title: "Concert sur la place",
    text: "Un groupe joue sur la plaza, la foule est dense. Un revendeur vous souffle : « Occasion en or, tout le monde est dehors ce soir. »",
    choices: [
      {
        label: "Écouler dans la foule (+20 000$ sale, Respect +3, Chaleur +5)",
        apply(s) {
          s.dirty += 20_000;
          s.respect = cap(s.respect + 3, 0, 100);
          addHeat(5);
          log("🎸 Vente flash pendant le concert. +20 000$ sale, respect +3, chaleur +5.", "good");
        },
      },
      {
        label: "Profiter du concert (Respect +2)",
        apply(s) {
          s.respect = cap(s.respect + 2, 0, 100);
          log("🎸 Vous avez applaudi le set entier, légendaire. Respect +2.", "good");
        },
      },
    ],
  },
  {
    id: "villaParty", loc: "villa", emoji: "🥂", weight: 4, type: "choice",
    cond: (s) => s.respect >= 20,
    title: "Fête au domaine",
    text: "Votre réputation vous précède : vous êtes invité à la réception du domaine. Les convives veulent tous faire affaire avec vous.",
    choices: [
      {
        label: "Négocier toute la nuit (Respect +6, Chaleur +7)",
        apply(s) {
          s.respect = cap(s.respect + 6, 0, 100);
          addHeat(7);
          log("🥂 Trois cartels sur votre liste d'attente. Respect +6, chaleur +7.", "good");
        },
      },
      {
        label: "Rester discret (Chaleur −3)",
        apply(s) {
          s.heat = cap(s.heat - 3, 0, 100);
          log("🥂 Vous avez savouré en silence, sans laisser de traces. Chaleur −3.", "good");
        },
      },
    ],
  },
  {
    id: "railStrike", loc: "rail", emoji: "🚂", weight: 5, type: "auto",
    chainNext: "cargoHijack",
    title: "Grève des aiguilleurs",
    text: "Les trains de fret sont bloqués sur toute la ligne : la marchandise se raréfie et les prix flambent.",
    apply(s) {
      s.market = cap(s.market + 0.08, 0.7, 1.6);
      log("🚂 Grève : le marché grimpe à " + Math.round(s.market * 100) + "%.", "good");
    },
  },
  // v43 — événements de SAISON (calendrier réel)
  {
    id: "snowstorm", loc: "corner", emoji: "❄️", weight: 7, type: "auto",
    cond: (s) => { const m = new Date().getMonth(); return m <= 1 || m === 11; },
    title: "Tempête de neige",
    text: "Albuquerque est paralysée par la neige. Les patrouilles restent au garage, vos clients aussi.",
    apply(s) {
      s.heat = cap(s.heat - 10, 0, 100);
      s.market = cap(s.market - 0.06, 0.7, 1.4);
      log("❄️ Tempête : la DEA déneige ses bureaux. Chaleur −10, marché −6%.", "info");
    },
  },
  {
    id: "heatwave", loc: "villa", emoji: "🔥", weight: 6, type: "auto",
    chainNext: "methylamineDeal",
    cond: (s) => { const m = new Date().getMonth(); return m >= 5 && m <= 7; },
    title: "Canicule sur le désert",
    text: "40°C à l'ombre. Le RV surchauffe, mais un laboratoire bien réglé tourne à la perfection.",
    apply(s) {
      s.purity = cap(s.purity + 4, 0, 100);
      s.market = cap(s.market + 0.05, 0.7, 1.6);
      log("🔥 Canicule : cuissons parfaites. Pureté +4, marché +5%.", "good");
    },
  },
  {
    id: "harvest", loc: "pollos", emoji: "🌾", weight: 6, type: "auto",
    cond: (s) => { const m = new Date().getMonth(); return m >= 8 && m <= 10; },
    title: "Récolte d'automne",
    text: "Fin de saison pour les fournisseurs : les contrats se signent avant l'hiver.",
    apply(s) {
      s.cash += 25_000;
      s.respect = cap(s.respect + 2, 0, 100);
      log("🌾 Contrats de récolte signés. +25 000$ propre, respect +2.", "good");
    },
  },
);

// ------------------------------------------------------------
// v44 — ÉVÉNEMENTS EN CHAÎNE MULTI-LIEUX (weight 0 = uniquement via chainNext)
// ------------------------------------------------------------
EVENTS.push(
  {
    id: "cargoHijack", loc: "junkyard", emoji: "🚚", weight: 0, type: "choice",
    chainStep: 2, chainMax: 3,
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
    chainStep: 3, chainMax: 3,
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
    chainStep: 2, chainMax: 2,
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
    chainStep: 2, chainMax: 3,
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
    chainStep: 3, chainMax: 3,
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

// ------------------------------------------------------------
// v45 — CHAÎNE « L'EMPIRE » (4 étapes) + événements aléatoires
// ------------------------------------------------------------
EVENTS.push(
  {
    id: "saulPitch", loc: "saul", emoji: "💼", weight: 5, type: "auto",
    title: "Le plan de Saul",
    text: "Saul étale des schémas sur son bureau : « Un labo plus gros, des vendeurs en nombre, une vraie STRUCTURE. On signe ? »",
    apply(s) {
      s.respect = cap(s.respect + 2, 0, 100);
      log("💼 Saul vous a convaincu. Respect +2. L'expansion commence…", "good");
    },
    chainNext: "empireLab",
  },
  {
    id: "empireLab", loc: "superlab", emoji: "🏗️", weight: 0, type: "choice",
    chainStep: 2, chainMax: 4,
    title: "Investissement industriel",
    text: "Le plan de Saul passe par un labo modernisé : cuves doublées, extraction repensée. Le chantier est chiffré.",
    choices: [
      {
        label: "Investir (−50 000$, Pureté +3, Stock +8 kg)",
        can: (s) => s.cash >= 50_000,
        apply(s) {
          s.cash -= 50_000;
          s.purity = cap(s.purity + 3, 0, 100);
          s.stock = Math.min(stockCap(), s.stock + 8);
          log("🏗️ Le superlab passe au niveau supérieur. Pureté +3, stock +8 kg.", "good");
        },
      },
      {
        label: "Reporter l'investissement",
        apply(s) {
          log("🏗️ Le chantier attend. Saul soupire.", "info");
        },
      },
    ],
    chainNext: "empireDealer",
  },
  {
    id: "empireDealer", loc: "corner", emoji: "🧢", weight: 0, type: "choice",
    chainStep: 3, chainMax: 4,
    title: "Réseau de rue",
    text: "Pour écouler le volume, Saul propose de recruter une équipe de vendeurs dédiée sur le coin.",
    choices: [
      {
        label: "Recruter l'équipe (−20 000$, +60 000$ sale, Chaleur +10)",
        can: (s) => s.cash >= 20_000,
        apply(s) {
          s.cash -= 20_000;
          s.dirty += 60_000;
          addHeat(10);
          log("🧢 L'équipe tourne à plein régime. +60 000$ sale, chaleur +10.", "good");
        },
      },
      {
        label: "Rester prudent (Respect +3)",
        apply(s) {
          s.respect = cap(s.respect + 3, 0, 100);
          log("🧢 Discrétion avant tout. Respect +3.", "good");
        },
      },
    ],
    chainNext: "empireFinale",
  },
  {
    id: "empireFinale", loc: "hq", emoji: "🏙️", weight: 0, type: "choice",
    cond: (s) => s.day >= 12,
    chainStep: 4, chainMax: 4,
    title: "Le conseil de l'empire",
    text: "Au sommet de la tour, les partenaires veulent un nom, un visage, une signature. Le vôtre.",
    choices: [
      {
        label: "Accepter le titre (Respect +10, Chaleur +10)",
        apply(s) {
          s.respect = cap(s.respect + 10, 0, 100);
          addHeat(10);
          log("🏙️ L'empire a un visage. Respect +10, chaleur +10.", "good");
        },
      },
      {
        label: "Rester dans l'ombre (Chaleur −5, +30 000$ propre)",
        apply(s) {
          s.heat = cap(s.heat - 5, 0, 100);
          s.cash += 30_000;
          log("🏙️ L'homme mystérieux, c'est vous. Chaleur −5, +30 000$.", "good");
        },
      },
    ],
  },
  // v45 — événements aléatoires
  {
    id: "carwashFleet", loc: "carwash", emoji: "🚙", weight: 4, type: "choice",
    title: "Contrat de flotte",
    text: "Une entreprise locale propose un abonnement pour sa flotte de utilitaires. Le gérant vous regarde espérant.",
    choices: [
      {
        label: "Signer l'abonnement (+8 000$ propre)",
        apply(s) {
          s.cash += 8_000;
          log("🚙 Flotte entière chaque semaine. +8 000$ propre.", "good");
        },
      },
      {
        label: "Négocier plus cher",
        apply(s) {
          if (Math.random() < 0.5) {
            s.cash += 14_000;
            log("🚙 Négociation musclée : +14 000$ propre.", "good");
          } else {
            s.cash += 4_000;
            log("🚙 Ils ont haussé les épaules : +4 000$ seulement.", "info");
          }
        },
      },
    ],
  },
  {
    id: "rvBreakdown", loc: "rv", emoji: "🛠️", weight: 4, type: "choice",
    title: "Panne sèche",
    text: "Le fourgon refuse de démarrer, au milieu de nulle part. Le radiateur fume.",
    choices: [
      {
        label: "Remorquage express (−6 000$)",
        can: (s) => s.cash >= 6_000,
        apply(s) {
          s.cash -= 6_000;
          log("🛠️ Dépanneuse sur place en 20 minutes. −6 000$.", "info");
        },
      },
      {
        label: "Bricoler soi-même",
        apply(s) {
          if (Math.random() < 0.6) {
            log("🛠️ Réparé avec du fil de fer et de la sueur. Rien de cassé.", "good");
          } else {
            s.stock = Math.max(0, s.stock - 1);
            log("🛠️ Un bidon a percé pendant la réparation. Stock −1 kg.", "bad");
          }
        },
      },
    ],
  },
  {
    id: "streetPreacher", loc: "plaza", emoji: "📣", weight: 4, type: "auto",
    title: "Prêche surprise",
    text: "Un prêcheur rassemble la foule sur la plaza. Les patrouilles accourent, bien trop occupées pour vous.",
    apply(s) {
      s.heat = cap(s.heat - 4, 0, 100);
      log("📣 La police a mieux à faire. Chaleur −4.", "good");
    },
  },
);

// ------------------------------------------------------------
// APPARENCES des visiteurs d'événements dans les scènes (v17)
// ------------------------------------------------------------
const EVENT_VISITORS = {
  carwashCrowd: { shirt: "#4a6a8a", pants: "#2a2a30", cap: true },
  lydiaList: CHAR_LOOKS.lydia,
  comboMessage: CHAR_LOOKS.combo,
  gasCan: { shirt: "#7a6a3a", pants: "#3a3428", beard: true },
  rats: { shirt: "#6a5a4a", pants: "#3a342c", cap: true },
  hankBBQ: CHAR_LOOKS.hank,
  turfwar: { shirt: "#8a3a3a", pants: "#26262c", beanie: true },
  billboard: CHAR_LOOKS.saul,
  nightbreakin: { shirt: "#2a2a30", pants: "#1a1a20", beanie: true },
  precursor: { shirt: "#4a5a4a", pants: "#2a2a30", hat: true, glasses: true },
  scouts: CHAR_LOOKS.cousins,
  mikeJob: CHAR_LOOKS.mike,
  hank: CHAR_LOOKS.hank,
  tuco: CHAR_LOOKS.tuco,
  cartel: { shirt: "#2a2a34", pants: "#1e1e26", hat: true },
  cousins: { shirt: "#24242e", pants: "#16161c", hat: true, tie: true },
  deasurveillance: { shirt: "#3a5a8a", pants: "#2a2a30", glasses: true },
  raidWarning: { shirt: "#3a5a8a", pants: "#2a2a30", hat: true },
  informant: { shirt: "#5a6a4a", pants: "#3a3428", flatCap: true, glasses: true },
  robbery: { shirt: "#3a3a3a", pants: "#26262c", beanie: true },
  jesseRage: CHAR_LOOKS.jesse,
  blackMarket: { shirt: "#6a5a3a", pants: "#3a3428", flatCap: true, beard: true },
  cartelTribute: { shirt: "#2a2a34", pants: "#1e1e26", hat: true },
  gusMeeting: CHAR_LOOKS.gus,
  purityDuel: { shirt: "#d8d8d0", pants: "#c8c8c0", glasses: true },
  wholesale: { shirt: "#4a5a6a", pants: "#2e2e34", flatCap: true },
  comboDeal: { shirt: "#7a4a8a", pants: "#2e2e34", gold: true },
  galeHelp: { shirt: "#c8b87a", pants: "#5a5240", glasses: true, beard: true },
  tortuga: { shirt: "#4a6a3a", pants: "#3a3a30", hat: true },
  methHeads: { shirt: "#7a7a5a", pants: "#4a4438", beard: true },
  lydiaDemand: CHAR_LOOKS.lydia,
  streetrace: { shirt: "#c84a3a", pants: "#2a2a34", cap: true },
  junkie: { shirt: "#6a6a5a", pants: "#4a4438", beanie: true },
  // v43 — visiteurs des nouveaux événements
  labInspector: { shirt: "#8a7a55", pants: "#3a3630", flatCap: true, glasses: true },
  copperScore: CHAR_LOOKS.combo,
  nailsTip: { shirt: "#c98fb0", pants: "#5a4a5a", hair: "#7a3a2a" },
  plazaConcert: { shirt: "#3a3a4a", pants: "#26262e", cap: "#1a1a22", loud: true },
  villaParty: CHAR_LOOKS.eladio,
  railStrike: { shirt: "#4a6a8a", pants: "#2a2a34", cap: "#3a4a5a" },
  snowstorm: { shirt: "#6a6a7a", pants: "#3a3a44", beanie: true },
  heatwave: { shirt: "#d9c33c", pants: "#8a7a3a", bald: true },
  harvest: CHAR_LOOKS.gus,
  // v44 — visiteurs des chaînes
  cargoHijack: { shirt: "#5a6a4a", pants: "#3a3a30", cap: "#2a3a2a", beard: "#3a3a2a" },
  deaSting: CHAR_LOOKS.hank,
  methylamineDeal: CHAR_LOOKS.lydia,
  turfThreat: { shirt: "#7a2a3a", pants: "#26262e", gold: true, loud: true },
  turfMeet: CHAR_LOOKS.tuco,
  // v45 — visiteurs de la chaîne « L'Empire » + aléatoires
  saulPitch: CHAR_LOOKS.saul,
  empireLab: CHAR_LOOKS.hazmat,
  empireDealer: { shirt: "#7a2a3a", pants: "#26262e", cap: "#3a2a2a", gold: true },
  empireFinale: CHAR_LOOKS.mike,
  carwashFleet: { shirt: "#3a6a8a", pants: "#2a3440", flatCap: true },
  rvBreakdown: { shirt: "#6a5a3a", pants: "#4a4030", beard: "#3a2a1a" },
  streetPreacher: { shirt: "#2a2a2a", pants: "#1a1a1a", flatCap: true, glasses: true },
};

// v21 : répliques d'événements (bulles des visiteurs dans les scènes)
const EVENT_QUOTES = {
  saulPitch: ["Un labo plus gros, des vendeurs en nombre.", "Signez ici. Et ici. Et là aussi."],
  empireLab: ["Les cuves doublées, c'est du grand art.", "Le béton, ça coûte. Mais ça rapporte."],
  empireDealer: ["Une équipe dédiée, zéro intermédiaire.", "La rue, c'est du volume."],
  empireFinale: ["L'empire a besoin d'un visage.", "Un nom, une signature. Le vôtre."],
  carwashFleet: ["Dix-sept utilitaires, chaque semaine.", "On paie au mois, pas au lavage."],
  rvBreakdown: ["Le radiateur a rendu l'âme.", "Vous avez du fil de fer, au moins ?"],
  streetPreacher: ["REPENTEZ-VOUS, ALBUQUERQUE !", "Le salut est gratuit, mes frères !"],
  cargoHijack: ["Ce camion appartient au domaine du silence.", "On vide ça avant le lever du jour."],
  deaSting: ["Sortez les mains. Lentement.", "Ce camion vous a mené droit à moi."],
  methylamineDeal: ["Un bidon. Qualité pharma. Pas une goutte de plus.", "Ce bidon n'a jamais existé. Compris ?"],
  turfThreat: ["Ce coin est à nous maintenant.", "Le grand chef veut te rencontrer. Seul."],
  turfMeet: ["Alors c'est toi, le fameux cuisinier ?", "Tu paies, ou tu disparais. Choisis."],
  labInspector: ["Cet équipement n'a pas d'homologation, monsieur.", "Un rapport propre, ça se rédige… ou ça se paie."],
  copperScore: ["Le cuivre, ça pèse lourd en trésorerie.", "Ou alors tu t'en sers. Je te fais un prix d'ami."],
  nailsTip: ["On dit que la police a perdu votre trace.", "Moi, je n'ai rien vu, hein. Rien entendu non plus."],
  plazaConcert: ["Ce soir, tout le monde achète.", "La foule couvre tout. Même les sirènes."],
  villaParty: ["Chez moi, les deals se font en smoking.", "Reste jusqu'à l'aube, c'est là que se signent les contrats."],
  railStrike: ["Plus un wagon ne roule avant lundi.", "Ce qui n'arrive pas se vend plus cher."],
  snowstorm: ["Même les flics ne sortent pas dans ça.", "La ville est à nous jusqu'au déneigement."],
  heatwave: ["Cette chaleur, ça affine les cuissons.", "Buvez de l'eau. Ou pas."],
  harvest: ["Les contrats d'automne sont les plus juteux.", "Bonnes récoltes à ceux qui ont semé."],
  carwashCrowd: ["On est pressés, vous pouvez accélérer ?", "Trois voitures, un abonnement, s'il vous plaît."],
  lydiaList: ["Je déteste les imprévus. Éliminons-les.", "La liste n'est pas négociable."],
  comboMessage: ["Yo, mon pote a un truc ÉNORME pour nous.", "On divise le prix d'achat par trois, je te jure."],
  gasCan: ["Essence stabilisée, monsieur. La meilleure de l'État.", "C'est du bon. Vous verrez la différence."],
  rats: ["Ils ont mangé deux sacs. DEUX.", "Grignote, grignote, petit..."],
  hankBBQ: ["T'apportes tes fameux steaks, ou on commande des pizzas ?", "Marie a refait sa salade de raisins. Sois fort."],
  turfwar: ["Ce trottoir, il est à nous maintenant.", "Tu veux régler ça à l'ancienne ?"],
  billboard: ["Un panneau 4x3, c'est de la légitimité, amigo !", "Le visuel est prêt : toi, en costume, souriant."],
  nightbreakin: ["Fais vite, la caméra tourne...", "Le coffre est où ?!"],
  precursor: ["Tombé du camion, promis. Prix d'ami.", "Vous voulez la quantité ou la qualité ? Les deux, j'ai."],
  scouts: ["...", "Nous regardons. Nous notons."],
  mikeJob: ["Vos problèmes de chaleur ? Je connais des gens.", "Je fais oublier des choses. Le tarif est sec."],
  hank: ["On sait que vous êtes malin. On sait aussi que vous n'êtes pas intouchable.", "Un jour ou l'autre, je vous aurai."],
  tuco: ["Hé ! Tonton ! Tu me cachs quelque chose ?", "TIGHT, TIGHT, TIGHT ! Raconte-moi ça !"],
  cartel: ["Le cartel t'observe. Fais tes preuves.", "Nos amis du sud attendent des résultats."],
  cousins: ["...", "Nous parlons peu. Mais nous comptons bien."],
  deasurveillance: ["Rien à signaler... si ce n'est cette odeur de chimie.", "Je te vois. Tu me vois."],
  raidWarning: ["Ils préparent un coup. Dégage le matériel. VITE.", "J'ai entendu un truc au commissariat... dépêche-toi."],
  informant: ["J'ai des infos. Mais rien n'est gratuit.", "Tu veux savoir qui parle aux flics ? Ça s'achète."],
  robbery: ["Le sac. Maintenant. Personne ne bouge.", "Pas un geste, ou ça se termine mal."],
  jesseRage: ["Tu m'as pas écouté, M. White ! PERSONNE m'écoute !", "J'en ai marre de ta condescendance !"],
  blackMarket: ["Marchandise rare, prix amical. T'intéresses ?", "J'ai ce qu'il te faut. Tu as ce qu'il me faut."],
  cartelTribute: ["La maison demande sa part. Toujours.", "Le compte doit être bon. Sinon..."],
  gusMeeting: ["La qualité est constante. C'est tout ce que je demande.", "Les détails font la réputation. Les nôtres sont impeccables."],
  purityDuel: ["99,1 % ? Je parie que je fais mieux.", "Ton produit est correct. Le mien est de l'art."],
  wholesale: ["Gros lot, gros chèque, pas de questions.", "Je paie comptant si la marchandise suit."],
  comboDeal: ["Deux kilos, moitié prix, et on en parle plus.", "Mes clients sont pressés. Toi aussi, je crois."],
  galeHelp: ["La chimie est une symphonie, non ?", "J'ai noté chaque variable. Vous ne le regretterez pas."],
  tortuga: ["Un petit message du sud... prenez-en de la graine.", "Regardez bien. C'est un avertissement."],
  methHeads: ["On dérange pas, hein ? On regarde juste.", "Ça sent bon ici, tu sais..."],
  lydiaDemand: ["Mes clients veulent de la régularité, pas des surprises.", "Je déteste les imprévus. Éliminons-les."],
  streetrace: ["Paris clandestin ce soir. Tu oses ?", "Le vainqueur repart avec la caisse. Littéralement."],
  junkie: ["Tu aurais... un petit quelque chose ?", "Je paie demain. Promis. Comme la dernière fois."],
};

// ------------------------------------------------------------
// CITATIONS des personnages (bulles dans les scènes, v12)
// ------------------------------------------------------------
const QUOTES = {
  walter:     ["La chimie est l'étude de la transformation.", "On doit être plus malins qu'eux.", "Il faut tout calculer."],
  heisenberg: ["Dis mon nom.", "Tu es putain de mort.", "On ne négocie pas. On décide."],
  jesse:      ["Ouais, science, mec !", "C'est de la balle, M. White !", "Ça sent l'chou-fleur ici."],
  skyler:     ["Walter, on doit parler.", "Je le fais pour la famille.", "Les comptes doivent tenir la route."],
  gus:        ["Je ne suis pas un danger.", "Le compte est bon.", "Tout doit être impeccable."],
  saul:       ["Mieux vaut appeler Saul !", "Tout est légal avec le bon avocat.", "On plaide non coupable !"],
  mike:       ["Pas de bruit. Jamais.", "Pas de demi-mesures.", "Je fais mon travail."],
  tuco:       ["C'est du business, tonton !", "TIGHT, TIGHT, TIGHT !", "Ouais ! Magnifique !"],
  hank:       ["Heisenberg, c'est un amateur.", "Les minerais, c'est mon affaire.", "Ce dossier me trotte dans la tête."],
  marie:      ["C'est du vrai violet, ça.", "Hank, pose ce dossier !"],
  jane:       ["Un dessin avant de dormir ?", "Ne me juge pas.", "Ce quartier m'étouffe."],
  badger:     ["Le capitaine Tee-et-Baguette !", "C'est nous les rois du coin."],
  combo:      ["On gère le secteur, tranquille.", "Zéro stress, mon pote."],
  todd:       ["Désolé. C'était logique.", "Je peux nettoyer, si tu veux."],
  lydia:      ["Les manifests sont parfaits.", "Je ne tolère pas les erreurs.", "Le train repart à l'aube."],
  eladio:     ["Assieds-toi. Bois un verre.", "Ici, c'est moi qui décide.", "Le poulet est excellent."],
  hazmat:     ["« (respiration filtrée) »", "99,1 % de pureté."],
  hazmat2:    ["« (respiration filtrée) »", "La cuve est prête."],
};

// v21 : répliques additionnelles
Object.assign(QUOTES, {
  walter: QUOTES.walter.concat(["Je suis dans l'empire business."]),
  heisenberg: QUOTES.heisenberg.concat(["Tu n'as pas l'air à la hauteur."]),
  jesse: QUOTES.jesse.concat(["On gère, mec !"]),
  skyler: QUOTES.skyler.concat(["J'ai fait les chiffres. Deux fois."]),
  gus: QUOTES.gus.concat(["Un homme fournit un service."]),
  saul: QUOTES.saul.concat(["C'est pas illégal, c'est créatif !"]),
  mike: QUOTES.mike.concat(["Quelqu'un doit rester lucide."]),
  tuco: QUOTES.tuco.concat(["Tu sais qui je suis ?!"]),
  hank: QUOTES.hank.concat(["J'aurai ta peau, Heisenberg."]),
  marie: QUOTES.marie.concat(["Le violet, ça apaise."]),
  jane: QUOTES.jane.concat(["Chacun son mur, non ?"]),
  badger: QUOTES.badger.concat(["C'est comme Star Trek, mais pire."]),
  combo: QUOTES.combo.concat(["Le coin est à nous, frère."]),
  todd: QUOTES.todd.concat(["Désolé. C'était logique."]),
  lydia: QUOTES.lydia.concat(["Ce n'est pas conforme au protocole."]),
  eladio: QUOTES.eladio.concat(["Bois, et profite de la vie."]),
  hazmat: QUOTES.hazmat.concat(["La température monte, patron."]),
  hazmat2: QUOTES.hazmat2.concat(["Je note tout, comme vous m'avez dit."]),
});

// Succès v12
ACHIEVEMENTS.push(
  { id: "opps10", icon: "✨", name: "Œil de lynx", desc: "Attraper 10 opportunités sur la carte", check: (s) => (s.stats && s.stats.oppsTaken || 0) >= 10, reward: { cash: 50_000 } },
  { id: "pub3", icon: "📣", name: "Agent de pub", desc: "Utiliser 3 coups de pub", check: (s) => (s.stats && s.stats.pubUsed || 0) >= 3, reward: { respect: 5 } },
);

// ============================================================
// v13 — CITATIONS DU MATIN, COUP DE PUB, SUCCÈS
// ============================================================

const DAY_QUOTES = [
  { icon: "🧪", who: "Walter White", line: "La chimie, c'est la transformation. Nous, on transforme." },
  { icon: "🤓", who: "Jesse Pinkman", line: "Ouais, science, mec !" },
  { icon: "🐔", who: "Gus Fring", line: "Je ne suis pas un danger. Je suis le contraire du danger." },
  { icon: "⚖️", who: "Saul Goodman", line: "Mieux vaut appeler Saul !" },
  { icon: "🧢", who: "Mike Ehrmantraut", line: "Pas de demi-mesures." },
  { icon: "🤪", who: "Tuco Salamanca", line: "TIGHT, TIGHT, TIGHT !" },
  { icon: "🚔", who: "Hank Schrader", line: "Heisenberg, c'est un amateur. On va l'avoir." },
  { icon: "🚬", who: "Jane Margolis", line: "Ce quartier m'étouffe." },
  { icon: "🚂", who: "Lydia Rodarte-Quayle", line: "Je ne tolère pas les erreurs." },
  { icon: "🍹", who: "Don Eladio", line: "Assieds-toi. Bois un verre." },
  { icon: "👶", who: "Walter White Jr.", line: "Papa, ta laverie pue l'argent." },
  { icon: "💀", who: "Heisenberg", line: "Dis mon nom." },
];

// ============================================================
// v23 — ÉTAGES DU SUPERLAB + COLLECTION DE RELIQUES
// ============================================================

// Sous-sols du Superlab (-1 à -3) : multiplicateurs permanents
const LAB_FLOOR_COSTS = [5_000_000, 25_000_000, 100_000_000];

// Collection de reliques : trouvées par chance en fin de journée
const RELICS = [
  { id: "plate", icon: "🚙", name: "Plaque tordue", desc: "+10% sur chaque tap." },
  { id: "tortoise", icon: "🐢", name: "Tortue de Tortuga", desc: "−1 de chaleur à chaque gain." },
  { id: "hat", icon: "🎩", name: "Chapeau de Heisenberg", desc: "+5% de cuisson." },
  { id: "fly", icon: "🪰", name: "Mouche du labo", desc: "+2 de pureté effective." },
  { id: "coin", icon: "🪙", name: "Pièce de Saul", desc: "+5% sur le prix au kilo." },
  { id: "mask", icon: "😷", name: "Masque rose", desc: "+5% de revenus d'affaires." },
  { id: "marble", icon: "🔮", name: "Boule de Todd", desc: "+5% de cuisson." },
  { id: "chicken", icon: "🍗", name: "Seau Los Pollos", desc: "+10% de revenus d'affaires." },
];

ACHIEVEMENTS.push(
  { id: "floors3", icon: "🏗️", name: "Sous-sols infinis", desc: "Creuser les 3 sous-sols du Superlab", check: (s) => (s.labFloors || 0) >= 3, reward: { cash: 2_000_000 } },
  { id: "relic4", icon: "🗄️", name: "Collectionneur", desc: "Trouver 4 reliques", check: (s) => (s.relics || []).length >= 4, reward: { respect: 10 } },
);

// ============================================================
// v25 — RÉCIT : 3 ARCS NARRATIFS + CINÉMATIQUES
// Chaque arc progresse chapitre par chapitre selon la partie.
// Les chapitres marqués cinematic: true déclenchent une
// cinématique plein écran à leur déblocage.
// ============================================================

// ============================================================
// v32 — EXPRESSIONS : humeur des visiteurs d'événement
// (neutre, happy, angry, worried, shout) — pilotée par drawPerson
// ============================================================

const EV_MOODS = {
  saulPitch: "happy", empireLab: "neutral", empireDealer: "worried",
  empireFinale: "neutral", carwashFleet: "happy", rvBreakdown: "worried",
  streetPreacher: "neutral",
  cargoHijack: "worried", deaSting: "angry", methylamineDeal: "worried",
  turfThreat: "angry", turfMeet: "angry",
  labInspector: "worried", copperScore: "happy", nailsTip: "neutral",
  plazaConcert: "happy", villaParty: "happy", railStrike: "angry",
  snowstorm: "worried", heatwave: "happy", harvest: "happy",
  tuco: "angry", turfwar: "angry", rivalbuy: "angry", rats: "angry",
  scoutsPayback: "angry", cousin: "angry",
  junkie: "worried", blackout: "worried", wire: "worried", health: "worried",
  jessesales: "worried", nightbreakin: "worried", lydiaList: "worried",
  streetrace: "happy", chickenrun: "happy", windfall: "happy", precursor: "happy",
  scouts: "happy", hankBBQ: "happy", carwashCrowd: "happy", comboMessage: "happy",
  wkKaraoke: "happy", wkGift: "happy",
};

// ============================================================
// v34 — RÉPLIQUES À DEUX VOIX : un perso de la scène répond
// au visiteur pendant la cinématique d'événement
// ============================================================

const EVENT_REPLIES = {
  saulPitch: { who: "Jesse", text: "Yo, est-ce qu'on signe ou quoi ?" },
  empireFinale: { who: "Mike", text: "Un titre, ça attire les regards. Réfléchissez bien." },
  rvBreakdown: { who: "Badger", text: "J'ai regardé le tuto deux fois. Ça va le faire." },
  deaSting: { who: "Saul", text: "Pas un mot. Pas un geste. Je m'occupe de tout." },
  turfThreat: { who: "Jesse", text: "Yo, c'est NOTRE coin, ils peuvent pas faire ça !" },
  turfMeet: { who: "Tuco", text: "Touchez à son coin et je vous fais goûter au bitume !" },
  villaParty: { who: "Mike", text: "Souriez. Parlez peu. Partez tôt." },
  labInspector: { who: "Saul", text: "Laissez-moi lui parler. J'ai un cousin notaire." },
  snowstorm: { who: "Jesse", text: "Yo, y a même plus d'école. On fait quoi ?" },
  tuco: { who: "Walter", text: "Reste calme. On est en business, pas en guerre." },
  turfwar: { who: "Jesse", text: "Yo, ils ont touché à nos coins, faut réagir !" },
  junkie: { who: "Jesse", text: "Laisse, je m'en occupe. Ça va aller, yo." },
  wire: { who: "Saul", text: "On ne dit PLUS rien au téléphone. Jamais. Compris ?" },
  hankBBQ: { who: "Hank", text: "Sers-moi une de tes bières, et parle-moi d'autre chose." },
  mikeprotection: { who: "Mike", text: "Le travail est fait. Personne ne vous cherchera." },
  lydiaList: { who: "Lydia", text: "Ces chiffres sont inacceptables. Il faut structurer." },
  carwashCrowd: { who: "Skyler", text: "Souris. On est un établissement familial, souviens-t'en." },
  precursor: { who: "Jesse", text: "Yeah science ! On peut cuire combien de lots avec ça ?" },
  wkGift: { who: "Jesse", text: "Allez, ouvre-le. Tu vas pas être déçu, yo." },
};

// ============================================================
// v35 — BRUITAGES D'ÉVÉNEMENT : son signature au déclenchement
// ============================================================

const EV_SOUNDS = {
  saulPitch: "golden", empireLab: "crystal", empireDealer: "shot",
  empireFinale: "golden", carwashFleet: "cash", rvBreakdown: "alarm",
  streetPreacher: "horn",
  deaSting: "alarm", turfMeet: "shot", methylamineDeal: "crystal",
  cargoHijack: "cash", turfThreat: "horn",
  railStrike: "alarm", villaParty: "golden", plazaConcert: "horn",
  harvest: "cash", copperScore: "cash",
  turfwar: "shot", nightbreakin: "shot", cousin: "shot", scoutsPayback: "shot",
  streetrace: "horn", carwashCrowd: "cash", windfall: "cash", chickenrun: "cash",
  precursor: "crystal", rats: "alarm", wire: "alarm", blackout: "alarm",
  wkStorm: "lose", health: "lose", junkie: "lose",
};

// ============================================================
// v39 — ALBUM : récompenses de collection (bonus permanents)
// ============================================================

const ALBUM_TIERS = [
  { n: 0.25, bonus: 0.03 },
  { n: 0.5, bonus: 0.06 },
  { n: 0.75, bonus: 0.10 },
  { n: 1, bonus: 0.15 },
];

const STORY_ARCS = [
  {
    id: "rise", icon: "⚗️", name: "L'Ascension",
    desc: "De prof en survêt à baron de la méthode.",
    unlock: (s) => true,
    chapters: [
      { title: "Le diagnostic", cond: (s) => s.day >= 2, reward: { cash: 5_000 },
        text: "« Cancer inopérable. » Le papier tremble dans la main de Walter. Ce soir, il décide que la sentence ne l'attendra pas." },
      { title: "Première cuisson", cond: (s) => (s.stats.cooked || 0) >= 1, reward: { respect: 5 },
        text: "Dans le RV, la mixture bout. Jesse tousse, Walter sourit. Le bleu qui sort du four est pur à 99,1 %." },
      { title: "Chapeau sur la tête", cond: (s) => s.labLevel >= 3, reward: { cash: 25_000 },
        text: "Les vêtements mous sont partis. Reste un homme debout, chapeau noir, lunettes sombres. Heisenberg est né." },
      { title: "Say my name", cond: (s) => (s.maxCombo || 0) >= 15, reward: { respect: 10 },
        text: "« Tu sais qui je suis. Dis mon nom. » — « …Heisenberg. » — « Tu es putain de droit. »" },
      { title: "Je suis le danger", cond: (s) => s.respect >= 40, reward: { cash: 100_000 }, cinematic: true,
        text: "La rue ne prononce plus son nom qu'à voix basse. Walter White est resté sur la route 25. Il reste le danger." },
    ],
    finale: [
      { who: "Walter", icon: "⚗️", line: "La chimie est l'étude de la transformation." },
      { icon: "🎩", line: "Walter White est mort. Heisenberg est né." },
      { who: "Walter", icon: "💬", line: "« Je ne suis pas en danger, Skyler. JE SUIS le danger. »" },
    ],
  },
  {
    id: "heat", icon: "🚔", name: "La Traque",
    desc: "Hank serre la toile. Restez invisible.",
    unlock: (s) => s.heat >= 25 || s.day >= 10,
    chapters: [
      { title: "Un cuisinier de génie", cond: (s) => s.heat >= 30, reward: { cash: 10_000 },
        text: "Le DEA retrouve un labo roulant vidangé, propre, professionnel. Hank grommelle : « Ce gars est bon. Trop bon. »" },
      { title: "La toile se resserre", cond: (s) => s.heat >= 50, reward: { respect: 5 },
        text: "Des caméras au carwash, des perquisitions chez les junkies. Chaque rue a des yeux." },
      { title: "Le filet", cond: (s) => s.heat >= 70, reward: { cash: 50_000 },
        text: "Alerte rouge au bureau de la DEA. Le profileur pose une photo sur la table : un homme chauve en chapeau." },
      { title: "Fantôme", cond: (s) => s.heat <= 15 && s.day >= 12, reward: { respect: 10 }, cinematic: true,
        text: "Chaleur 15. Le capitaine rend le dossier. Quelque part, un homme au chapeau traverse la rue sans se retourner." },
    ],
    finale: [
      { icon: "🚔", line: "Trois labos démantelés. Zéro preuve." },
      { who: "Hank", icon: "🕵️", line: "Hank regarde le dossier se refermer. Il sait. Il ne peut rien prouver." },
      { icon: "🌫️", line: "Le fantôme d'Albuquerque reprend du service." },
    ],
  },
  {
    id: "empire", icon: "🍗", name: "L'Empire",
    desc: "Des affaires légitimes, de l'argent très légitime.",
    unlock: (s) => Object.values(s.businesses || {}).filter((b) => b.level > 0).length >= 3,
    chapters: [
      { title: "La façade", cond: (s) => Object.values(s.businesses || {}).filter((b) => b.level > 0).length >= 3, reward: { cash: 15_000 },
        text: "Un lavage, un restaurant, une station. Tout est propre, tout est légal. C'est exactement pour ça que ça marche." },
      { title: "Blanchiment industriel", cond: (s) => (s.stats.laundered || 0) >= 500_000, reward: { cash: 50_000 },
        text: "L'argent sale entre le soir, ressort propre le matin. Saul appelle ça « la magie de la comptabilité créative »." },
      { title: "Ressources humaines", cond: (s) => Object.values(s.businesses || {}).filter((b) => b.manager).length >= 3, reward: { respect: 8 },
        text: "Des managers partout. L'empire tourne pendant que vous dormez. C'est ça, être patron." },
      { title: "Sous-sols", cond: (s) => (s.labFloors || 0) >= 2, reward: { cash: 150_000 },
        text: "Sous le Superlab, les étages s'enfoncent dans le désert. Personne n'imagine ce qu'il y a sous le parking." },
      { title: "L'empire de verre", cond: (s) => Object.values(s.businesses || {}).reduce((t, b) => t + b.level, 0) >= 150, reward: { cash: 250_000 }, cinematic: true,
        text: "Lydia projette la carte des ventes : trois pays, des dizaines de relais. L'empire ne coule plus — il flotte." },
    ],
    finale: [
      { icon: "🍗", line: "Los Pollos Hermanos. « Le meilleur poulet frit de la région. »" },
      { who: "Gus", icon: "💼", line: "Gustavo Fring sert le café. Personne ne refuse la deuxième tasse." },
      { icon: "🏙️", line: "L'empire de verre brille. Il ne lui manque qu'un cuisinier à sa hauteur." },
    ],
  },
];

// ============================================================
// v26 — RÉTENTION : ÉVÉNEMENTS DE WEEK-END
// Tirés uniquement le samedi/dimanche (date réelle).
// ============================================================

const WEEKEND_EVENTS = [
  { id: "wkKaraoke", emoji: "🎤", weight: 5, type: "choice", title: "Karaoké de Badger",
    text: "Badger a réservé la salle de karaoké du coin. Tout le monde y sera. Tout le monde.",
    choices: [
      { label: "Chanter du Fleetwood Mac (Respect +4)",
        apply(s) { s.respect = cap(s.respect + 4, 0, 100); if (Math.random() < 0.3) { addHeat(3); log("🎤 Tu as enflammé la scène... et un client bavard y était. Respect +4, Chaleur +3.", "info"); } else { log("🎤 Légendaire. Respect +4.", "good"); } } },
      { label: "Rester au labo (Pureté +2)",
        apply(s) { s.purity = cap(s.purity + 2, 0, 100); log("🎤 Pendant qu'ils chantent, tu cuisines. Pureté +2.", "good"); } },
    ] },
  { id: "wkDeaSlow", emoji: "🛋️", weight: 7, type: "auto", title: "Effectif réduit à la DEA",
    text: "Week-end oblige : les bureaux de l'agence sont à moitié vides.",
    apply(s) { addHeat(-8); log("🛋️ La DEA tourne au ralenti. Chaleur −8.", "good"); } },
  { id: "wkBlackMarket", emoji: "🕶️", weight: 7, type: "auto", title: "Marché noir en effervescence",
    text: "Des revendeurs de tout l'État font la queue. Les prix montent.",
    apply(s) { s.market = cap(s.market + 0.12, 0.7, 1.6); log("🕶️ Demande record ce week-end : marché +12%.", "good"); } },
  { id: "wkStorm", emoji: "⛈️", weight: 6, type: "auto", title: "Orage d'été",
    text: "L'averse martèle les toits. Personne ne sort — sauf tes clients les plus fidèles.",
    apply(s) { s.purity = cap(s.purity + 3, 0, 100); s.market = cap(s.market - 0.05, 0.7, 1.6); log("⛈️ Orage : pureté +3 (humidité parfaite), marché −5%.", "info"); } },
  { id: "wkGift", emoji: "🎁", weight: 5, type: "choice", title: "Cadeau de Jesse",
    text: "Jesse débarque avec un paquet emballé dans du papier « Bon anniversaire » (ce n'est l'anniversaire de personne).",
    choices: [
      { label: "Accepter (+10 000$ d'argent sale)",
        apply(s) { s.dirty += 10_000; log("🎁 Un peu d'argent sale, emballé avec amour. +10 000$.", "good"); } },
      { label: "Refuser (Respect +3)",
        apply(s) { s.respect = cap(s.respect + 3, 0, 100); log("🎁 « C'est le geste qui compte, yo. » Respect +3.", "good"); } },
    ] },
  { id: "wkRush", emoji: "🎉", weight: 10, type: "auto", title: "Rush du samedi soir",
    text: "Les fêtes battent leur plein. La demande explose.",
    apply(s) { s.market = cap(s.market + 0.15, 0.7, 1.6); s.cash += 5_000; log("🎉 Rush du week-end : marché +15%, +5 000$.", "good"); } },
  { id: "wkParty", emoji: "🪩", weight: 8, type: "auto", title: "Soirée arrosée",
    text: "Un barbecue légendaire dans le quartier. Tout le monde parle de vous — en bien.",
    apply(s) { s.respect = cap(s.respect + 5, 0, 100); addHeat(-5); log("🪩 Soirée arrosée : respect +5, chaleur −5.", "good"); } },
  { id: "wkFestival", emoji: "🎪", weight: 7, type: "auto", title: "Festival de plein air",
    text: "Foule énorme cette nuit. Les affaires tournent à plein régime.",
    apply(s) { const gain = 2_000 * totalBizLevels(); s.cash += gain; log("🎪 Festival : les affaires rapportent un bonus de " + fmt(gain) + "$.", "good"); } },
  { id: "wkSunday", emoji: "😴", weight: 8, type: "auto", title: "Dimanche tranquille",
    text: "Personne ne travaille. Même la DEA. Journée parfaite pour peaufiner la mixture.",
    apply(s) { s.purity = cap(s.purity + 5, 0, 100); log("😴 Dimanche tranquille : pureté +5.", "good"); } },
  { id: "wkAudit", emoji: "😰", weight: 6, type: "choice", title: "Contrôle fiscal surprise",
    text: "Un inspecteur très zélé fouille les comptes du carwash. Il faut réagir.",
    choices: [
      { label: "Payer l'avocat de Saul (−20 000$)", apply(s) { s.cash = Math.max(0, s.cash - 20_000); log("😰 Avocat payé. Le contrôle se referme.", "good"); } },
      { label: "Jouer la montre", apply(s) { if (Math.random() < 0.5) { log("😰 Le contrôle n'a rien trouvé. Ouf.", "good"); } else { addHeat(10); log("😰 L'inspecteur a des doutes. Chaleur +10.", "bad"); } } },
    ] },
  { id: "wkCousins", emoji: "🧢", weight: 5, type: "choice", title: "Des cousins curieux",
    text: "Deux inconnus photographient l'arrière du Superlab. Des amateurs ou pire ?",
    choices: [
      { label: "Payer le silence (−30 000$)", apply(s) { s.cash = Math.max(0, s.cash - 30_000); log("🧢 Silence acheté. Les photos disparaissent.", "good"); } },
      { label: "Les ignorer", apply(s) { addHeat(12); log("🧢 Les photos circulent déjà. Chaleur +12.", "bad"); } },
    ] },
];


// ============================================================
// v57 — DES CHOIX QUI PÈSENT : événements à conséquences réelles
// ============================================================
EVENTS.push(
  {
    id: "deaMole", loc: "dea", emoji: "🕵️", weight: 4, type: "choice",
    cond: (s) => s.day >= 10,
    title: "Un indicateur propose ses services",
    text: "Un employé de la DEA vous aborde en cachette. Il peut vous passer les infos sur les enquêtes... contre de l'argent.",
    choices: [
      { label: "Le payer 60 000$ (chaleur −12)", can: (s) => s.cash >= 60_000,
        apply(s) { s.cash -= 60_000; s.heat = cap(s.heat - 12, 0, 100); log("🕵️ Indicateur acheté. Les dossiers vous concernant s'amincissent. Chaleur −12.", "good"); scheduleEvent("moleBurn", 4 + Math.floor(Math.random() * 3), "Ton indicateur va être grillé — prépare-toi à réagir."); } },
      { label: "Le faire chanter (respect +4, chaleur +6)",
        apply(s) { s.respect = cap(s.respect + 4, 0, 100); addHeat(6); log("🕵️ Tu tiens un indicateur de la DEA par la gorge. Respect +4, chaleur +6.", "event"); scheduleEvent("moleBurn", 2 + Math.floor(Math.random() * 3), "L'indicateur que tu fais chanter va être découvert."); } },
      { label: "Refuser et partir", apply(s) { s.respect = cap(s.respect - 1, 0, 100); log("🕵️ Tu l'as éconduit. Prudent, mais aucun gain. Respect −1.", "bad"); } },
    ],
  },
  {
    id: "moleBurn", loc: "dea", emoji: "🔥", weight: 0, type: "choice",
    title: "Ton indicateur est grillé",
    text: "La sécurité interne de la DEA a flairé la fuite. Ton contact supplie d'être extrait avant l'interrogatoire.",
    choices: [
      { label: "L'extraire en catastrophe (−25 000$)", can: (s) => s.cash >= 25_000,
        apply(s) { s.cash -= 25_000; s.heat = cap(s.heat - 8, 0, 100); s.respect = cap(s.respect + 2, 0, 100); log("🔥 Indicateur exfiltré. Il te devra tout. Chaleur −8, respect +2.", "good"); } },
      { label: "L'abandonner", apply(s) { addHeat(10); s.respect = cap(s.respect - 2, 0, 100); log("🔥 Il a parlé sous l'interrogatoire. Chaleur +10, respect −2.", "bad"); } },
    ],
  },
  {
    id: "cartelShake", loc: "hq", emoji: "💰", weight: 4, type: "choice",
    cond: (s) => s.day >= 12,
    title: "Le cartel passe à la caisse",
    text: "Un envoyé d'Eladio frappe à la porte du QG. Le cartel « protège » ton empire désormais — et veut sa part.",
    choices: [
      { label: "Payer le tribut (−5% du cash, respect +2)", can: (s) => s.cash > 0,
        apply(s) { const t = Math.min(Math.floor(s.cash * 0.05), 200_000); s.cash -= t; s.respect = cap(s.respect + 2, 0, 100); log("💰 Tribut payé : " + fmt(t) + "$. Le cartel est apaisé. Respect +2.", "good"); scheduleEvent("cartelPeace", 5 + Math.floor(Math.random() * 4), "La paix avec le cartel porterait ses fruits."); } },
      { label: "Refuser frontalement (respect +5, chaleur +8)",
        apply(s) { s.respect = cap(s.respect + 5, 0, 100); addHeat(8); log("💰 Tu as repoussé l'envoyé du cartel. Ils n'oublieront pas. Respect +5, chaleur +8.", "event"); scheduleEvent("cartelRetaliation", 2 + Math.floor(Math.random() * 2), "Le cartel prépare sa riposte."); } },
      { label: "Saisir sa marchandise (respect ≥ 40)", can: (s) => s.respect >= 40,
        apply(s) { s.cash += 100_000; s.respect = cap(s.respect + 8, 0, 100); addHeat(12); log("💰 Marchandise de l'envoyé saisie : +100 000$. Respect +8, chaleur +12.", "event"); scheduleEvent("cartelRetaliation", 2 + Math.floor(Math.random() * 2), "Le cartel prépare sa riposte."); } },
    ],
  },
  {
    id: "cartelPeace", loc: "hq", emoji: "🕊️", weight: 0, type: "auto",
    title: "Paix avec le cartel",
    text: "Le tribut a apaisé Eladio. Des portes s'ouvrent dans tout le sud-ouest.",
    apply(s) { s.heat = cap(s.heat - 5, 0, 100); s.respect = cap(s.respect + 3, 0, 100); log("🕊️ Paix avec le cartel. Chaleur −5, respect +3.", "good"); },
  },
  {
    id: "landlordSnoop", loc: "house", emoji: "🏠", weight: 4, type: "choice",
    title: "Le propriétaire fouine",
    text: "Ton propriétaire rôde autour de la maison et pose des questions sur les allées et venues nocturnes.",
    choices: [
      { label: "Acheter la maison (−80 000$)", can: (s) => s.cash >= 80_000,
        apply(s) { s.cash -= 80_000; s.heat = cap(s.heat - 4, 0, 100); s.respect = cap(s.respect + 3, 0, 100); log("🏠 La maison est à toi. Plus de propriétaire, plus de questions. Chaleur −4, respect +3.", "good"); } },
      { label: "Le soudoyer (−15 000$)", can: (s) => s.cash >= 15_000,
        apply(s) { s.cash -= 15_000; s.heat = cap(s.heat - 3, 0, 100); log("🏠 Enveloppe discrète. Il ne verra plus rien. Chaleur −3.", "good"); } },
      { label: "L'intimider", apply(s) { s.respect = cap(s.respect + 2, 0, 100); addHeat(5); log("🏠 Il est reparti tout pâle. Mais il en parlera. Respect +2, chaleur +5.", "event"); } },
    ],
  },
  {
    id: "studentRecruit", loc: "superlab", emoji: "🎓", weight: 4, type: "choice",
    cond: (s) => s.day >= 8,
    title: "Une étudiante surdouée",
    text: "Une étudiante en chimie tient des calculs de pureté dignes d'un professionnel. Elle veut travailler pour toi.",
    choices: [
      { label: "L'embaucher (−30 000$, pureté +5)", can: (s) => s.cash >= 30_000,
        apply(s) { s.cash -= 30_000; s.purity = cap(s.purity + 5, 0, 100); log("🎓 Elle cuisine déjà mieux que la moitié de l'équipe. Pureté +5.", "good"); } },
      { label: "Prendre juste une astuce (pureté +1)", apply(s) { s.purity = cap(s.purity + 1, 0, 100); log("🎓 Un conseil de synthèse ingénieux. Pureté +1.", "good"); } },
      { label: "La présenter à Gus (Gus dans l'équipe)", can: (s) => s.staff.includes("gus"),
        apply(s) { s.cash += 20_000; s.respect = cap(s.respect + 3, 0, 100); log("🎓 Gus la recrute pour le labo officiel. Prime : +20 000$, respect +3.", "good"); } },
    ],
  },
);

// v57 : visiteurs, répliques, noms, humeurs
EVENT_VISITORS.deaMole = { shirt: "#3a4a5a", pants: "#2a2a34", hair: "#2a2a2a", glasses: true, skin: "#e8b58a" };
EVENT_VISITORS.moleBurn = { shirt: "#4a4252", pants: "#2a2a34", hair: "#3a2a1a", beard: "#3a2a1a", skin: "#dfb08e" };
EVENT_VISITORS.cartelShake = CHAR_LOOKS.eladio;
EVENT_VISITORS.cartelPeace = CHAR_LOOKS.eladio;
EVENT_VISITORS.landlordSnoop = { shirt: "#8a7a5a", pants: "#4a4438", hair: "#8a8a8a", flatCap: "#5a5248", skin: "#eec09a" };
EVENT_VISITORS.studentRecruit = { shirt: "#c8d8e8", pants: "#3a4a5a", hair: "#e8c86a", hairLong: true, necklace: true, skin: "#eec09a" };

EVENT_QUOTES.deaMole = ["Je peux faire disparaître des dossiers. Le prix : soixante mille.", "Votre nom revient chaque semaine dans les comptes rendus.", "Je risque ma carrière en étant ici. Soyez rapide."];
EVENT_QUOTES.moleBurn = ["Ils savent. Ils SAVENT ! Sors-moi d'ici !", "Deux jours et je passe à l'interrogatoire.", "Tout ce que tu veux — mais sors-moi de là !"];
EVENT_QUOTES.cartelShake = ["Eladio considère ton empire comme... un franchisé.", "Le cartel protège. Le cartel prélève.", "C'est une formalité. Une très chère formalité."];
EVENT_QUOTES.cartelPeace = ["Eladio est satisfait. Pour l'instant.", "Les routes du sud sont ouvertes à tes camions.", "La paix a un prix. Tu l'as payé."];
EVENT_QUOTES.landlordSnoop = ["Il y a des allées et venues la nuit. Beaucoup.", "J'ai juste quelques questions... routine.", "Je pose des questions, c'est mon droit."];
EVENT_QUOTES.studentRecruit = ["Votre rendement théorique est sous-optimal. Je peux faire mieux.", "J'ai recalculé votre synthèse sur trois pages.", "J'ai besoin d'un vrai laboratoire. Le vôtre fera l'affaire."];

CHAR_NAMES.deaMole = "Indicateur";
CHAR_NAMES.moleBurn = "Indicateur";
CHAR_NAMES.cartelShake = "Envoyé";
CHAR_NAMES.cartelPeace = "Envoyé";
CHAR_NAMES.landlordSnoop = "Propriétaire";
CHAR_NAMES.studentRecruit = "Étudiante";

EV_MOODS.deaMole = "worried";
EV_MOODS.moleBurn = "angry";
EV_MOODS.cartelShake = "angry";
EV_MOODS.cartelPeace = "happy";
EV_MOODS.landlordSnoop = "worried";
EV_MOODS.studentRecruit = "happy";


// ============================================================
// v58 — OBJECTIFS DE LÉGENDE : la partie continue après la victoire
// ============================================================
const LEGEND_GOALS = [
  { id: "empire500", icon: "🏰", name: "Empire de verre", desc: "Atteindre 500 000 000$ en caisse.", prog: (s) => s.cash || 0, target: () => 500_000_000, coins: 3 },
  { id: "respect100", icon: "👑", name: "Respect total", desc: "Atteindre 100 de respect.", prog: (s) => s.respect || 0, target: () => 100, coins: 3 },
  { id: "purete100", icon: "💎", name: "Pureté absolue", desc: "Atteindre 100 de pureté.", prog: (s) => s.purity || 0, target: () => 100, coins: 3 },
  { id: "relics6", icon: "🗄️", name: "Collectionneur", desc: "Posséder 6 reliques.", prog: (s) => (s.relics || []).length, target: () => 6, coins: 2 },
  { id: "days100", icon: "🗓️", name: "Cent jours", desc: "Survivre 100 jours.", prog: (s) => s.day || 0, target: () => 100, coins: 3 },
  { id: "floors5", icon: "🏗️", name: "Tour de cristal", desc: "Construire 5 étages de superlab.", prog: (s) => s.labFloors || 0, target: () => 5, coins: 2 },
];

STORY_ARCS.push({
  id: "era", icon: "👑", name: "L'Ère Légende",
  desc: "L'empire est bâti. Que reste-t-il à conquérir ?",
  unlock: (s) => s.day >= 25 || (s.prestiges || 0) >= 1,
  chapters: [
    { title: "L'argent ne dort plus", cond: (s) => (s.cash || 0) >= 50_000_000, reward: { respect: 5 },
      text: "Cinquante millions. Les banques vous appellent « Monsieur ». Elles se trompent de nom — mais elles appellent." },
    { title: "Le nom qui traverse les frontières", cond: (s) => (s.respect || 0) >= 70, reward: { cash: 250_000 },
      text: "Phoenix, Tucson, El Paso : le bleu circule. On ne dit plus « la méthode ». On dit son nom." },
    { title: "L'héritage", cond: (s) => (s.prestiges || 0) >= 1, reward: { respect: 10 }, cinematic: true,
      text: "Un empire repris à zéro, une identité de plus, et toujours le même homme derrière. La légende, elle, ne se réinitialise pas." },
  ],
  finale: [
    { who: "Walter", icon: "👑", line: "J'ai tout bâti deux fois. La deuxième, mieux." },
    { icon: "👑", line: "La légende ne se vend pas. Elle se transmet." },
  ],
});
