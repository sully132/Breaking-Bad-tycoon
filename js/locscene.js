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
  let bubble = null;
  let nextBubbleAt = 3000;
  let charScreens = [];
  const DPR_CAP = 2;

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

  function drawSky(w, h, night, t) {
    if (night) {
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.7);
      g.addColorStop(0, "#0a0e1e");
      g.addColorStop(1, "#1c2438");
      ctx.fillStyle = g;
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.7);
      g.addColorStop(0, "#7ec4e8");
      g.addColorStop(1, "#f2e2b8");
      ctx.fillStyle = g;
    }
    ctx.fillRect(0, 0, w, h);

    if (night) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      let seed = 7;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < 40; i++) {
        const sx = rnd() * w;
        const sy = rnd() * h * 0.45;
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
        ctx.globalAlpha = 0.3 + tw * 0.6;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
      const mx = w * 0.84, my = h * 0.1;
      ctx.fillStyle = "#f4f0dc";
      ctx.beginPath();
      ctx.arc(mx, my, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = sceneDef().night ? "rgba(10,14,30,0.25)" : "rgba(0,0,0,0)";
      ctx.beginPath();
      ctx.arc(mx - 8, my - 4, 18, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const sx = w * 0.86, sy = h * 0.1;
      const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 70);
      glow.addColorStop(0, "rgba(255,240,170,0.9)");
      glow.addColorStop(1, "rgba(255,240,170,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(sx - 80, sy - 80, 160, 160);
      ctx.fillStyle = "#fff3c4";
      ctx.beginPath();
      ctx.arc(sx, sy, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawClouds(w, h, night) {
    ctx.fillStyle = night ? "rgba(200,210,235,0.12)" : "rgba(255,250,235,0.6)";
    const cs = [
      { x: 0.18 + Math.sin(anim / 9000) * 0.03, y: 0.14, s: 1 },
      { x: 0.55 + Math.cos(anim / 12000) * 0.04, y: 0.09, s: 0.7 },
    ];
    for (const c of cs) {
      const cx = c.x * w, cy = c.y * h, r = 18 * c.s;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.arc(cx + r * 0.9, cy + r * 0.2, r * 0.75, 0, Math.PI * 2);
      ctx.arc(cx - r * 0.9, cy + r * 0.25, r * 0.65, 0, Math.PI * 2);
      ctx.fill();
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

  function drawPerson(x, y, s, look) {
    if (!look) return;
    const t = anim / 1000;
    const bob = Math.sin(t * 2 + x * 0.05) * 1.5 * s;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(s, s);

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

    ctx.fillStyle = look.pants || "#3a3a44";
    ctx.fillRect(-7, -16, 5.5, 16);
    ctx.fillRect(1.5, -16, 5.5, 16);
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(-8, -2, 7, 3);
    ctx.fillRect(1, -2, 7, 3);

    ctx.fillStyle = look.shirt || "#4a6a8a";
    rr(-9, -36 + 0, 18, 21, 4);
    ctx.fill();
    ctx.fillStyle = shade(look.shirt || "#4a6a8a", -25);
    ctx.fillRect(-9, -19, 18, 4);
    ctx.fillStyle = look.shirt || "#4a6a8a";
    ctx.fillRect(-13, -34, 4, 15);
    ctx.fillRect(9, -34, 4, 15);
    ctx.fillStyle = "#e8b58a";
    ctx.fillRect(-13, -20, 4, 3);
    ctx.fillRect(9, -20, 4, 3);

    if (look.tie) {
      ctx.fillStyle = "#a02a2a";
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

    ctx.fillStyle = "#e8b58a";
    ctx.beginPath();
    ctx.arc(0, -44, 8.5, 0, Math.PI * 2);
    ctx.fill();

    if (look.beard) {
      ctx.fillStyle = look.beard;
      ctx.beginPath();
      ctx.arc(0, -40, 7, 0, Math.PI);
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

  function drawCharRow(w, h, chars, positions) {
    const looks = (typeof CHAR_LOOKS !== "undefined") ? CHAR_LOOKS : {};
    const ground = h * 0.78;
    const list = chars || [];
    charScreens = [];
    const tw = anim / 1000;
    for (let i = 0; i < list.length; i++) {
      const pos = (positions && positions[i]) || [0.42 + i * 0.14, 1];
      const range = w * 0.022;
      const x = w * pos[0] + Math.sin(tw * 0.4 + i * 2.3) * range;
      const sc = 1.5 * (pos[1] || 1);
      drawPerson(x, ground, sc, looks[list[i]]);
      charScreens.push({ id: list[i], x, y: ground, s: sc });
    }
  }

  function updateBubble(t, chars) {
    if (typeof QUOTES === "undefined") return;
    if (bubble && anim > bubble.until) {
      bubble = null;
      nextBubbleAt = anim + 4500 + Math.random() * 4500;
      return;
    }
    if (!bubble && anim > nextBubbleAt && chars && chars.length) {
      const id = chars[Math.floor(Math.random() * chars.length)];
      const lines = QUOTES[id];
      if (lines && lines.length) {
        bubble = { id, text: lines[Math.floor(Math.random() * lines.length)], until: anim + 3000 };
      } else {
        nextBubbleAt = anim + 5000;
      }
    }
  }

  function drawBubble() {
    if (!bubble) return;
    const c = charScreens.find((cs) => cs.id === bubble.id);
    if (!c) return;
    const bx = c.x;
    const by = c.y - 66 * c.s - 26;
    ctx.font = "bold 12px sans-serif";
    const tw = Math.min(230, ctx.measureText(bubble.text).width + 20);
    const bh = 26;
    const x0 = Math.max(6, Math.min(canvas.clientWidth - tw - 6, bx - tw / 2));
    ctx.save();
    ctx.globalAlpha = 0.94;
    ctx.fillStyle = "#fffdf4";
    rr(x0, by - bh, tw, bh, 9);
    ctx.fill();
    ctx.strokeStyle = "#4e7a2a";
    ctx.lineWidth = 1.5;
    rr(x0, by - bh, tw, bh, 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx - 5, by);
    ctx.lineTo(bx + 5, by);
    ctx.lineTo(bx, by + 7);
    ctx.closePath();
    ctx.fillStyle = "#fffdf4";
    ctx.fill();
    ctx.fillStyle = "#1c2b14";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(bubble.text, x0 + tw / 2, by - bh / 2);
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

  function drawVignette(w, h, night) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, night ? "rgba(0,0,0,0.4)" : "rgba(20,16,8,0.22)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

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
    const night = def.night;

    drawSky(w, h, night, t);
    if (!night) {
      drawClouds(w, h, night);
      drawBirds(w, h, t);
    }

    const painter = PAINTERS[def.kind] || PAINTERS.desert;
    painter(w, h, t);

    if (def.kind === "desert" || def.kind === "desert2") drawTumbleweed(w, h, t);

    drawCharRow(w, h, def.chars, CHAR_SPOTS[def.kind]);
    updateBubble(t, def.chars);
    drawBubble();

    const biz = bizForLoc(currentLocId);
    if (biz && levelOf(biz.id) > 0) {
      drawBills(w, h, biz, t);
      drawBizBadge(w, h, biz, t);
    }

    drawSparks(t);
    drawFloaters();
    drawVignette(w, h, night);

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

    const hitChar = charScreens.find((cs) => Math.hypot(cs.x - mx, cs.y - 44 * cs.s - my) < 34 * cs.s);
    if (hitChar && typeof QUOTES !== "undefined" && QUOTES[hitChar.id]) {
      const lines = QUOTES[hitChar.id];
      bubble = { id: hitChar.id, text: lines[Math.floor(Math.random() * lines.length)], until: anim + 3000 };
      if (typeof haptic === "function") haptic(10);
      for (let i = 0; i < 5; i++) {
        sparks.push({ x: mx, y: my, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 80, life: 0.4 });
      }
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

    canvas.addEventListener("pointerdown", onTap);

    const closeBtn = document.getElementById("locscene-close");
    if (closeBtn) closeBtn.addEventListener("click", closeLocScene);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.openLocScene = openLocScene;
  window.closeLocScene = closeLocScene;
  window.refreshLocScene = refreshLocScene;
})();
