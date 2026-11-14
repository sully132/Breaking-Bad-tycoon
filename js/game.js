// ============================================================
// HEISENBERG TYCOON — Moteur de jeu (v4)
// État, actions, boucle de journée, idle, contrats, succès,
// marché, événements + chaînes, investissements, prestige,
// séries de vente, frénésie, cristal doré, UI, sauvegarde.
// ============================================================

// ---------- État ----------
function newGame() {
  return {
    day: 1,
    ap: AP_PER_DAY,
    cash: 1_000,
    dirty: 0,
    stock: 0,
    purity: 70,
    heat: 0,
    respect: 10,
    labLevel: 0,
    capBonus: 0,
    market: 1,
    staff: ["jesse"],
    upgrades: [],
    flags: { cookPenalty: 1, priceBonus: 1, precursorDiscount: 1 },
    stats: { cooked: 0, sold: 0, laundered: 0, contractsDone: 0, totalEarned: 0 },
    achievements: [],
    contract: null,
    contractCooldown: 0,
    goal: VICTORY_CASH,
    endless: false,
    taps: 0,
    investments: {},
    legendPoints: 0,
    prestiges: 0,
    streak: 0,
    soldToday: false,
    frenzyUntil: 0,
    pendingEvents: [],
    goldenCaught: 0,
    visitedToday: {},
    opps: [],
    legendCoins: 0,
    legendUpgrades: {},
    dailyMissions: { day: 0, list: [] },
    businesses: { carwash: { level: 1, manager: false, pooled: 0 } },
    buyAmount: "1",
    lastSeen: Date.now(),
    gameOver: false,
    victory: false,
    log: [],
  };
}

let state = newGame();

// ---------- Utilitaires ----------
function fmt(n) {
  return Math.round(n).toLocaleString("fr-FR");
}

function cap(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function hasStaff(id) {
  return state.staff.includes(id);
}

function hasUpgrade(id) {
  return state.upgrades.includes(id);
}

function staffEffect(key) {
  let total = 0;
  for (const id of state.staff) {
    const member = STAFF.find((s) => s.id === id);
    if (member && member.effect[key] !== undefined) total += member.effect[key];
  }
  return total;
}

function hasStaffEffect(key) {
  return state.staff.some((id) => {
    const member = STAFF.find((s) => s.id === id);
    return member && member.effect[key];
  });
}

function lab() {
  return LABS[state.labLevel];
}

// ---------- Empire (v10) ----------
function bizDef(id) {
  return BUSINESSES.find((b) => b.id === id);
}

function bizState(id) {
  if (!state.businesses[id]) state.businesses[id] = { level: 0, manager: false, pooled: 0 };
  return state.businesses[id];
}

function bizLevel(id) {
  return (state.businesses[id] && state.businesses[id].level) || 0;
}

function hasManager(id) {
  return !!(state.businesses[id] && state.businesses[id].manager);
}

function bizUnlocked(b) {
  try { return b.unlock(state); } catch (e) { return false; }
}

function bizMilestoneMult(level) {
  return Math.pow(2, BUSINESS_MILESTONES.filter((m) => level >= m).length);
}

function bizNextMilestone(level) {
  return BUSINESS_MILESTONES.find((m) => level < m) || null;
}

function bizRevPerSec(id) {
  const b = bizDef(id);
  if (!b || bizLevel(id) <= 0) return 0;
  let rev = b.baseRev * bizLevel(id) * bizMilestoneMult(bizLevel(id));
  rev *= legendMult();
  rev *= 1 + state.respect / 250;
  if (frenzyActive()) rev *= 2;
  return rev;
}

function totalEmpirePerSec() {
  return BUSINESSES.reduce((t, b) => t + (bizUnlocked(b) ? bizRevPerSec(b.id) : 0), 0);
}

function totalBizLevels() {
  return Object.values(state.businesses).reduce((t, b) => t + (b.level || 0), 0);
}

function bizSingleCost(b, level) {
  return Math.ceil(b.baseCost * Math.pow(b.costMult, level));
}

function bizCostFor(id, n) {
  const b = bizDef(id);
  const lvl = bizLevel(id);
  let total = 0;
  for (let i = 0; i < n; i++) total += bizSingleCost(b, lvl + i);
  return total;
}

function bizMaxAffordable(id) {
  const b = bizDef(id);
  let lvl = bizLevel(id);
  let cash = state.cash;
  let n = 0;
  while (n < 1_000) {
    const c = bizSingleCost(b, lvl + n);
    if (cash < c) break;
    cash -= c;
    n += 1;
  }
  return n;
}

function bizBuyCount(id) {
  if (state.buyAmount === "max") return Math.max(1, bizMaxAffordable(id));
  return parseInt(state.buyAmount, 10) || 1;
}

function bizPoolCap(id) {
  return bizRevPerSec(id) * (hasManager(id) ? POOL_CAP_MANAGED : POOL_CAP_RAW);
}

function fmtMoney(n) {
  const abs = Math.abs(n);
  if (abs >= 1e15) return (n / 1e15).toFixed(2) + " Qa$";
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + " T$";
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + " Md$";
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + " M$";
  if (abs >= 10_000) return Math.round(n / 1_000) + " k$";
  return fmt(n) + "$";
}

function stockCap() {
  return lab().cap + (state.capBonus || 0) + 5 * legendLevel("vault");
}

function invLevel(id) {
  return (state.investments && state.investments[id]) || 0;
}

function legendMult() {
  return 1 + PRESTIGE_POINT_BONUS * (state.legendPoints || 0);
}

function legendLevel(id) {
  return (state.legendUpgrades && state.legendUpgrades[id]) || 0;
}

function frenzyActive() {
  return performance.now() < (state.frenzyUntil || 0);
}

function streakBonus() {
  return 1 + Math.min(state.streak || 0, 10) * 0.02;
}

function prestigePoints() {
  return Math.floor((state.stats.totalEarned || 0) / PRESTIGE_MIN_EARNED);
}

function purityNow() {
  let bonus = staffEffect("purity");
  if (hasUpgrade("mask")) bonus += 8;
  if (hasUpgrade("gear")) bonus += 5;
  if (hasUpgrade("generator")) bonus += 10;
  return cap(state.purity + bonus, 0, 100);
}

function cookMult() {
  let m = 1;
  for (const id of state.staff) {
    const member = STAFF.find((s) => s.id === id);
    if (member && member.effect.cookMult) m *= member.effect.cookMult;
  }
  if (hasUpgrade("gear")) m *= 1.2;
  if (hasUpgrade("methylamine")) m *= 1.4;
  if (hasUpgrade("generator")) m *= 1.25;
  m *= 1 + invLevel("chemists") * 0.10;
  m *= state.flags.cookPenalty;
  m *= legendMult();
  m *= 1 + 0.15 * legendLevel("cook");
  if (frenzyActive()) m *= 2;
  return m;
}

function pricePerKg() {
  let p = 20_000 + purityNow() * 400;
  p *= state.flags.priceBonus;
  p *= 1 + state.respect / 200;
  p *= state.market || 1;
  const gus = STAFF.find((s) => s.id === "gus");
  if (hasStaff("gus") && gus) p *= gus.effect.priceMult;
  if (hasUpgrade("railnetwork")) p *= 1.3;
  p *= 1 + invLevel("marketing") * 0.03;
  p *= legendMult();
  p *= 1 + 0.15 * legendLevel("price");
  p *= streakBonus();
  return p;
}

function launderRate() {
  let r = 0.65;
  if (hasStaffEffect("launderRate")) r = 0.9;
  if (hasUpgrade("carwash")) r += 0.1;
  r += invLevel("accountants") * 0.02;
  r += 0.03 * legendLevel("launder");
  return cap(r, 0, 0.98);
}

function launderVolume() {
  let v = hasUpgrade("carwash") ? 200_000 : 50_000;
  v += 2_500 * bizLevel("carwash");
  v += 25_000 * bizLevel("laundry");
  return v;
}

function addHeat(n) {
  if (n > 0) n = Math.round(n * (1 - 0.06 * legendLevel("cool")));
  state.heat = cap(state.heat + n, 0, 100);
}

function log(msg, kind = "") {
  state.log.unshift({ day: state.day, msg, kind });
  if (state.log.length > 60) state.log.pop();
}

function playSfx(name) {
  try {
    if (typeof sfx !== "undefined" && sfx && typeof sfx[name] === "function") sfx[name]();
  } catch (e) { /* audio indisponible */ }
}

// ---------- Popups flottants sur la scène ----------
function spawnPopup(text, kind = "info") {
  try {
    const layer = document.getElementById("popup-layer");
    if (!layer) return;
    const el = document.createElement("div");
    el.className = `popup ${kind}`;
    el.textContent = text;
    el.style.left = `${25 + Math.random() * 50}%`;
    el.style.top = `${30 + Math.random() * 35}%`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  } catch (e) { /* pas de DOM */ }
}

// ---------- Toasts (succès, infos) ----------
function toast(title, desc = "") {
  try {
    const box = document.getElementById("toasts");
    if (!box) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<div class="t-title">${title}</div>${desc ? `<div class="t-desc">${desc}</div>` : ""}`;
    box.appendChild(el);
    setTimeout(() => el.classList.add("out"), 3600);
    setTimeout(() => el.remove(), 4000);
  } catch (e) { /* pas de DOM */ }
}

// ---------- Succès ----------
function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (state.achievements.includes(a.id)) continue;
    let unlocked = false;
    try { unlocked = a.check(state); } catch (e) { unlocked = false; }
    if (unlocked) {
      state.achievements.push(a.id);
      if (a.reward.cash) state.cash += a.reward.cash;
      if (a.reward.respect) state.respect = cap(state.respect + a.reward.respect, 0, 100);
      toast(`${a.icon} Succès : ${a.name}`, a.desc + (a.reward.cash ? ` — +${fmt(a.reward.cash)}$` : "") + (a.reward.respect ? ` — +${a.reward.respect} respect` : ""));
      playSfx("upgrade");
      log(`${a.icon} Succès débloqué : ${a.name}.`, "good");
    }
  }
}

// ---------- Contrats ----------
function generateContract() {
  const client = CONTRACT_CLIENTS[Math.floor(Math.random() * CONTRACT_CLIENTS.length)];
  const kg = Math.max(1, Math.round(lab().cook * cookMult() * rand(1.5, 3) * 10) / 10);
  state.contract = {
    emoji: client.emoji,
    client: client.name,
    kg,
    days: 4 + Math.floor(kg / 3),
    reward: Math.round(kg * pricePerKg() * rand(1.3, 1.6)),
    progress: 0,
  };
  log(`📋 Nouveau contrat : ${kg} kg pour ${client.name} en ${state.contract.days} jours.`, "event");
  toast("📋 Nouveau contrat", `${client.name} veut ${kg} kg !`);
}

function deliverContract() {
  const c = state.contract;
  if (!c || state.stock <= 0) return;
  const move = Math.min(state.stock, c.kg - c.progress);
  if (move <= 0) return;
  state.stock = Math.round((state.stock - move) * 10) / 10;
  c.progress = Math.round((c.progress + move) * 10) / 10;
  spawnPopup(`Livré : ${c.progress}/${c.kg} kg`, "info");
  playSfx("click");
  if (c.progress >= c.kg) completeContract(true);
  render();
  save();
}

function completeContract(success) {
  const c = state.contract;
  if (!c) return;
  if (success) {
    state.dirty += c.reward;
    state.respect = cap(state.respect + 4, 0, 100);
    state.stats.contractsDone += 1;
    state.stats.totalEarned += c.reward;
    state.soldToday = true;
    spawnPopup(`Contrat réussi ! +${fmt(c.reward)}$`, "money");
    playSfx("cash");
    log(`📋 Contrat honoré : ${c.kg} kg livrés à ${c.client} pour ${fmt(c.reward)}$. Respect +4.`, "good");
  } else {
    state.respect = cap(state.respect - 5, 0, 100);
    playSfx("spend");
    log(`📋 Contrat raté : ${c.client} est furieux. Respect −5.`, "bad");
    toast("📋 Contrat échoué", `${c.client} ne vous fera plus confiance...`);
  }
  state.contract = null;
  state.contractCooldown = CONTRACT_COOLDOWN_DAYS;
  if (success) trackMission("contract", 1);
}

// ---------- Production idle (temps réel) ----------
function idleTick() {
  if (state.gameOver || state.victory) return;
  const kg = lab().cook * cookMult() * 0.04;
  if (kg <= 0 || state.stock >= stockCap()) return;
  const space = stockCap() - state.stock;
  const gain = Math.min(kg, space);
  state.stock = Math.round((state.stock + gain) * 100) / 100;
  state.stats.cooked = Math.round((state.stats.cooked + gain) * 100) / 100;
  if (typeof scene !== "undefined" && scene) scene.FX.cook = performance.now();
  if (Math.random() < 0.2) spawnPopup(`+${gain.toFixed(2)} kg (idle)`, "crystal");
  checkAchievements();
  render();
  save();
}

// ---------- Bonus de tap sur la scène ----------
function tapBoost(x = 0.5, y = 0.5) {
  if (state.gameOver || state.victory) return;
  state.taps += 1;
  trackMission("tap", 1);
  const mult = frenzyActive() ? 2 : 1;
  const gain = Math.max(TAP_CASH_MIN, Math.round(pricePerKg() * TAP_CASH_RATE)) * mult;
  state.cash += gain;
  spawnPopup(`+${fmt(gain)}$`, "money");
  playSfx("tap");
  if (state.taps % 25 === 0) {
    state.respect = cap(state.respect + 1, 0, 100);
    spawnPopup("La rue vous remarque ! Respect +1", "info");
  }
  checkAchievements();
  render();
  save();
}

// ---------- Cristal doré ----------
function goldenCollect() {
  if (state.gameOver || state.victory) return;
  state.goldenCaught += 1;
  const roll = Math.floor(Math.random() * 5);
  if (roll === 0) {
    const gain = Math.max(500, Math.round(pricePerKg() * TAP_CASH_RATE * 15));
    state.cash += gain;
    spawnPopup(`💎 +${fmt(gain)}$ !`, "money");
    toast("💎 Cristal doré", `Jackpot : +${fmt(gain)}$ !`);
  } else if (roll === 1) {
    addHeat(-10);
    spawnPopup("💎 Chaleur −10", "info");
    toast("💎 Cristal doré", "Les flics perdent votre trace. Chaleur −10.");
  } else if (roll === 2) {
    state.purity = cap(state.purity + 5, 0, 100);
    spawnPopup("💎 Pureté +5%", "crystal");
    toast("💎 Cristal doré", "Un échantillon parfait. Pureté +5%.");
  } else if (roll === 3) {
    state.frenzyUntil = performance.now() + 30_000;
    spawnPopup("💎 FRÉNÉSIE ×2 !", "golden");
    toast("💎 FRÉNÉSIE !", "Cuisson et taps ×2 pendant 30 secondes !");
  } else {
    const gain = Math.min(2, stockCap() - state.stock);
    state.stock = Math.round((state.stock + gain) * 10) / 10;
    spawnPopup(`💎 +${gain.toFixed(1)} kg`, "crystal");
    toast("💎 Cristal doré", `Un petit cadeau du ciel : +${gain.toFixed(1)} kg.`);
  }
  playSfx("golden");
  trackMission("golden", 1);
  checkAchievements();
  render();
  save();
}

// ---------- Empire : moteur idle (v10) ----------
function bizTick() {
  if (state.gameOver || state.victory) return;
  const now = Date.now();
  const dt = Math.min(5, (now - (state._lastTick || now)) / 1000);
  state._lastTick = now;
  let dirty = false;
  for (const b of BUSINESSES) {
    if (!bizUnlocked(b) || bizLevel(b.id) <= 0) continue;
    const st = bizState(b.id);
    const rate = bizRevPerSec(b.id);
    if (rate <= 0) continue;
    const capAmt = bizPoolCap(b.id);
    if (st.pooled < capAmt) {
      st.pooled = Math.min(capAmt, st.pooled + rate * dt);
      dirty = true;
    }
  }
  if (dirty && document.querySelector(".tab-page[data-page='empire']")?.classList.contains("active")) {
    renderBusinesses();
  }
}

function collectBusiness(id, silent = false) {
  const st = bizState(id);
  const b = bizDef(id);
  if (!b || st.level <= 0 || st.pooled < 1) return 0;
  const gain = Math.floor(st.pooled);
  st.pooled -= gain;
  state.dirty += gain;
  state.stats.totalEarned += gain;
  trackMission("collect", 1);
  if (!silent) {
    spawnPopup(`+${fmtMoney(gain)} (sale)`, "money");
    playSfx("cash");
    if (typeof haptic === "function") haptic(12);
  }
  return gain;
}

function collectAllBusinesses() {
  let total = 0;
  for (const b of BUSINESSES) total += collectBusiness(b.id, true);
  if (total > 0) {
    spawnPopup(`+${fmtMoney(total)} (sale)`, "money");
    playSfx("cash");
    if (typeof haptic === "function") haptic(18);
    log(`💼 Collecte de l'empire : +${fmtMoney(total)} d'argent sale.`, "good");
  }
  return total;
}

function buyBusiness(id) {
  const b = bizDef(id);
  if (!b || !bizUnlocked(b)) return;
  const n = state.buyAmount === "max" ? bizMaxAffordable(id) : parseInt(state.buyAmount, 10);
  if (!n || n < 1) return;
  const cost = bizCostFor(id, n);
  if (state.cash < cost) return;
  state.cash -= cost;
  const st = bizState(id);
  const before = st.level;
  st.level += n;
  playSfx("upgrade");
  if (typeof haptic === "function") haptic(10);
  const crossed = BUSINESS_MILESTONES.filter((m) => before < m && st.level >= m);
  if (crossed.length > 0) {
    spawnPopup(`🚀 ${b.name} ×2 !`, "golden");
    toast(`${b.emoji} Palier atteint !`, `${b.name} niveau ${st.level} — revenus ×2 !`);
    playSfx("golden");
    log(`🚀 ${b.name} atteint le niveau ${st.level} : revenus ×2 !`, "good");
  }
  checkAchievements();
  renderBusinesses();
  renderStats();
  save();
}

function hireManager(id) {
  const b = bizDef(id);
  if (!b || !b.manager || hasManager(id)) return;
  if (state.cash < b.manager.cost) return;
  state.cash -= b.manager.cost;
  bizState(id).manager = true;
  playSfx("upgrade");
  if (typeof haptic === "function") haptic(25);
  toast(`${b.manager.emoji} ${b.manager.name} embauché !`, `${b.name} produit automatiquement (même app fermée, 2 h).`);
  log(`👔 ${b.manager.name} gère désormais ${b.name}. Production automatique.`, "good");
  checkAchievements();
  renderBusinesses();
  renderStats();
  save();
}

function setBuyAmount(v) {
  state.buyAmount = v;
  playSfx("click");
  renderBusinesses();
  save();
}

function checkOfflineEarnings() {
  const elapsed = Math.max(0, (Date.now() - (state.lastSeen || Date.now())) / 1000);
  if (elapsed < 30) return null;
  const report = [];
  let total = 0;
  for (const b of BUSINESSES) {
    if (!bizUnlocked(b) || bizLevel(b.id) <= 0) continue;
    const rate = bizRevPerSec(b.id);
    if (rate <= 0) continue;
    const capSec = hasManager(b.id) ? POOL_CAP_MANAGED : POOL_CAP_RAW;
    const gain = Math.floor(rate * Math.min(elapsed, capSec));
    if (gain <= 0) continue;
    bizState(b.id).pooled = Math.min(bizPoolCap(b.id), bizState(b.id).pooled + gain);
    total += gain;
    report.push({ b, gain, capped: elapsed > capSec });
  }
  return total > 0 ? { total, elapsed, report } : null;
}

function showOfflineModal(report) {
  const mins = Math.floor(report.elapsed / 60);
  const timeStr = mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
  const lines = report.report
    .map((r) => `${r.b.emoji} ${r.b.name} : +${fmtMoney(r.gain)}${r.capped ? " (plafonné)" : ""}`)
    .join("\n");
  showModal(
    "🕊️ Pendant ton absence",
    `Empire laissé seul ${timeStr}. Les affaires ont continué :\n\n${lines}\n\nTotal en attente : ${fmtMoney(report.total)} d'argent sale.\n\n💡 Embauche des managers pour stocker jusqu'à 2 h de production !`,
    [
      { label: `💼 Tout collecter (+${fmtMoney(report.total)})`, apply() { collectAllBusinesses(); } },
      { label: "Plus tard", apply() {} },
    ]
  );
}

// ---------- Événements planifiés (chaînes) ----------
function scheduleEvent(id, days) {
  state.pendingEvents.push({ id, days });
}

function fireScheduled(ev) {
  playSfx("event");
  log(`${ev.emoji} ${ev.title}`, "event");
  if (ev.type === "choice") {
    showEventModal(ev);
  } else {
    ev.apply(state);
    spawnPopup(ev.emoji + " " + ev.title, "info");
  }
}

function processPendingEvents() {
  if (state.pendingEvents.length === 0) return;
  const stillPending = [];
  for (const p of state.pendingEvents) {
    p.days -= 1;
    if (p.days <= 0) {
      const ev = EVENTS.find((e) => e.id === p.id);
      if (ev) fireScheduled(ev);
    } else {
      stillPending.push(p);
    }
  }
  state.pendingEvents = stillPending;
}

// ---------- Actions (coûtent 1 PA) ----------
const ACTIONS = [
  {
    id: "cook",
    icon: "🍳",
    name: "Cuisiner",
    desc: () => {
      const kg = (lab().cook * cookMult()).toFixed(1);
      return `Produit ~${kg} kg (${lab().name}). Précurseurs : ${fmt(PRECURSOR_COST_PER_KG * state.flags.precursorDiscount)}$/kg.`;
    },
    can(s) {
      return s.ap > 0 && s.cash >= PRECURSOR_COST_PER_KG * s.flags.precursorDiscount && s.stock < stockCap();
    },
    run(s) {
      const kgRaw = lab().cook * cookMult() * rand(0.85, 1.15);
      const space = stockCap() - s.stock;
      const affordable = s.cash / (PRECURSOR_COST_PER_KG * s.flags.precursorDiscount);
      const kg = Math.min(kgRaw, space, affordable);
      if (kg <= 0.05) {
        log("🍳 Plus de place pour stocker ! Vendez d'abord.", "bad");
        return;
      }
      const cost = Math.ceil(kg * PRECURSOR_COST_PER_KG * s.flags.precursorDiscount);
      s.cash -= cost;
      s.stock = Math.round((s.stock + kg) * 10) / 10;
      s.stats.cooked = Math.round((s.stats.cooked + kg) * 10) / 10;
      s.flags.cookPenalty = 1;
      s.flags.precursorDiscount = 1;
      trackMission("cook", kg);
      spawnPopup(`+${kg.toFixed(1)} kg`, "crystal");
      playSfx("cook");
      if (typeof scene !== "undefined" && scene) scene.FX.cook = performance.now();
      log(`🍳 Cuisson : +${kg.toFixed(1)} kg (pureté ${purityNow()}%) pour ${fmt(cost)}$.`, "good");
    },
  },
  {
    id: "sell",
    icon: "💸",
    name: "Vendre",
    desc: () => `Écouler de la marchandise. Prix actuel : ~${fmt(pricePerKg())}$/kg.${state.streak > 0 ? ` Série 🔥${state.streak} (+${Math.round((streakBonus() - 1) * 100)}% prix).` : ""} Génère de la chaleur.`,
    can(s) {
      return s.ap > 0 && s.stock >= 0.5;
    },
    run(s) {
      let qty = Math.min(s.stock, 2 + state.respect / 10);
      if (hasStaffEffect("sellMult")) qty *= 2;
      if (hasUpgrade("railnetwork")) qty *= 1.5;
      qty *= 1 + invLevel("street") * 0.15;
      qty = Math.min(qty, s.stock);
      const price = pricePerKg() * rand(0.9, 1.1);
      let revenue = qty * price;
      if (hasStaffEffect("sellCashMult")) revenue *= 1.25;
      revenue = Math.round(revenue);
      s.stock = Math.round((s.stock - qty) * 10) / 10;
      s.dirty += revenue;
      s.respect += 1;
      s.stats.sold = Math.round((s.stats.sold + qty) * 10) / 10;
      s.stats.totalEarned += revenue;
      s.soldToday = true;
      trackMission("sell", qty);
      let heatGain = qty * 1.5;
      if (hasUpgrade("van")) heatGain *= 0.5;
      if (hasStaffEffect("sellHeatMult")) heatGain *= 0.6;
      addHeat(Math.round(heatGain));
      spawnPopup(`+${fmt(revenue)}$ (sale)`, "money");
      playSfx("cash");
      if (typeof scene !== "undefined" && scene) scene.FX.sell = performance.now();
      log(`💸 Vente : ${qty.toFixed(1)} kg pour ${fmt(revenue)}$ (argent sale). Chaleur +${Math.round(heatGain)}.`, "good");
    },
  },
  {
    id: "launder",
    icon: "🧽",
    name: "Blanchir l'argent",
    desc: () => `Convertir l'argent sale en argent propre (taux ${Math.round(launderRate() * 100)}%, max ${fmt(launderVolume())}$/action).`,
    can(s) {
      return s.ap > 0 && s.dirty > 0;
    },
    run(s) {
      const amount = Math.min(s.dirty, launderVolume());
      const clean = Math.round(amount * launderRate());
      s.dirty -= amount;
      s.cash += clean;
      s.stats.laundered += amount;
      trackMission("launder", amount);
      spawnPopup(`+${fmt(clean)}$ propres`, "money");
      playSfx("cash");
      if (typeof scene !== "undefined" && scene) scene.FX.launder = performance.now();
      log(`🧽 Blanchiment : ${fmt(amount)}$ → ${fmt(clean)}$ propres.`, "good");
    },
  },
  {
    id: "hide",
    icon: "🕶️",
    name: "Se faire discret",
    desc: () => "Une journée sans mouvements : Chaleur −18.",
    can(s) {
      return s.ap > 0 && s.heat > 0;
    },
    run(s) {
      addHeat(-18);
      spawnPopup("Chaleur −18", "info");
      playSfx("click");
      log("🕶️ Journée tranquille, aucune trace. Chaleur −18.", "good");
    },
  },
];

// ---------- Fin de journée ----------
function endDay() {
  if (state.gameOver) return;

  const salaries = state.staff.reduce((sum, id) => {
    const member = STAFF.find((s) => s.id === id);
    return sum + (member ? member.salary : 0);
  }, 0);

  if (state.cash >= salaries) {
    state.cash -= salaries;
    if (salaries > 0) log(`💼 Salaires payés : ${fmt(salaries)}$.`);
  } else {
    log("💸 Impossible de payer les salaires ! Une partie de l'équipe s'en va.", "bad");
    state.staff = state.staff.filter((id) => id === "jesse" || Math.random() < 0.5);
    if (!state.staff.includes("jesse")) state.staff.push("jesse");
  }

  let heatDrift = 2;
  if (state.dirty > 100_000) heatDrift += 8;
  if (state.dirty > 30_000) heatDrift += 3;
  heatDrift += Math.min(10, Math.floor(totalBizLevels() / 30));
  heatDrift += staffEffect("heatPerDay");
  if (hasUpgrade("cameras")) heatDrift -= 5;
  heatDrift -= invLevel("security");
  addHeat(Math.round(heatDrift));

  state.market = cap(state.market + rand(-0.06, 0.06) + (1 - state.market) * 0.1, 0.7, 1.4);

  if (state.soldToday) {
    state.streak = (state.streak || 0) + 1;
    if (state.streak >= 3) {
      spawnPopup(`🔥 Série de ${state.streak} jours ! +${Math.round((streakBonus() - 1) * 100)}% prix`, "golden");
    }
  } else {
    state.streak = 0;
  }
  state.soldToday = false;
  state.visitedToday = {};
  if (state.heat < 30) trackMission("cooldown", 1);

  state.day += 1;
  state.ap = AP_PER_DAY + legendLevel("stamina");
  rollDailyMissions();
  spawnOpportunities();
  state.flags.priceBonus = 1;
  state.respect = cap(state.respect, 0, 100);

  log(`🌙 Jour ${state.day}. Chaleur ${state.heat}/100. Marché ${Math.round(state.market * 100)}%.`);

  processPendingEvents();

  if (state.contract) {
    state.contract.days -= 1;
    if (state.contract.days <= 0) {
      completeContract(state.contract.progress >= state.contract.kg);
    }
  } else if (state.contractCooldown > 0) {
    state.contractCooldown -= 1;
    if (state.contractCooldown <= 0) generateContract();
  } else {
    generateContract();
  }

  checkAchievements();

  if (state.cash >= state.goal) {
    state.victory = true;
    playSfx("win");
    render();
    showOverlay(true);
    return;
  }

  maybeEvent();
  checkRaid();
  render();
  save();
}

function spawnOpportunities() {
  if (typeof OPPORTUNITIES === "undefined" || !OPPORTUNITIES.length) return;
  const n = 1 + Math.floor(Math.random() * 2) + (state.day >= 5 ? 1 : 0);
  state.opps = [];
  for (let i = 0; i < n; i++) {
    const kind = OPPORTUNITIES[Math.floor(Math.random() * OPPORTUNITIES.length)];
    state.opps.push({
      uid: "opp" + state.day + "_" + i,
      kind: kind.id,
      x: 0.08 + Math.random() * 0.84,
      y: 0.08 + Math.random() * 0.84,
    });
  }
}

function grabOpportunity(uid) {
  const opp = (state.opps || []).find((o) => o.uid === uid);
  if (!opp) return false;
  const kind = (typeof OPPORTUNITIES !== "undefined")
    ? OPPORTUNITIES.find((k) => k.id === opp.kind) : null;
  state.opps = state.opps.filter((o) => o.uid !== uid);
  if (kind && typeof kind.apply === "function") kind.apply(state);
  state.stats.oppsTaken = (state.stats.oppsTaken || 0) + 1;
  playSfx("cash");
  if (typeof haptic === "function") haptic(15);
  checkAchievements();
  render();
  save();
  return true;
}

function maybeEvent() {
  const pool = EVENTS.filter((e) => (e.weight || 0) > 0 && (!e.cond || e.cond(state)));
  if (pool.length === 0) return;
  const chance = 0.15 + state.heat / 300;
  if (Math.random() > chance) return;

  const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const e of pool) {
    roll -= e.weight;
    if (roll <= 0) {
      playSfx("event");
      log(`${e.emoji} ${e.title}`, "event");
      if (e.type === "choice") {
        showEventModal(e);
      } else {
        e.apply(state);
        spawnPopup(e.emoji + " " + e.title, "info");
      }
      return;
    }
  }
}

function checkRaid() {
  if (state.heat >= 100) {
    if (hasStaffEffect("arrestProtect")) {
      const msg = RAID.withSaul(state);
      if (msg) showModal(msg.title, msg.text, [{ label: "Ouf...", apply() {} }]);
    } else {
      state.gameOver = true;
      state.gameOverReason = "arrest";
    }
  }
  if (state.gameOver) {
    playSfx("alarm");
    setTimeout(() => playSfx("lose"), 1200);
    render();
    showOverlay(false);
  }
}

// ---------- Recrutement & améliorations (gratuits en PA) ----------
function hire(id) {
  const member = STAFF.find((s) => s.id === id);
  if (!member || hasStaff(id) || state.cash < member.cost) return;
  state.cash -= member.cost;
  state.staff.push(id);
  spawnPopup(`${member.emoji} ${member.name} !`, "info");
  playSfx("upgrade");
  log(`🤝 ${member.name} rejoint l'équipe (−${fmt(member.cost)}$).`, "good");
  checkAchievements();
  render();
  save();
}

function buyUpgrade(id) {
  const up = UPGRADES.find((u) => u.id === id);
  if (!up || hasUpgrade(id) || state.cash < up.cost) return;
  state.cash -= up.cost;
  state.upgrades.push(id);
  spawnPopup(`${up.emoji} ${up.name}`, "info");
  playSfx("upgrade");
  log(`🏗️ ${up.name} installé (−${fmt(up.cost)}$).`, "good");
  checkAchievements();
  render();
  save();
}

function upgradeLab() {
  const next = LABS[state.labLevel + 1];
  if (!next) return;
  if (next.requires && !hasStaff(next.requires)) {
    log(`🧪 Il faut ${STAFF.find((s) => s.id === next.requires).name} pour accéder à ${next.name}.`, "bad");
    return;
  }
  if (state.cash < next.cost) return;
  state.cash -= next.cost;
  state.labLevel += 1;
  spawnPopup(`${next.emoji} ${next.name} !`, "info");
  playSfx("upgrade");
  log(`🏗️ Nouveau labo : ${next.name} (−${fmt(next.cost)}$).`, "good");
  checkAchievements();
  render();
  save();
}

// ---------- Investissements (v4) ----------
function investCost(inv) {
  return Math.ceil(inv.base * Math.pow(inv.growth, invLevel(inv.id)));
}

function buyInvestment(id) {
  const inv = INVESTMENTS.find((i) => i.id === id);
  if (!inv) return;
  const level = invLevel(id);
  if (level >= inv.max) return;
  const cost = investCost(inv);
  if (state.cash < cost) return;
  state.cash -= cost;
  state.investments[id] = level + 1;
  spawnPopup(`${inv.icon} ${inv.name} niv. ${level + 1}`, "info");
  playSfx("upgrade");
  log(`📈 ${inv.name} niveau ${level + 1} (−${fmt(cost)}$).`, "good");
  checkAchievements();
  render();
  save();
}

// ---------- Prestige (v4) ----------
function doPrestige() {
  const pts = prestigePoints();
  if (pts < 1) return;
  showModal(
    "🎭 Nouvelle identité",
    `Vous disparaissez, et un inconnu au chapeau noir reprend l'empire.\n\nVous gagnez ${pts} point(s) de légende : +${Math.round(pts * PRESTIGE_POINT_BONUS * 100)}% de cuisson et de prix, PERMANENT.\n\nL'argent, l'équipe, les labos et les investissements repartent de zéro. Les succès et vos points de légende sont conservés.`,
    [
      {
        label: `Disparaître (+${pts} 🎭)`,
        apply(s) {
          const keep = {
            achievements: s.achievements,
            legendPoints: (s.legendPoints || 0) + pts,
            prestiges: (s.prestiges || 0) + 1,
            taps: s.taps,
            goldenCaught: s.goldenCaught || 0,
            legendCoins: (s.legendCoins || 0) + pts,
            legendUpgrades: s.legendUpgrades || {},
          };
          state = Object.assign(newGame(), keep);
          playSfx("prestige");
          log(`🎭 Nouvelle identité ! +${pts} point(s) de légende (bonus permanent ×${legendMult().toFixed(2)}).`, "event");
          toast("🎭 Nouvelle identité", `Bonus permanent : +${Math.round(state.legendPoints * PRESTIGE_POINT_BONUS * 100)}% !`);
          checkAchievements();
          render();
          save();
        },
      },
      { label: "Pas encore", apply() {} },
    ]
  );
}

// ---------- Missions quotidiennes (v7) ----------
function rollDailyMissions() {
  if (!state.dailyMissions || state.dailyMissions.day !== state.day) {
    const pool = DAILY_MISSIONS.slice();
    const picked = [];
    while (picked.length < 3 && pool.length > 0) {
      picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    state.dailyMissions = {
      day: state.day,
      list: picked.map((m) => ({ id: m.id, progress: 0, claimed: false })),
    };
  }
}

function trackMission(event, amount = 1) {
  if (!state.dailyMissions || !Array.isArray(state.dailyMissions.list)) return false;
  let changed = false;
  for (const m of state.dailyMissions.list) {
    const def = DAILY_MISSIONS.find((d) => d.id === m.id);
    if (!def || m.claimed || def.event !== event) continue;
    if (m.progress >= def.goal) continue;
    m.progress = Math.min(def.goal, m.progress + amount);
    changed = true;
    if (m.progress >= def.goal) {
      toast(`${def.icon} Mission prête !`, `${def.label} — viens la réclamer.`);
      playSfx("golden");
    }
  }
  return changed;
}

function claimMission(id) {
  const m = (state.dailyMissions.list || []).find((x) => x.id === id);
  const def = DAILY_MISSIONS.find((d) => d.id === id);
  if (!m || !def || m.claimed || m.progress < def.goal) return;
  m.claimed = true;
  def.reward(state);
  playSfx("cash");
  toast(`${def.icon} Mission accomplie`, def.rewardText || "");
  checkAchievements();
  render();
  save();
}

// ---------- Boutique de Légende (v7) ----------
function buyLegendUpgrade(id) {
  const u = LEGEND_UPGRADES.find((x) => x.id === id);
  if (!u) return;
  const lvl = legendLevel(id);
  if (lvl >= u.max) return;
  const cost = u.cost(lvl);
  if ((state.legendCoins || 0) < cost) {
    toast("🪙 Pas assez de pièces", "Fais un prestige 🎭 pour en gagner.");
    return;
  }
  state.legendCoins -= cost;
  state.legendUpgrades[id] = lvl + 1;
  playSfx("cash");
  toast(`${u.icon} ${u.name}`, `Niveau ${lvl + 1} ! Bonus permanent actif.`);
  checkAchievements();
  render();
  save();
}

// ---------- Rendu Empire (v10) ----------
function renderBusinesses() {
  const container = document.getElementById("businesses");
  if (!container) return;
  const header = document.getElementById("empire-summary");
  if (header) {
    header.innerHTML = `
      <div class="empire-rate">💼 ${fmtMoney(totalEmpirePerSec())}/s</div>
      <div class="empire-controls">
        ${["1", "10", "100", "max"].map((v) => `
          <button class="buy-amt ${state.buyAmount === v ? "active" : ""}" data-amt="${v}">${v === "max" ? "MAX" : "×" + v}</button>`).join("")}
        <button class="btn primary" id="btn-collect-all">💰 Tout collecter</button>
      </div>`;
    header.querySelectorAll("[data-amt]").forEach((btn) => {
      btn.addEventListener("click", () => setBuyAmount(btn.dataset.amt));
    });
    const ca = header.querySelector("#btn-collect-all");
    if (ca) ca.addEventListener("click", () => { collectAllBusinesses(); renderBusinesses(); renderStats(); save(); });
  }

  container.innerHTML = BUSINESSES.map((b) => {
    if (!bizUnlocked(b)) {
      return `
      <div class="biz-row locked">
        <div class="biz-icon">🔒</div>
        <div class="biz-body">
          <h3>???</h3>
          <p>Continue ta progression pour débloquer cette affaire...</p>
        </div>
      </div>`;
    }
    const st = bizState(b.id);
    const lvl = st.level;
    const rate = bizRevPerSec(b.id);
    const capAmt = bizPoolCap(b.id);
    const poolPct = capAmt > 0 ? (st.pooled / capAmt) * 100 : 0;
    const nextMs = bizNextMilestone(lvl);
    const n = bizBuyCount(b.id);
    const cost = bizCostFor(b.id, n);
    const afford = state.cash >= cost;
    const poolLabel = st.pooled >= 1 ? fmtMoney(Math.floor(st.pooled)) : "0$";
    const collectable = st.pooled >= 1;
    const nextMsTxt = nextMs
      ? `Palier ×2 dans ${nextMs - lvl} niveaux`
      : "Tous les paliers atteints !";
    const msPct = nextMs ? (lvl / nextMs) * 100 : 100;
    return `
    <div class="biz-row ${st.manager ? "managed" : ""}">
      <div class="biz-icon ${collectable ? "ready" : ""}" data-collect="${b.id}">
        ${b.emoji}
        ${collectable ? `<span class="biz-pool">${poolLabel}</span>` : ""}
      </div>
      <div class="biz-body">
        <h3>${b.name} <span class="biz-level">Niv. ${lvl}</span></h3>
        <p class="biz-rate">${fmtMoney(rate)}/s ${st.manager ? `· ${b.manager.emoji} auto` : "· ⚠️ collecte manuelle"}</p>
        <div class="biz-ms"><div class="fill" style="width:${cap(msPct, 0, 100)}%"></div><span>${nextMsTxt}</span></div>
      </div>
      <div class="biz-actions">
        <button class="btn buy" data-biz="${b.id}" ${afford ? "" : "disabled"}>
          Améliorer ×${n}<br/><small>${fmtMoney(cost)}</small>
        </button>
        ${st.manager
          ? `<div class="mgr-chip owned">${b.manager.emoji} ${b.manager.name.split(" ")[0]}</div>`
          : `<button class="btn mgr" data-mgr="${b.id}" ${state.cash >= b.manager.cost ? "" : "disabled"} title="${b.manager.quote}">
              ${b.manager.emoji}<br/><small>${fmtMoney(b.manager.cost)}</small>
             </button>`}
      </div>
    </div>`;
  }).join("");

  container.querySelectorAll("[data-biz]").forEach((btn) => {
    btn.addEventListener("click", () => buyBusiness(btn.dataset.biz));
  });
  container.querySelectorAll("[data-mgr]").forEach((btn) => {
    btn.addEventListener("click", () => hireManager(btn.dataset.mgr));
  });
  container.querySelectorAll("[data-collect]").forEach((el) => {
    el.addEventListener("click", () => { collectBusiness(el.dataset.collect); renderBusinesses(); renderStats(); save(); });
  });
}

function showBusinessModal(id) {
  const b = bizDef(id);
  if (!b || !bizUnlocked(b)) return;
  const st = bizState(id);
  const rate = bizRevPerSec(id);
  const pooled = Math.floor(st.pooled);
  const n = bizBuyCount(id);
  const cost = bizCostFor(id, n);
  const choices = [];
  if (pooled >= 1) {
    choices.push({
      label: `💰 Collecter (+${fmtMoney(pooled)} sale)`,
      can: () => true,
      apply() { collectBusiness(id); },
    });
  }
  choices.push({
    label: `📈 Améliorer ×${n} (${fmtMoney(cost)})`,
    can: () => state.cash >= cost,
    apply() { buyBusiness(id); },
  });
  if (!st.manager) {
    choices.push({
      label: `👔 Embaucher ${b.manager.emoji} ${b.manager.name} (${fmtMoney(b.manager.cost)})`,
      can: () => state.cash >= b.manager.cost,
      apply() { hireManager(id); },
    });
  }
  choices.push({ label: "🚪 Quitter", can: () => true, apply() {} });
  const status = st.manager
    ? `${b.manager.emoji} ${b.manager.name} gère l'affaire : revenus automatiques, réserve de 2 h.`
    : "⚠️ Pas de manager : la réserve plafonne à 15 min de production.";
  setModalAvatar(b.emoji);
  showModal(
    `${b.emoji} ${b.name} — Niv. ${st.level}`,
    `${b.desc}\n\nRevenus : ${fmtMoney(rate)}/s · Réserve : ${fmtMoney(pooled)}\n${nextMilestoneText(st.level)}\n${status}`,
    choices
  );
}

function nextMilestoneText(level) {
  const next = bizNextMilestone(level);
  return next ? `🚀 Palier ×2 au niveau ${next}.` : "👑 Tous les paliers ×2 atteints.";
}

// ---------- Rendu UI ----------
function render() {
  renderStats();
  renderBusinesses();
  renderActions();
  renderContracts();
  renderLab();
  renderInvestments();
  renderUpgrades();
  renderStaff();
  renderMissions();
  renderLegend();
  renderLog();
  document.getElementById("day-num").textContent = state.day;
  document.getElementById("ap-num").textContent = state.ap;
  document.getElementById("btn-next-day").disabled = state.gameOver || state.victory;

  const prestigeBtn = document.getElementById("btn-prestige");
  if (prestigeBtn) {
    const pts = prestigePoints();
    prestigeBtn.style.display = pts >= 1 ? "" : "none";
    prestigeBtn.textContent = `🎭 ${pts}`;
    prestigeBtn.disabled = state.gameOver;
  }
  const banner = document.getElementById("frenzy-banner");
  if (banner) banner.classList.toggle("hidden", !frenzyActive());
}

function bar(pct, cls = "") {
  return `<div class="bar"><div class="fill ${cls}" style="width:${cap(pct, 0, 100)}%"></div></div>`;
}

function renderStats() {
  const stats = [
    { label: "💰 Propre", value: fmtMoney(state.cash), cls: "good" },
    { label: "🤍 Sale", value: fmtMoney(state.dirty), cls: state.dirty > 100_000 ? "warn" : "" },
    { label: "📦 Stock", value: `${state.stock.toFixed(1)} / ${stockCap()} kg`, cls: "blue", bar: (state.stock / stockCap()) * 100, barCls: "stock" },
    { label: "💎 Pureté", value: `${purityNow()}%`, cls: "blue", bar: purityNow() },
    { label: "🚨 Chaleur", value: `${state.heat}/100`, cls: state.heat >= 70 ? "warn" : "", bar: state.heat, barCls: "heat" },
    { label: "🏙️ Respect", value: state.respect, cls: "", bar: state.respect },
    { label: "📈 Marché", value: `${Math.round(state.market * 100)}%`, cls: state.market >= 1 ? "good" : "warn" },
    { label: "🏷️ Prix/kg", value: `${fmt(pricePerKg())}$`, cls: "" },
    { label: "🔥 Série", value: state.streak > 0 ? `${state.streak} j (+${Math.round((streakBonus() - 1) * 100)}%)` : "—", cls: state.streak >= 3 ? "good" : "" },
    { label: "🎭 Légende", value: `×${legendMult().toFixed(2)}${state.prestiges ? ` (${state.prestiges})` : ""}`, cls: state.legendPoints > 0 ? "good" : "" },
    { label: "🎯 Objectif", value: `${fmt(Math.min(state.cash, state.goal))} / ${fmt(state.goal)}$`, cls: "", bar: (state.cash / state.goal) * 100 },
  ];
  document.getElementById("statbar").innerHTML = stats
    .map((s) => `<div class="stat ${s.cls}"><div class="label">${s.label}</div><div class="value">${s.value}</div>${s.bar !== undefined ? bar(s.bar, s.barCls || "") : ""}</div>`)
    .join("");
}

function renderActions() {
  const container = document.getElementById("actions");
  container.innerHTML = ACTIONS.map(
    (a) => `
    <div class="card">
      <div class="icon">${a.icon}</div>
      <h3>${a.name}</h3>
      <p>${a.desc(state)}</p>
      <button class="btn primary" data-action="${a.id}" ${a.can(state) ? "" : "disabled"}>Exécuter (1 PA)</button>
    </div>`
  ).join("");
  container.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = ACTIONS.find((a) => a.id === btn.dataset.action);
      if (!action || !action.can(state)) return;
      action.run(state);
      state.ap -= 1;
      checkAchievements();
      render();
      save();
    });
  });
}

function renderContracts() {
  const container = document.getElementById("contracts");
  const c = state.contract;
  if (!c) {
    container.innerHTML = `
      <div class="card locked">
        <div class="icon">📞</div>
        <h3>Aucun contrat en cours</h3>
        <p>Les clients vous rappelleront dans ${Math.max(0, state.contractCooldown)} jour(s)...</p>
      </div>`;
    return;
  }
  const pct = (c.progress / c.kg) * 100;
  const urgent = c.days <= 1;
  container.innerHTML = `
    <div class="card" style="border-color: var(--blue);">
      <div class="icon">${c.emoji}</div>
      <h3>${c.client}</h3>
      <p>Livrer <b>${c.kg} kg</b>. Récompense : <b>${fmt(c.reward)}$</b> (sale) + 4 respect.</p>
      <div class="contract-progress"><div class="fill" style="width:${cap(pct, 0, 100)}%"></div></div>
      <div class="meta">${c.progress.toFixed(1)} / ${c.kg} kg livrés</div>
      <div class="contract-deadline ${urgent ? "urgent" : ""}">⏳ ${c.days} jour(s) restant(s)</div>
      <button class="btn primary" id="btn-deliver" ${state.stock > 0 && c.progress < c.kg ? "" : "disabled"}>Livrer le stock (gratuit)</button>
    </div>`;
  const btn = container.querySelector("#btn-deliver");
  if (btn) btn.addEventListener("click", deliverContract);
}

function renderLab() {
  const next = LABS[state.labLevel + 1];
  const cards = [
    `<div class="card owned">
      <div class="icon">${lab().emoji}</div>
      <h3>${lab().name}</h3>
      <p>Production : ${lab().cook} kg/action. Stock max : ${stockCap()} kg.</p>
      <div class="meta">Niveau ${state.labLevel + 1} / ${LABS.length}</div>
    </div>`,
  ];
  if (next) {
    const locked = next.requires && !hasStaff(next.requires);
    const canBuy = !locked && state.cash >= next.cost;
    cards.push(`
      <div class="card ${locked ? "locked" : ""}">
        <div class="icon">${next.emoji}</div>
        <h3>${next.name}</h3>
        <p>Production : ${next.cook} kg/action. Stock max : ${next.cap} kg.${locked ? " Nécessite : " + STAFF.find((s) => s.id === next.requires).name + "." : ""}</p>
        <button class="btn" id="btn-lab" ${canBuy ? "" : "disabled"}>Améliorer (${fmt(next.cost)}$)</button>
      </div>`);
  }
  const container = document.createElement("div");
  container.className = "cards small-cards";
  container.innerHTML = cards.join("");
  const old = document.getElementById("lab-cards");
  if (old && typeof old.replaceWith === "function") old.replaceWith(container);
  else document.getElementById("investments").before(container);
  container.id = "lab-cards";
  const btn = container.querySelector("#btn-lab");
  if (btn) btn.addEventListener("click", upgradeLab);
}

function renderInvestments() {
  const container = document.getElementById("investments");
  if (!container) return;
  container.innerHTML = INVESTMENTS.map((inv) => {
    const level = invLevel(inv.id);
    const maxed = level >= inv.max;
    const cost = investCost(inv);
    const affordable = state.cash >= cost && !maxed;
    return `
    <div class="card ${level > 0 ? "owned" : ""}">
      <div class="icon">${inv.icon}</div>
      <h3>${inv.name} ${level > 0 ? `<span class="inv-level">Niv. ${level}</span>` : ""}</h3>
      <p>${inv.desc}</p>
      ${maxed
        ? '<div class="meta">✔ Niveau maximum</div>'
        : `<button class="btn" data-invest="${inv.id}" ${affordable ? "" : "disabled"}>${level > 0 ? "Améliorer" : "Investir"} (${fmt(cost)}$)</button>`}
    </div>`;
  }).join("");
  container.querySelectorAll("[data-invest]").forEach((btn) => {
    btn.addEventListener("click", () => buyInvestment(btn.dataset.invest));
  });
}

function renderUpgrades() {
  const container = document.getElementById("upgrades");
  container.innerHTML = UPGRADES.map((u) => {
    const owned = hasUpgrade(u.id);
    return `
    <div class="card ${owned ? "owned" : ""} ${u.rarity}">
      <div class="icon">${u.emoji}</div>
      <h3>${u.name}</h3>
      <p>${u.desc}</p>
      ${owned
        ? '<div class="meta">✔ Installé</div>'
        : `<button class="btn" data-upgrade="${u.id}" ${state.cash >= u.cost ? "" : "disabled"}>${fmt(u.cost)}$</button>`}
    </div>`;
  }).join("");
  container.querySelectorAll("[data-upgrade]").forEach((btn) => {
    btn.addEventListener("click", () => buyUpgrade(btn.dataset.upgrade));
  });
}

function renderStaff() {
  const container = document.getElementById("staff");
  container.innerHTML = STAFF.map((m) => {
    const hired = hasStaff(m.id);
    return `
    <div class="card ${hired ? "owned" : ""} ${m.rarity}">
      <div class="icon">${m.emoji}</div>
      <h3>${m.name}</h3>
      <p>${m.desc}</p>
      <div class="meta">Salaire : ${fmt(m.salary)}$/jour</div>
      ${hired
        ? '<div class="meta">✔ Dans l\'équipe</div>'
        : `<button class="btn" data-hire="${m.id}" ${state.cash >= m.cost ? "" : "disabled"}>Recruter (${fmt(m.cost)}$)</button>`}
    </div>`;
  }).join("");
  container.querySelectorAll("[data-hire]").forEach((btn) => {
    btn.addEventListener("click", () => hire(btn.dataset.hire));
  });
}

function renderMissions() {
  const container = document.getElementById("missions");
  if (!container) return;
  rollDailyMissions();
  container.innerHTML = (state.dailyMissions.list || [])
    .map((m) => {
      const def = DAILY_MISSIONS.find((d) => d.id === m.id);
      if (!def) return "";
      const pct = Math.min(100, (m.progress / def.goal) * 100);
      const done = m.progress >= def.goal;
      return `
      <div class="card mission ${m.claimed ? "owned" : ""}">
        <div class="icon">${def.icon}</div>
        <h3>${def.label}</h3>
        <p>${def.desc}</p>
        <div class="meta">${Math.floor(m.progress)} / ${def.goal}</div>
        ${bar(pct)}
        <button class="btn primary" data-mission="${def.id}" ${done && !m.claimed ? "" : "disabled"}>
          ${m.claimed ? "✔ Réclamé" : done ? "🎁 Réclamer" : "En cours..."}
        </button>
      </div>`;
    })
    .join("");
  container.querySelectorAll("[data-mission]").forEach((btn) => {
    btn.addEventListener("click", () => claimMission(btn.dataset.mission));
  });
}

function renderLegend() {
  const container = document.getElementById("legend");
  if (!container) return;
  container.innerHTML =
    `<div class="card legend-info"><div class="icon">🪙</div><h3>${state.legendCoins || 0} pièce(s) de légende</h3><p>Gagnées à chaque prestige 🎭. Bonus permanents, conservés pour toujours.</p></div>` +
    LEGEND_UPGRADES.map((u) => {
      const lvl = legendLevel(u.id);
      const maxed = lvl >= u.max;
      const cost = u.cost(lvl);
      const afford = (state.legendCoins || 0) >= cost;
      return `
      <div class="card ${maxed ? "owned" : ""}">
        <div class="icon">${u.icon}</div>
        <h3>${u.name} <span class="meta">Niv. ${lvl}/${u.max}</span></h3>
        <p>${u.desc}</p>
        <button class="btn primary" data-legend="${u.id}" ${maxed || !afford ? "disabled" : ""}>
          ${maxed ? "✔ Maximum" : `🪙 ${cost}`}
        </button>
      </div>`;
    })
    .join("");
  container.querySelectorAll("[data-legend]").forEach((btn) => {
    btn.addEventListener("click", () => buyLegendUpgrade(btn.dataset.legend));
  });
}

function renderLog() {
  document.getElementById("log").innerHTML = state.log
    .map((e) => `<div class="log-entry ${e.kind}"><span class="d">J${e.day}</span>${e.msg}</div>`)
    .join("");
}

// ---------- Modales ----------
function showModal(title, text, choices) {
  const modal = document.getElementById("modal");
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-text").textContent = text;
  const box = document.getElementById("modal-choices");
  box.innerHTML = "";
  choices.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "btn primary";
    btn.textContent = c.label;
    if (c.can && !c.can(state)) btn.disabled = true;
    btn.addEventListener("click", () => {
      c.apply(state);
      modal.classList.add("hidden");
      checkRaid();
      render();
      save();
    });
    box.appendChild(btn);
  });
  modal.classList.remove("hidden");
}

function showEventModal(event) {
  log(`${event.emoji} ${event.title}`, "event");
  showModal(`${event.emoji} ${event.title}`, event.text, event.choices);
}

function showAchievements() {
  const items = ACHIEVEMENTS.map((a) => {
    const got = state.achievements.includes(a.id);
    return `
      <div class="ach-item ${got ? "unlocked" : "locked"}">
        <div class="a-icon">${a.icon}</div>
        <div>
          <div class="a-name">${a.name}</div>
          <div class="a-desc">${a.desc}${got ? " ✔" : ""}</div>
        </div>
      </div>`;
  }).join("");
  showModal(`🏆 Succès (${state.achievements.length}/${ACHIEVEMENTS.length})`,
    `<div class="ach-list">${items}</div>`,
    [{ label: "Fermer", apply() {} }]);
  document.getElementById("modal-text").innerHTML = `<div class="ach-list">${items}</div>`;
}

function showOverlay(win) {
  const overlay = document.getElementById("overlay");
  const box = overlay.querySelector(".overlay-box");
  box.classList.toggle("lose", !win);
  document.getElementById("overlay-title").textContent = win
    ? "👑 SAY MY NAME."
    : "🚨 FIN DE PARTIE";
  const prestigeLine = state.prestiges > 0 ? ` Légende ×${legendMult().toFixed(2)} (${state.prestiges} identité(s)).` : "";
  document.getElementById("overlay-text").textContent = win
    ? `Vous avez bâti un empire de ${fmt(state.cash)}$ en ${state.day} jours.${prestigeLine} L'argent propre a triomphé... pour l'instant.`
    : "Menottes, flashs, une cellule à Albuquerque. Votre empire s'arrête ici.";

  const buttons = document.getElementById("overlay-buttons");
  buttons.innerHTML = "";
  const restart = document.createElement("button");
  restart.className = "btn danger";
  restart.textContent = "Recommencer";
  restart.addEventListener("click", () => {
    overlay.classList.add("hidden");
    reset();
  });
  buttons.appendChild(restart);
  if (win) {
    const cont = document.createElement("button");
    cont.className = "btn primary";
    cont.textContent = `Mode Légende : objectif ×10 (${fmt(state.goal * 10)}$)`;
    cont.addEventListener("click", () => {
      state.endless = true;
      state.victory = false;
      state.goal *= 10;
      overlay.classList.add("hidden");
      log("👑 Mode Légende activé ! Nouvel objectif : " + fmt(state.goal) + "$.", "event");
      checkAchievements();
      render();
      save();
    });
    buttons.appendChild(cont);
    if (prestigePoints() >= 1) {
      const pres = document.createElement("button");
      pres.className = "btn prestige";
      pres.textContent = `🎭 Nouvelle identité (+${prestigePoints()} 🎭)`;
      pres.addEventListener("click", () => {
        overlay.classList.add("hidden");
        state.victory = false;
        doPrestige();
      });
      buttons.appendChild(pres);
    }
  }
  overlay.classList.remove("hidden");
}

// ---------- Sauvegarde ----------
function save() {
  try {
    state.lastSeen = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    /* stockage indisponible : le jeu continue sans sauvegarde */
  }
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || typeof data.day !== "number") return false;
    state = Object.assign(newGame(), data);
    state.flags = Object.assign({ cookPenalty: 1, priceBonus: 1, precursorDiscount: 1 }, data.flags || {});
    state.stats = Object.assign({ cooked: 0, sold: 0, laundered: 0, contractsDone: 0, totalEarned: 0, oppsTaken: 0 }, data.stats || {});
    state.investments = Object.assign({}, data.investments || {});
    state.pendingEvents = Array.isArray(data.pendingEvents) ? data.pendingEvents : [];
    state.visitedToday = Object.assign({}, data.visitedToday || {});
    state.opps = Array.isArray(data.opps) ? data.opps : [];
    state.legendCoins = data.legendCoins || 0;
    state.legendUpgrades = Object.assign({}, data.legendUpgrades || {});
    state.dailyMissions = data.dailyMissions && Array.isArray(data.dailyMissions.list)
      ? { day: data.dailyMissions.day || 0, list: data.dailyMissions.list }
      : { day: 0, list: [] };
    if (typeof state.frenzyUntil !== "number") state.frenzyUntil = 0;
    state.businesses = Object.assign({ carwash: { level: 1, manager: false, pooled: 0 } }, data.businesses || {});
    for (const k of Object.keys(state.businesses)) {
      state.businesses[k] = Object.assign({ level: 0, manager: false, pooled: 0 }, state.businesses[k]);
    }
    state.buyAmount = data.buyAmount || "1";
    state.lastSeen = data.lastSeen || Date.now();
    return true;
  } catch (e) {
    return false;
  }
}

function reset() {
  localStorage.removeItem(SAVE_KEY);
  state = newGame();
  log("🎓 Nouvelle vie. Un RV, un tablier, un rêve.");
  render();
  save();
}

// ---------- Initialisation ----------
document.getElementById("btn-next-day").addEventListener("click", endDay);
document.getElementById("btn-restart").addEventListener("click", () => {
  document.getElementById("overlay").classList.add("hidden");
  reset();
});
document.getElementById("btn-reset").addEventListener("click", () => {
  if (confirm("Recommencer une nouvelle vie ? La progression sera perdue.")) reset();
});
document.getElementById("btn-save").addEventListener("click", () => {
  save();
  spawnPopup("💾 Sauvegardé", "info");
  log("💾 Partie sauvegardée.");
  render();
});
document.getElementById("btn-sound").addEventListener("click", () => {
  if (typeof sfx !== "undefined" && sfx) {
    const muted = sfx.toggle();
    document.getElementById("btn-sound").textContent = muted ? "🔇" : "🔊";
  }
});
document.getElementById("btn-ach").addEventListener("click", showAchievements);
const prestigeBtn = document.getElementById("btn-prestige");
if (prestigeBtn) prestigeBtn.addEventListener("click", doPrestige);
if (typeof sfx !== "undefined" && sfx && sfx.muted) {
  document.getElementById("btn-sound").textContent = "🔇";
}
setTimeout(() => {
  const hint = document.getElementById("tap-hint");
  if (hint) hint.remove();
}, 12_000);

if (typeof window !== "undefined") {
  setInterval(bizTick, 1_000);
  setInterval(idleTick, 5_000);
  setInterval(() => {
    if (!state.gameOver && !state.victory && typeof scene !== "undefined" && scene && typeof scene.spawnGolden === "function") {
      scene.spawnGolden();
    }
  }, 45_000);
}

let offlineReport = null;
if (!load()) {
  log("🎓 Albuquerque, Nouveau-Mexique. Un RV, un tablier, un rêve.");
  log("💡 Objectif : 10 000 000$ d'argent propre. Attention à la chaleur DEA (100 = arrestation).");
  log("💼 Onglet EMPIRE : tes premières affaires de façade t'attendent.");
  generateContract();
} else {
  offlineReport = checkOfflineEarnings();
}
render();
if (offlineReport) setTimeout(() => showOfflineModal(offlineReport), 700);
