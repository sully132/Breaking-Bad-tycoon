// Scènes plein écran par lieu — v11
// Chaque lieu de la carte s'ouvre en vraie scène animée (canvas plein écran)
// avec décor, personnages, effets d'affaire et bottom-sheet d'actions.
// Dépend de data.js (MAP_LOCATIONS, SCENES, CHAR_LOOKS, BUSINESSES),
// game.js (state, showBusinessModal, collectBusiness, fmtMoney...)
// et map.js (runInteraction, visitLocation en fallback).

(function () {
  let canvas = null;
  let ctx = null;
  let rafId = 0;
  let anim = 0;
  let currentLocId = null;
  let bills = [];
  let sparks = [];
  let floaters = [];
  let shoot = null;
  let bubble = null;
  let nextBubbleAt = 3000;
  let charScreens = [];
  let eventVisitor = null;
  let DPR_CAP = 2;
  let fpsFrames = 0;
  let fpsLast = 0;

  function loc() {
    if (!currentLocId || typeof MAP_LOCATIONS === "undefined") return null;
    return MAP_LOCATIONS.find((l) => l.id === currentLocId) || null;
  }

  function sceneDef() {
    const s = (typeof SCENES !== "undefined" && SCENES[currentLocId]) || {};
    return { kind: s.kind || "desert", chars: s.chars || [], night: !!s.night };
  }

  function bizForLoc(locId) {
    try {
      if (typeof BUSINESSES === "undefined") return null;
      return BUSINESSES.find((b) => b.locId === locId) || null;
    } catch (e) { return null; }
  }

  function pooledOf(bizId) {
    try {
      const st = state.businesses && state.businesses[bizId];
      return st && st.level > 0 ? Math.floor(st.pooled || 0) : 0;
    } catch (e) { return 0; }
  }

  function levelOf(bizId) {
    try {
      const st = state.businesses && state.businesses[bizId];
      return st ? st.level : 0;
    } catch (e) { return 0; }
  }

  // ---------- helpers dessin ----------

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function timePhase() {
    const d = new Date();
    const hr = d.getHours() + d.getMinutes() / 60;
    if (hr >= 20 || hr < 5) return "night";
    if (hr < 7.5) return "dawn";
    if (hr >= 18) return "dusk";
    return "day";
  }

  function applyPhaseTint(w, h, phase) {
    if (phase === "dawn") {
      ctx.fillStyle = "rgba(255, 150, 80, 0.14)";
      ctx.fillRect(0, 0, w, h);
    } else if (phase === "dusk") {
      ctx.fillStyle = "rgba(140, 70, 160, 0.16)";
      ctx.fillRect(0, 0, w, h);
    }
  }

  // ---------- v17 : météo — pluie et orage occasionnels ----------
  let weather = "clear";
  let rain = [];
  let flash = 0;
  let nextBolt = 4000;
  let puddles = [], puddleUntil = 0; // v41 : flaques

  function rollWeather() {
    const prev = weather;
    const r = Math.random();
    weather = r < 0.62 ? "clear" : r < 0.88 ? "rain" : "storm";
    rain = [];
    flash = 0;
    nextBolt = 2500 + Math.random() * 6000;
    // v41 : la pluie laisse des flaques qui sèchent lentement
    if (weather === "clear" && prev !== "clear") {
      puddles = [];
      const n = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        puddles.push({ x: 0.1 + Math.random() * 0.8, y: 0.80 + Math.random() * 0.14, rx: 14 + Math.random() * 22, ry: 3 + Math.random() * 3 });
      }
      puddleUntil = anim + 45000;
    }
    if (weather !== "clear") {
      const n = weather === "storm" ? 130 : 80;
      for (let i = 0; i < n; i++) {
        rain.push({ x: Math.random(), y: Math.random(), l: 9 + Math.random() * 13, sp: 0.5 + Math.random() * 0.5 });
      }
    }
  }

  function drawStormClouds(w, h, t) {
    ctx.fillStyle = weather === "storm" ? "rgba(28, 30, 40, 0.55)" : "rgba(60, 68, 80, 0.4)";
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 0.23 + t * 0.008 * (1 + i * 0.2)) % 1.3 - 0.15) * w;
      const cy = h * (0.04 + (i % 2) * 0.05);
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.16, h * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function updateRain(w, h) {
    for (const d of rain) {
      d.y += d.sp * 0.035;
      d.x -= d.sp * 0.006;
      if (d.y > 1.05) { d.y = -0.05; d.x = Math.random() * 1.15; }
      if (d.x < -0.05) d.x += 1.2;
    }
  }

  function drawRain(w, h) {
    ctx.strokeStyle = "rgba(190, 210, 235, 0.4)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const d of rain) {
      const x = d.x * w, y = d.y * h;
      ctx.moveTo(x, y);
      ctx.lineTo(x - d.l * 0.25, y + d.l);
    }
    ctx.stroke();
  }

  function updateStorm(w, h) {
    if (weather !== "storm") { flash = 0; return; }
    nextBolt -= 16;
    if (nextBolt <= 0) {
      flash = 1;
      nextBolt = 3500 + Math.random() * 7000;
    }
    if (flash > 0) flash -= 0.06;
  }

  function drawFlash(w, h) {
    if (flash <= 0) return;
    const a = flash * (0.35 + Math.random() * 0.2);
    ctx.fillStyle = "rgba(235, 240, 255, " + a.toFixed(3) + ")";
    ctx.fillRect(0, 0, w, h);
  }

  function drawFireflies(w, h, t) {
    for (let i = 0; i < 7; i++) {
      const fx = w * (0.15 + 0.7 * ((Math.sin(t * 0.3 + i * 2.7) + 1) / 2));
      const fy = h * (0.6 + 0.16 * ((Math.cos(t * 0.45 + i * 1.9) + 1) / 2));
      const glow = 0.3 + 0.7 * ((Math.sin(t * 3 + i * 2.2) + 1) / 2);
      ctx.globalAlpha = glow;
      ctx.fillStyle = "#d8ff8a";
      ctx.beginPath();
      ctx.arc(fx, fy, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = glow * 0.35;
      ctx.beginPath();
      ctx.arc(fx, fy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function updateShootingStar(w, h, night) {
    if (!night) { shoot = null; return; }
    if (!shoot && Math.random() < 0.0025) {
      shoot = { x: w * (0.3 + Math.random() * 0.6), y: h * (0.04 + Math.random() * 0.12), vx: -5 - Math.random() * 3, vy: 1.6 + Math.random() * 1.4, life: 1 };
    }
    if (shoot) {
      shoot.x += shoot.vx;
      shoot.y += shoot.vy;
      shoot.life -= 0.012;
      if (shoot.life <= 0) shoot = null;
    }
  }

  function drawShootingStar() {
    if (!shoot) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, shoot.life);
    const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 14, shoot.y - shoot.vy * 14);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(shoot.x, shoot.y);
    ctx.lineTo(shoot.x - shoot.vx * 14, shoot.y - shoot.vy * 14);
    ctx.stroke();
    ctx.restore();
  }

  function drawSky(w, h, night, t) {
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.72);
    if (night) {
      g.addColorStop(0, "#070b18");
      g.addColorStop(0.55, "#10182e");
      g.addColorStop(1, "#243048");
    } else {
      g.addColorStop(0, "#4e9fd4");
      g.addColorStop(0.5, "#8ecbe8");
      g.addColorStop(1, "#f4e4bc");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    if (night) {
      // v30 : étoiles en 3 tailles, scintillement, croix brillantes
      let seed = 7;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < 70; i++) {
        const sx = rnd() * w;
        const sy = rnd() * h * 0.5;
        const big = rnd() > 0.88;
        const tw = 0.5 + 0.5 * Math.sin(t * (1.5 + rnd() * 2) + i * 1.7);
        ctx.globalAlpha = (0.25 + tw * 0.65) * (big ? 1 : 0.8);
        ctx.fillStyle = big ? "#fff8e0" : "#dfe8ff";
        const sz = big ? 2.6 : (rnd() > 0.5 ? 1.8 : 1.1);
        ctx.beginPath();
        ctx.arc(sx, sy, sz, 0, Math.PI * 2);
        ctx.fill();
        if (big && tw > 0.8) {
          ctx.globalAlpha = (tw - 0.8) * 2.5;
          ctx.strokeStyle = "#fff8e0";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx - 5, sy); ctx.lineTo(sx + 5, sy);
          ctx.moveTo(sx, sy - 5); ctx.lineTo(sx, sy + 5);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      // v30 : lune — halo, disque, cratères
      const mx = w * 0.84, my = h * 0.1;
      const halo = ctx.createRadialGradient(mx, my, 10, mx, my, 85);
      halo.addColorStop(0, "rgba(230,235,255,0.35)");
      halo.addColorStop(1, "rgba(230,235,255,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(mx - 90, my - 90, 180, 180);
      ctx.fillStyle = "#f4f0dc";
      ctx.beginPath();
      ctx.arc(mx, my, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(180,180,160,0.5)";
      ctx.beginPath();
      ctx.arc(mx - 7, my - 5, 4.5, 0, Math.PI * 2);
      ctx.arc(mx + 6, my + 7, 3.2, 0, Math.PI * 2);
      ctx.arc(mx + 3, my - 9, 2.4, 0, Math.PI * 2);
      ctx.fill();
      if (sceneDef().night) {
        ctx.fillStyle = "rgba(10,14,30,0.28)";
        ctx.beginPath();
        ctx.arc(mx - 8, my - 4, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // v30 : soleil — triple halo + rayons subtils animés
      const sx = w * 0.86, sy = h * 0.1;
      const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 110);
      glow.addColorStop(0, "rgba(255,244,190,0.95)");
      glow.addColorStop(0.35, "rgba(255,230,150,0.35)");
      glow.addColorStop(1, "rgba(255,230,150,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(sx - 120, sy - 120, 240, 240);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(t * 0.05);
      ctx.strokeStyle = "rgba(255,235,160,0.4)";
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        const len = 34 + 4 * Math.sin(t * 2 + i);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 24, Math.sin(a) * 24);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = "#fff6cc";
      ctx.beginPath();
      ctx.arc(sx, sy, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawClouds(w, h, night) {
    const cs = [
      { x: 0.18 + Math.sin(anim / 9000) * 0.03, y: 0.14, s: 1 },
      { x: 0.55 + Math.cos(anim / 12000) * 0.04, y: 0.09, s: 0.7 },
      { x: 0.78 + Math.sin(anim / 15000) * 0.05, y: 0.2, s: 0.85 },
    ];
    for (const c of cs) {
      const cx = c.x * w, cy = c.y * h, r = 18 * c.s;
      const blobs = [[0, 0, 1], [0.9, 0.2, 0.75], [-0.9, 0.25, 0.65], [0.3, -0.35, 0.6], [-0.4, -0.2, 0.6]];
      ctx.fillStyle = night ? "rgba(0,0,20,0.18)" : "rgba(120,90,50,0.10)";
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 1.5, r * 2.1, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = night ? "rgba(150,160,190,0.20)" : "rgba(190,200,215,0.55)";
      for (const [ox, oy, sr] of blobs) {
        ctx.beginPath();
        ctx.arc(cx + ox * r, cy + oy * r + r * 0.22, r * sr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = night ? "rgba(200,210,235,0.16)" : "rgba(255,252,242,0.85)";
      for (const [ox, oy, sr] of blobs) {
        ctx.beginPath();
        ctx.arc(cx + ox * r, cy + oy * r - r * 0.12, r * sr * 0.82, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function smokePuff(x, y, t, tint, scale) {
    const sc = scale || 1;
    for (let i = 0; i < 4; i++) {
      const p = ((t * 0.35 + i * 0.25) % 1);
      const px = x + Math.sin(t * 1.4 + i * 2) * 6 * sc;
      const py = y - p * 70 * sc;
      const pr = (5 + p * 12) * sc;
      ctx.globalAlpha = (1 - p) * 0.45;
      ctx.fillStyle = tint || "#cfd4d8";
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function flame(x, y, t, s) {
    const sc = s || 1;
    for (let i = 0; i < 5; i++) {
      const p = ((t * 1.6 + i * 0.2) % 1);
      const fx = x + Math.sin(t * 6 + i * 2.4) * 3 * sc;
      const fy = y - p * 26 * sc;
      const fr = (6 - p * 4.5) * sc;
      ctx.globalAlpha = (1 - p) * 0.9;
      ctx.fillStyle = p < 0.4 ? "#ffd23a" : "#ff7a2a";
      ctx.beginPath();
      ctx.arc(fx, fy, Math.max(0.5, fr), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawWindow(x, y, w2, h2, lit, t, i) {
    ctx.fillStyle = lit ? ((Math.sin(t * 0.7 + (i || 0)) > -0.85) ? "#ffd98a" : "#5a4a2a") : "#2a3444";
    ctx.fillRect(x, y, w2, h2);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w2, h2);
  }

  function drawPerson(x, y, s, look, mood, pose, noShadow) {
    if (!look) return;
    const t = anim / 1000;
    const bob = Math.sin(t * 2 + x * 0.05) * 1.5 * s;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(s, s);

    if (!noShadow) {
      // v40 : ombre portée selon l'heure réelle (soleil bas = ombre longue et décalée)
      let sdx = 0, srx = 13, sry = 4;
      try {
        const dt = new Date();
        const hr = dt.getHours() + dt.getMinutes() / 60;
        const th = ((hr - 6) / 12) * Math.PI; // 0 rad à 6h, π à 18h
        if (hr >= 5.5 && hr <= 18.5) {
          sdx = -Math.cos(th) * 7;
          srx = 13 - Math.abs(Math.cos(th)) * 3;
          sry = 4 + Math.abs(Math.cos(th)) * 2.5;
        }
      } catch (e) {}
      ctx.fillStyle = "rgba(20, 14, 8, 0.3)";
      ctx.beginPath();
      ctx.ellipse(sdx, 1, srx, sry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (look.hazmat) {
      ctx.fillStyle = "#e8e8dc";
      rr(-11, -46, 22, 34, 9);
      ctx.fill();
      ctx.fillStyle = "#e8e8dc";
      ctx.fillRect(-8, -14, 6, 14);
      ctx.fillRect(2, -14, 6, 14);
      ctx.strokeStyle = "#b8b8ac";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-8, -14, 6, 14);
      ctx.strokeRect(2, -14, 6, 14);
      ctx.fillStyle = "#e8e8dc";
      ctx.beginPath();
      ctx.arc(0, -54, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8ac4d8";
      rr(-7, -58, 14, 8, 4);
      ctx.fill();
      ctx.fillStyle = "#c8c8bc";
      rr(-4, -70, 8, 8, 3);
      ctx.fill();
      ctx.strokeStyle = "#d8d8cc";
      ctx.beginPath();
      ctx.moveTo(9, -50);
      ctx.quadraticCurveTo(20, -44, 18, -30);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // v32 : jambes articulées — cuisse + tibia, genou qui plie
    for (let side = -1; side <= 1; side += 2) {
      const ph = side < 0 ? 0 : Math.PI;
      const a1 = Math.sin(t * 5 + x * 0.13 + ph) * 0.30;
      const a2 = Math.max(0, Math.sin(t * 5 + x * 0.13 + ph + 1.2)) * 0.5;
      ctx.save();
      ctx.translate(side * 4.2, -16);
      ctx.rotate(a1);
      ctx.fillStyle = look.pants || "#3a3a44";
      ctx.fillRect(-2.75, 0, 5.5, 9);
      ctx.translate(0, 9);
      ctx.rotate(a2);
      ctx.fillRect(-2.5, 0, 5, 7);
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(-3.4, 6, 6.8, 3);
      ctx.restore();
    }

    ctx.fillStyle = look.shirt || "#4a6a8a";
    rr(-9, -36, 18, 21, 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(15, 12, 8, 0.55)";
    ctx.lineWidth = 1.2;
    rr(-9, -36, 18, 21, 4);
    ctx.stroke();
    ctx.strokeStyle = "rgba(15, 12, 8, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -35);
    ctx.lineTo(0, -17);
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    rr(-7, -35, 4, 18, 2);
    ctx.fill();
    ctx.fillStyle = shade(look.shirt || "#4a6a8a", -25);
    ctx.fillRect(-9, -19, 18, 4);
    // v31 : accessoires de torse
    if (look.apron) {
      ctx.fillStyle = look.apron;
      ctx.beginPath();
      ctx.moveTo(-6, -34);
      ctx.lineTo(6, -34);
      ctx.lineTo(7, -16);
      ctx.lineTo(-7, -16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(15, 12, 8, 0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillRect(-2.5, -36, 5, 3);
    }
    if (look.jacket) {
      ctx.fillStyle = look.jacket;
      ctx.beginPath();
      ctx.moveTo(-9, -36);
      ctx.lineTo(-3, -36);
      ctx.lineTo(-4.5, -15);
      ctx.lineTo(-9, -15);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(9, -36);
      ctx.lineTo(3, -36);
      ctx.lineTo(4.5, -15);
      ctx.lineTo(9, -15);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(15, 12, 8, 0.45)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (look.lapel) {
      ctx.strokeStyle = "rgba(15, 12, 8, 0.5)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-3, -36); ctx.lineTo(-6, -26); ctx.lineTo(-2, -18);
      ctx.moveTo(3, -36); ctx.lineTo(6, -26); ctx.lineTo(2, -18);
      ctx.stroke();
    }
    if (look.badge) {
      ctx.fillStyle = "#e8c84a";
      ctx.beginPath();
      ctx.arc(5, -29, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8a7a2a";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    if (look.necklace) {
      ctx.strokeStyle = "#e8c84a";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -34, 4.5, 0.35, Math.PI - 0.35);
      ctx.stroke();
      ctx.fillStyle = "#e8c84a";
      ctx.beginPath();
      ctx.arc(0, -30, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (pose === "crossed") {
      // v33 : bras croisés — pose de cinématique
      ctx.fillStyle = shade(look.shirt || "#4a6a8a", -12);
      rr(-11, -30, 22, 5.5, 2.5);
      ctx.fill();
      ctx.strokeStyle = "rgba(15, 12, 8, 0.45)";
      ctx.lineWidth = 1;
      rr(-11, -30, 22, 5.5, 2.5);
      ctx.stroke();
      ctx.fillStyle = look.skin || "#e8b58a";
      ctx.fillRect(-11, -27.5, 4, 3.2);
      ctx.fillRect(7, -27.5, 4, 3.2);
    } else {
      const armSw = Math.sin(t * 5 + x * 0.13 + Math.PI) * 0.13;
      ctx.save();
      ctx.translate(-11, -33);
      ctx.rotate(armSw);
      ctx.fillStyle = look.shirt || "#4a6a8a";
      ctx.fillRect(-2, 0, 4, 13);
      ctx.fillStyle = look.skin || "#e8b58a";
      ctx.fillRect(-2, 13, 4, 3.2);
      ctx.restore();
      ctx.save();
      ctx.translate(11, -33);
      ctx.rotate(-armSw);
      ctx.fillStyle = look.shirt || "#4a6a8a";
      ctx.fillRect(-2, 0, 4, 13);
      ctx.fillStyle = look.skin || "#e8b58a";
      ctx.fillRect(-2, 13, 4, 3.2);
      ctx.restore();
    }

    if (look.tie) {
      ctx.fillStyle = typeof look.tie === "string" ? look.tie : "#a02a2a";
      ctx.beginPath();
      ctx.moveTo(0, -35);
      ctx.lineTo(3, -30);
      ctx.lineTo(0, -20);
      ctx.lineTo(-3, -30);
      ctx.closePath();
      ctx.fill();
    }
    if (look.gold) {
      ctx.strokeStyle = "#e8c84a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -33, 6, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }

    ctx.fillStyle = look.skin || "#e8b58a";
    ctx.beginPath();
    ctx.arc(0, -44, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(15, 12, 8, 0.45)";
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.beginPath();
    ctx.arc(-3, -47, 2.6, 0, Math.PI * 2);
    ctx.fill();

    const blink = Math.sin(t * 1.1 + x * 0.31) > 0.96 ? 0.12 : 1;
    // v39 : les pupilles se tournent vers l'événement
    const exo = (typeof lookTargetX !== "undefined" && lookTargetX !== null)
      ? Math.max(-0.9, Math.min(0.9, (lookTargetX - x) * 0.012)) : 0;
    ctx.fillStyle = "#2a221a";
    ctx.beginPath();
    ctx.ellipse(-3.2 + exo, -44.5, 1.1, 1.1 * blink, 0, 0, Math.PI * 2);
    ctx.ellipse(3.2 + exo, -44.5, 1.1, 1.1 * blink, 0, 0, Math.PI * 2);
    ctx.fill();
    if (blink > 0.5) {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(-2.8 + exo, -45.2, 0.45, 0, Math.PI * 2);
      ctx.arc(3.6 + exo, -45.2, 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    // v32 : expressions — sourcils + bouche selon l'humeur
    const m = mood || "neutral";
    ctx.strokeStyle = "#3a2a1c";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    if (m === "angry") {
      ctx.moveTo(-5.4, -49.2); ctx.lineTo(-1.6, -47.8);
      ctx.moveTo(1.6, -47.8); ctx.lineTo(5.4, -49.2);
    } else if (m === "worried") {
      ctx.moveTo(-5.4, -48.2); ctx.lineTo(-1.6, -49.2);
      ctx.moveTo(1.6, -49.2); ctx.lineTo(5.4, -48.2);
    } else if (m === "happy") {
      ctx.moveTo(-5.2, -48.6); ctx.lineTo(-1.6, -48.9);
      ctx.moveTo(1.6, -48.9); ctx.lineTo(5.2, -48.6);
    } else {
      ctx.moveTo(-5.2, -48.2); ctx.lineTo(-1.6, -48.4);
      ctx.moveTo(1.6, -48.4); ctx.lineTo(5.2, -48.2);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(40, 22, 14, 0.85)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (m === "happy") {
      ctx.arc(0, -40.4, 2.7, 0.2, Math.PI - 0.2);
    } else if (m === "angry") {
      ctx.arc(0, -37.6, 2.7, Math.PI + 0.3, Math.PI * 2 - 0.3);
    } else if (m === "shout") {
      ctx.ellipse(0, -39.4, 1.7, 2.3, 0, 0, Math.PI * 2);
    } else if (m === "worried") {
      ctx.ellipse(0, -39.6, 1.2, 1.5, 0, 0, Math.PI * 2);
    } else {
      ctx.moveTo(-2.4, -39.7); ctx.lineTo(2.4, -39.7);
    }
    ctx.stroke();

    if (look.beard) {
      ctx.fillStyle = look.beard;
      ctx.beginPath();
      ctx.arc(0, -40, 7, 0, Math.PI);
      ctx.fill();
    }
    if (look.mustache) {
      ctx.fillStyle = look.mustache;
      ctx.beginPath();
      ctx.ellipse(0, -41, 4.5, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (look.hair && !look.bald && !look.hat && !look.cap && !look.flatCap && !look.beanie) {
      ctx.fillStyle = look.hair;
      ctx.beginPath();
      ctx.arc(0, -47, 8.5, Math.PI * 0.95, Math.PI * 2.05);
      ctx.fill();
      if (look.hairLong) {
        ctx.fillRect(-10, -47, 4, 16);
        ctx.fillRect(6, -47, 4, 16);
      }
    }
    if (look.bald) {
      ctx.fillStyle = look.hair || "#2a2a2a";
      ctx.beginPath();
      ctx.arc(0, -49, 6, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    if (look.hat) {
      ctx.fillStyle = look.hat;
      rr(-10, -56, 20, 7, 2);
      ctx.fill();
      rr(-13, -50, 26, 3, 1.5);
      ctx.fill();
    }
    if (look.cap) {
      ctx.fillStyle = look.cap;
      ctx.beginPath();
      ctx.arc(0, -49, 8.5, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-2, -50, 13, 3);
    }
    if (look.flatCap) {
      ctx.fillStyle = look.flatCap;
      rr(-9, -54, 18, 5, 2);
      ctx.fill();
      ctx.fillRect(4, -51, 8, 2);
    }
    if (look.beanie) {
      ctx.fillStyle = look.beanie;
      ctx.beginPath();
      ctx.arc(0, -48, 8.7, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-8.7, -48, 17.4, 3);
    }
    if (look.glasses) {
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 1.4;
      ctx.strokeRect(-6.5, -46.5, 5.5, 4.5);
      ctx.strokeRect(1, -46.5, 5.5, 4.5);
      ctx.beginPath();
      ctx.moveTo(-1, -44.5);
      ctx.lineTo(1, -44.5);
      ctx.stroke();
    }
    if (look.loud) {
      ctx.fillStyle = "#e84848";
      ctx.fillRect(-9, -36, 18, 2.5);
    }
    ctx.restore();
  }


  // v39 : détails de décor — petits éléments propres à chaque lieu
  // v41 : flaques qui reflètent le ciel et sèchent
  function drawPuddles(w, h, t) {
    if (anim >= puddleUntil || !puddles.length) return;
    const k = Math.min(1, (puddleUntil - anim) / 15000);
    for (const p of puddles) {
      ctx.fillStyle = "rgba(130, 170, 210, " + (0.22 * k).toFixed(3) + ")";
      ctx.beginPath();
      ctx.ellipse(p.x * w, p.y * h, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(220, 240, 255, " + (0.18 * k * (0.5 + 0.5 * Math.sin(t * 2 + p.x * 9))).toFixed(3) + ")";
      ctx.beginPath();
      ctx.ellipse(p.x * w - p.rx * 0.2, p.y * h - 1, p.rx * 0.4, p.ry * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawProps(w, h, t, night) {
    const kind = sceneDef().kind;
    const gy = h * 0.78;
    const ink = night ? "rgba(16, 20, 30, 0.85)" : "rgba(38, 30, 20, 0.55)";
    ctx.fillStyle = ink;
    if (kind === "desert" || kind === "desert2") {
      // poteaux télégraphiques + fil qui vibre
      for (let i = 0; i < 3; i++) {
        const px = w * (0.16 + i * 0.3);
        ctx.fillRect(px, h * 0.42, 3, h * 0.36);
        ctx.fillRect(px - 8, h * 0.44, 19, 2.5);
      }
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.16, h * 0.45);
      ctx.quadraticCurveTo(w * 0.31, h * 0.49 + Math.sin(t * 2) * 2, w * 0.46, h * 0.45);
      ctx.quadraticCurveTo(w * 0.61, h * 0.49 + Math.cos(t * 2) * 2, w * 0.76, h * 0.45);
      ctx.stroke();
      ctx.fillStyle = ink;
    } else if (kind === "suburb" || kind === "backyard") {
      for (let i = 0; i < 9; i++) ctx.fillRect(w * 0.60 + i * 9, h * 0.60, 5, h * 0.18);
      ctx.fillRect(w * 0.60, h * 0.63, 86, 3);
      ctx.fillRect(w * 0.30, gy - 26, 12, 26);
      ctx.fillRect(w * 0.34, gy - 24, 12, 24);
    } else if (kind === "carwash") {
      for (let i = 0; i < 2; i++) {
        const px = w * (0.14 + i * 0.1);
        ctx.fillRect(px, h * 0.52, 5, h * 0.26);
        ctx.beginPath(); ctx.arc(px + 2.5, h * 0.52, 7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillRect(w * 0.82, h * 0.46, 4, h * 0.32);
      ctx.fillRect(w * 0.82 - 14, h * 0.46, 32, 14);
    } else if (kind === "restaurant") {
      rr(w * 0.08, gy - 22, w * 0.14, 16, 6); ctx.fill();
      ctx.beginPath(); ctx.arc(w * 0.11, gy - 4, 5, 0, Math.PI * 2); ctx.arc(w * 0.19, gy - 4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(w * 0.88, h * 0.50, 3, h * 0.28);
      ctx.fillRect(w * 0.88 - 12, h * 0.50, 27, 18);
    } else if (kind === "industrial" || kind === "junkyard") {
      rr(w * 0.06, gy - 20, w * 0.10, 20, 2); ctx.fill();
      ctx.fillRect(w * 0.90, h * 0.55, 3, h * 0.23);
      ctx.fillRect(w * 0.90 - 16, h * 0.55, 3, h * 0.23);
      ctx.fillRect(w * 0.90 - 16, h * 0.57, 19, 3);
    } else if (kind === "street" || kind === "plaza") {
      ctx.fillRect(w * 0.08, h * 0.40, 3.5, h * 0.38);
      ctx.fillRect(w * 0.08 - 5, h * 0.40, 13, 22);
      ctx.fillStyle = "#e84a3a"; ctx.beginPath(); ctx.arc(w * 0.08 + 1.7, h * 0.44, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e8c84a"; ctx.beginPath(); ctx.arc(w * 0.08 + 1.7, h * 0.475, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#4ac86a"; ctx.beginPath(); ctx.arc(w * 0.08 + 1.7, h * 0.51, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ink;
      ctx.fillRect(w * 0.93, gy - 14, 7, 14);
      ctx.fillRect(w * 0.93 - 2, gy - 17, 11, 4);
    } else if (kind === "station") {
      ctx.fillRect(w * 0.12, gy - 12, w * 0.09, 4);
      ctx.fillRect(w * 0.13, gy - 8, 3, 8);
      ctx.fillRect(w * 0.19, gy - 8, 3, 8);
      ctx.beginPath(); ctx.arc(w * 0.5, h * 0.34, 9, 0, Math.PI * 2); ctx.fill();
    } else if (kind === "ranch") {
      ctx.fillRect(w * 0.86, h * 0.34, 2.5, h * 0.44);
      ctx.fillRect(w * 0.90, h * 0.34, 2.5, h * 0.44);
      rr(w * 0.845, h * 0.26, 22, 16, 4); ctx.fill();
    }
  }


  // v40 : faune de fond — corbeaux sur les fils, chien qui traverse, pigeons
  let dogX = null, dogDir = 1, dogNext = 9000;
  let birdScare = -99999, dogBoost = -99999; // v41 : interactions
  function drawFauna(w, h, t, night) {
    const kind = sceneDef().kind;
    if (night) return;
    const gy = h * 0.78;
    if (kind === "desert" || kind === "desert2") {
      // corbeaux posés sur les fils — ils s'envolent si on les approche (v41)
      const sAge = anim - birdScare;
      const fly = sAge >= 0 && sAge < 1600 ? sAge / 1600 : 0;
      for (let i = 0; i < 2; i++) {
        const cx = w * (0.28 + i * 0.33) + Math.sin(t * 0.7 + i * 3) * 3 + (fly > 0 ? Math.sin(i * 2.1) * 46 * fly : 0);
        const cy = h * 0.452 + Math.sin(t * 2 + i) * 1.5 - fly * h * 0.25;
        ctx.globalAlpha = 1 - fly * 0.9;
        ctx.fillStyle = "#14161c";
        ctx.beginPath();
        ctx.ellipse(cx, cy, 4.5, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 3.5, cy - 2.5, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 5.5, cy - 1, 4, 1.6);
        if (fly > 0 && fly < 1) {
          const wf = Math.sin(anim * 0.04) * 4;
          ctx.beginPath();
          ctx.moveTo(cx - 2, cy - 1); ctx.lineTo(cx - 7, cy - 3 - wf); ctx.lineTo(cx - 1, cy + 1);
          ctx.moveTo(cx + 2, cy - 1); ctx.lineTo(cx + 7, cy - 3 - wf); ctx.lineTo(cx + 1, cy + 1);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    } else if (kind === "suburb" || kind === "backyard") {
      // un chien traverse de temps en temps
      if (dogX === null && anim > dogNext) { dogX = -0.05; dogDir = Math.random() < 0.5 ? 1 : -1; }
      if (dogX !== null) {
        dogX += dogDir * 0.0009 * ((anim - dogBoost < 2000) ? 3 : 1); // v41 : tap = il sprinte
        const dx = w * dogX;
        const hop = Math.abs(Math.sin(anim * 0.012)) * 3;
        ctx.fillStyle = "#8a6a4a";
        ctx.beginPath();
        ctx.ellipse(dx, gy - 6 - hop, 8, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dx + dogDir * 7, gy - 10 - hop, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(dx + dogDir * 8.5, gy - 12 - hop, 1.5, 2.5);
        ctx.fillRect(dx - 6, gy - 4, 1.8, 5);
        ctx.fillRect(dx + 4, gy - 4, 1.8, 5);
        if (anim - dogBoost < 1500) {
          ctx.font = "bold 11px sans-serif";
          ctx.fillStyle = "#fff6e0";
          ctx.textAlign = "center";
          ctx.fillText("Ouaf !", dx, gy - 22 - hop);
        }
        if (dogX < -0.1 || dogX > 1.1) { dogX = null; dogNext = anim + 20000 + Math.random() * 25000; }
      }
    } else if (kind === "plaza" || kind === "street") {
      // pigeons qui picorent
      const sAgeP = anim - birdScare;
      const flyP = sAgeP >= 0 && sAgeP < 1400 ? sAgeP / 1400 : 0;
      for (let i = 0; i < 3; i++) {
        const px = w * (0.55 + i * 0.05) + (flyP > 0 ? (i - 1) * 40 * flyP : 0);
        const py = gy + 6 + Math.sin(t * 3 + i * 2) * 1.5 - flyP * h * 0.2;
        ctx.globalAlpha = 1 - flyP * 0.9;
        ctx.fillStyle = "#5a6270";
        ctx.beginPath();
        ctx.ellipse(px, py, 3.2, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + 2.4, py - 1.8, 1.2, 0, Math.PI * 2);
        ctx.fill();
        if (flyP > 0 && flyP < 1) {
          const wf = Math.sin(anim * 0.045 + i) * 3;
          ctx.beginPath();
          ctx.moveTo(px - 1, py - 1); ctx.lineTo(px - 5, py - 2.5 - wf); ctx.lineTo(px, py + 0.5);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  // v41 : tap près de la faune → les oiseaux s'envolent, le chien aboie
  function tryScareFauna(mx, my, w, h) {
    if (anim - birdScare < 1600 && anim - dogBoost < 1600) return false;
    const kind = sceneDef().kind;
    if (kind === "desert" || kind === "desert2") {
      for (let i = 0; i < 2; i++) {
        const cx = w * (0.28 + i * 0.33);
        const cy = h * 0.452;
        if (Math.hypot(mx - cx, my - cy) < 34) {
          birdScare = anim;
          if (typeof playSfx === "function") playSfx("tap");
          return true;
        }
      }
    } else if (kind === "plaza" || kind === "street") {
      for (let i = 0; i < 3; i++) {
        const px = w * (0.55 + i * 0.05);
        const py = h * 0.78 + 6;
        if (Math.hypot(mx - px, my - py) < 30) {
          birdScare = anim;
          if (typeof playSfx === "function") playSfx("tap");
          return true;
        }
      }
    } else if (kind === "suburb" || kind === "backyard" && dogX !== null) {
      const dx = w * dogX;
      const dy = h * 0.78 - 10;
      if (Math.hypot(mx - dx, my - dy) < 34) {
        dogBoost = anim;
        if (typeof playSfx === "function") playSfx("tap");
        return true;
      }
    }
    return false;
  }

  // v42 : saisons réelles — neige en hiver, feuilles en automne, teintes
  function season() {
    const m = new Date().getMonth();
    return (m <= 1 || m === 11) ? "winter" : (m <= 4) ? "spring" : (m <= 7) ? "summer" : "autumn";
  }
  let snow = [], leaves = [];
  function ensureWeatherParticles() {
    const sd = season();
    if (sd === "winter" && !snow.length) {
      for (let i = 0; i < 60; i++) snow.push({ x: Math.random(), y: Math.random(), sp: 0.03 + Math.random() * 0.05, sw: Math.random() * 6.28, sz: 1 + Math.random() * 2 });
    }
    if (sd === "autumn" && !leaves.length) {
      for (let i = 0; i < 24; i++) leaves.push({ x: Math.random(), y: Math.random(), sp: 0.04 + Math.random() * 0.06, sw: Math.random() * 6.28, rot: Math.random() * 6.28, c: Math.random() < 0.5 ? "#c87a2a" : "#a85a20" });
    }
  }
  function updateSnow() {
    for (const f of snow) {
      f.y += f.sp * 0.012;
      f.sw += 0.02;
      if (f.y > 1.02) { f.y = -0.02; f.x = Math.random(); }
    }
  }
  function drawSnow(w, h) {
    ctx.fillStyle = "rgba(240, 246, 255, 0.85)";
    for (const f of snow) {
      const x = (f.x + Math.sin(f.sw) * 0.01) * w;
      ctx.beginPath();
      ctx.arc(x, f.y * h, f.sz, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function updateLeaves() {
    for (const f of leaves) {
      f.y += f.sp * 0.008;
      f.sw += 0.015;
      f.x += Math.sin(f.sw) * 0.0012;
      f.rot += 0.03;
      if (f.y > 1.02) { f.y = -0.02; f.x = Math.random(); }
    }
  }
  function drawLeaves(w, h) {
    for (const f of leaves) {
      ctx.save();
      ctx.translate(f.x * w, f.y * h);
      ctx.rotate(f.rot);
      ctx.fillStyle = f.c;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
  function drawSeasonTint(w, h) {
    const sd = season();
    if (sd === "winter") { ctx.fillStyle = "rgba(170, 195, 255, 0.06)"; ctx.fillRect(0, 0, w, h); }
    else if (sd === "autumn") { ctx.fillStyle = "rgba(255, 150, 50, 0.05)"; ctx.fillRect(0, 0, w, h); }
    else if (sd === "spring") { ctx.fillStyle = "rgba(140, 220, 120, 0.04)"; ctx.fillRect(0, 0, w, h); }
  }

  // v42 : ombres de nuages qui glissent lentement au sol
  function drawCloudShadows(w, h, t) {
    ctx.fillStyle = "rgba(18, 24, 12, 0.09)";
    for (let i = 0; i < 3; i++) {
      const cx = (((i * 0.37 + t * 0.006 * (1 + i * 0.3)) % 1.4) - 0.2) * w;
      const cy = h * (0.74 + (i % 2) * 0.08);
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.2, h * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCharRow(w, h, chars, positions) {
    const looks = (typeof CHAR_LOOKS !== "undefined") ? CHAR_LOOKS : {};
    const ground = h * 0.78;
    const list = chars || [];
    charScreens = [];
    const tw = anim / 1000;
    for (let i = 0; i < list.length; i++) {
      const pos = (positions && positions[i]) || [0.42 + i * 0.14, 1];
      // v33 : pendant une cinématique, les persos s'arrêtent et regardent
      const cineOn = !!evCine;
      const range = cineOn ? w * 0.004 : w * 0.022;
      let x = w * pos[0] + Math.sin(tw * 0.4 + i * 2.3) * range;
      const sc = 1.5 * (pos[1] || 1);
      const cm = (charMood && charMood.id === list[i] && anim < charMoodUntil) ? charMood.mood
        : (cineOn ? ((typeof EV_MOODS !== "undefined" && evCine.ev && EV_MOODS[evCine.ev.id]) || "worried") : "neutral");
      lookTargetX = cineOn && eventVisitor ? eventVisitor.x : null; // v39
      if (cineOn && eventVisitor) {
        // v48 : les passants s'écartent prudemment du visiteur
        const away = Math.sign(x - eventVisitor.x) || 1;
        x += away * Math.min(w * 0.035, Math.abs(eventVisitor.x - x) * 0.15);
        // v39 : léger penché de curiosité vers le visiteur
        const lean = Math.max(-0.05, Math.min(0.05, (eventVisitor.x - x) * 0.0004));
        ctx.save();
        ctx.translate(x, ground);
        ctx.rotate(lean);
        drawPerson(0, 0, sc, looks[list[i]], cm);
        ctx.restore();
      } else {
        drawPerson(x, ground, sc, looks[list[i]], cm);
      }
      charScreens.push({ id: list[i], x, y: ground, s: sc });
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
  }

  // ---------- v17 : événements joués dans la scène ----------
  function sceneEventFor(locId) {
    try {
      const list = (typeof state !== "undefined" && state.sceneEvents) || [];
      if (typeof EVENTS === "undefined") return null;
      for (const id of list) {
        const ev = EVENTS.find((e) => e.id === id);
        if (ev && ev.loc === locId) return ev;
      }
    } catch (err) {}
    return null;
  }

  let evQuote = null;
  // v28 : animation d'entrée, bannière, braises, flash
  let lastEvId = null, evEnterAt = 0, evParts = [], evFlash = 0, evBanner = null;
  let cineShake = 0; // v46 : secousse dramatique en cours
  let camKCur = 1, camXCur = null; // v47 : plans de caméra alternés (valeurs lissées)
  let dofCur = 0; // v51 : intensité lissée du voile de profondeur de champ
  let evCine = null; // v31 : cinématique d'événement
  let charMood = null, charMoodUntil = 0; // v32 : humeur temporaire
  let lookTargetX = null; // v39 : les persos suivent du regard
  function drawEventVisitor(w, h, t, def) {
    const ev = sceneEventFor(currentLocId);
    if (!ev) { eventVisitor = null; evQuote = null; evBanner = null; lastEvId = null; return; }
    const looks = (typeof EVENT_VISITORS !== "undefined") ? EVENT_VISITORS : {};
    const look = looks[ev.id] || { shirt: "#5a5a6a", pants: "#2e2e34" };
    const quotes = (typeof EVENT_QUOTES !== "undefined" && EVENT_QUOTES[ev.id]) || ["..."];
    if (ev.id !== lastEvId) {
      lastEvId = ev.id;
      evEnterAt = anim;
      evBanner = { emoji: (ev.chainStep ? "🔗" : (ev.emoji || "❗")), title: ev.title + (ev.chainStep ? " — étape " + ev.chainStep + "/" + ev.chainMax : ""), until: anim + 7000 }; // v45
      evParts = [];
      for (let i = 0; i < 14; i++) {
        evParts.push({
          x: Math.random(), y: 0.55 + Math.random() * 0.35,
          vx: (Math.random() - 0.5) * 0.02, vy: -0.02 - Math.random() * 0.05,
          life: 0.3 + Math.random() * 0.7,
          size: 1.5 + Math.random() * 2.5,
          hue: Math.random() < 0.5 ? "#ffb347" : "#ff6b57",
        });
      }
    }
    if (!evQuote || evQuote.eid !== ev.id || anim > evQuote.until) {
      evQuote = { eid: ev.id, text: quotes[Math.floor(Math.random() * quotes.length)], until: anim + 5200 };
    }
    const ground = h * 0.78;
    const spots = CHAR_SPOTS[def.kind] || [];
    const inCine = !!(evCine && evCine.ev.id === ev.id);
    let px = 0.5;
    if (!inCine) {
      for (const cand of [0.5, 0.26, 0.74]) {
        if (!spots.some((p) => Math.abs(p[0] - cand) < 0.1)) { px = cand; break; }
      }
    }
    // v49 : cohérence des persos — si le visiteur est déjà un personnage de la
    // scène (même apparence), pas de doublon : le perso de la scène porte
    // l'événement (badge, bulle, caméra, tap)
    let dupScreen = null;
    if (typeof CHAR_LOOKS !== "undefined" && typeof SCENES !== "undefined") {
      const sdef = SCENES[def.kind];
      if (sdef && sdef.chars) {
        for (const k of Object.keys(CHAR_LOOKS)) {
          if (CHAR_LOOKS[k] === look && sdef.chars.includes(k)) {
            dupScreen = charScreens.find((c) => c.id === k) || null;
            break;
          }
        }
      }
    }
    const enterRef = inCine ? evCine.start : evEnterAt;
    const kIn = Math.min(1, (anim - enterRef) / 900);
    const ease = 1 - Math.pow(1 - kIn, 3);
    const startX = -0.18;
    const x = dupScreen ? dupScreen.x : w * (startX + (px - startX) * ease);
    const sc = dupScreen ? dupScreen.s : 1.65;
    const walking = !dupScreen && kIn < 1;
    const bob = walking ? Math.abs(Math.sin(anim * 0.02)) * 6 : 0;
    // v28 : faisceau de lumière sur le visiteur
    const sa = 0.10 + 0.05 * Math.sin(anim * 0.005);
    const sg = ctx.createRadialGradient(x, ground - 150 * sc, 10, x, ground - 150 * sc, 190 * sc);
    sg.addColorStop(0, "rgba(255, 220, 150, " + sa.toFixed(3) + ")");
    sg.addColorStop(1, "rgba(255, 220, 150, 0)");
    ctx.fillStyle = sg;
    ctx.fillRect(x - 200 * sc, ground - 360 * sc, 400 * sc, 380 * sc);
    let vMood = "neutral";
    if (inCine) {
      const base = (typeof EV_MOODS !== "undefined" && EV_MOODS[ev.id]) || "neutral";
      vMood = evCine.idx > 0 ? (base === "angry" ? "shout" : base) : "neutral";
    }
    if (!dupScreen) drawPerson(x, ground - bob, sc, look, vMood, inCine ? "crossed" : null); // v49 : pas de doublon
    eventVisitor = dupScreen ? { x: dupScreen.x, y: dupScreen.y, s: dupScreen.s } : { x, y: ground, s: sc }; // v49
    for (const p of evParts) {
      p.x += p.vx * 0.016; p.y += p.vy * 0.016; p.life -= 0.006;
      if (p.life <= 0 || p.y < 0.3) { p.x = Math.random(); p.y = 0.9; p.life = 1; }
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life)) * 0.8;
      ctx.fillStyle = p.hue;
      ctx.beginPath();
      ctx.arc(w * p.x, h * p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!inCine) {
    const pulse = 0.7 + 0.3 * Math.sin(t * 4);
    const by = ground - 96 * sc - Math.abs(Math.sin(t * 5)) * 5;
    const ringK = (anim % 1200) / 1200;
    ctx.globalAlpha = (1 - ringK) * 0.55;
    ctx.strokeStyle = "#ff8a5c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, by, 13 + ringK * 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(200, 58, 50, " + pulse.toFixed(2) + ")";
    ctx.beginPath();
    ctx.arc(x, by, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff3d6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, by, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", x, by + 1);

    // bulle de dialogue du visiteur
    const maxW = Math.min(230, w - 24);
    const lines = wrapText(evQuote.text, maxW - 18);
    const tw = Math.max(...lines.map((l) => {
      ctx.font = "bold 12px sans-serif";
      return ctx.measureText(l).width;
    })) + 18;
    const lh = 15;
    const bh = lines.length * lh + 10;
    const qy = by - 22;
    const x0 = Math.max(6, Math.min(w - tw - 6, x - tw / 2));
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "#fff6e0";
    rr(x0, qy - bh, tw, bh, 9);
    ctx.fill();
    ctx.strokeStyle = "#b04a3a";
    ctx.lineWidth = 1.8;
    rr(x0, qy - bh, tw, bh, 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 5, qy);
    ctx.lineTo(x + 5, qy);
    ctx.lineTo(x, qy + 7);
    ctx.closePath();
    ctx.fillStyle = "#fff6e0";
    ctx.fill();
    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#3a2418";
    lines.forEach((l, i) => {
      ctx.fillText(l, x0 + tw / 2, qy - bh + 10 + i * lh);
    });
    ctx.restore();
    ctx.textBaseline = "alphabetic";
    }
  }

  function drawEventAura(w, h, t) {
    const ev = sceneEventFor(currentLocId);
    if (!ev) return;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
    const a = 0.10 + pulse * 0.10;
    const g1 = ctx.createLinearGradient(0, 0, 0, h * 0.25);
    g1.addColorStop(0, "rgba(190, 50, 40, " + a.toFixed(3) + ")");
    g1.addColorStop(1, "rgba(190, 50, 40, 0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h * 0.25);
    const g2 = ctx.createLinearGradient(0, h, 0, h * 0.75);
    g2.addColorStop(0, "rgba(190, 50, 40, " + a.toFixed(3) + ")");
    g2.addColorStop(1, "rgba(190, 50, 40, 0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, h * 0.75, w, h * 0.25);
  }

  // v28 : bannière animée d'événement en haut de la scène
  function drawEventBanner(w, h, t) {
    if (!evBanner) return;
    if (anim > evBanner.until) { evBanner = null; return; }
    const ease = 1 - Math.pow(1 - Math.min(1, (anim - (evBanner.until - 7000)) / 450), 3);
    const alpha = Math.min(1, (evBanner.until - anim) / 400);
    const off = (1 - ease) * -w;
    const bw = Math.min(w - 20, 360);
    const bh = 40;
    const bx = (w - bw) / 2 + off;
    const byy = 12;
    ctx.save();
    ctx.globalAlpha = 0.94 * alpha;
    const g = ctx.createLinearGradient(bx, byy, bx + bw, byy + bh);
    g.addColorStop(0, "#2a1512");
    g.addColorStop(1, "#4a1f16");
    ctx.fillStyle = g;
    rr(bx, byy, bw, bh, 12);
    ctx.fill();
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    ctx.strokeStyle = "rgba(255, 120, 80, " + (0.45 + 0.5 * pulse).toFixed(2) + ")";
    ctx.lineWidth = 2;
    rr(bx, byy, bw, bh, 12);
    ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffd9a0";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(evBanner.emoji + "  " + evBanner.title, bx + bw / 2, byy + bh / 2 + 1);
    ctx.restore();
    ctx.textBaseline = "alphabetic";
  }

  function triggerSceneEvent() {
    const ev = sceneEventFor(currentLocId);
    if (!ev) return;
    evFlash = 1;
    evBanner = null;
    bubble = null; // v33 : place nette pour la cinématique
    if (typeof playSfx === "function") playSfx("event");
    const snd = (typeof EV_SOUNDS !== "undefined" && EV_SOUNDS[ev.id]) || null;
    if (snd && typeof playSfx === "function") playSfx(snd); // v35
    if (snd === "shot" || snd === "alarm") cineShake = 1; // v46 : secousse sur son dramatique
    if (typeof haptic === "function") haptic(15);
    // v31 : cinématique — cinémascope + sous-titres au typewriter
    const quotes = (typeof EVENT_QUOTES !== "undefined" && EVENT_QUOTES[ev.id]) || [];
    const who = (typeof CHAR_NAMES !== "undefined" && CHAR_NAMES[ev.id]) || "";
    const lines = [{ who: "", text: ev.text || ev.title }];
    if (quotes.length) lines.push({ who, text: quotes[0] });
    if (quotes.length > 1) lines.push({ who, text: quotes[1] });
    // v34 : réplique à deux voix — un perso de la scène répond
    const reply = (typeof EVENT_REPLIES !== "undefined" && EVENT_REPLIES[ev.id]) || null;
    if (reply) lines.push({ who: reply.who, text: reply.text });
    // v47 : plans de caméra alternés — plan d'établissement, puis alternance
    const shots = lines.map((ln, i) => {
      if (i === 0) return 0; // plan large d'établissement
      if (!ln.who) return 1; // plan moyen sur la narration
      return (i % 2 === 0) ? 1 : 2; // alterne plan moyen / plan poitrine
    });
    evCine = { ev, lines, who, idx: 0, start: anim, lineStart: anim, reveal: false, bipAt: 0, shots };
    if (typeof sfx !== "undefined" && sfx.cine) { try { sfx.cine.start(); } catch (e) {} }
  }

  function cineFinish() {
    const ev = evCine.ev;
    evCine = null;
    bubble = null; // v50 : on efface la bulle du locuteur à la fin de la cinématique
    if (typeof sfx !== "undefined" && sfx.cine) { try { sfx.cine.stop(); } catch (e) {} }
    // v37 : polaroïd — on garde le souvenir de l'événement
    try {
      if (typeof state !== "undefined") {
        if (!Array.isArray(state.evLog)) state.evLog = [];
        if (!state.evLog.some((r) => r.id === ev.id && r.day === state.day)) {
          state.evLog.unshift({ id: ev.id, day: state.day });
          state.evLog = state.evLog.slice(0, 24);
        }
        if (typeof state.evSeen !== "object" || !state.evSeen) state.evSeen = {};
        state.evSeen[ev.id] = state.day; // v38 : album — événement découvert
        if (typeof checkAlbumTiers === "function") { try { checkAlbumTiers(); } catch (e) {} } // v39 : palier ?
      }
    } catch (err) {}
    state.sceneEvents = (state.sceneEvents || []).filter((id) => id !== ev.id);
    eventVisitor = null;
    if (ev.type === "choice" && typeof showEventModal === "function") {
      showEventModal(ev);
    } else {
      try { ev.apply(state); } catch (err) {}
      if (typeof spawnPopup === "function") spawnPopup(ev.emoji + " " + ev.title, "info");
      if (typeof render === "function") render();
    }
    if (typeof queueChainEvent === "function") { try { queueChainEvent(ev.chainNext); } catch (e) {} } // v44 : chaîne
    if (typeof save === "function") save();
  }

  // v31 : rendu de la cinématique (bandes noires, sous-titres, tap pour avancer)
  // v35 : nom affiché → id d'apparence (portraits de cinématique)
  const LOOK_BY_NAME = {};
  try {
    if (typeof CHAR_NAMES !== "undefined") {
      for (const k of Object.keys(CHAR_NAMES)) LOOK_BY_NAME[CHAR_NAMES[k]] = k;
    }
  } catch (e) {}

  function drawCine(w, h, t) {
    if (!evCine) return;
    const age = anim - evCine.start;
    const kIn = 1 - Math.pow(1 - Math.min(1, age / 400), 3);
    const barH = h * 0.13 * kIn;
    ctx.fillStyle = "rgba(5, 6, 10, " + (0.30 * kIn).toFixed(3) + ")";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, w, barH);
    ctx.fillRect(0, h - barH, w, barH);
    // v35 : fondu rapide au début de chaque ligne (cut au montage)
    const lFade = Math.min(1, (anim - evCine.lineStart) / 220);
    if (lFade < 1) {
      ctx.fillStyle = "rgba(5, 6, 10, " + ((1 - lFade) * 0.75).toFixed(3) + ")";
      ctx.fillRect(0, 0, w, h);
    }
    // v46 : spotlight théâtral au centre de la scène
    {
      const sg = ctx.createRadialGradient(w / 2, h * 0.42, 10, w / 2, h * 0.42, h * 0.58);
      sg.addColorStop(0, "rgba(255, 240, 200, " + (0.10 * kIn).toFixed(3) + ")");
      sg.addColorStop(1, "rgba(255, 240, 200, 0)");
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, w, h);
    }
    // v46 : grain de film animé
    {
      const gseed = Math.floor(anim / 80);
      ctx.fillStyle = "rgba(255, 255, 255, 0.045)";
      for (let i = 0; i < 46; i++) {
        const gx = ((i * 137 + gseed * 61) % 97) / 97 * w;
        const gy = ((i * 89 + gseed * 43) % 89) / 89 * h;
        ctx.fillRect(gx, gy, 1.4, 1.4);
      }
    }
    // v46 : vignette renforcée pendant la cinématique
    {
      const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.34, w / 2, h / 2, h * 0.78);
      vg.addColorStop(0, "rgba(0, 0, 0, 0)");
      vg.addColorStop(1, "rgba(0, 0, 0, " + (0.26 * kIn).toFixed(3) + ")");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }
    const line = evCine.lines[evCine.idx];
    if (!line) { cineFinish(); return; }
    const shown = evCine.reveal ? line.text.length : Math.min(line.text.length, Math.floor((anim - evCine.lineStart) / 26));
    // v33 : bips de dialogue pendant l'écriture
    if (shown > (evCine.bipAt || 0)) {
      if (shown % 3 === 0 && typeof playSfx === "function") playSfx("bip");
      evCine.bipAt = shown;
    }
    const txt = line.text.slice(0, shown);
    // v50 : le locuteur parle en bulle dans la scène (cohérence scène/cinématique)
    const spByName = {};
    if (typeof CHAR_NAMES !== "undefined") {
      for (const sk of Object.keys(CHAR_NAMES)) {
        spByName[CHAR_NAMES[sk]] = sk;
        spByName[CHAR_NAMES[sk].split(" ")[0]] = sk;
      }
    }
    const spId = line.who ? (spByName[line.who] || null) : null;
    const spScreen = spId ? charScreens.find((cs) => cs.id === spId) : null;
    bubble = spScreen ? { id: spId, text: txt, until: anim + 999999 } : null;
    if (shown >= line.text.length && anim - evCine.lineStart > 2400 + line.text.length * 24) {
      evCine.idx += 1;
      evCine.lineStart = anim;
      evCine.reveal = false;
      if (evCine.idx >= evCine.lines.length) { cineFinish(); return; }
      return;
    }
    const bw = Math.min(w * 0.86, 340);
    const bx = (w - bw) / 2;
    // v35 : portrait du locuteur en médaillon
    let portLook = null;
    if (line.who) {
      const looks = (typeof CHAR_LOOKS !== "undefined") ? CHAR_LOOKS : {};
      const visitors = (typeof EVENT_VISITORS !== "undefined") ? EVENT_VISITORS : {};
      if (line.who === evCine.who) {
        portLook = looks[evCine.ev.id] || visitors[evCine.ev.id] || null;
      } else {
        const byName = (typeof LOOK_BY_NAME !== "undefined") ? LOOK_BY_NAME : {};
        const pid = byName[line.who] || (typeof CHAR_NAMES !== "undefined"
          ? Object.keys(CHAR_NAMES).find((k) => CHAR_NAMES[k] === line.who || CHAR_NAMES[k].split(" ")[0] === line.who)
          : null);
        portLook = pid ? looks[pid] : null;
      }
    }
    const subLines = wrapText(txt, bw - (portLook ? 72 : 24));
    const bh = 16 + (line.who ? 14 : 0) + subLines.length * 16 + 10;
    // v46 : la boîte de sous-titres glisse vers le haut à chaque réplique
    const lSlide = 1 - Math.pow(1 - Math.min(1, (anim - evCine.lineStart) / 190), 3);
    const by = h - barH - bh - 16 + (1 - lSlide) * 16;
    let textX = bx + 12;
    // v46 : la boîte est dessinée AVANT le médaillon (fix calque v35)
    ctx.save();
    ctx.globalAlpha = lSlide;
    ctx.fillStyle = "rgba(8, 10, 6, 0.85)";
    rr(bx, by, bw, bh, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 210, 120, 0.35)";
    ctx.lineWidth = 1.5;
    rr(bx, by, bw, bh, 10);
    ctx.stroke();
    ctx.restore();
    if (portLook) {
      // v46 : le médaillon pop à l'entrée de la réplique puis respire doucement
      const pAge = anim - evCine.lineStart;
      const pk = Math.min(1, pAge / 260);
      const eb = 1 + 2.70158 * Math.pow(pk - 1, 3) + 1.70158 * Math.pow(pk - 1, 2); // easeOutBack
      const pr = Math.max(0.01, 20 * eb * (1 + 0.02 * Math.sin(t * 2.2)));
      const pcx = bx + 10 + 20;
      const pcy = by + bh / 2 + 2;
      ctx.save();
      ctx.globalAlpha = Math.min(1, lSlide * 1.4);
      ctx.beginPath();
      ctx.arc(pcx, pcy, pr, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(8, 10, 6, 0.92)";
      ctx.fill();
      ctx.clip();
      ctx.translate(pcx, pcy);
      const ps = pr / 15;
      ctx.scale(ps, ps);
      ctx.translate(0, 42);
      drawPerson(0, 0, 1, portLook, "neutral", null, true);
      ctx.restore();
      ctx.strokeStyle = "rgba(232, 200, 74, 0.65)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pcx, pcy, pr, 0, Math.PI * 2);
      ctx.stroke();
      textX = bx + 12 + 40 + 8;
    }
    let ty = by + 12;
    if (line.who) {
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "#e8c84a";
      ctx.textAlign = "left";
      ctx.fillText(line.who.toUpperCase(), textX, ty + 8);
      // v46 : soulignement doré qui se déploie sous le nom
      const uw = Math.min(1, (anim - evCine.lineStart) / 300) * (bw - (textX - bx) - 26);
      ctx.fillStyle = "rgba(232, 200, 74, 0.7)";
      ctx.fillRect(textX, ty + 11, Math.max(0, uw), 1.5);
      ty += 14;
    }
    ctx.font = "bold 12.5px sans-serif";
    ctx.fillStyle = "#fff3d6";
    ctx.textAlign = "left";
    subLines.forEach((l, i) => {
      ctx.fillText(l, textX, ty + 14 + i * 16);
    });
    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = shown >= line.text.length
      ? "rgba(255, 220, 140, " + (0.5 + 0.4 * Math.sin(t * 5)).toFixed(2) + ")"
      : "rgba(255, 255, 255, 0.4)";
    ctx.textAlign = "right";
    ctx.fillText(shown >= line.text.length ? "▼" : "...", bx + bw - 10, by + bh - 8);
    // v46 : points de progression des répliques au-dessus de la boîte
    if (evCine.lines.length > 1) {
      for (let i = 0; i < evCine.lines.length; i++) {
        const dx = bx + bw - 10 - (evCine.lines.length - 1 - i) * 11;
        ctx.beginPath();
        ctx.arc(dx, by - 11, i === evCine.idx ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = i === evCine.idx
          ? "rgba(232, 200, 74, " + (0.65 + 0.3 * Math.sin(t * 5)).toFixed(2) + ")"
          : "rgba(255, 255, 255, 0.28)";
        ctx.fill();
      }
    }
    ctx.textAlign = "left";
  }

  // v31 : silhouettes de premier plan par décor (profondeur)
  function drawForeground(w, h, kind, night) {
    const col = night ? "rgba(10, 12, 18, 0.90)" : "rgba(24, 18, 10, 0.82)";
    ctx.fillStyle = col;
    if (kind === "desert" || kind === "desert2") {
      rr(w * 0.03, h * 0.70, w * 0.045, h * 0.30, w * 0.02);
      ctx.fill();
      rr(w * 0.015, h * 0.76, w * 0.02, h * 0.10, w * 0.01);
      ctx.fill();
      rr(w * 0.075, h * 0.80, w * 0.02, h * 0.09, w * 0.01);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(w * 0.94, h * 0.97, w * 0.07, h * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "suburb" || kind === "backyard") {
      ctx.fillRect(w * 0.06, h * 0.80, 4, h * 0.19);
      rr(w * 0.045, h * 0.76, w * 0.05, h * 0.045, 4);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(w * 0.93, h * 0.98, w * 0.08, h * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "industrial") {
      rr(w * 0.03, h * 0.82, w * 0.05, h * 0.17, 5);
      ctx.fill();
      rr(w * 0.085, h * 0.84, w * 0.045, h * 0.15, 5);
      ctx.fill();
    } else if (kind === "street") {
      ctx.fillRect(w * 0.055, h * 0.30, 5, h * 0.69);
      ctx.fillRect(w * 0.055, h * 0.30, w * 0.045, 4);
      ctx.fillStyle = night ? "rgba(255, 220, 130, 0.95)" : "rgba(255, 240, 190, 0.75)";
      ctx.beginPath();
      ctx.ellipse(w * 0.10, h * 0.315, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col;
    } else if (kind === "junkyard") {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(w * 0.05, h * (0.95 - i * 0.05), w * 0.045, h * 0.022, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === "ranch" || kind === "station") {
      ctx.fillRect(0, h * 0.86, w * 0.10, 4);
      ctx.fillRect(w * 0.02, h * 0.80, 4, h * 0.19);
      ctx.fillRect(w * 0.07, h * 0.80, 4, h * 0.19);
    } else {
      ctx.beginPath();
      ctx.ellipse(w * 0.05, h * 0.98, w * 0.06, h * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function updateBubble(t, chars) {
    if (typeof QUOTES === "undefined") return;
    if (bubble && anim > bubble.until) {
      bubble = null;
      nextBubbleAt = anim + 4500 + Math.random() * 4500;
      return;
    }
    if (!bubble && !evCine && anim > nextBubbleAt && chars && chars.length) {
      const id = chars[Math.floor(Math.random() * chars.length)];
      const lines = QUOTES[id];
      if (lines && lines.length) {
        bubble = { id, text: lines[Math.floor(Math.random() * lines.length)], until: anim + 3000 };
      } else {
        nextBubbleAt = anim + 5000;
      }
    }
  }

  const BUBBLE_COLORS = ["#4e7a2a", "#3a6ea5", "#8a5fc9", "#c2743a", "#a53a5f", "#2a8a7a"];
  function bubbleColor(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return BUBBLE_COLORS[h % BUBBLE_COLORS.length];
  }

  function wrapText(text, maxW) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    ctx.font = "bold 12px sans-serif";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawBubble() {
    if (!bubble) return;
    const c = charScreens.find((cs) => cs.id === bubble.id);
    if (!c) return;
    const bx = c.x;
    const by = c.y - 66 * c.s - 26;
    const maxW = Math.min(220, canvas.clientWidth - 24);
    const lines = wrapText(bubble.text, maxW - 18);
    const tw = Math.max(...lines.map((l) => {
      ctx.font = "bold 12px sans-serif";
      return ctx.measureText(l).width;
    })) + 18;
    const lh = 15;
    const bh = lines.length * lh + 10;
    const x0 = Math.max(6, Math.min(canvas.clientWidth - tw - 6, bx - tw / 2));
    const col = bubbleColor(bubble.id);
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "#fffdf4";
    rr(x0, by - bh, tw, bh, 9);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.8;
    rr(x0, by - bh, tw, bh, 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx - 5, by);
    ctx.lineTo(bx + 5, by);
    ctx.lineTo(bx, by + 7);
    ctx.closePath();
    ctx.fillStyle = "#fffdf4";
    ctx.fill();

    // étiquette du nom
    const name = (typeof CHAR_NAMES !== "undefined" && CHAR_NAMES[bubble.id]) || bubble.id;
    ctx.font = "bold 10px sans-serif";
    const nw = ctx.measureText(name).width + 12;
    ctx.fillStyle = col;
    rr(x0, by - bh - 13, nw, 14, 7);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, x0 + nw / 2, by - bh - 6);

    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#1c2b14";
    lines.forEach((l, i) => {
      ctx.fillText(l, x0 + tw / 2, by - bh + 10 + i * lh);
    });
    ctx.restore();
    ctx.textBaseline = "alphabetic";
  }

  function drawFloaters() {
    for (const f of floaters) {
      f.y -= 0.7;
      f.life -= 0.016;
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.4));
      ctx.fillStyle = "#ffd23a";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 3;
      ctx.strokeText(f.txt, f.x, f.y);
      ctx.fillText(f.txt, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    floaters = floaters.filter((f) => f.life > 0);
  }

  function drawBirds(w, h, t) {
    ctx.strokeStyle = "rgba(40,40,50,0.7)";
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const bx = ((t * (26 + i * 9) + i * 230) % (w + 80)) - 40;
      const by = h * (0.08 + i * 0.05) + Math.sin(t * 2 + i * 2) * 8;
      const flap = Math.sin(t * 9 + i * 3) * 3.5;
      ctx.beginPath();
      ctx.moveTo(bx - 6, by - flap);
      ctx.quadraticCurveTo(bx, by + 2, bx + 6, by - flap);
      ctx.stroke();
    }
  }

  function drawTumbleweed(w, h, t) {
    const x = ((t * 55) % (w + 80)) - 40;
    const y = h * 0.7;
    ctx.save();
    ctx.translate(x, y - 8 + Math.abs(Math.sin(t * 3)) * -6);
    ctx.rotate(t * 4);
    ctx.strokeStyle = "rgba(120, 96, 50, 0.8)";
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, 7 - i, i * 1.3, i * 1.3 + 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  // v30 : poussières dans la lumière du jour (scènes extérieures)
  let dustMotes = [];
  function drawDust(w, h, t) {
    if (!dustMotes.length) {
      for (let i = 0; i < 10; i++) {
        dustMotes.push({ x: Math.random(), y: 0.25 + Math.random() * 0.5, vx: 0.008 + Math.random() * 0.02, ph: Math.random() * 6.28, sz: 1 + Math.random() * 1.6 });
      }
    }
    ctx.fillStyle = "rgba(255, 240, 200, 0.5)";
    for (const p of dustMotes) {
      const dx = (p.x + t * p.vx * 0.06) % 1;
      const dy = p.y + Math.sin(t * 0.9 + p.ph) * 0.02;
      ctx.globalAlpha = 0.18 + 0.14 * Math.sin(t * 1.3 + p.ph);
      ctx.beginPath();
      ctx.arc(w * dx, h * dy, p.sz, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // v30 : brume d'aube
  function drawMist(w, h, t) {
    const g = ctx.createLinearGradient(0, h * 0.45, 0, h * 0.8);
    g.addColorStop(0, "rgba(235, 240, 245, 0)");
    g.addColorStop(0.5, "rgba(235, 240, 245, " + (0.10 + 0.03 * Math.sin(t * 0.4)).toFixed(3) + ")");
    g.addColorStop(1, "rgba(235, 240, 245, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, h * 0.45, w, h * 0.35);
  }

  let grainTile = null;
  function drawVignette(w, h, night) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, night ? "rgba(0,0,0,0.4)" : "rgba(20,16,8,0.22)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // v30 : grain de film
    try {
      if (!grainTile) {
        grainTile = document.createElement("canvas");
        grainTile.width = 128; grainTile.height = 128;
        const gc = grainTile.getContext("2d");
        const img = gc.createImageData(128, 128);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = 120 + Math.random() * 135;
          img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
        gc.putImageData(img, 0, 0);
      }
      ctx.globalAlpha = night ? 0.045 : 0.032;
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = ctx.createPattern(grainTile, "repeat");
      const ox = (anim * 0.61) % 128, oy = (anim * 0.37) % 128;
      ctx.save();
      ctx.translate(-ox, -oy);
      ctx.fillRect(0, 0, w + 128, h + 128);
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    } catch (err) { grainTile = null; }
  }

  // ---------- v17 : extras de décor par scène ----------
  const EXTRAS = {
    desert(w, h, t, night) {
      ctx.strokeStyle = night ? "#2a2a30" : "#5a5248";
      ctx.lineWidth = 3;
      const py = h * 0.5;
      for (const px of [w * 0.08, w * 0.24]) {
        ctx.beginPath();
        ctx.moveTo(px, py + h * 0.14);
        ctx.lineTo(px, py - h * 0.02);
        ctx.stroke();
      }
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.08, py + h * 0.01);
      ctx.quadraticCurveTo(w * 0.16, py + h * 0.035, w * 0.24, py + h * 0.01);
      ctx.moveTo(w * 0.08, py + h * 0.035);
      ctx.quadraticCurveTo(w * 0.16, py + h * 0.06, w * 0.24, py + h * 0.035);
      ctx.stroke();
      ctx.fillStyle = night ? "#3a342c" : "#9a8264";
      ctx.beginPath();
      ctx.ellipse(w * 0.68, h * 0.66, 18, 7, 0.3, 0, Math.PI * 2);
      ctx.ellipse(w * 0.72, h * 0.68, 10, 5, -0.2, 0, Math.PI * 2);
      ctx.fill();
    },
    carwash(w, h, t) {
      for (let i = 0; i < 6; i++) {
        const bx = w * (0.3 + 0.4 * ((i * 0.7 + t * 0.05) % 1));
        const by = h * (0.58 - ((i * 0.37 + t * 0.09) % 1) * 0.16);
        ctx.strokeStyle = "rgba(230, 245, 255, 0.55)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bx, by, 3 + (i % 3), 0, Math.PI * 2);
        ctx.stroke();
      }
      const rx = w * 0.5, ry = h * 0.6;
      ctx.save();
      ctx.translate(rx + 52, ry - 8);
      ctx.rotate(t * 1.4);
      ctx.strokeStyle = "#c2483a";
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(i * 2.1) * 16, Math.sin(i * 2.1) * 16);
        ctx.stroke();
      }
      ctx.restore();
    },
    restaurant(w, h, t, night) {
      const sx = w * 0.16, sy = h * 0.34;
      const glow = 0.5 + 0.5 * Math.sin(t * 2);
      ctx.fillStyle = "#c8a03a";
      rr(sx - 34, sy - 22, 68, 34, 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 220, 120, " + (0.3 + glow * 0.4).toFixed(2) + ")";
      ctx.lineWidth = 3;
      rr(sx - 34, sy - 22, 68, 34, 6);
      ctx.stroke();
      ctx.fillStyle = "#fff8e0";
      ctx.beginPath();
      ctx.arc(sx, sy - 5, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c8402a";
      ctx.beginPath();
      ctx.moveTo(sx - 8, sy - 10);
      ctx.lineTo(sx, sy - 18);
      ctx.lineTo(sx + 8, sy - 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#8a6a20";
      ctx.fillRect(sx - 2, sy + 12, 4, 14);
    },
    street(w, h, t, night) {
      const flick = Math.random() < 0.03 ? 0.2 : 1;
      const nx = w * 0.82, ny = h * 0.42;
      ctx.save();
      ctx.globalAlpha = flick;
      ctx.fillStyle = night ? "#e83a6a" : "#d84a7a";
      rr(nx - 10, ny - 30, 20, 46, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 200, 220, " + (night ? 0.5 : 0.2) + ")";
      rr(nx - 6, ny - 26, 12, 38, 3);
      ctx.fill();
      ctx.restore();
      if (night) {
        ctx.fillStyle = "rgba(232, 58, 106, 0.12)";
        ctx.beginPath();
        ctx.ellipse(nx, ny + 34, 26, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#3a3a42";
      ctx.fillRect(nx - 2, ny + 16, 4, h * 0.24);
    },
    police(w, h, t, night) {
      const cx = w * 0.2, cy = h * 0.72;
      const on = Math.sin(t * 6) > 0;
      ctx.fillStyle = on ? "rgba(220, 50, 50, 0.5)" : "rgba(60, 90, 220, 0.5)";
      ctx.beginPath();
      ctx.ellipse(cx + (on ? -8 : 8), cy - 26, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = on ? "rgba(220, 50, 50, 0.14)" : "rgba(60, 90, 220, 0.14)";
      ctx.beginPath();
      ctx.ellipse(cx, cy - 10, 44, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    },
    industrial(w, h, t, night) {
      ctx.strokeStyle = night ? "#2e3426" : "#6a705c";
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 6; i++) {
        const fx = w * (0.04 + i * 0.045);
        ctx.beginPath();
        ctx.moveTo(fx, h * 0.6);
        ctx.lineTo(fx, h * 0.52);
        ctx.stroke();
      }
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.04, h * 0.55);
      ctx.lineTo(w * 0.28, h * 0.55);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const bx = w * 0.88 + i * 13, by = h * 0.66 - i * 2;
        ctx.fillStyle = ["#3a6a4a", "#8a6a2a", "#6a3a3a"][i];
        rr(bx, by - 16, 12, 18, 3);
        ctx.fill();
      }
    },
  };

  function drawBills(w, h, biz, t) {
    const pooled = pooledOf(biz.id);
    if (pooled >= 1 && bills.length < 14 && Math.random() < 0.25) {
      bills.push({ x: w * (0.3 + Math.random() * 0.4), y: h * 0.55, vy: 40 + Math.random() * 60, vx: (Math.random() - 0.5) * 30, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 4 });
    }
    ctx.save();
    for (const b of bills) {
      b.y += b.vy * 0.016;
      b.x += b.vx * 0.016 + Math.sin(t * 3 + b.rot) * 0.6;
      b.rot += b.vr * 0.016;
      if (b.y > h * 0.85) { b.y = h * 0.5; b.x = w * (0.3 + Math.random() * 0.4); }
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "#7bc47b";
      ctx.fillRect(-9, -5, 18, 10);
      ctx.strokeStyle = "#4a8a4a";
      ctx.lineWidth = 1;
      ctx.strokeRect(-9, -5, 18, 10);
      ctx.fillStyle = "#e8f4e8";
      ctx.beginPath();
      ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawBizBadge(w, h, biz, t) {
    const lvl = levelOf(biz.id);
    const pooled = pooledOf(biz.id);
    const bx = w * 0.5, by = h * 0.16;
    ctx.save();
    ctx.translate(bx, by);
    ctx.fillStyle = "rgba(20,26,16,0.82)";
    rr(-w * 0.34, -22, w * 0.68, 44, 12);
    ctx.fill();
    ctx.strokeStyle = pooled >= 1 ? "#e8c84a" : "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    rr(-w * 0.34, -22, w * 0.68, 44, 12);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#f4ead0";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText((biz.emoji || "💼") + " " + biz.name, 0, -4);
    ctx.fillStyle = "#9fd49f";
    ctx.font = "11px sans-serif";
    const rateTxt = (typeof bizRevPerSec === "function" && lvl > 0)
      ? (typeof fmtMoney === "function" ? fmtMoney(bizRevPerSec(biz.id)) : bizRevPerSec(biz.id)) + "/s"
      : "niveau 0";
    ctx.fillText("Niveau " + lvl + " · " + rateTxt, 0, 12);
    ctx.restore();

    if (pooled >= 1) {
      const pulse = 1 + Math.sin(t * 4) * 0.08;
      ctx.save();
      ctx.translate(w * 0.5, h * 0.3);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = "#e8c84a";
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-8, 14);
      ctx.lineTo(8, 14);
      ctx.lineTo(0, 24);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#1c2b14";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("$", 0, 5);
      ctx.restore();
    }
  }

  function drawSparks(t) {
    for (const s of sparks) {
      s.x += s.vx * 0.016;
      s.y += s.vy * 0.016;
      s.vy += 200 * 0.016;
      s.life -= 0.016;
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.fillStyle = "#ffd23a";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    sparks = sparks.filter((s) => s.life > 0);
  }

  // ---------- peintres de décor (kind) ----------

  function drawDistantHills(w, h, night) {
    ctx.fillStyle = night ? "rgba(24, 30, 44, 0.85)" : "rgba(140, 100, 70, 0.4)";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.56);
    ctx.lineTo(w * 0.14, h * 0.44);
    ctx.lineTo(w * 0.3, h * 0.53);
    ctx.lineTo(w * 0.5, h * 0.4);
    ctx.lineTo(w * 0.72, h * 0.52);
    ctx.lineTo(w * 0.88, h * 0.43);
    ctx.lineTo(w, h * 0.52);
    ctx.lineTo(w, h * 0.62);
    ctx.lineTo(0, h * 0.62);
    ctx.closePath();
    ctx.fill();
    if (!night) {
      ctx.fillStyle = "rgba(255, 240, 210, 0.35)";
      for (const [px, py, sz] of [[0.14, 0.44, 0.05], [0.5, 0.4, 0.06], [0.88, 0.43, 0.045]]) {
        ctx.beginPath();
        ctx.moveTo(w * px, h * py);
        ctx.lineTo(w * (px + sz), h * (py + 0.05));
        ctx.lineTo(w * (px - sz), h * (py + 0.05));
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawGroundTexture(w, h, topY, tint) {
    let seed = 13;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    if (tint) {
      ctx.fillStyle = tint;
      for (let i = 0; i < 26; i++) {
        const gx = rnd() * w;
        const gy = topY + rnd() * (h - topY);
        const gw = 8 + rnd() * 22;
        ctx.fillRect(gx, gy, gw, 1.6);
      }
    }
    for (let i = 0; i < 16; i++) {
      const gx = rnd() * w;
      const gy = topY + rnd() * (h - topY);
      const gr = 1.5 + rnd() * 2.8;
      ctx.fillStyle = "rgba(60, 45, 25, 0.22)";
      ctx.beginPath();
      ctx.ellipse(gx, gy, gr, gr * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 240, 210, 0.20)";
      ctx.beginPath();
      ctx.ellipse(gx - gr * 0.25, gy - gr * 0.3, gr * 0.45, gr * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(50, 35, 18, 0.18)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      let cx = rnd() * w, cy = topY + rnd() * (h - topY);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let j = 0; j < 4; j++) {
        cx += (rnd() - 0.5) * 34;
        cy += rnd() * 10;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(90, 110, 50, 0.5)";
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 10; i++) {
      const gx = rnd() * w;
      const gy = topY + rnd() * (h - topY);
      for (let j = -1; j <= 1; j++) {
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.quadraticCurveTo(gx + j * 3, gy - 5, gx + j * 5, gy - 8 - rnd() * 3);
        ctx.stroke();
      }
    }
  }

  const OUTDOOR_KINDS = new Set(["desert", "desert2", "suburb", "ranch", "station", "plaza", "police", "backyard"]);

  const PAINTERS = {
    desert(w, h, t) {
      ctx.fillStyle = "#c89858";
      ctx.fillRect(0, h * 0.62, w, h * 0.38);
      ctx.fillStyle = "#b8884a";
      ctx.beginPath();
      ctx.moveTo(0, h * 0.62);
      ctx.lineTo(w * 0.3, h * 0.56);
      ctx.lineTo(w * 0.7, h * 0.64);
      ctx.lineTo(w, h * 0.58);
      ctx.lineTo(w, h * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#8a6838";
      ctx.beginPath();
      ctx.ellipse(w * 0.15, h * 0.72, 26, 8, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.88, h * 0.8, 34, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#4a7a3a";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(w * 0.78, h * 0.72);
      ctx.lineTo(w * 0.78, h * 0.58);
      ctx.moveTo(w * 0.78, h * 0.65);
      ctx.lineTo(w * 0.73, h * 0.61);
      ctx.moveTo(w * 0.78, h * 0.67);
      ctx.lineTo(w * 0.83, h * 0.62);
      ctx.stroke();
      const rx = w * 0.5, ry = h * 0.6;
      ctx.fillStyle = "#d8d0c0";
      rr(rx - 70, ry - 55, 140, 62, 10);
      ctx.fill();
      ctx.strokeStyle = "#8a8274";
      ctx.lineWidth = 2;
      rr(rx - 70, ry - 55, 140, 62, 10);
      ctx.stroke();
      ctx.fillStyle = "#5a6a7a";
      rr(rx - 58, ry - 44, 26, 18, 3);
      ctx.fill();
      rr(rx - 24, ry - 44, 26, 18, 3);
      ctx.fill();
      rr(rx + 10, ry - 44, 26, 18, 3);
      ctx.fill();
      ctx.fillStyle = "#3a3a3a";
      ctx.beginPath();
      ctx.arc(rx - 40, ry + 8, 9, 0, Math.PI * 2);
      ctx.arc(rx + 40, ry + 8, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8a8a8a";
      rr(rx - 6, ry - 62, 12, 10, 2);
      ctx.fill();
      smokePuff(rx, ry - 66, t, "#d8d4cc", 1.2);
    },
    suburb(w, h, t) {
      ctx.fillStyle = "#7aa85a";
      ctx.fillRect(0, h * 0.66, w, h * 0.34);
      ctx.fillStyle = "#6a9850";
      ctx.fillRect(w * 0.55, h * 0.72, w * 0.4, h * 0.16);
      const px = w * 0.72, py = h * 0.78;
      ctx.fillStyle = "#4a9ac8";
      ctx.beginPath();
      ctx.ellipse(px, py, 46, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#e8e8e0";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(px, py, 50, 19, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(px - 30 + i * 22, py - 6 + Math.sin(t * 3 + i) * 2);
        ctx.lineTo(px - 18 + i * 22, py + 4 + Math.cos(t * 2.4 + i) * 2);
        ctx.stroke();
      }
      const hx = w * 0.32, hy = h * 0.62;
      ctx.fillStyle = "#e8d8b8";
      rr(hx - 80, hy - 70, 160, 76, 4);
      ctx.fill();
      ctx.fillStyle = "#8a4a2a";
      ctx.beginPath();
      ctx.moveTo(hx - 94, hy - 70);
      ctx.lineTo(hx, hy - 116);
      ctx.lineTo(hx + 94, hy - 70);
      ctx.closePath();
      ctx.fill();
      drawWindow(hx - 60, hy - 52, 26, 22, false, t);
      drawWindow(hx + 34, hy - 52, 26, 22, true, t, 1);
      ctx.fillStyle = "#6a4a2a";
      rr(hx - 12, hy - 40, 24, 46, 3);
      ctx.fill();
      ctx.fillStyle = "#c8b890";
      ctx.fillRect(hx + 96, hy - 30, 4, 34);
      rr(hx + 88, hy - 44, 20, 14, 2);
      ctx.fill();
      ctx.strokeStyle = "#4a6a3a";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.7);
      ctx.lineTo(w * 0.1, h * 0.58);
      ctx.stroke();
      ctx.fillStyle = "#5a8a3a";
      ctx.beginPath();
      ctx.arc(w * 0.1, h * 0.55, 22, 0, Math.PI * 2);
      ctx.fill();
    },
    carwash(w, h, t) {
      ctx.fillStyle = "#9aa0a8";
      ctx.fillRect(0, h * 0.68, w, h * 0.32);
      const bx = w * 0.5, by = h * 0.56;
      ctx.fillStyle = "#d84848";
      rr(bx - 110, by - 90, 220, 30, 6);
      ctx.fill();
      ctx.fillStyle = "#e8e8e4";
      rr(bx - 100, by - 60, 200, 66, 4);
      ctx.fill();
      ctx.fillStyle = "#4a8ac8";
      rr(bx - 88, by - 48, 60, 40, 3);
      ctx.fill();
      rr(bx + 28, by - 48, 60, 40, 3);
      ctx.fill();
      ctx.fillStyle = "#1a2a3a";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("A1A CAR WASH", bx, by - 70);
      ctx.fillStyle = "#3a4a5a";
      rr(bx - 18, by - 40, 36, 46, 4);
      ctx.fill();
      const cy = by + 14;
      const cx = bx + Math.sin(t * 0.7) * 60;
      ctx.fillStyle = "#c84a3a";
      rr(cx - 34, cy - 18, 68, 20, 6);
      ctx.fill();
      ctx.fillStyle = "#2a2a2a";
      ctx.beginPath();
      ctx.arc(cx - 20, cy + 4, 7, 0, Math.PI * 2);
      ctx.arc(cx + 20, cy + 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(160,220,255,0.7)";
      rr(cx - 26, cy - 15, 20, 10, 3);
      ctx.fill();
      rr(cx + 6, cy - 15, 20, 10, 3);
      ctx.fill();
      for (const rx2 of [bx - 55, bx + 55]) {
        ctx.strokeStyle = "#e84a4a";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(rx2, by - 50);
        ctx.lineTo(rx2, by + 6);
        ctx.stroke();
        const sway = Math.sin(t * 5 + rx2) * 6;
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(rx2, by - 46 + i * 14);
          ctx.lineTo(rx2 + sway, by - 40 + i * 14);
          ctx.stroke();
        }
      }
      ctx.fillStyle = "rgba(160,220,255,0.5)";
      for (let i = 0; i < 6; i++) {
        const dx = ((t * 90 + i * 37) % 120) - 60;
        ctx.beginPath();
        ctx.arc(bx + dx, by + 20 + (i % 3) * 8, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    restaurant(w, h, t) {
      ctx.fillStyle = "#b8a888";
      ctx.fillRect(0, h * 0.68, w, h * 0.32);
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(0, h * 0.66, w, 8);
      const bx = w * 0.5, by = h * 0.58;
      ctx.fillStyle = "#e8e0d0";
      rr(bx - 110, by - 80, 220, 86, 6);
      ctx.fill();
      ctx.fillStyle = "#c83a2a";
      rr(bx - 118, by - 92, 236, 18, 8);
      ctx.fill();
      ctx.fillStyle = "#c8a02a";
      rr(bx - 70, by - 116, 140, 26, 12);
      ctx.fill();
      ctx.fillStyle = "#1a2a1a";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("LOS POLLOS HERMANOS", bx, by - 98);
      drawWindow(bx - 92, by - 52, 70, 40, true, t, 1);
      drawWindow(bx + 22, by - 52, 70, 40, true, t, 2);
      ctx.fillStyle = "#6a4a2a";
      rr(bx - 14, by - 36, 28, 42, 3);
      ctx.fill();
      const cx = ((t * 40) % (w + 120)) - 60;
      ctx.fillStyle = "#c8b830";
      rr(cx, by + 12, 56, 18, 5);
      ctx.fill();
      ctx.fillStyle = "#2a2a2a";
      ctx.beginPath();
      ctx.arc(cx + 14, by + 32, 6, 0, Math.PI * 2);
      ctx.arc(cx + 44, by + 32, 6, 0, Math.PI * 2);
      ctx.fill();
    },
    industrial(w, h, t) {
      ctx.fillStyle = "#3a4048";
      ctx.fillRect(0, h * 0.64, w, h * 0.36);
      const bx = w * 0.5, by = h * 0.6;
      ctx.fillStyle = "#4a4e56";
      rr(bx - 130, by - 110, 260, 116, 4);
      ctx.fill();
      ctx.fillStyle = "#3a3e46";
      rr(bx - 138, by - 122, 276, 16, 3);
      ctx.fill();
      for (let i = 0; i < 6; i++) {
        drawWindow(bx - 112 + i * 40, by - 88, 28, 22, i !== 1 && i !== 4, t, i);
      }
      ctx.fillStyle = "#2a2e34";
      rr(bx - 24, by - 40, 48, 46, 3);
      ctx.fill();
      ctx.fillStyle = "#e8c84a";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("LAVANDERÍA", bx, by - 128);
      ctx.strokeStyle = "rgba(200,210,220,0.4)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.06 + i * (w * 0.88 / 7), h * 0.64);
        ctx.lineTo(w * 0.06 + i * (w * 0.88 / 7), h * 0.72);
        ctx.stroke();
      }
      smokePuff(bx - 100, by - 120, t, "#9aa0a8", 1);
      smokePuff(bx + 104, by - 120, t + 2, "#9aa0a8", 1);
      ctx.fillStyle = "rgba(120,200,140,0.14)";
      ctx.fillRect(bx - 90, by - 66, 30, 22);
      ctx.fillRect(bx + 60, by - 66, 30, 22);
    },
    office(w, h, t) {
      ctx.fillStyle = "#8a8478";
      ctx.fillRect(0, h * 0.68, w, h * 0.32);
      const bx = w * 0.5, by = h * 0.58;
      ctx.fillStyle = "#d8cfc0";
      rr(bx - 110, by - 100, 220, 106, 4);
      ctx.fill();
      const flick = Math.sin(t * 8) > -0.7 || Math.sin(t * 2.2) > 0;
      ctx.fillStyle = flick ? "#ffd23a" : "#7a6a2a";
      rr(bx - 96, by - 88, 192, 24, 4);
      ctx.fill();
      ctx.fillStyle = flick ? "#1a2a4a" : "#3a3020";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BETTER CALL SAUL", bx, by - 71);
      ctx.fillStyle = "#4a6a8a";
      rr(bx - 92, by - 52, 184, 52, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(bx - 92 + i * 50, by - 52);
        ctx.lineTo(bx - 70 + i * 50, by);
        ctx.lineTo(bx - 58 + i * 50, by);
        ctx.lineTo(bx - 80 + i * 50, by - 52);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#8a4a2a";
      rr(bx - 16, by - 34, 32, 40, 3);
      ctx.fill();
      const sx = w * 0.88, sy = h * 0.3;
      ctx.fillStyle = "rgba(255,240,180,0.5)";
      ctx.beginPath();
      ctx.arc(sx, sy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8e0d0";
      rr(sx - 8, sy + 12, 16, 26, 3);
      ctx.fill();
    },
    desert2(w, h, t) {
      ctx.fillStyle = "#5a4a3a";
      ctx.fillRect(0, h * 0.62, w, h * 0.38);
      const sx = w * 0.26, sy = h * 0.56;
      ctx.fillStyle = "#6a5a48";
      rr(sx - 60, sy - 70, 120, 76, 4);
      ctx.fill();
      ctx.fillStyle = "#4a3c30";
      ctx.beginPath();
      ctx.moveTo(sx - 70, sy - 70);
      ctx.lineTo(sx, sy - 100);
      ctx.lineTo(sx + 70, sy - 70);
      ctx.closePath();
      ctx.fill();
      drawWindow(sx - 36, sy - 50, 22, 20, true, t, 1);
      ctx.fillStyle = "#2a221c";
      rr(sx + 10, sy - 38, 26, 44, 3);
      ctx.fill();
      const fx = w * 0.68, fy = h * 0.74;
      ctx.fillStyle = "#3a3a3a";
      rr(fx - 12, fy - 26, 24, 26, 3);
      ctx.fill();
      flame(fx, fy - 26, t, 1.4);
      ctx.fillStyle = "#3a3a3a";
      ctx.beginPath();
      ctx.arc(fx + 8, fy + 2, 5, 0, Math.PI * 2);
      ctx.arc(fx - 8, fy + 3, 5, 0, Math.PI * 2);
      ctx.fill();
      const wx = w * 0.85, wy = h * 0.68;
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(0.12);
      ctx.fillStyle = "#7a4a3a";
      rr(-40, -18, 80, 20, 5);
      ctx.fill();
      ctx.fillStyle = "#2a2a2a";
      ctx.beginPath();
      ctx.arc(-24, 6, 6, 0, Math.PI * 2);
      ctx.arc(24, 6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
    junkyard(w, h, t) {
      ctx.fillStyle = "#8a7a5a";
      ctx.fillRect(0, h * 0.64, w, h * 0.36);
      ctx.strokeStyle = "#5a5a5a";
      ctx.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.05 + i * (w * 0.9 / 11), h * 0.5);
        ctx.lineTo(w * 0.05 + i * (w * 0.9 / 11), h * 0.66);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(w * 0.05, h * 0.52);
      ctx.lineTo(w * 0.95, h * 0.52);
      ctx.stroke();
      const stack = [
        [0.2, 0.6, "#7a4a3a"], [0.32, 0.58, "#4a6a7a"], [0.26, 0.5, "#6a7a4a"],
        [0.72, 0.6, "#5a5a6a"], [0.84, 0.58, "#7a6a3a"], [0.78, 0.5, "#4a5a6a"],
      ];
      for (const [px, py, col] of stack) {
        ctx.save();
        ctx.translate(w * px, h * py);
        ctx.rotate((px * 7 % 1) * 0.2 - 0.1);
        ctx.fillStyle = col;
        rr(-34, -14, 68, 22, 6);
        ctx.fill();
        ctx.fillStyle = "rgba(220,240,255,0.35)";
        rr(-24, -11, 16, 9, 2);
        ctx.fill();
        rr(8, -11, 16, 9, 2);
        ctx.fill();
        ctx.restore();
      }
      const cx = w * 0.52 + Math.sin(t * 0.5) * 20;
      ctx.strokeStyle = "#c8a02a";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(w * 0.52, h * 0.3);
      ctx.lineTo(cx, h * 0.42);
      ctx.stroke();
      ctx.strokeStyle = "#8a8a8a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, h * 0.42);
      ctx.lineTo(cx, h * 0.48);
      ctx.stroke();
      ctx.fillStyle = "#c8a02a";
      rr(cx - 10, h * 0.48, 20, 10, 2);
      ctx.fill();
    },
    plaza(w, h, t) {
      ctx.fillStyle = "#b8b0a0";
      ctx.fillRect(0, h * 0.64, w, h * 0.36);
      ctx.fillStyle = "#a89c88";
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.66, w * 0.3, Math.PI, Math.PI * 2);
      ctx.fill();
      const fx = w * 0.5, fy = h * 0.68;
      ctx.fillStyle = "#8a9aa8";
      ctx.beginPath();
      ctx.ellipse(fx, fy, 56, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6a9ac8";
      ctx.beginPath();
      ctx.ellipse(fx, fy, 48, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c8c4b8";
      rr(fx - 8, fy - 40, 16, 40, 4);
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        const p = ((t * 0.8 + i * 0.2) % 1);
        const ang = i * 1.3;
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = "#8ac4e8";
        ctx.beginPath();
        ctx.arc(fx + Math.sin(ang) * 14, fy - 36 - p * 26, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const px of [0.14, 0.86]) {
        ctx.fillStyle = "#7a6a4a";
        ctx.fillRect(w * px - 20, h * 0.74, 40, 6);
        ctx.fillRect(w * px - 3, h * 0.66, 6, 8);
        ctx.fillStyle = "#5a8a3a";
        ctx.beginPath();
        ctx.arc(w * px, h * 0.6, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#8a8a8a";
      for (let i = 0; i < 3; i++) {
        const px = fx - 30 + i * 30 + Math.sin(t + i * 2) * 8;
        ctx.beginPath();
        ctx.ellipse(px, h * 0.86, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    police(w, h, t) {
      ctx.fillStyle = "#9aa0a0";
      ctx.fillRect(0, h * 0.66, w, h * 0.34);
      const bx = w * 0.5, by = h * 0.56;
      ctx.fillStyle = "#c8c4bc";
      rr(bx - 120, by - 100, 240, 106, 4);
      ctx.fill();
      ctx.fillStyle = "#1a3a6a";
      rr(bx - 120, by - 100, 240, 22, 4);
      ctx.fill();
      ctx.fillStyle = "#f4f0e0";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("D.E.A. — ALBUQUERQUE", bx, by - 84);
      for (let i = 0; i < 4; i++) {
        drawWindow(bx - 96 + i * 56, by - 60, 36, 30, i % 2 === 0, t, i);
      }
      ctx.fillStyle = "#6a4a2a";
      rr(bx - 16, by - 22, 32, 28, 3);
      ctx.fill();
      const cx = w * 0.2, cy = h * 0.74;
      ctx.fillStyle = "#e8883a";
      rr(cx - 44, cy - 20, 88, 22, 6);
      ctx.fill();
      ctx.fillStyle = "#e8e8e8";
      rr(cx - 44, cy - 26, 88, 8, 3);
      ctx.fill();
      ctx.fillStyle = "#2a2a2a";
      ctx.beginPath();
      ctx.arc(cx - 26, cy + 4, 7, 0, Math.PI * 2);
      ctx.arc(cx + 26, cy + 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a3a6a";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText("DEA", cx, cy - 6);
      const sx = w * 0.82;
      const sweep = Math.sin(t * 1.2) * w * 0.08;
      ctx.fillStyle = "rgba(255,250,200,0.35)";
      ctx.beginPath();
      ctx.moveTo(sx, h * 0.4);
      ctx.lineTo(sx + sweep - 30, h * 0.66);
      ctx.lineTo(sx + sweep + 30, h * 0.66);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#4a4a4a";
      rr(sx - 6, h * 0.38, 12, 30, 3);
      ctx.fill();
    },
    backyard(w, h, t) {
      ctx.fillStyle = "#6a9850";
      ctx.fillRect(0, h * 0.64, w, h * 0.36);
      const fx = w * 0.78, fy = h * 0.7;
      ctx.fillStyle = "#4a4a4a";
      rr(fx - 16, fy - 20, 32, 20, 3);
      ctx.fill();
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(fx - 3, fy - 32, 6, 14);
      smokePuff(fx, fy - 34, t, "#d0ccc4", 0.8);
      ctx.strokeStyle = "#e88a9a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.12, h * 0.78);
      ctx.lineTo(w * 0.12, h * 0.6);
      ctx.stroke();
      ctx.fillStyle = "#e86a8a";
      ctx.beginPath();
      ctx.ellipse(w * 0.12, h * 0.58, 7, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8e8e8";
      ctx.fillRect(w * 0.115, h * 0.56, 2, 5);
      ctx.fillStyle = "#c8b898";
      rr(w * 0.34, h * 0.6, w * 0.32, h * 0.1, 6);
      ctx.fill();
      ctx.fillStyle = "#8a6a4a";
      rr(w * 0.36, h * 0.62, w * 0.28, h * 0.06, 4);
      ctx.fill();
      ctx.fillStyle = "#e84848";
      ctx.beginPath();
      ctx.arc(w * 0.44, h * 0.645, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4a8a4a";
      ctx.beginPath();
      ctx.arc(w * 0.56, h * 0.645, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8e8e8";
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.645, 5, 0, Math.PI * 2);
      ctx.fill();
    },
    apartment(w, h, t) {
      ctx.fillStyle = "#4a4450";
      ctx.fillRect(0, h * 0.66, w, h * 0.34);
      const bx = w * 0.5, by = h * 0.6;
      ctx.fillStyle = "#5a5460";
      rr(bx - 120, by - 130, 240, 136, 4);
      ctx.fill();
      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 4; i++) {
          const lit = (i + j * 3) % 3 !== 0;
          drawWindow(bx - 96 + i * 56, by - 112 + j * 40, 30, 24, lit, t, i + j);
        }
      }
      ctx.fillStyle = "#3a3640";
      rr(bx - 70, by - 40, 140, 46, 4);
      ctx.fill();
      ctx.strokeStyle = "#2a2630";
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(bx - 66 + i * 18, by - 40);
        ctx.lineTo(bx - 66 + i * 18, by + 6);
        ctx.stroke();
      }
      ctx.fillStyle = "#4a7a3a";
      for (const px of [bx - 58, bx + 44]) {
        rr(px, by - 18, 16, 18, 4);
        ctx.fill();
        ctx.fillStyle = "#c84a6a";
        ctx.beginPath();
        ctx.arc(px + 4, by - 20, 3, 0, Math.PI * 2);
        ctx.arc(px + 11, by - 22, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#4a7a3a";
      }
      ctx.fillStyle = "rgba(200,220,255,0.8)";
      ctx.font = "14px sans-serif";
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.5 + i * 0.33) % 1;
        ctx.globalAlpha = 1 - p;
        ctx.fillText("♪", bx - 90 + i * 20, by - 50 - p * 40);
      }
      ctx.globalAlpha = 1;
    },
    salon(w, h, t) {
      ctx.fillStyle = "#c8b0b8";
      ctx.fillRect(0, h * 0.68, w, h * 0.32);
      const bx = w * 0.5, by = h * 0.58;
      ctx.fillStyle = "#f0dce4";
      rr(bx - 105, by - 90, 210, 96, 6);
      ctx.fill();
      ctx.fillStyle = "#d86a9a";
      rr(bx - 113, by - 100, 226, 16, 8);
      ctx.fill();
      ctx.save();
      ctx.translate(bx, by - 118);
      ctx.rotate(Math.sin(t * 1.4) * 0.12);
      ctx.fillStyle = "#e84a8a";
      rr(-58, -13, 116, 26, 12);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✂ NAILS", 0, 5);
      ctx.restore();
      ctx.fillStyle = "#e8b8cc";
      rr(bx - 88, by - 56, 70, 52, 4);
      ctx.fill();
      rr(bx + 18, by - 56, 70, 52, 4);
      ctx.fill();
      ctx.fillStyle = "#c84a7a";
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(bx - 66 + i * 18, by - 34, 5, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#e84a8a";
      ctx.font = "16px sans-serif";
      ctx.fillText("💅", bx + 50, by - 26);
      ctx.fillStyle = "#8a4a5a";
      rr(bx - 14, by - 34, 28, 40, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.moveTo(bx - 60, by - 56);
      ctx.lineTo(bx - 40, by - 56);
      ctx.lineTo(bx - 70, by - 4);
      ctx.lineTo(bx - 88, by - 4);
      ctx.closePath();
      ctx.fill();
    },
    street(w, h, t) {
      ctx.fillStyle = "#6a6a72";
      ctx.fillRect(0, h * 0.66, w, h * 0.34);
      ctx.fillStyle = "#e8c84a";
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(w * 0.08 + i * w * 0.18, h * 0.8, 26, 5);
      }
      const b1x = w * 0.24;
      ctx.fillStyle = "#5a5460";
      rr(b1x - 90, h * 0.18, 180, h * 0.5, 4);
      ctx.fill();
      for (let j = 0; j < 4; j++) {
        for (let i = 0; i < 3; i++) {
          drawWindow(b1x - 70 + i * 50, h * 0.24 + j * 52, 26, 30, (i + j) % 2 === 0, t, i + j);
        }
      }
      const b2x = w * 0.78;
      ctx.fillStyle = "#6a5a50";
      rr(b2x - 70, h * 0.3, 160, h * 0.38, 4);
      ctx.fill();
      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
          drawWindow(b2x - 52 + i * 46, h * 0.36 + j * 46, 24, 26, (i * 2 + j) % 3 !== 0, t, i + j * 2);
        }
      }
      ctx.strokeStyle = "#3a3a42";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w * 0.52, h * 0.66);
      ctx.lineTo(w * 0.52, h * 0.3);
      ctx.stroke();
      ctx.fillStyle = "#ffd98a";
      ctx.beginPath();
      ctx.arc(w * 0.52, h * 0.28, 7, 0, Math.PI * 2);
      ctx.fill();
      const glow = ctx.createRadialGradient(w * 0.52, h * 0.3, 2, w * 0.52, h * 0.3, 50);
      glow.addColorStop(0, "rgba(255,220,140,0.35)");
      glow.addColorStop(1, "rgba(255,220,140,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(w * 0.52 - 55, h * 0.3 - 55, 110, 110);
      for (let i = 0; i < 2; i++) {
        const px = ((t * 30 + i * 90) % (w + 80)) - 40;
        ctx.fillStyle = "rgba(20,20,26,0.75)";
        rr(px, h * 0.7, 10, 26, 4);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + 5, h * 0.68, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    ranch(w, h, t) {
      ctx.fillStyle = "#4a5a3a";
      ctx.fillRect(0, h * 0.64, w, h * 0.36);
      const bx = w * 0.42, by = h * 0.58;
      ctx.fillStyle = "#e8d8b0";
      rr(bx - 130, by - 90, 260, 96, 6);
      ctx.fill();
      ctx.fillStyle = "#b84a3a";
      rr(bx - 140, by - 102, 280, 18, 6);
      ctx.fill();
      for (let i = 0; i < 4; i++) {
        const ax = bx - 96 + i * 64;
        ctx.fillStyle = "#3a2e24";
        ctx.beginPath();
        ctx.moveTo(ax, by + 6);
        ctx.lineTo(ax, by - 40);
        ctx.arc(ax + 16, by - 40, 16, Math.PI, 0);
        ctx.lineTo(ax + 32, by + 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255,220,140,0.5)";
        rr(ax + 4, by - 34, 24, 34, 3);
        ctx.fill();
        ctx.fillStyle = "#3a2e24";
      }
      const px = w * 0.86, py = h * 0.6;
      ctx.strokeStyle = "#8a6a4a";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(px, h * 0.76);
      ctx.quadraticCurveTo(px - 6, h * 0.5, px + 4, h * 0.38);
      ctx.stroke();
      ctx.fillStyle = "#4a8a3a";
      for (let i = 0; i < 5; i++) {
        const ang = -0.4 - i * 0.5;
        ctx.beginPath();
        ctx.ellipse(px + 4 + Math.cos(ang) * 22, h * 0.38 + Math.sin(ang) * 14, 16, 6, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      const gx = w * 0.72, gy = h * 0.78;
      ctx.fillStyle = "#3a8ab8";
      ctx.beginPath();
      ctx.ellipse(gx, gy, 44, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(140,220,255,0.5)";
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(gx - 10 + i * 12, gy - 3 + Math.sin(t * 2 + i) * 2, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      smokePuff(w * 0.1, h * 0.6, t, "#e8dcc8", 0.7);
    },
    station(w, h, t) {
      ctx.fillStyle = "#7a7e84";
      ctx.fillRect(0, h * 0.7, w, h * 0.3);
      ctx.fillStyle = "#5a5e64";
      ctx.fillRect(0, h * 0.68, w, 6);
      ctx.fillStyle = "#e8c84a";
      for (let i = 0; i < 8; i++) ctx.fillRect(w * 0.06 + i * w * 0.12, h * 0.735, 22, 4);
      const cols = ["#b84a3a", "#3a6ab8", "#4a8a4a", "#c8a02a", "#7a4a8a"];
      const off = (t * 26) % 130;
      for (let i = -1; i < 5; i++) {
        const cx = w * 0.1 + i * 130 - off;
        ctx.fillStyle = cols[(i + 5) % cols.length];
        rr(cx, h * 0.42, 110, 60, 5);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 2;
        for (let j = 1; j < 5; j++) {
          ctx.beginPath();
          ctx.moveTo(cx + j * 20, h * 0.42);
          ctx.lineTo(cx + j * 20, h * 0.62 + 0);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "9px monospace";
        ctx.fillText("MADRIGAL", cx + 18, h * 0.52);
      }
      ctx.strokeStyle = "#4a4e54";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.4);
      ctx.lineTo(w, h * 0.4);
      ctx.stroke();
      ctx.fillStyle = "#c8c4bc";
      rr(w * 0.78, h * 0.34, 10, h * 0.34, 3);
      ctx.fill();
      rr(w * 0.72, h * 0.34, 22, 14, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(120,180,255,0.8)";
      ctx.font = "12px sans-serif";
      ctx.fillText("🚇", w * 0.735, h * 0.33);
    },
    tower(w, h, t) {
      ctx.fillStyle = "#2a3038";
      ctx.fillRect(0, h * 0.66, w, h * 0.34);
      const bx = w * 0.5, by = h * 0.62;
      ctx.fillStyle = "#1a2028";
      rr(bx - 70, h * 0.06, 140, h * 0.6, 6);
      ctx.fill();
      for (let j = 0; j < 10; j++) {
        for (let i = 0; i < 4; i++) {
          const lit = (i * 3 + j * 7) % 5 < 2;
          drawWindow(bx - 54 + i * 30, h * 0.1 + j * (h * 0.055), 18, h * 0.035, lit, t, i + j * 2);
        }
      }
      ctx.fillStyle = "#c8a02a";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CARTEL", bx, h * 0.09);
      const sx = w * 0.82;
      const sweep = Math.sin(t * 0.9) * w * 0.1;
      ctx.fillStyle = "rgba(200,220,255,0.22)";
      ctx.beginPath();
      ctx.moveTo(sx, h * 0.12);
      ctx.lineTo(sx + sweep - 40, h * 0.66);
      ctx.lineTo(sx + sweep + 40, h * 0.66);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#3a4048";
      rr(sx - 7, h * 0.1, 14, 34, 3);
      ctx.fill();
      ctx.fillStyle = "#4a5460";
      for (let i = 0; i < 3; i++) {
        const px = w * 0.16 + i * w * 0.1;
        rr(px, h * 0.52, 34, h * 0.14, 3);
        ctx.fill();
      }
    },
  };

  // positions des personnages par kind : [ratioX, échelle]
  const CHAR_SPOTS = {
    desert: [[0.38, 1], [0.62, 0.95]],
    desert2: [[0.45, 1]],
    industrial: [[0.42, 1], [0.6, 1]],
    street: [[0.44, 1], [0.58, 0.95]],
    backyard: [[0.48, 1], [0.6, 0.95]],
    station: [[0.5, 1]],
    ranch: [[0.44, 1]],
    carwash: [[0.32, 1]],
    restaurant: [[0.5, 1]],
    office: [[0.5, 1]],
    junkyard: [[0.5, 1]],
    police: [[0.62, 1]],
    apartment: [[0.5, 1]],
    suburb: [[0.52, 1]],
    salon: [[0.5, 1]],
    villa: [[0.58, 1]],
    plaza: [],
    hq: [],
  };

  // ---------- boucle de rendu ----------

  // v23 : panneau des sous-sols du Superlab
  function drawFloorsPanel(w, h, t) {
    const fl = state.labFloors || 0;
    const px = w * 0.5;
    const pw = Math.min(160, w * 0.36);
    const ph = 34 + fl * 30;
    const py = h * 0.26 - ph / 2;
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "rgba(12, 18, 10, 0.82)";
    rr(px - pw / 2, py, pw, ph, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(122, 182, 72, 0.55)";
    ctx.lineWidth = 2;
    rr(px - pw / 2, py, pw, ph, 10);
    ctx.stroke();
    ctx.fillStyle = "#d9c33c";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🏗️ SUPERLAB", px, py + 20);
    for (let i = 1; i <= fl; i++) {
      const y = py + 30 + (i - 1) * 30;
      const lit = 0.55 + 0.35 * Math.sin(t * 2 + i * 1.7);
      ctx.fillStyle = "rgba(122, 182, 72, " + lit.toFixed(2) + ")";
      rr(px - pw / 2 + 12, y, pw - 24, 22, 6);
      ctx.fill();
      ctx.fillStyle = "#0c120a";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("Étage −" + i + " actif", px, y + 15);
    }
    ctx.restore();
  }

  // v27 : éclairage dynamique — halos de lampes la nuit, rayons de soleil le jour
  const LIGHT_SPOTS = {
    desert: [[0.18, 0.62, 0.16], [0.85, 0.64, 0.14]],
    desert2: [[0.5, 0.6, 0.2]],
    station: [[0.5, 0.58, 0.22]],
    ranch: [[0.25, 0.6, 0.16], [0.78, 0.62, 0.14]],
    default: [[0.22, 0.6, 0.16], [0.62, 0.58, 0.18], [0.88, 0.63, 0.13]],
  };
  function drawLighting(w, h, t, night) {
    const def = sceneDef();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (night) {
      const spots = LIGHT_SPOTS[def.kind] || LIGHT_SPOTS.default;
      for (const sp of spots) {
        const x = w * sp[0];
        const y = h * sp[1];
        const r = w * sp[2] * (1 + 0.04 * Math.sin(t * 1.7 + x));
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(255, 200, 110, 0.20)");
        g.addColorStop(1, "rgba(255, 200, 110, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    } else {
      const g = ctx.createLinearGradient(w * 0.7, 0, w * 0.2, h);
      g.addColorStop(0, "rgba(255, 240, 200, 0.10)");
      g.addColorStop(1, "rgba(255, 240, 200, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  // v51 : profondeur de champ simulée sur les plans poitrine — voile radial doux
  // derrière les persos (zéro blur : perf mobile préservée), intensité lissée 8%/frame
  function drawDofVeil(w, h) {
    if (!evCine || !evCine.shots) { dofCur += (0 - dofCur) * 0.08; return; }
    const shot = evCine.shots[evCine.idx] || 0;
    dofCur += ((shot === 2 ? 1 : 0) - dofCur) * 0.08;
    if (dofCur < 0.01) return;
    const fx = eventVisitor ? eventVisitor.x : w / 2;
    const fy = eventVisitor ? eventVisitor.y : h * 0.62;
    const g = ctx.createRadialGradient(fx, fy, Math.min(w, h) * 0.16, fx, fy, Math.max(w, h) * 0.62);
    g.addColorStop(0, "rgba(8, 10, 6, 0)");
    g.addColorStop(1, "rgba(8, 10, 6, " + (0.34 * dofCur).toFixed(3) + ")");
    ctx.fillStyle = g;
    ctx.fillRect(-w * 0.25, -h * 0.25, w * 1.5, h * 1.5);
  }

  function draw() {
    if (!canvas || !ctx || !currentLocId) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) {
      rafId = requestAnimationFrame(draw);
      return;
    }
    const def = sceneDef();
    const t = anim / 1000;
    const phase = timePhase();
    const night = def.night || phase === "night";

    // v34 : caméra de cinématique — léger zoom + pan vers le visiteur
    let camK = 1, camX = w / 2, camY = h * 0.55;
    if (evCine) {
      // v47 : plans de caméra alternés — zoom et pan dépendent de la réplique
      const cAge = anim - evCine.start;
      const cK = 1 - Math.pow(1 - Math.min(1, cAge / 900), 3);
      const shot = evCine.shots ? (evCine.shots[evCine.idx] || 0) : 1;
      const zk = shot === 2 ? 0.16 : shot === 1 ? 0.07 : 0.01;
      const pk = shot === 2 ? 0.55 : 0.35;
      const ty = h * 0.55 - h * (shot === 2 ? 0.06 : 0.03) * cK;
      if (camXCur === null) camXCur = w / 2;
      camKCur += (1 + zk * cK - camKCur) * 0.08; // transition douce entre les plans
      camXCur += ((w / 2 + ((eventVisitor ? eventVisitor.x : w / 2) - w / 2) * pk * cK) - camXCur) * 0.08;
      camK = camKCur;
      camX = camXCur;
      camY = camY + (ty - camY) * 0.08;
    } else if (camKCur !== 1 || (camXCur !== null && Math.abs(camXCur - w / 2) > 0.5)) {
      // v47 : retour doux au cadre neutre après la cinématique
      camKCur += (1 - camKCur) * 0.08;
      if (camXCur === null) camXCur = w / 2;
      camXCur += (w / 2 - camXCur) * 0.08;
      camK = camKCur;
      camX = camXCur;
    }
    ctx.save();
    ctx.translate(w / 2, camY);
    ctx.scale(camK, camK);
    ctx.translate(-camX, -camY);
    if (cineShake > 0) { // v46 : secousse dramatique
      const sh = cineShake * 6;
      ctx.translate(Math.sin(anim * 0.09) * sh, Math.cos(anim * 0.113) * sh * 0.6);
      ctx.rotate(Math.sin(anim * 0.09) * 0.004 * cineShake); // v47 : roulis
      cineShake = Math.max(0, cineShake - 0.025);
    }

    drawSky(w, h, night, t);
    if (!night) {
      drawClouds(w, h, night);
      drawBirds(w, h, t);
    }
    const wet = OUTDOOR_KINDS.has(def.kind) && weather !== "clear";
    if (wet) drawStormClouds(w, h, t);

    const painter = PAINTERS[def.kind] || PAINTERS.desert;
    if (OUTDOOR_KINDS.has(def.kind)) drawDistantHills(w, h, night);
    painter(w, h, t);
    const extra = EXTRAS[def.kind];
    if (extra) extra(w, h, t, night);
    drawGroundTexture(w, h, h * 0.64, night ? "rgba(255,255,255,0.05)" : "rgba(40, 26, 10, 0.1)");
    if (!night && OUTDOOR_KINDS.has(def.kind)) drawCloudShadows(w, h, t); // v42 : ombres de nuages
    drawPuddles(w, h, t); // v41 : flaques
    drawProps(w, h, t, night); // v39 : détails de décor
    drawFauna(w, h, t, night); // v40 : faune de fond
    drawLighting(w, h, t, night);
    drawDofVeil(w, h); // v51 : profondeur de champ sur les plans poitrine

    if (def.kind === "desert" || def.kind === "desert2") drawTumbleweed(w, h, t);

    drawCharRow(w, h, def.chars, CHAR_SPOTS[def.kind]);
    drawEventVisitor(w, h, t, def);
    updateBubble(t, def.chars);
    drawBubble();
    drawForeground(w, h, def.kind, night);

    const biz = bizForLoc(currentLocId);
    if (biz && levelOf(biz.id) > 0) {
      drawBills(w, h, biz, t);
      drawBizBadge(w, h, biz, t);
    }

    if (currentLocId === "superlab" && typeof state !== "undefined" && (state.labFloors || 0) > 0) {
      drawFloorsPanel(w, h, t);
    }

    drawSparks(t);
    drawFloaters();
    if (wet) { updateRain(w, h); drawRain(w, h); }
    updateStorm(w, h);
    if (night && OUTDOOR_KINDS.has(def.kind)) drawFireflies(w, h, t);
    if (OUTDOOR_KINDS.has(def.kind)) { // v42 : saisons
      ensureWeatherParticles();
      const sd = season();
      if (sd === "winter") { updateSnow(); drawSnow(w, h); }
      else if (sd === "autumn") { updateLeaves(); drawLeaves(w, h); }
    }
    if (!night && OUTDOOR_KINDS.has(def.kind)) drawDust(w, h, t);
    updateShootingStar(w, h, night);
    drawShootingStar();
    if (phase === "dawn") drawMist(w, h, t);
    if (!def.night) applyPhaseTint(w, h, phase);
    if (OUTDOOR_KINDS.has(def.kind)) drawSeasonTint(w, h); // v42 : teinte de saison
    drawFlash(w, h);
    drawEventAura(w, h, t);
    drawEventBanner(w, h, t);
    drawVignette(w, h, night);
    ctx.restore(); // v34 : fin de la caméra — l'UI reste en plein écran
    if (evFlash > 0.02) {
      ctx.fillStyle = "rgba(255, 235, 210, " + (evFlash * 0.45).toFixed(3) + ")";
      ctx.fillRect(0, 0, w, h);
      evFlash *= 0.88;
    }
    drawCine(w, h, t);

    anim += 16;
    // v27 : DPR adaptatif — si le fps chute, on réduit la résolution
    fpsFrames += 1;
    const fpsNow = performance.now();
    if (!fpsLast) fpsLast = fpsNow;
    if (fpsNow - fpsLast >= 2000) {
      const fps = (fpsFrames * 1000) / (fpsNow - fpsLast);
      fpsFrames = 0;
      fpsLast = fpsNow;
      if (fps < 45 && DPR_CAP > 1) {
        DPR_CAP = Math.max(1, DPR_CAP - 0.5);
        resize();
      }
    }
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

  // ---------- bottom-sheet ----------

  function buildSheet() {
    const loc = loc();
    if (!loc) return;
    const emojiEl = document.getElementById("locsheet-emoji");
    const titleEl = document.getElementById("locsheet-title");
    const descEl = document.getElementById("locsheet-desc");
    const apEl = document.getElementById("locsheet-ap");
    const actionsEl = document.getElementById("locsheet-actions");
    if (!actionsEl) return;

    if (emojiEl) emojiEl.textContent = loc.emoji || "📍";
    if (titleEl) titleEl.textContent = loc.name || "";
    if (descEl) descEl.textContent = loc.desc || "";
    if (apEl) apEl.textContent = (typeof state !== "undefined" ? "⚡ " + state.ap + " PA" : "");

    const used = (it) => state.visitedToday && state.visitedToday[loc.id + ":" + it.id];
    const buttons = [];

    const ev = sceneEventFor(loc.id);
    if (ev) {
      buttons.push({
        label: "❗ " + ev.emoji + " " + ev.title + " — régler ça !",
        apply: () => { triggerSceneEvent(); buildSheet(); },
      });
    }

    const biz = bizForLoc(loc.id);
    if (biz) {
      const lvl = levelOf(biz.id);
      const pooled = pooledOf(biz.id);
      const label = lvl > 0
        ? "💼 Gérer l'affaire" + (pooled >= 1 ? " — collecter (" + (typeof fmtMoney === "function" ? fmtMoney(pooled) : pooled + "$") + ")" : " (niveau " + lvl + ")")
        : "🚧 Ouvrir l'affaire — " + (typeof bizDef === "function" && bizDef(biz.id) ? "démarrer l'activité" : "investir");
      buttons.push({ label, apply: () => { if (typeof showBusinessModal === "function") showBusinessModal(biz.id); } });
    }

    if (typeof activatePubBoost === "function") {
      const active = typeof pubBoostActive === "function" && pubBoostActive();
      const cd = (typeof pubCdRemaining === "function") ? pubCdRemaining() : 0;
      const label = active
        ? "📣 Coup de pub ×4 — ACTIF !"
        : (cd > 0 ? "📣 Coup de pub ×4 — dispo dans " + Math.ceil(cd / 60000) + " min" : "📣 Coup de pub ×4 (60 s)");
      buttons.push({
        label,
        disabled: active || cd > 0,
        apply: () => { activatePubBoost(); buildSheet(); },
      });
    }

    // v49 : accès direct au labo depuis les lieux de cuisson (RV = camping car)
    if ((loc.id === "rv" || loc.id === "superlab") && typeof closeLocScene === "function") {
      const labTab = document.querySelector('#bottom-nav button[data-tab="base"]');
      if (labTab) {
        buttons.push({
          label: "🔬 Ouvrir le labo — production, équipement, améliorations",
          apply: () => { closeLocScene(); labTab.click(); },
        });
      }
    }

    // v28 : mini-jeux par lieu
    if (typeof window.openMinigame === "function") {
      if (loc.id === "rv" || loc.id === "superlab") {
        const mgDone = state.mgCookDay === state.day;
        buttons.push({
          label: mgDone ? "⚗️ Cuisson de précision — réussi aujourd'hui ✔" : "⚗️ Mini-jeu : Cuisson de précision (pureté + bonus)",
          disabled: mgDone,
          apply: () => { window.openMinigame("cook"); },
        });
      }
      if (loc.id === "tuco") {
        const mgDone = state.mgTucoDay === state.day;
        buttons.push({
          label: mgDone ? "🤝 Négociation avec Tuco — déjà tentée aujourd'hui ✔" : "🤝 Mini-jeu : Négocier avec Tuco (gros pactole)",
          disabled: mgDone,
          apply: () => { window.openMinigame("tuco"); },
        });
      }
      if (loc.id === "corner") {
        const mgDone = state.mgSellDay === state.day;
        buttons.push({
          label: mgDone ? "🥫 Vente express — terminée aujourd'hui ✔" : "🥫 Mini-jeu : Vente express (argent sale)",
          disabled: mgDone,
          apply: () => { window.openMinigame("sell"); },
        });
      }
    }

    // v23 : étages du Superlab
    if (loc.id === "superlab" && typeof buyLabFloor === "function" && typeof labFloorCost === "function") {
      const fl = (typeof state.labFloors === "number") ? state.labFloors : 0;
      if (fl < 3) {
        const cost = labFloorCost(fl);
        const costTxt = (typeof fmt === "function") ? fmt(cost) : String(cost);
        buttons.push({
          label: "🏗️ Creuser le sous-sol −" + (fl + 1) + " (" + costTxt + "$) — +25% cuisson, +10% affaires",
          disabled: state.cash < cost,
          apply: () => { buyLabFloor(); buildSheet(); },
        });
      } else {
        buttons.push({ label: "🏗️ Tous les sous-sols sont creusés ✔", disabled: true, apply: () => {} });
      }
    }

    for (const it of loc.interactions || []) {
      if (it.cond && !it.cond(state)) continue;
      const done = used(it);
      const label = it.icon + " " + it.label + (it.apCost ? " (" + it.apCost + " PA)" : " (gratuit)") + (done ? " ✔" : "");
      buttons.push({
        label,
        disabled: done || state.ap < (it.apCost || 0),
        apply: () => {
          if (typeof runInteraction === "function") runInteraction(loc, it);
          buildSheet();
        },
      });
    }

    actionsEl.innerHTML = "";
    buttons.forEach((b) => {
      const el = document.createElement("button");
      el.className = "loc-btn" + (b.disabled ? " done" : "");
      el.textContent = b.label;
      el.addEventListener("click", () => {
        if (b.disabled) {
          if (typeof haptic === "function") haptic(8);
          return;
        }
        b.apply();
      });
      actionsEl.appendChild(el);
    });
  }

  function refreshLocScene() {
    buildSheet();
  }

  // ---------- ouverture / fermeture ----------

  function openLocScene(locId) {
    const target = (typeof MAP_LOCATIONS !== "undefined") ? MAP_LOCATIONS.find((l) => l.id === locId) : null;
    if (!target) return false;
    if (target.unlock && !target.unlock(state)) {
      if (typeof spawnPopup === "function") spawnPopup("🔒 Lieu verrouillé", "info");
      return true;
    }
    try {
      currentLocId = locId;
      bills = [];
      sparks = [];
      floaters = [];
      bubble = null;
      nextBubbleAt = 3000;
      anim = 0;
      rollWeather();
      try {
        if (typeof sfx !== "undefined" && sfx && sfx.ambient) {
          const d = sceneDef();
          sfx.ambient.start((d && d.kind) || "default", weather && weather !== "clear");
        }
      } catch (e) { /* pas d'audio */ }
      const overlay = document.getElementById("locscene");
      canvas = document.getElementById("locscene-canvas");
      if (!overlay || !canvas) throw new Error("overlay manquant");
      ctx = canvas.getContext("2d");
      overlay.classList.remove("hidden");
      requestAnimationFrame(() => {
        resize();
        buildSheet();
      });
      if (!rafId) rafId = requestAnimationFrame(draw);
      if (typeof window !== "undefined") window.heisLocSceneOpen = true;
      return true;
    } catch (e) {
      currentLocId = null;
      if (typeof visitLocation === "function") visitLocation(locId);
      return true;
    }
  }

  function closeLocScene() {
    evCine = null;
    try { if (typeof sfx !== "undefined" && sfx && sfx.ambient) sfx.ambient.stop(); } catch (e) {}
    currentLocId = null;
    const overlay = document.getElementById("locscene");
    if (overlay) overlay.classList.add("hidden");
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (typeof window !== "undefined") window.heisLocSceneOpen = false;
  }

  function onTap(e) {
    if (!currentLocId) return;
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;

    // v31 : cinématique — révéler la ligne ou avancer
    if (evCine) {
      const line = evCine.lines[evCine.idx];
      const shown = (!line || evCine.reveal) ? (line ? line.text.length : 0) : Math.min(line.text.length, Math.floor((anim - evCine.lineStart) / 26));
      if (line && shown < line.text.length) {
        evCine.reveal = true;
      } else {
        evCine.idx += 1;
        evCine.lineStart = anim;
        evCine.reveal = false;
        if (evCine.idx >= evCine.lines.length) { cineFinish(); return; }
      }
      if (typeof haptic === "function") haptic(8);
      return;
    }

    if (eventVisitor && Math.hypot(eventVisitor.x - mx, eventVisitor.y - 44 * eventVisitor.s - my) < 38 * eventVisitor.s) {
      triggerSceneEvent();
      return;
    }

    const hitChar = charScreens.find((cs) => Math.hypot(cs.x - mx, cs.y - 44 * cs.s - my) < 34 * cs.s);
    if (hitChar && typeof QUOTES !== "undefined" && QUOTES[hitChar.id]) {
      const lines = QUOTES[hitChar.id];
      bubble = { id: hitChar.id, text: lines[Math.floor(Math.random() * lines.length)], until: anim + 3000 };
      charMood = { id: hitChar.id, mood: "happy" };
      charMoodUntil = anim + 2600;
      if (typeof haptic === "function") haptic(10);
      for (let i = 0; i < 5; i++) {
        sparks.push({ x: mx, y: my, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 80, life: 0.4 });
      }
      return;
    }

    // v41 : effrayer la faune au tap
    if (tryScareFauna(mx, my, canvas.clientWidth, canvas.clientHeight)) {
      if (typeof haptic === "function") haptic(8);
      return;
    }

    const biz = bizForLoc(currentLocId);
    if (!biz || levelOf(biz.id) <= 0) {
      if (typeof haptic === "function") haptic(8);
      return;
    }
    const pooled = pooledOf(biz.id);
    if (pooled >= 1 && typeof collectBusiness === "function") {
      collectBusiness(biz.id);
      buildSheet();
      for (let i = 0; i < 10; i++) {
        sparks.push({
          x: mx, y: my,
          vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 120,
          life: 0.5 + Math.random() * 0.3,
        });
      }
      return;
    }
    if (typeof bizRevPerSec === "function" && bizRevPerSec(biz.id) > 0) {
      const gain = Math.max(5, Math.round(bizRevPerSec(biz.id) * 2));
      state.dirty += gain;
      floaters.push({ x: mx, y: my, txt: "+" + (typeof fmtMoney === "function" ? fmtMoney(gain) : gain + "$"), life: 0.9 });
      if (typeof haptic === "function") haptic(6);
      if (typeof playSfx === "function") playSfx("click");
    }
  }

  function init() {
    const overlay = document.getElementById("locscene");
    if (!overlay) return;
    canvas = document.getElementById("locscene-canvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    if (!ctx) return;

    window.addEventListener("resize", () => {
      if (currentLocId) resize();
    });

    // v27 : pause du canvas quand l'app passe en arrière-plan (batterie)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        try { if (typeof sfx !== "undefined" && sfx && sfx.ambient) sfx.ambient.stop(); } catch (e) {}
      } else if (!rafId && currentLocId) {
        rafId = requestAnimationFrame(draw);
      }
    });

    canvas.addEventListener("pointerdown", onTap);

    const closeBtn = document.getElementById("locscene-close");
    if (closeBtn) closeBtn.addEventListener("click", closeLocScene);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.heisTimePhase = timePhase;
  window.openLocScene = openLocScene;
  window.closeLocScene = closeLocScene;
  window.refreshLocScene = refreshLocScene;
})();
