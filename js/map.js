// Carte interactive d'Albuquerque — v6
// Dépend de game.js (state, showModal, helpers) et data.js (MAP_LOCATIONS, DIALOGUES).
// Charge APRÈS game.js.

(function () {
  let canvas = null;
  let ctx = null;
  let hoverId = null;
  let anim = 0;
  let rafId = 0;

  const DPR_CAP = 2;
  const HIT_RADIUS = 36;

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

  function drawSun(w, h) {
    const sx = w * 0.92;
    const sy = h * 0.1;
    const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 60);
    glow.addColorStop(0, "rgba(255, 236, 160, 0.9)");
    glow.addColorStop(1, "rgba(255, 236, 160, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(sx - 70, sy - 70, 140, 140);
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath();
    ctx.arc(sx, sy, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawClouds(w, h) {
    const clouds = [
      { x: (0.2 + Math.sin(anim / 9000) * 0.04), y: 0.12, s: 1 },
      { x: (0.55 + Math.cos(anim / 12000) * 0.05), y: 0.2, s: 0.7 },
      { x: (0.8 + Math.sin(anim / 7000) * 0.03), y: 0.08, s: 0.85 },
    ];
    ctx.fillStyle = "rgba(255, 250, 235, 0.5)";
    for (const c of clouds) {
      const cx = c.x * w;
      const cy = c.y * h;
      const r = 16 * c.s;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.arc(cx + r * 0.9, cy + r * 0.2, r * 0.75, 0, Math.PI * 2);
      ctx.arc(cx - r * 0.9, cy + r * 0.25, r * 0.65, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMountains(w, h) {
    ctx.fillStyle = "rgba(120, 84, 60, 0.5)";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.24);
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
    ctx.fillStyle = "rgba(255, 240, 210, 0.35)";
    ctx.beginPath();
    ctx.moveTo(w * 0.45, h * 0.05);
    ctx.lineTo(w * 0.5, h * 0.12);
    ctx.lineTo(w * 0.41, h * 0.12);
    ctx.closePath();
    ctx.fill();
  }

  function drawCityBlocks(w, h) {
    ctx.fillStyle = "rgba(90, 110, 70, 0.18)";
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 3; j++) {
        const bx = w * (0.06 + i * 0.135);
        const by = h * (0.62 + j * 0.11);
        roundRect(bx, by, w * 0.1, h * 0.075, 5);
        ctx.fill();
      }
    }
  }

  function drawRiver(w, h) {
    ctx.strokeStyle = "rgba(90, 150, 190, 0.65)";
    ctx.lineWidth = Math.max(8, h * 0.028);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(w * 0.66, h);
    ctx.bezierCurveTo(w * 0.72, h * 0.8, w * 0.6, h * 0.72, w * 0.68, h * 0.58);
    ctx.bezierCurveTo(w * 0.74, h * 0.46, w * 0.9, h * 0.44, w, h * 0.4);
    ctx.stroke();
    ctx.strokeStyle = "rgba(190, 225, 245, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  function drawRoads(w, h) {
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
  }

  function drawLocations(w, h) {
    for (const loc of MAP_LOCATIONS) {
      const p = locPixel(loc);
      const open = unlocked(loc);
      const isHover = hoverId === loc.id;
      const pulse = hasFreshInteraction(loc) && open;
      const s = 30 + (isHover ? 4 : 0) + (pulse ? Math.sin(anim / 300) * 2 : 0);

      ctx.fillStyle = "rgba(40, 25, 12, 0.25)";
      roundRect(p.x - s + 3, p.y - s + 5, s * 2, s * 2, 14);
      ctx.fill();

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
      ctx.strokeStyle = isHover ? "#ffffff" : "rgba(60, 35, 20, 0.75)";
      ctx.lineWidth = isHover ? 3 : 2;
      roundRect(p.x - s, p.y - s, s * 2, s * 2, 14);
      ctx.fill();
      ctx.stroke();

      ctx.font = "22px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(open ? loc.emoji : "🔒", p.x, p.y - 3);

      ctx.font = "bold 11px sans-serif";
      const tw = ctx.measureText(loc.name).width + 12;
      ctx.fillStyle = "rgba(30, 18, 8, 0.75)";
      roundRect(p.x - tw / 2, p.y + s + 3, tw, 16, 8);
      ctx.fill();
      ctx.fillStyle = "#f5ecd8";
      ctx.fillText(loc.name, p.x, p.y + s + 12);
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    if (!canvas || !ctx) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) {
      rafId = requestAnimationFrame(draw);
      return;
    }

    ctx.clearRect(0, 0, w, h);

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#f5c98a");
    sky.addColorStop(0.45, "#e8b877");
    sky.addColorStop(1, "#d8a566");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    drawSun(w, h);
    drawClouds(w, h);
    drawMountains(w, h);
    drawCityBlocks(w, h);
    drawRoads(w, h);
    drawRiver(w, h);
    drawLocations(w, h);

    anim += 16;
    rafId = requestAnimationFrame(draw);
  }

  function resize() {
    if (!canvas || !ctx) return;
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
      if (typeof haptic === "function") haptic(8);
      if (!unlocked(loc)) {
        spawnPopup("🔒 Lieu verrouillé", "info");
        return;
      }
      visitLocation(loc.id);
    });

    draw();
  }

  window.heismapOnShow = function () {
    resize();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

function setModalAvatar(emoji) {
  const av = document.getElementById("modal-avatar");
  if (!av) return;
  if (emoji) {
    av.textContent = emoji;
    av.style.display = "";
  } else {
    av.textContent = "";
    av.style.display = "none";
  }
}

function visitLocation(id) {
  if (state.gameOver || state.victory) return;
  const loc = MAP_LOCATIONS.find((l) => l.id === id);
  if (!loc) return;
  if (loc.unlock && !loc.unlock(state)) {
    spawnPopup("🔒 Lieu verrouillé", "info");
    return;
  }

  setModalAvatar(loc.emoji);
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
  if (typeof haptic === "function") haptic(15);

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
  setModalAvatar(d.emoji);
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
