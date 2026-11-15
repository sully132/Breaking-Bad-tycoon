# -*- coding: utf-8 -*-
# v48 — Réactions des passants pendant les cinématiques + contrats express
# (petites livraisons chronométrées en temps réel, 10 minutes)
import re, io

def rd(p):
    with io.open(p, encoding="utf-8") as f: return f.read()

def wr(p, s):
    with io.open(p, "w", encoding="utf-8") as f: f.write(s)

def rep(s, old, new, n=1, tag=""):
    c = s.count(old)
    assert c == n, "ANCRE %r : %d occurrences (attendu %d) [%s]" % (old[:60], c, n, tag)
    return s.replace(old, new)

# ============================== js/data.js ==============================
s = rd("js/data.js")

# (a) clients des contrats express
old = "const CONTRACT_COOLDOWN_DAYS = 2;"
new = old + '''

// v48 : clients des contrats express (livraisons chronométrées en temps réel)
const EXPRESS_CLIENTS = [
  { emoji: "🛹", name: "Skinny Pete" },
  { emoji: "🚲", name: "Brandon" },
  { emoji: "🕶️", name: "Emilio" },
  { emoji: "🎲", name: "Krazy-8" },
  { emoji: "🧢", name: "Un dealer de passage" },
];'''
s = rep(s, old, new, 1, "EXPRESS_CLIENTS")

# (b) succès express5 après chainMaster
old = '''  { id: "chainMaster", icon: "🔗", name: "Maître des chaînes", desc: "Mener les 3 chaînes d'événements à leur terme", check: (s) => !!(s.evSeen && s.evSeen.deaSting && s.evSeen.methylamineDeal && s.evSeen.turfMeet), reward: { cash: 50_000, respect: 15 } },
);'''
new = old + '''
// v48 — succès des contrats express
ACHIEVEMENTS.push(
  { id: "express5", icon: "⚡", name: "Livreur express", desc: "Réussir 5 contrats express", check: (s) => ((s.stats && s.stats.expressDone) || 0) >= 5, reward: { cash: 30_000, respect: 5 } },
);'''
s = rep(s, old, new, 1, "ACHIEVEMENTS express5")

wr("js/data.js", s)

# ============================== js/game.js ==============================
s = rd("js/game.js")

# (c) newGame : état express + stat
old = '''    contract: null,
    contractCooldown: 0,'''
new = '''    contract: null,
    contractCooldown: 0,
    express: null, // v48 : contrat express en cours'''
s = rep(s, old, new, 1, "newGame express")
s = rep(s, "mgTucoBest: 0, mgSellBest: 0 },", "mgTucoBest: 0, mgSellBest: 0, expressDone: 0 },", 1, "newGame stat express")

# (d) migration load
old = '''    if (typeof state.albumTier !== "number") state.albumTier = 0; // v39 : palier de collection atteint'''
new = '''    if (typeof state.albumTier !== "number") state.albumTier = 0; // v39 : palier de collection atteint
    if (typeof state.express === "undefined") state.express = null; // v48 : contrats express'''
s = rep(s, old, new, 1, "migration express")

# (e) fonctions express après completeContract
old = '''  state.contract = null;
  state.contractCooldown = CONTRACT_COOLDOWN_DAYS;
  if (success) trackMission("contract", 1);
}'''
new = '''  state.contract = null;
  state.contractCooldown = CONTRACT_COOLDOWN_DAYS;
  if (success) trackMission("contract", 1);
}

// ---------- v48 : contrats express (chronométrés en temps réel) ----------
function spawnExpress() {
  if (state.express || state.gameOver || state.victory) return;
  if (Math.random() > 0.4) return;
  const client = EXPRESS_CLIENTS[Math.floor(Math.random() * EXPRESS_CLIENTS.length)];
  const kg = Math.round(rand(2, 5) * 10) / 10;
  state.express = {
    emoji: client.emoji,
    client: client.name,
    kg,
    reward: Math.round(kg * pricePerKg() * rand(2.0, 2.4)),
    until: Date.now() + 10 * 60 * 1000,
  };
  log(`⚡ Contrat express : ${kg} kg pour ${client.name} — 10 minutes réelles !`, "event");
  toast("⚡ Contrat express !", `${client.name} veut ${kg} kg dans les 10 minutes.`);
}

function deliverExpress() {
  const ex = state.express;
  if (!ex || state.stock < ex.kg) return;
  state.stock = Math.round((state.stock - ex.kg) * 10) / 10;
  state.dirty += ex.reward;
  state.respect = cap(state.respect + 2, 0, 100);
  state.stats.expressDone = (state.stats.expressDone || 0) + 1;
  state.stats.totalEarned += ex.reward;
  state.soldToday = true;
  spawnPopup(`⚡ Express livré ! +${fmt(ex.reward)}$`, "money");
  playSfx("cash");
  log(`⚡ Contrat express honoré : ${ex.kg} kg livrés à ${ex.client} pour ${fmt(ex.reward)}$. Respect +2.`, "good");
  state.express = null;
  checkAchievements();
  render();
  save();
}

function expireExpress() {
  const ex = state.express;
  if (!ex) return false;
  if (Date.now() > ex.until) {
    state.express = null;
    state.respect = cap(state.respect - 1, 0, 100);
    log(`⚡ Contrat express raté : ${ex.client} est parti. Respect −1.`, "bad");
    return true;
  }
  return false;
}'''
s = rep(s, old, new, 1, "fonctions express")

# (f) spawn dans endDay
old = '''  rollSceneEvents();
  rollRelic();'''
new = '''  rollSceneEvents();
  spawnExpress(); // v48 : contrat express possible chaque jour
  rollRelic();'''
s = rep(s, old, new, 1, "endDay spawn")

# (g) expiration + rafraîchissement du compte à rebours dans idleTick
old = '''function idleTick() {
  if (state.gameOver || state.victory) return;'''
new = '''function idleTick() {
  if (state.gameOver || state.victory) return;
  if (state.express) { // v48 : expiration + compte à rebours des contrats express
    if (expireExpress()) { render(); save(); }
    else renderContracts();
  }'''
s = rep(s, old, new, 1, "idleTick express")

# (h) renderContracts : carte express en plus du contrat classique
old = '''function renderContracts() {
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
}'''
new = '''function renderContracts() {
  const container = document.getElementById("contracts");
  const c = state.contract;
  const ex = state.express;
  let html = "";
  if (c) {
    const pct = (c.progress / c.kg) * 100;
    const urgent = c.days <= 1;
    html += `
    <div class="card" style="border-color: var(--blue);">
      <div class="icon">${c.emoji}</div>
      <h3>${c.client}</h3>
      <p>Livrer <b>${c.kg} kg</b>. Récompense : <b>${fmt(c.reward)}$</b> (sale) + 4 respect.</p>
      <div class="contract-progress"><div class="fill" style="width:${cap(pct, 0, 100)}%"></div></div>
      <div class="meta">${c.progress.toFixed(1)} / ${c.kg} kg livrés</div>
      <div class="contract-deadline ${urgent ? "urgent" : ""}">⏳ ${c.days} jour(s) restant(s)</div>
      <button class="btn primary" id="btn-deliver" ${state.stock > 0 && c.progress < c.kg ? "" : "disabled"}>Livrer le stock (gratuit)</button>
    </div>`;
  }
  if (ex) {
    // v48 : contrat express — chronométré en temps réel
    const left = Math.max(0, Math.ceil((ex.until - Date.now()) / 60_000));
    html += `
    <div class="card" style="border-color: var(--yellow);">
      <div class="icon">⚡</div>
      <h3>Express — ${ex.client}</h3>
      <p>Livrer <b>${ex.kg} kg</b> en moins de 10 minutes réelles. Paiement immédiat : <b>${fmt(ex.reward)}$</b> (sale) + 2 respect.</p>
      <div class="contract-deadline urgent">⏱ ${left} min restante(s)</div>
      <button class="btn primary" id="btn-express" ${state.stock >= ex.kg ? "" : "disabled"}>Livrer ${ex.kg} kg d'un coup</button>
    </div>`;
  }
  if (!html) {
    html = `
      <div class="card locked">
        <div class="icon">📞</div>
        <h3>Aucun contrat en cours</h3>
        <p>Les clients vous rappelleront dans ${Math.max(0, state.contractCooldown)} jour(s)...</p>
      </div>`;
  }
  container.innerHTML = html;
  const btn = container.querySelector("#btn-deliver");
  if (btn) btn.addEventListener("click", deliverContract);
  const ebx = container.querySelector("#btn-express");
  if (ebx) ebx.addEventListener("click", deliverExpress);
}'''
s = rep(s, old, new, 1, "renderContracts v48")

# (i) exports smoke
s = rep(s, "flushSceneEvents, rollSceneEvents, queueChainEvent", "flushSceneEvents, rollSceneEvents, queueChainEvent, spawnExpress, deliverExpress, expireExpress", 1, "X_GAME export v48")

wr("js/game.js", s)

# ============================== js/locscene.js ==============================
s = rd("js/locscene.js")

# (j) les passants s'écartent du visiteur (x devient mutable)
old = '''      const x = w * pos[0] + Math.sin(tw * 0.4 + i * 2.3) * range;'''
new = '''      let x = w * pos[0] + Math.sin(tw * 0.4 + i * 2.3) * range;'''
s = rep(s, old, new, 1, "x mutable")

old = '''      if (cineOn && eventVisitor) {
        // v39 : léger penché de curiosité vers le visiteur'''
new = '''      if (cineOn && eventVisitor) {
        // v48 : les passants s'écartent prudemment du visiteur
        const away = Math.sign(x - eventVisitor.x) || 1;
        x += away * Math.min(w * 0.035, Math.abs(eventVisitor.x - x) * 0.15);
        // v39 : léger penché de curiosité vers le visiteur'''
s = rep(s, old, new, 1, "écartement")

# (k) marque de réaction au-dessus du passant le plus proche
old = '''      charScreens.push({ id: list[i], x, y: ground, s: sc });
    }
  }'''
new = '''      charScreens.push({ id: list[i], x, y: ground, s: sc });
    }
    // v48 : marque de réaction (! / ?) au-dessus du passant le plus proche du visiteur
    if (cineOn && eventVisitor && charScreens.length) {
      let nearest = null, nd = Infinity;
      for (const cs of charScreens) {
        const d = Math.abs(cs.x - eventVisitor.x);
        if (d < nd) { nd = d; nearest = cs; }
      }
      if (nearest && nd > 40) {
        const angry = (typeof EV_MOODS !== "undefined" && evCine.ev && EV_MOODS[evCine.ev.id] === "angry");
        const rm = angry ? "!" : "?";
        const rk = Math.min(1, (anim - evCine.start) / 280);
        ctx.save();
        ctx.globalAlpha = rk;
        ctx.font = "bold " + Math.round(17 * (0.6 + 0.4 * rk)) + "px sans-serif";
        ctx.fillStyle = angry ? "#e8c84a" : "#cfe3ff";
        ctx.textAlign = "center";
        ctx.fillText(rm, nearest.x, nearest.y - 128 * nearest.s + Math.sin(anim / 300) * 3);
        ctx.textAlign = "left";
        ctx.restore();
      }
    }
  }'''
s = rep(s, old, new, 1, "marque réaction")

wr("js/locscene.js", s)

# ============================== smoke.test.js ==============================
s = rd("smoke.test.js")
s = rep(s, "EXPRESS_CLIENTS", "EXPRESS_CLIENTS", 0, "noop") if False else s
s = rep(s, "STORY_ARCS, WEEKEND_EVENTS };", "STORY_ARCS, WEEKEND_EVENTS, EXPRESS_CLIENTS };", 1, "X_DATA export")
s = rep(s, "heisenberg-v47", "heisenberg-v48", s.count("heisenberg-v47"), "sw refs")
s = rep(s, "SW cache v47:", "SW cache v48:", s.count("SW cache v47:"), "sw labels")

old = 'console.log("SMOKE TEST PASSE");'
new = '''// v48 : réactions des passants + contrats express
const ljs26 = fs.readFileSync("js/locscene.js", "utf8");
console.log("passants réactifs:", ljs26.includes("s'écartent prudemment") && ljs26.includes("marque de réaction") ? "OK" : "FAIL");
console.log("clients express:", Array.isArray(D.EXPRESS_CLIENTS) && D.EXPRESS_CLIENTS.length >= 4 ? "OK (" + D.EXPRESS_CLIENTS.length + ")" : "FAIL");
console.log("succès express:", D.ACHIEVEMENTS.some((a) => a.id === "express5") ? "OK" : "FAIL");
try {
  G.state.stock = 10;
  G.state.express = { kg: 3, reward: 12_000, until: Date.now() + 600_000, client: "Test" };
  G.deliverExpress();
} catch (e) {}
console.log("livraison express:", G.state.express === null && G.state.stats.expressDone >= 1 ? "OK" : "FAIL");
console.log("expiration express:", (function () { G.state.express = { kg: 2, reward: 8_000, until: Date.now() - 1000, client: "Test" }; try { return G.expireExpress() === true && G.state.express === null; } catch (e) { return false; } })() ? "OK" : "FAIL");
console.log("SW cache v48:", fs.readFileSync("sw.js", "utf8").includes("heisenberg-v48") ? "OK" : "FAIL");

console.log("SMOKE TEST PASSE");'''
s = rep(s, old, new, 1, "smoke tail v48")
wr("smoke.test.js", s)

# ============================== sw.js / index.html ==============================
s = rd("sw.js")
s = rep(s, 'const CACHE = "heisenberg-v47";', 'const CACHE = "heisenberg-v48";', 1, "sw cache")
wr("sw.js", s)

s = rd("index.html")
s = rep(s, "Heisenberg Tycoon v47 — fan game non officielle", "Heisenberg Tycoon v48 — fan game non officielle", 1, "index version")
wr("index.html", s)

# ============================== RESUME.md ==============================
s = rd("RESUME.md")
m = re.compile(r"- \*\*v47 \(courante\)[^\n]*").search(s)
assert m, "RESUME : ligne v47 (courante) introuvable"
new_line = "- **v48 (courante) : réactions des passants + contrats express — les personnages s'écartent prudemment du visiteur et réagissent (! ou ?) pendant les cinématiques, contrats express chronométrés en temps réel (10 minutes, paiement ×2,2 immédiat), succès « Livreur express ».**"
s = s[:m.start()] + new_line + s[m.end():]
wr("RESUME.md", s)

# ============================== ROADMAP.md ==============================
s = rd("ROADMAP.md")
old = """- [ ] Prochaines pistes : flou d'arrière-plan sur les plans poitrine, réactions des passants pendant la cinématique, contrats express à durée limitée"""
new = old + """

## Phase 28 — Passants réactifs & contrats express (v48) ✅ LIVRÉE (v48)
- [x] Les passants s'écartent prudemment du visiteur pendant les cinématiques *(livré en v48)*
- [x] Marque de réaction (! doré si tension, ? bleu sinon) au-dessus du passant le plus proche *(livré en v48)*
- [x] Contrats express : petites livraisons chronométrées en TEMPS RÉEL (10 minutes), paiement ×2,2 immédiat, apparition quotidienne aléatoire *(livré en v48)*
- [x] Succès « Livreur express » : 5 contrats express réussis (+30 000$, +5 respect) *(livré en v48)*
- [ ] Prochaines pistes : contrats express visibles sur la carte, chaîne de prestige post-reset, flou d'arrière-plan sur les plans poitrine"""
s = rep(s, old, new, 1, "ROADMAP phase28")
wr("ROADMAP.md", s)

print("PATCH v48 APPLIQUE")
