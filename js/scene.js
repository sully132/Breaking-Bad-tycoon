// ============================================================
// HEISENBERG TYCOON — Scène animée (canvas, style idle tycoon)
// Désert d'Albuquerque, cycle jour/nuit, labos qui évoluent,
// fumée de cuisson, cristaux bleus, gyrophares de la DEA.
// ============================================================

const scene = (() => {
  let canvas, ctx, W = 800, H = 260, dpr = 1;
  let smoke = [];      // particules de fumée {x,y,vx,vy,r,life}
  let crystals = [];   // cristaux bleus {x,y,vy,r,rot,life}
  let bills = [];      // billets (blanchiment) {x,y,vy,life,phase}
  let stars = [];      // étoiles fixes {x,y,r,phase}
  let popupAnchor = { x: 0.5, y: 0.4 };

  // FX alimenté par game.js : { cook: timestamp, sell: timestamp, launder: timestamp }
  const FX = { cook: 0, sell: 0, launder: 0 };

  const CYCLE_MS = 60_000; // une journée complète toutes les 60 s

  function init() {
    canvas = document.getElementById("game-canvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", onPointerDown);
    for (let i = 0; i < 60; i++) {
      stars.push({ x: Math.random(), y: Math.random() * 0.55, r: Math.random() * 1.4 + 0.4, phase: Math.random() * Math.PI * 2 });
    }
    requestAnimationFrame(loop);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function onPointerDown(ev) {
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width;
    const y = (ev.clientY - rect.top) / rect.height;
    popupAnchor = { x, y };
    if (typeof tapBoost === "function") tapBoost(x, y);
  }

  function labLevel() {
    return (typeof state !== "undefined" && state && !state.gameOver) ? state.labLevel : 0;
  }

  function heat() {
    return (typeof state !== "undefined" && state) ? state.heat : 0;
  }

  function dayFactor(t) {
    // 0 = nuit noire, 0.5 = plein midi
    const phase = (t % CYCLE_MS) / CYCLE_MS;
    return 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
  }

  function lerpColor(a, b, f) {
    const c = (i) => Math.round(a[i] + (b[i] - a[i]) * f);
    return `rgb(${c(0)},${c(1)},${c(2)})`;
  }

  function drawSky(f) {
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.75);
    g.addColorStop(0, lerpColor([10, 14, 38], [92, 168, 224], f));
    g.addColorStop(0.7, lerpColor([24, 30, 60], [236, 200, 140], f));
    g.addColorStop(1, lerpColor([36, 40, 70], [244, 213, 141], f));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawStars(f) {
    const alpha = Math.max(0, 1 - f * 2.2);
    if (alpha <= 0) return;
    const t = performance.now() / 1000;
    ctx.fillStyle = "#fff";
    for (const s of stars) {
      ctx.globalAlpha = alpha * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + s.phase)));
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawSunMoon(f) {
    const x = W * (0.15 + 0.7 * (1 - Math.abs(f - 0.5) * 2));
    const y = H * 0.62 - f * H * 0.45;
    if (f > 0.25) {
      ctx.save();
      ctx.shadowColor = "rgba(255,220,120,0.9)";
      ctx.shadowBlur = 30;
      ctx.fillStyle = "#ffd76e";
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.shadowColor = "rgba(200,220,255,0.8)";
      ctx.shadowBlur = 20;
      ctx.fillStyle = "#dfe8f5";
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(160,180,210,0.5)";
      ctx.beginPath();
      ctx.arc(x - 4, y - 3, 3, 0, Math.PI * 2);
      ctx.arc(x + 5, y + 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawMountains(f) {
    const shade = lerpColor([26, 32, 52], [150, 120, 96], f);
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.72);
    ctx.lineTo(W * 0.12, H * 0.5);
    ctx.lineTo(W * 0.26, H * 0.68);
    ctx.lineTo(W * 0.4, H * 0.46);
    ctx.lineTo(W * 0.55, H * 0.7);
    ctx.lineTo(W * 0.72, H * 0.52);
    ctx.lineTo(W * 0.88, H * 0.7);
    ctx.lineTo(W, H * 0.56);
    ctx.lineTo(W, H * 0.78);
    ctx.lineTo(0, H * 0.78);
    ctx.closePath();
    ctx.fill();
  }

  function drawGround(f) {
    const g = ctx.createLinearGradient(0, H * 0.72, 0, H);
    g.addColorStop(0, lerpColor([70, 62, 48], [214, 178, 122], f));
    g.addColorStop(1, lerpColor([40, 36, 28], [178, 140, 92], f));
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.72, W, H * 0.28);

    ctx.fillStyle = lerpColor([30, 30, 32], [90, 88, 92], f);
    ctx.fillRect(0, H * 0.86, W, H * 0.06);
    ctx.fillStyle = lerpColor([70, 70, 74], [220, 214, 190], f);
    for (let x = 0; x < W; x += 46) {
      ctx.fillRect(x, H * 0.885, 24, 4);
    }
  }

  function drawCactus(x, y, s, f) {
    const col = lerpColor([30, 60, 34], [86, 142, 84], f);
    ctx.fillStyle = col;
    ctx.fillRect(x - 3 * s, y - 34 * s, 6 * s, 34 * s);
    ctx.fillRect(x - 13 * s, y - 26 * s, 10 * s, 4 * s);
    ctx.fillRect(x - 13 * s, y - 26 * s, 4 * s, 12 * s);
    ctx.fillRect(x + 3 * s, y - 22 * s, 10 * s, 4 * s);
    ctx.fillRect(x + 9 * s, y - 22 * s, 4 * s, 9 * s);
  }

  function drawHeisenberg(x, y, f) {
    const t = performance.now() / 1000;
    const bob = Math.sin(t * 2) * 1.5;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-9, -46, 18, 5);
    ctx.fillRect(-13, -42, 26, 4);
    ctx.fillStyle = lerpColor([200, 170, 140], [235, 205, 175], f);
    ctx.fillRect(-8, -38, 16, 14);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(-4, -32, 3, 0, Math.PI * 2);
    ctx.arc(4, -32, 3, 0, Math.PI * 2);
    ctx.moveTo(-1, -32);
    ctx.lineTo(1, -32);
    ctx.stroke();
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-3, -27, 6, 5);
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(-10, -24, 20, 22);
    ctx.restore();
  }

  function drawBuilding(level, f, t) {
    const groundY = H * 0.86;
    const night = f < 0.35;
    const glow = night ? "rgba(122,182,72,0.85)" : "rgba(60,80,50,0.9)";

    if (level === 0) {
      const x = W * 0.5, y = groundY;
      ctx.fillStyle = "#e8e0c8";
      roundRect(x - 90, y - 62, 180, 52, 8, true);
      ctx.fillStyle = "#3aa6a0";
      ctx.fillRect(x - 90, y - 40, 180, 8);
      ctx.fillStyle = night ? "rgba(255,230,140,0.95)" : "#7fb2c9";
      ctx.fillRect(x - 70, y - 54, 26, 18);
      ctx.fillRect(x + 44, y - 54, 26, 18);
      ctx.fillStyle = "#8a8578";
      ctx.fillRect(x - 10, y - 30, 20, 20);
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(x - 55, y + 2, 12, 0, Math.PI * 2);
      ctx.arc(x + 55, y + 2, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#555";
      ctx.beginPath();
      ctx.arc(x - 55, y + 2, 5, 0, Math.PI * 2);
      ctx.arc(x + 55, y + 2, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (level === 1) {
      const x = W * 0.5, y = groundY;
      ctx.fillStyle = "#b09a72";
      ctx.fillRect(x - 110, y - 70, 220, 60);
      ctx.fillStyle = "#6e5236";
      ctx.beginPath();
      ctx.moveTo(x - 125, y - 70);
      ctx.lineTo(x, y - 108);
      ctx.lineTo(x + 125, y - 70);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = night ? glow : "#5a4a35";
      ctx.fillRect(x - 14, y - 34, 28, 24);
      ctx.fillStyle = night ? "rgba(255,230,140,0.9)" : "#7fb2c9";
      ctx.fillRect(x - 80, y - 58, 30, 20);
      ctx.fillRect(x + 50, y - 58, 30, 20);
      ctx.fillStyle = "#8a8578";
      ctx.fillRect(x + 84, y - 46, 12, 36);
    } else if (level === 2) {
      const x = W * 0.5, y = groundY;
      ctx.fillStyle = "#9aa3ab";
      ctx.fillRect(x - 150, y - 92, 300, 82);
      ctx.fillStyle = "#7c858d";
      ctx.fillRect(x - 150, y - 100, 300, 12);
      ctx.fillStyle = night ? glow : "#5d6a75";
      for (let i = -3; i <= 3; i++) ctx.fillRect(x + i * 38 - 10, y - 66, 20, 22);
      ctx.fillStyle = "#b8c0c8";
      for (const tx of [-190, 190]) {
        ctx.fillRect(x + tx - 16, y - 70, 32, 60);
        ctx.beginPath();
        ctx.ellipse(x + tx, y - 70, 16, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#2e6e46";
      roundRect(x - 60, y - 30, 120, 18, 4, true);
      ctx.fillStyle = "#dfe8f5";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("LOS POLLOS", x, y - 17);
    } else {
      const x = W * 0.5, y = groundY;
      ctx.fillStyle = "#3a4148";
      ctx.fillRect(x - 190, y - 120, 380, 110);
      ctx.fillStyle = "#2b3138";
      ctx.fillRect(x - 190, y - 130, 380, 14);
      ctx.fillStyle = night ? "rgba(110,211,255,0.9)" : "#5d6a75";
      for (let i = -4; i <= 4; i++) ctx.fillRect(x + i * 40 - 11, y - 92, 22, 28);
      ctx.fillStyle = "#545c64";
      for (const cx of [-120, 0, 120]) {
        ctx.fillRect(x + cx - 11, y - 180, 22, 62);
        ctx.fillStyle = "rgba(255,120,60,0.8)";
        ctx.fillRect(x + cx - 11, y - 186, 22, 6);
        ctx.fillStyle = "#545c64";
      }
      ctx.fillStyle = "#d9c33c";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("EMPIRE", x, y - 138);
    }
  }

  function roundRect(x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
  }

  function spawnSmoke(x, y) {
    smoke.push({ x: x + (Math.random() - 0.5) * 10, y, vx: (Math.random() - 0.5) * 0.3, vy: -(0.4 + Math.random() * 0.5), r: 4 + Math.random() * 5, life: 1 });
  }

  function spawnCrystal(x, y) {
    crystals.push({ x: x + (Math.random() - 0.5) * 120, y, vy: -(1.5 + Math.random() * 2), r: 3 + Math.random() * 4, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.2, life: 1 });
  }

  function spawnBill(x, y) {
    bills.push({ x: x + (Math.random() - 0.5) * 160, y, vy: -(1 + Math.random() * 1.5), phase: Math.random() * Math.PI * 2, life: 1 });
  }

  function drawParticles() {
    const now = performance.now();
    const cooking = now - FX.cook < 2500 || state && state.labLevel >= 3;
    const selling = now - FX.sell < 1800;
    const laundering = now - FX.launder < 1800;
    const level = labLevel();

    if (cooking) {
      const chimneyX = W * 0.5 + (level === 0 ? -60 : level === 1 ? 84 : level === 2 ? -190 : 0);
      const chimneyY = level === 0 ? H * 0.86 - 58 : level === 1 ? H * 0.86 - 44 : level === 2 ? H * 0.86 - 68 : H * 0.86 - 178;
      if (Math.random() < (level >= 3 ? 0.5 : 0.3)) spawnSmoke(chimneyX, chimneyY);
    }
    if (selling && Math.random() < 0.5) spawnCrystal(W * 0.5, H * 0.7);
    if (laundering && Math.random() < 0.5) spawnBill(W * 0.5, H * 0.75);

    ctx.save();
    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i];
      p.x += p.vx; p.y += p.vy; p.r += 0.08; p.life -= 0.012;
      if (p.life <= 0) { smoke.splice(i, 1); continue; }
      ctx.globalAlpha = p.life * 0.35;
      ctx.fillStyle = "#cfd4cc";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = crystals.length - 1; i >= 0; i--) {
      const p = crystals[i];
      p.y += p.vy; p.rot += p.vr; p.life -= 0.015;
      if (p.life <= 0) { crystals.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.life * 1.5);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = "#6fd3ff";
      ctx.shadowColor = "#6fd3ff";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -p.r * 1.6);
      ctx.lineTo(p.r, 0);
      ctx.lineTo(0, p.r * 1.6);
      ctx.lineTo(-p.r, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    for (let i = bills.length - 1; i >= 0; i--) {
      const p = bills[i];
      p.y += p.vy; p.phase += 0.1; p.life -= 0.012;
      if (p.life <= 0) { bills.splice(i, 1); continue; }
      const sway = Math.sin(p.phase) * 12;
      ctx.globalAlpha = Math.min(1, p.life * 1.5);
      ctx.save();
      ctx.translate(p.x + sway, p.y);
      ctx.rotate(Math.sin(p.phase) * 0.4);
      ctx.fillStyle = "#4e9a4e";
      ctx.fillRect(-9, -5, 18, 10);
      ctx.strokeStyle = "#2e6e2e";
      ctx.strokeRect(-9, -5, 18, 10);
      ctx.fillStyle = "#a8d8a8";
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawPoliceLights() {
    const heat = heat();
    if (heat < 70) return;
    const t = performance.now() / 1000;
    const phase = Math.floor(t * 2) % 2;
    const intensity = (heat - 70) / 30;
    const color = phase === 0 ? "rgba(255,60,60," : "rgba(70,120,255,";
    const g = ctx.createRadialGradient(W * 0.9, H * 0.2, 10, W * 0.9, H * 0.2, W * 0.5);
    g.addColorStop(0, color + (0.35 * intensity) + ")");
    g.addColorStop(1, color + "0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawVignette() {
    const heat = heat();
    if (heat < 85) return;
    const intensity = (heat - 85) / 15;
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7);
    g.addColorStop(0, "rgba(255,0,0,0)");
    g.addColorStop(1, `rgba(180,0,0,${0.35 * intensity})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function loop() {
    if (!ctx) return;
    const t = performance.now();
    const f = dayFactor(t);

    drawSky(f);
    drawStars(f);
    drawSunMoon(f);
    drawMountains(f);
    drawGround(f);
    const level = labLevel();
    drawCactus(W * 0.08, H * 0.85, 1, f);
    drawCactus(W * 0.16, H * 0.84, 0.7, f);
    drawCactus(W * 0.9, H * 0.85, 0.9, f);
    drawBuilding(level, f, t);
    drawHeisenberg(W * 0.5 + (level === 0 ? 130 : level === 1 ? 160 : level === 2 ? 240 : 260), H * 0.86, f);
    drawParticles();
    drawPoliceLights();
    drawVignette();

    requestAnimationFrame(loop);
  }

  return { init, FX };
})();

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", scene.init);
}
