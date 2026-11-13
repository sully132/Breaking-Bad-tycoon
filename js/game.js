// ============================================================
// HEISENBERG TYCOON — Moteur de jeu
// État, actions, boucle de journée, événements, UI, sauvegarde.
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
    staff: ["jesse"],
    upgrades: [],
    flags: { cookPenalty: 1, priceBonus: 1 },
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

function purityNow() {
  return cap(state.purity + staffEffect("purity") + (hasUpgrade("mask") ? 8 : 0) + (hasUpgrade("gear") ? 5 : 0), 0, 100);
}

function cookMult() {
  let m = 1;
  for (const id of state.staff) {
    const member = STAFF.find((s) => s.id === id);
    if (member && member.effect.cookMult) m *= member.effect.cookMult;
  }
  if (hasUpgrade("gear")) m *= 1.2;
  if (hasUpgrade("methylamine")) m *= 1.4;
  m *= state.flags.cookPenalty;
  return m;
}

function pricePerKg() {
  let p = 20_000 + purityNow() * 400;
  p *= state.flags.priceBonus;
  p *= 1 + state.respect / 200;
  const gus = STAFF.find((s) => s.id === "gus");
  if (hasStaff("gus") && gus) p *= gus.effect.priceMult;
  return p;
}

function launderRate() {
  let r = 0.65;
  if (hasStaffEffect("launderRate")) r = 0.9;
  if (hasUpgrade("carwash")) r += 0.1;
  return cap(r, 0, 0.98);
}

function launderVolume() {
  return hasUpgrade("carwash") ? 200_000 : 50_000;
}

function addHeat(n) {
  state.heat = cap(state.heat + n, 0, 100);
}

function log(msg, kind = "") {
  state.log.unshift({ day: state.day, msg, kind });
  if (state.log.length > 60) state.log.pop();
}

// ---------- Actions (coûtent 1 PA) ----------
const ACTIONS = [
  {
    id: "cook",
    icon: "🍳",
    name: "Cuisiner",
    desc: () => {
      const kg = (lab().cook * cookMult()).toFixed(1);
      return `Produit ~${kg} kg (${lab().name}). Précurseurs : ${fmt(PRECURSOR_COST_PER_KG)}$/kg.`;
    },
    can(s) {
      return s.ap > 0 && s.cash >= PRECURSOR_COST_PER_KG && s.stock < lab().cap;
    },
    run(s) {
      const kgRaw = lab().cook * cookMult() * rand(0.85, 1.15);
      const space = lab().cap - s.stock;
      const kg = Math.min(kgRaw, space);
      if (kg <= 0.05) {
        log("🍳 Plus de place pour stocker ! Vendez d'abord.", "bad");
        return;
      }
      const cost = Math.ceil(kg * PRECURSOR_COST_PER_KG);
      s.cash -= cost;
      s.stock = Math.round((s.stock + kg) * 10) / 10;
      s.flags.cookPenalty = 1;
      log(`🍳 Cuisson : +${kg.toFixed(1)} kg (pureté ${purityNow()}%) pour ${fmt(cost)}$.`, "good");
    },
  },
  {
    id: "sell",
    icon: "💸",
    name: "Vendre",
    desc: () => `Écouler de la marchandise. Prix actuel : ~${fmt(pricePerKg())}$/kg. Génère de la chaleur.`,
    can(s) {
      return s.ap > 0 && s.stock >= 0.5;
    },
    run(s) {
      let qty = Math.min(s.stock, 2 + state.respect / 10);
      if (hasStaffEffect("sellMult")) qty *= 2;
      qty = Math.min(qty, s.stock);
      const price = pricePerKg() * rand(0.9, 1.1);
      let revenue = qty * price;
      if (hasStaffEffect("sellCashMult")) revenue *= 1.25;
      revenue = Math.round(revenue);
      s.stock = Math.round((s.stock - qty) * 10) / 10;
      s.dirty += revenue;
      s.respect += 1;
      let heatGain = qty * 1.5;
      if (hasUpgrade("van")) heatGain *= 0.5;
      if (hasStaffEffect("sellHeatMult")) heatGain *= 0.6;
      addHeat(Math.round(heatGain));
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
  heatDrift += staffEffect("heatPerDay");
  if (hasUpgrade("cameras")) heatDrift -= 5;
  addHeat(Math.round(heatDrift));

  state.day += 1;
  state.ap = AP_PER_DAY;
  state.flags.priceBonus = 1;
  state.respect = cap(state.respect, 0, 100);

  log(`🌙 Jour ${state.day}. Chaleur ${state.heat}/100.`);

  if (state.cash >= VICTORY_CASH) {
    state.victory = true;
    render();
    showOverlay(true);
    return;
  }

  maybeEvent();
  checkRaid();
  render();
  save();
}

function maybeEvent() {
  const pool = EVENTS.filter((e) => !e.cond || e.cond(state));
  if (pool.length === 0) return;
  const chance = 0.15 + state.heat / 300;
  if (Math.random() > chance) return;

  const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const e of pool) {
    roll -= e.weight;
    if (roll <= 0) {
      if (e.type === "choice") {
        showEventModal(e);
      } else {
        e.apply(state);
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
  log(`🤝 ${member.name} rejoint l'équipe (−${fmt(member.cost)}$).`, "good");
  render();
  save();
}

function buyUpgrade(id) {
  const up = UPGRADES.find((u) => u.id === id);
  if (!up || hasUpgrade(id) || state.cash < up.cost) return;
  state.cash -= up.cost;
  state.upgrades.push(id);
  log(`🏗️ ${up.name} installé (−${fmt(up.cost)}$).`, "good");
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
  log(`🏗️ Nouveau labo : ${next.name} (−${fmt(next.cost)}$).`, "good");
  render();
  save();
}

// ---------- Rendu UI ----------
function render() {
  renderStats();
  renderActions();
  renderLab();
  renderUpgrades();
  renderStaff();
  renderLog();
  document.getElementById("day-num").textContent = state.day;
  document.getElementById("ap-num").textContent = state.ap;
  document.getElementById("btn-next-day").disabled = state.gameOver || state.victory;
}

function renderStats() {
  const stats = [
    { label: "Argent propre", value: `${fmt(state.cash)}$`, cls: "good" },
    { label: "Argent sale", value: `${fmt(state.dirty)}$`, cls: state.dirty > 100_000 ? "warn" : "" },
    { label: "Stock", value: `${state.stock.toFixed(1)} / ${lab().cap} kg`, cls: "blue" },
    { label: "Pureté", value: `${purityNow()}%`, cls: "blue" },
    { label: "Chaleur DEA", value: `${state.heat}/100`, cls: state.heat >= 70 ? "warn" : "" },
    { label: "Respect", value: state.respect, cls: "" },
    { label: "Prix du kg", value: `${fmt(pricePerKg())}$`, cls: "" },
  ];
  document.getElementById("statbar").innerHTML = stats
    .map((s) => `<div class="stat ${s.cls}"><div class="label">${s.label}</div><div class="value">${s.value}</div></div>`)
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
      render();
      save();
    });
  });
}

function renderLab() {
  const next = LABS[state.labLevel + 1];
  const cards = [
    `<div class="card owned">
      <div class="icon">${lab().emoji}</div>
      <h3>${lab().name}</h3>
      <p>Production : ${lab().cook} kg/action. Stock max : ${lab().cap} kg.</p>
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
  if (old) old.replaceWith(container);
  else document.getElementById("upgrades").before(container);
  container.id = "lab-cards";
  const btn = container.querySelector("#btn-lab");
  if (btn) btn.addEventListener("click", upgradeLab);
}

function renderUpgrades() {
  const container = document.getElementById("upgrades");
  container.innerHTML = UPGRADES.map((u) => {
    const owned = hasUpgrade(u.id);
    return `
    <div class="card ${owned ? "owned" : ""}">
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
    <div class="card ${hired ? "owned" : ""}">
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

function showOverlay(win) {
  const overlay = document.getElementById("overlay");
  const box = overlay.querySelector(".overlay-box");
  box.classList.toggle("lose", !win);
  document.getElementById("overlay-title").textContent = win
    ? "👑 SAY MY NAME."
    : "🚨 FIN DE PARTIE";
  document.getElementById("overlay-text").textContent = win
    ? `Vous avez bâti un empire de ${fmt(state.cash)}$ en ${state.day} jours. L'argent propre a triomphé... pour l'instant.`
    : "Menottes, flashs, une cellule à Albuquerque. Votre empire s'arrête ici.";
  overlay.classList.remove("hidden");
}

// ---------- Sauvegarde ----------
function save() {
  try {
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
    return true;
  } catch (e) {
    return false;
  }
}

function reset() {
  localStorage.removeItem(SAVE_KEY);
  state = newGame();
  log("🎬 Nouvelle vie. Un RV, un tablier, un rêve.");
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
  log("💾 Partie sauvegardée.");
  render();
});

if (!load()) {
  log("🎬 Albuquerque, Nouveau-Mexique. Un RV, un tablier, un rêve.");
  log("💡 Objectif : 10 000 000$ d'argent propre. Attention à la chaleur DEA (100 = arrestation).");
}
render();
