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
          log("🇲🇽 Le cartel paie comptant. Chaleur +15.", "bad");
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
      const gain = Math.min(2, lab().cap - s.stock);
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
];

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
