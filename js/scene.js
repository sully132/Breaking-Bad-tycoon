// ============================================================
// HEISENBERG TYCOON — Scène animée (v8, style jeu Android)
// Parallaxe complète : ciel jour/nuit/crépuscule, étoiles
// filantes, oiseaux, skyline, voitures, tumbleweed, équipe
// animée près du labo, ripples de tap, FX de cuisson/vente.
// ============================================================

const scene = (() => {
  let canvas, ctx, W = 800, H = 260, dpr = 1;
  let smoke = [];
  let crystals = [];
  let bills = [];
  let stars = [];
  let shooting = [];   // étoiles filantes {x,y,vx,vy,life}
  let birds = [];      // oiseaux {x,y,vx,flap}
  let cars = [];       // voitures {x,dir,speed,color,y}
  let tumbleweed = { x: -30, y: 0, rot: 0, speed: 0.6 };
  let ripples = [];    // effets de tap {x,y,r,life}
  let golden = null;

  const FX = { cook: 0, sell: 0, launder: 0 };
  const CYCLE_MS = 60_000;

  function init() {
    canvas = document.getElementById("game-canvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    if (!ctx) return;
    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", onPointerDown);
    for (let i = 0; i < 70; i++) {
      stars.push({ x: Math.random(), y: Math.random() * 0.55, r: Math.random() * 1.4 + 0.4, phase: Math.random() * Math.PI * 2 });
    }
    cars = [
      { x: Math.random() * W, dir: 1, speed: 0.5 + Math.random() * 0.4, color: "#c94f3d", lane: 0 },
      { x: Math.random() * W, dir: -1, speed: 0.45 + Math.random() * 0.4, color: "#4e7a8a", lane: 1 },
      { x: Math.random() * W, dir: 1, speed: 0.35 + Math.random() * 0.3, color: "#d9c33c", lane: 0 },
    ];
    for (let i = 0; i < 3; i++) {
      birds.push({ x: Math.random() * W, y: H * (0.12 + Math.random() * 0.2), vx: 0.3 + Math.random() * 0.3, flap: Math.random() * Math.PI * 2 });
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
    ripples.push({ x: x * W, y: y * H, r: 4, life: 1 });
    if (ripples.length > 6) ripples.shift();
    for (let i = 0; i < 5; i++) {
      crystals.push({
        x: x * W + (Math.random() - 0.5) * 30,
        y: y * H + (Math.random() - 0.5) * 20,
        vy: -(1 + Math.random() * 2),
        r: 2 + Math.random() * 2.5,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 0.8,
      });
    }
    if (golden) {
      const px = x * W;
      const py = y * H;
      if (Math.hypot(px - golden.x, py - golden.y) < 34) {
        golden = null;
        if (typeof goldenCollect === "function") goldenCollect();
        else if (typeof tapBoost === "function") tapBoost(x, y);
        return;
      }
    }
    if (typeof tapBoost === "function") tapBoost(x, y);
  }

  function spawnGolden() {
    if (golden) return;
    golden = {
      x: W * (0.12 + Math.random() * 0.76),
      y: H * (0.2 + Math.random() * 0.5),
      born: performance.now(),
      ttl: 12_000,
    };
  }

  function frenzy() {
    try {
      return typeof frenzyActive === "function" && frenzyActive();
    } catch (e) {
      return false;
    }
  }

  function labLevel() {
    return (typeof state !== "undefined" && state && !state.gameOver) ? state.labLevel : 0;
  }

  function heat() {
    return (typeof state !== "undefined" && state) ? state.heat : 0;
  }

  function dayFactor(t) {
    const phase = (t % CYCLE_MS) / CYCLE_MS;
    return 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
  }

  function lerpColor(a, b, f) {
    const c = (i) => Math.round(a[i] + (b[i] - a[i]) * f);
    return `rgb(${c(0)},${c(1)},${c(2)})`;
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

  // ---------- Ciel & ambiance ----------
  function drawSky(f) {
    const sunset = Math.max(0, 1 - Math.abs(f - 0.22) * 6) + Math.max(0, 1 - Math.abs(f - 0.78) * 6);
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.78);
    g.addColorStop(0, lerpColor([10, 14, 38], [74, 150, 216], f));
    g.addColorStop(0.62, lerpColor([24, 30, 60], [210, 190, 150], f));
    g.addColorStop(1, lerpColor([36, 40, 70], [244, 213, 141], f));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (sunset > 0.02) {
      const sg = ctx.createLinearGradient(0, H * 0.3, 0, H * 0.78);
      sg.addColorStop(0, "rgba(255,120,50,0)");
      sg.addColorStop(1, `rgba(255,110,40,${0.28 * Math.min(1, sunset)})`);
      ctx.fillStyle = sg;
      ctx.fillRect(0, H * 0.3, W, H * 0.48);
    }
  }

  function drawStars(f, t) {
    const alpha = Math.max(0, 1 - f * 2.2);
    if (alpha <= 0) return;
    ctx.fillStyle = "#fff";
    for (const s of stars) {
      ctx.globalAlpha = alpha * (0.4 + 0.6 * Math.abs(Math.sin(t / 640 + s.phase)));
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (Math.random() < 0.004 * alpha && shooting.length < 2) {
      shooting.push({ x: W * (0.3 + Math.random() * 0.6), y: H * (0.05 + Math.random() * 0.2), vx: -(4 + Math.random() * 3), vy: 2 + Math.random() * 1.5, life: 1 });
    }
    for (let i = shooting.length - 1; i >= 0; i--) {
      const s = shooting[i];
      s.x += s.vx; s.y += s.vy; s.life -= 0.03;
      if (s.life <= 0) { shooting.splice(i, 1); continue; }
      ctx.globalAlpha = s.life * alpha;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 5, s.y - s.vy * 5);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawSunMoon(f) {
    const x = W * (0.15 + 0.7 * (1 - Math.abs(f - 0.5) * 2));
    const y = H * 0.62 - f * H * 0.45;
    if (f > 0.25) {
      ctx.save();
      const glow = ctx.createRadialGradient(x, y, 4, x, y, 60);
      glow.addColorStop(0, "rgba(255,225,130,0.75)");
      glow.addColorStop(1, "rgba(255,225,130,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - 70, y - 70, 140, 140);
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

  function drawClouds(f) {
    const t = performance.now();
    const alpha = 0.25 + f * 0.3;
    const defs = [
      { x: ((t / 240) % (W + 220)) - 110, y: H * 0.14, s: 1 },
      { x: ((t / 340 + W * 0.5) % (W + 220)) - 110, y: H * 0.24, s: 0.7 },
      { x: ((t / 300 + W * 0.85) % (W + 220)) - 110, y: H * 0.08, s: 0.85 },
    ];
    ctx.fillStyle = `rgba(255,250,235,${alpha})`;
    for (const c of defs) {
      const r = 16 * c.s;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.arc(c.x + r * 0.9, c.y + r * 0.2, r * 0.75, 0, Math.PI * 2);
      ctx.arc(c.x - r * 0.9, c.y + r * 0.25, r * 0.65, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBirds(f) {
    if (f < 0.2) return;
    ctx.strokeStyle = `rgba(40,40,50,${0.5 * Math.min(1, f * 2)})`;
    ctx.lineWidth = 1.6;
    for (const b of birds) {
      b.x -= b.vx;
      b.flap += 0.18;
      if (b.x < -20) { b.x = W + 20; b.y = H * (0.1 + Math.random() * 0.25); }
      const wing = Math.sin(b.flap) * 4;
      ctx.beginPath();
      ctx.moveTo(b.x - 6, b.y - wing);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(b.x + 6, b.y - wing);
      ctx.stroke();
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
    ctx.fillStyle = `rgba(240,244,248,${0.14 + f * 0.2})`;
    for (const [px, py, w2] of [[0.12, 0.5, 0.05], [0.4, 0.46, 0.06], [0.72, 0.52, 0.045]]) {
      ctx.beginPath();
      ctx.moveTo(W * px, H * py);
      ctx.lineTo(W * (px + w2), H * (py + 0.09));
      ctx.lineTo(W * (px - w2), H * (py + 0.09));
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawSkyline(f, t) {
    const base = H * 0.72;
    const col = lerpColor([22, 26, 40], [126, 122, 128], f);
    ctx.fillStyle = col;
    const bl = [
      [0.02, 0.1], [0.06, 0.16], [0.1, 0.08], [0.15, 0.13], [0.2, 0.07],
      [0.78, 0.12], [0.83, 0.07], [0.88, 0.15], [0.93, 0.09], [0.97, 0.13],
    ];
    for (const [bx, bh] of bl) {
      ctx.fillRect(W * bx, base - H * bh, W * 0.035, H * bh);
    }
    const lit = f < 0.35;
    if (lit) {
      ctx.fillStyle = "rgba(255,225,140,0.75)";
      let seed = 7;
      for (const [bx, bh] of bl) {
        for (let wy = base - H * bh + 6; wy < base - 6; wy += 9) {
          for (let wx = 0; wx < 2; wx++) {
            seed = (seed * 16807) % 2147483647;
            if (seed % 3 === 0) ctx.fillRect(W * bx + 4 + wx * 8, wy, 3, 4);
          }
        }
      }
    }
  }

  function drawGround(f) {
    const g = ctx.createLinearGradient(0, H * 0.72, 0, H);
    g.addColorStop(0, lerpColor([70, 62, 48], [214, 178, 122], f));
    g.addColorStop(1, lerpColor([40, 36, 28], [178, 140, 92], f));
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.72, W, H * 0.28);

    ctx.fillStyle = lerpColor([30, 30, 32], [90, 88, 92], f);
    ctx.fillRect(0, H * 0.86, W, H * 0.07);
    ctx.fillStyle = lerpColor([70, 70, 74], [220, 214, 190], f);
    for (let x = ((performance.now() / 60) % 46) - 46; x < W; x += 46) {
      ctx.fillRect(x, H * 0.888, 24, 4);
    }
  }

  function drawCars(f) {
    const roadY = H * 0.895;
    for (const c of cars) {
      c.x += c.speed * c.dir;
      if (c.dir > 0 && c.x > W + 60) c.x = -60;
      if (c.dir < 0 && c.x < -60) c.x = W + 60;
      const y = roadY + (c.lane === 0 ? -7 : 7);
      const dir = c.dir;
      ctx.save();
      ctx.translate(c.x, y);
      ctx.scale(dir, 1);
      ctx.fillStyle = c.color;
      roundRect(-16, -8, 32, 9, 3, true);
      ctx.beginPath();
      ctx.moveTo(-8, -8);
      ctx.lineTo(-4, -14);
      ctx.lineTo(8, -14);
      ctx.lineTo(11, -8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = f < 0.35 ? "rgba(255,230,150,0.95)" : "#bfe3ef";
      ctx.fillRect(-3, -13, 10, 4);
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(-9, 1, 3.4, 0, Math.PI * 2);
      ctx.arc(9, 1, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPoles(f) {
    const col = lerpColor([35, 30, 26], [94, 74, 56], f);
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = 2;
    for (const px of [0.07, 0.31]) {
      const x = W * px;
      ctx.fillRect(x - 2, H * 0.6, 4, H * 0.26);
      ctx.fillRect(x - 12, H * 0.62, 24, 3);
    }
    ctx.beginPath();
    ctx.moveTo(W * 0.07, H * 0.625);
    ctx.quadraticCurveTo(W * 0.19, H * 0.66, W * 0.31, H * 0.625);
    ctx.stroke();
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

  function drawTumbleweed(f) {
    const tw = tumbleweed;
    tw.x += tw.speed;
    tw.rot += 0.06;
    if (tw.x > W + 30) {
      tw.x = -30;
      tw.y = H * (0.8 + Math.random() * 0.05);
      tw.speed = 0.4 + Math.random() * 0.6;
    }
    if (tw.y === 0) tw.y = H * 0.82;
    ctx.save();
    ctx.translate(tw.x, tw.y + Math.sin(tw.x / 14) * 2);
    ctx.rotate(tw.rot);
    ctx.strokeStyle = `rgba(${f < 0.35 ? "90,80,60" : "150,120,70"},0.8)`;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 4, (i * Math.PI) / 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- Personnages ----------
  function figure(x, y, opts, f, t) {
    const o = Object.assign({ shirt: "#3a6b8a", pants: "#2a2a2a", skin: "#e8c39a", hair: "#3a2a1a", hat: null, glasses: false, bald: false, wave: false }, opts);
    const bob = Math.sin(t / 500 + x) * 1.5;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = o.pants;
    ctx.fillRect(-6, -14, 5, 14);
    ctx.fillRect(1, -14, 5, 14);
    ctx.fillStyle = o.shirt;
    ctx.fillRect(-8, -32, 16, 19);
    ctx.fillStyle = o.skin;
    ctx.fillRect(-8, -36, 4, 8);
    ctx.fillRect(4, -36, 4, 8);
    if (o.wave) {
      const wave = Math.sin(t / 220) * 4;
      ctx.fillRect(4, -40 - Math.max(0, wave), 4, 8);
    }
    ctx.beginPath();
    ctx.arc(0, -40, 8, 0, Math.PI * 2);
    ctx.fill();
    if (!o.bald) {
      ctx.fillStyle = o.hair;
      ctx.beginPath();
      ctx.arc(0, -42, 8, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    if (o.hat) {
      ctx.fillStyle = o.hat;
      ctx.fillRect(-11, -47, 22, 4);
      ctx.fillRect(-6, -55, 12, 9);
    }
    if (o.glasses) {
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(-3.4, -40, 3, 0, Math.PI * 2);
      ctx.arc(3.4, -40, 3, 0, Math.PI * 2);
      ctx.moveTo(-0.4, -40);
      ctx.lineTo(0.4, -40);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCrew(f, t) {
    const groundY = H * 0.86;
    const level = labLevel();
    const baseX = W * 0.5 + (level === 0 ? 130 : level === 1 ? 160 : level === 2 ? 240 : 260);
    const hired = (id) => {
      try { return typeof hasStaff === "function" && hasStaff(id); } catch (e) { return false; }
    };
    figure(baseX, groundY, { shirt: "#2a2a2a", pants: "#1a1a1a", bald: true, hat: "#1a1a1a", glasses: true }, f, t);
    let slot = 0;
    const spot = () => baseX + 34 + slot++ * 26;
    if (hired("jesse")) figure(spot(), groundY, { shirt: "#e8c832", pants: "#3a5a8a", hair: "#c8b44a", wave: Math.sin(t / 3000) > 0.7 }, f, t);
    if (hired("mike")) figure(spot(), groundY, { shirt: "#5a5a5a", pants: "#333", hair: "#cfcfcf" }, f, t);
    if (hired("saul")) figure(spot(), groundY, { shirt: "#d94f8a", pants: "#444", bald: true }, f, t);
    if (hired("gus")) figure(spot(), groundY, { shirt: "#e8d44a", pants: "#333", hair: "#222", glasses: false }, f, t);
    if (hired("huell")) figure(spot(), groundY, { shirt: "#7a4a8a", pants: "#222", bald: true }, f, t);
    if (hired("todd")) figure(spot(), groundY, { shirt: "#c8c8b8", pants: "#5a4a3a", hair: "#e8d8a0" }, f, t);
    if (hired("lydia")) figure(spot(), groundY, { shirt: "#3a7a9a", pants: "#223a4a", hair: "#e8c86a" }, f, t);
  }

  // ---------- Bâtiments ----------
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

  // ---------- Particules & FX ----------
  function spawnSmoke(x, y) {
    smoke.push({ x: x + (Math.random() - 0.5) * 10, y, vx: (Math.random() - 0.5) * 0.3, vy: -(0.4 + Math.random() * 0.5), r: 4 + Math.random() * 5, life: 1 });
  }

  function spawnCrystal(x, y) {
    crystals.push({ x: x + (Math.random() - 0.5) * 120, y, vy: -(1.5 + Math.random() * 2), r: 3 + Math.random() * 4, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.2, life: 1 });
  }

  function crystalColor(p) {
    return p.gold ? "#ffd94e" : "#6fd3ff";
  }

  function spawnBill(x, y) {
    bills.push({ x: x + (Math.random() - 0.5) * 160, y, vy: -(1 + Math.random() * 1.5), phase: Math.random() * Math.PI * 2, life: 1 });
  }

  function drawParticles() {
    const now = performance.now();
    const cooking = now - FX.cook < 2500 || (typeof state !== "undefined" && state && state.labLevel >= 3);
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

    if (smoke.length > 80) smoke.splice(0, smoke.length - 80);
    if (crystals.length > 80) crystals.splice(0, crystals.length - 80);
    if (bills.length > 40) bills.splice(0, bills.length - 40);

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
      ctx.fillStyle = crystalColor(p);
      ctx.shadowColor = crystalColor(p);
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

  function drawRipples() {
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += 3.2;
      r.life -= 0.05;
      if (r.life <= 0) { ripples.splice(i, 1); continue; }
      ctx.globalAlpha = r.life * 0.6;
      ctx.strokeStyle = "#d9c33c";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawGolden(t) {
    if (!golden) return;
    const age = t - golden.born;
    if (age > golden.ttl) {
      golden = null;
      return;
    }
    const pulse = 1 + Math.sin(t / 150) * 0.15;
    const fade = age > golden.ttl - 2000 ? (golden.ttl - age) / 2000 : 1;
    const r = 14 * pulse;
    ctx.save();
    ctx.globalAlpha = fade;
    const halo = ctx.createRadialGradient(golden.x, golden.y, 2, golden.x, golden.y, 42 * pulse);
    halo.addColorStop(0, "rgba(255,215,80,0.85)");
    halo.addColorStop(1, "rgba(255,215,80,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(golden.x, golden.y, 42 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(golden.x, golden.y);
    ctx.rotate(Math.sin(t / 400) * 0.3);
    ctx.shadowColor = "#ffd94e";
    ctx.shadowBlur = 18;
    const g = ctx.createLinearGradient(0, -r * 1.6, 0, r * 1.6);
    g.addColorStop(0, "#fff3b0");
    g.addColorStop(0.5, "#ffd94e");
    g.addColorStop(1, "#d9a410");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.6);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r * 1.6);
    ctx.lineTo(-r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,220,0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawFrenzy(t) {
    if (!frenzy()) return;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "rgba(255,200,40,0.10)");
    g.addColorStop(0.5, "rgba(255,140,20,0.06)");
    g.addColorStop(1, "rgba(255,200,40,0.10)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (Math.random() < 0.25) {
      crystals.push({
        x: Math.random() * W,
        y: H * 0.9,
        vy: -(1 + Math.random() * 1.5),
        r: 2 + Math.random() * 3,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.2,
        life: 1,
        gold: true,
      });
    }
  }

  function drawPoliceLights() {
    const h = heat();
    if (h < 70) return;
    const t = performance.now() / 1000;
    const phase = Math.floor(t * 2) % 2;
    const intensity = (h - 70) / 30;
    const color = phase === 0 ? "rgba(255,60,60," : "rgba(70,120,255,";
    const g = ctx.createRadialGradient(W * 0.9, H * 0.2, 10, W * 0.9, H * 0.2, W * 0.5);
    g.addColorStop(0, color + (0.35 * intensity) + ")");
    g.addColorStop(1, color + "0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawVignette() {
    const h = heat();
    if (h < 85) return;
    const intensity = (h - 85) / 15;
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
    drawStars(f, t);
    drawSunMoon(f);
    drawClouds(f);
    drawBirds(f);
    drawMountains(f);
    drawSkyline(f, t);
    drawGround(f);
    drawPoles(f);
    const level = labLevel();
    drawCactus(W * 0.08, H * 0.85, 1, f);
    drawCactus(W * 0.16, H * 0.84, 0.7, f);
    drawCactus(W * 0.9, H * 0.85, 0.9, f);
    drawBuilding(level, f, t);
    drawCrew(f, t);
    drawTumbleweed(f);
    drawCars(f);
    drawParticles();
    drawRipples();
    drawGolden(t);
    drawFrenzy(t);
    drawPoliceLights();
    drawVignette();

    requestAnimationFrame(loop);
  }

  return { init, FX, spawnGolden };
})();

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", scene.init);
}
