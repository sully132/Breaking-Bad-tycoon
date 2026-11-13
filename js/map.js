// Carte interactive d'Albuquerque — v5
// Dépend de game.js (state, showModal, helpers) et data.js (MAP_LOCATIONS, DIALOGUES).
// Charge APRÈS game.js.

(function () {
  let canvas = null;
  let ctx = null;
  let hoverId = null;
  let anim = 0;
  let rafId = 0;

  const DPR_CAP = 2;
  const HIT_RADIUS = 34;

  function unlocked(loc) {
    return !loc.unlock || loc.unlock(state);
  }

  function locPixel(loc) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    return { x: loc.x * w, y: loc.y * h };
  }

  function hasFreshInteraction(loc) {
    if (!state.visitedToday) return false;
    return loc.interactions.some((it) => !state.visitedToday[loc.id + ":" + it.id] && (!it.cond || it.cond(state)));
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    if (!canvas || !ctx) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;

    ctx.clearRect(0, 0, w, h);

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#f5c98a");
    sky.addColorStop(0.45, "#e8b877");
    sky.addColorStop(1, "#d8a566");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(120, 84, 60, 0.45)";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.22);
    ctx.lineTo(w * 0.12, h * 0.08);
    ctx.lineTo(w * 0.28, h * 0.2);
    ctx.lineTo(w * 0.45, h * 0.05);
    ctx.lineTo(w * 0.62, h * 0.19);
    ctx.lineTo(w * 0.8, h * 0.07);
    ctx.lineTo(w, h * 0.21);
    ctx.lineTo(w, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 245, 220, 0.85)";
    ctx.lineWidth = Math.max(10, h * 0.05);
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(w, h * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.55, 0);
    ctx.lineTo(w * 0.55, h);
    ctx.stroke();
    ctx.strokeStyle = "rgba(160, 110, 60, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(w, h * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.55, 0);
    ctx.lineTo(w * 0.55, h);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const loc of MAP_LOCATIONS) {
      const p = locPixel(loc);
      const open = unlocked(loc);
      const isHover = hoverId === loc.id;
      const pulse = hasFreshInteraction(loc) && open;
      const s = 32 + (isHover ? 4 : 0) + (pulse ? Math.sin(anim / 300) * 2 : 0);

      if (pulse) {
        const ring = 40 + Math.sin(anim / 250) * 6;
        ctx.strokeStyle = "rgba(255, 215, 80, " + (0.55 + Math.sin(anim / 250) * 0.25) + ")";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, ring, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = open ? 1 : 0.35;
      ctx.fillStyle = loc.color;
      ctx.strokeStyle = isHover ? "#ffffff" : "rgba(60, 35, 20, 0.7)";
      ctx.lineWidth = isHover ? 3 : 2;
      roundRect(p.x - s, p.y - s, s * 2, s * 2, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = "22px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(open ? loc.emoji : "🔒", p.x, p.y - 4);

      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "rgba(50, 25, 10, 0.95)";
      ctx.fillText(loc.name, p.x, p.y + s + 12);
      ctx.globalAlpha = 1;
    }

    anim += 16;
    rafId = requestAnimationFrame(draw);
  }

  function resize() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function pickLocation(mx, my) {
    let best = null;
    let bestDist = Infinity;
    for (const loc of MAP_LOCATIONS) {
      const p = locPixel(loc);
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d < bestDist) {
        bestDist = d;
        best = loc;
      }
    }
    return bestDist <= HIT_RADIUS ? best : null;
  }

  function init() {
    canvas = document.getElementById("map-canvas");
    if (!canvas) return;
    ctx = canvas.getContext ? canvas.getContext("2d") : null;
    if (!ctx) return;
    resize();
    window.addEventListener("resize", resize);

    canvas.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      const loc = pickLocation(e.clientX - r.left, e.clientY - r.top);
      hoverId = loc ? loc.id : null;
      canvas.style.cursor = loc ? "pointer" : "default";
    });

    canvas.addEventListener("pointerdown", (e) => {
      const r = canvas.getBoundingClientRect();
      const loc = pickLocation(e.clientX - r.left, e.clientY - r.top);
      if (!loc) return;
      if (!unlocked(loc)) {
        spawnPopup("🔒 Lieu verrouillé", "info");
        return;
      }
      visitLocation(loc.id);
    });

    draw();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

function visitLocation(id) {
  if (state.gameOver || state.victory) return;
  const loc = MAP_LOCATIONS.find((l) => l.id === id);
  if (!loc) return;
  if (loc.unlock && !loc.unlock(state)) {
    spawnPopup("🔒 Lieu verrouillé", "info");
    return;
  }

  const used = (it) => state.visitedToday && state.visitedToday[loc.id + ":" + it.id];
  const choices = [];
  for (const it of loc.interactions) {
    if (it.cond && !it.cond(state)) continue;
    const done = used(it);
    const label =
      `${it.icon} ${it.label}` +
      (it.apCost ? ` (${it.apCost} PA)` : " (gratuit)") +
      (done ? " ✔ déjà fait" : "");
    choices.push({
      label,
      can: () => !done && state.ap >= (it.apCost || 0),
      apply: () => runInteraction(loc, it),
    });
  }
  choices.push({ label: "🚶 Repartir", can: () => true, apply: () => {} });

  showModal(`${loc.emoji} ${loc.name}`, loc.desc, choices);
}

function runInteraction(loc, it) {
  if (!state.visitedToday) state.visitedToday = {};
  const key = loc.id + ":" + it.id;
  if (state.visitedToday[key]) return;
  if (state.ap < (it.apCost || 0)) {
    spawnPopup("⏳ Pas assez de PA", "bad");
    return;
  }
  state.ap -= it.apCost || 0;
  state.visitedToday[key] = true;
  playSfx("click");

  if (it.dialogue && DIALOGUES[it.dialogue]) {
    playDialogue(DIALOGUES[it.dialogue]);
  } else if (typeof it.effect === "function") {
    it.effect(state);
  }

  checkAchievements();
  render();
  save();
}

function playDialogue(d) {
  const line = d.lines[Math.floor(Math.random() * d.lines.length)];
  const choices = line.choices.map((c) => ({
    label: c.label,
    can: c.can || (() => true),
    apply: (s) => {
      c.effect(s);
      log(`💬 ${d.name} : “${c.label}”`, "info");
    },
  }));
  showModal(`${d.emoji} ${d.name}`, line.text, choices);
}
