// ============================================================
// HEISENBERG TYCOON — Données de jeu
// Tous les contenus éditables : labos, équipe, améliorations,
// événements. Modifier ici suffit pour équilibrer le jeu.
// ============================================================

const SAVE_KEY = "heisenberg-tycoon-save-v2";

// Objectif de victoire : argent propre accumulé
const VICTORY_CASH = 10_000_000;

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
    id: "hank", emoji: "🚔", weight: 10,
    type: "auto",
    title: "Hank Schrader est sur votre piste",
    text: "Un SUV orange traîne près du RV. La DEA resserre l'étau.",
    apply(s) { addHeat(18); log("🚔 Hank ratisse large. Chaleur +18.", "bad"); },
  },
  {
    id: "tuco", emoji: "🤯", weight: 8,
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
    id: "cartel", emoji: "🇲🇽", weight: 7,
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
    id: "deasurveillance", emoji: "👀", weight: 9,
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
    id: "robbery", emoji: "🔪", weight: 6,
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
    id: "jesseRage", emoji: "😤", weight: 7,
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
    id: "blackMarket", emoji: "🕶️", weight: 5,
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
    id: "informant", emoji: "🐀", weight: 6,
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
    id: "cartelTribute", emoji: "💀", weight: 6,
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
    id: "raidWarning", emoji: "🚨", weight: 10,
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
    id: "gusMeeting", emoji: "🐔", weight: 7,
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
    id: "purityDuel", emoji: "⚔️", weight: 6,
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
    id: "wholesale", emoji: "🏪", weight: 5,
    type: "auto",
    title: "Vente en gros",
    text: "Un distributeur régional veut un lot immédiatement, cash.",
    apply(s) {
      s.dirty += 60_000;
      addHeat(8);
      log("🏪 Vente en gros : +60 000$ d'argent sale. Chaleur +8.", "bad");
    },
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
  { id: "streak7", icon: "🔥", name: "Série chaude", desc: "Vendre 7 jours de suite", check: (s) => s.streak >= 7, reward: { cash: 25_000 } }
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
    desc: "Le RV grise, cloquamant sous le soleil. Ça sent le chou-fleur et la dangerosité.",
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
