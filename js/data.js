// ============================================================
// HEISENBERG TYCOON — Données de jeu
// Tous les contenus éditables : labos, équipe, améliorations,
// événements. Modifier ici suffit pour équilibrer le jeu.
// ============================================================

const SAVE_KEY = "heisenberg-tycoon-save-v1";

// Objectif de victoire : argent propre accumulé
const VICTORY_CASH = 10_000_000;

// Points d'action par jour
const AP_PER_DAY = 3;

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
    cost: 0, salary: 500,
    desc: "+50% cuisson, −3 pureté. Il est dans le RV dès le début.",
    effect: { cookMult: 1.5, purity: -3 },
  },
  {
    id: "todd", name: "Todd Alquist", emoji: "😐",
    cost: 60_000, salary: 2_000,
    desc: "+15% cuisson, +5 pureté. Poli, efficace, inquiétant.",
    effect: { cookMult: 1.15, purity: 5 },
  },
  {
    id: "huell", name: "Huell Babineaux", emoji: "💼",
    cost: 30_000, salary: 1_500,
    desc: "+25% d'argent sur les ventes.",
    effect: { sellCashMult: 1.25 },
  },
  {
    id: "saul", name: "Saul Goodman", emoji: "⚖️",
    cost: 50_000, salary: 3_000,
    desc: "Blanchiment à 90%, vous protège en cas de descente.",
    effect: { launderRate: 0.9, arrestProtect: true },
  },
  {
    id: "mike", name: "Mike Ehrmantraut", emoji: "🎩",
    cost: 80_000, salary: 4_000,
    desc: "−8 chaleur/jour, ventes 40% moins risquées.",
    effect: { heatPerDay: -8, sellHeatMult: 0.6 },
  },
  {
    id: "gus", name: "Gus Fring", emoji: "🐔",
    cost: 200_000, salary: 8_000,
    desc: "Prix de vente +60%. Débloque le Superlab.",
    effect: { priceMult: 1.6, unlockSuperlab: true },
  },
  {
    id: "lydia", name: "Lydia Rodarte-Quayle", emoji: "📋",
    cost: 500_000, salary: 15_000,
    desc: "Marché tchèque : quantités vendues ×2.",
    effect: { sellMult: 2 },
  },
];

// ------------------------------------------------------------
// AMÉLIORATIONS — achats définitifs
// ------------------------------------------------------------
const UPGRADES = [
  { id: "mask", name: "Masques & combinaisons", emoji: "😷", cost: 15_000, desc: "+8 pureté." },
  { id: "gear", name: "Matériel de pro", emoji: "⚗️", cost: 40_000, desc: "+5 pureté, +20% cuisson." },
  { id: "methylamine", name: "Réservoir de méthylamine", emoji: "🛢️", cost: 60_000, desc: "+40% cuisson." },
  { id: "van", name: "Fourgon discret", emoji: "🚐", cost: 80_000, desc: "Les ventes génèrent 2× moins de chaleur." },
  { id: "carwash", name: "Lavages A1A", emoji: "🧽", cost: 100_000, desc: "Blanchiment +10% de taux, 3× plus de volume/jour." },
  { id: "cameras", name: "Caméras & gardes", emoji: "📹", cost: 120_000, desc: "−5 chaleur/jour, descentes moins graves." },
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
