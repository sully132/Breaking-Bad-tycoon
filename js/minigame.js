// ============================================================
// v28 — MINI-JEUX PAR LIEU
//  - Cuisson de précision (RV / Superlab) : timing sur 3 manches
//  - Négociation avec Tuco (scène Tuco) : jauge de tempérament
// ============================================================
(function () {
  "use strict";

  let overlay = null, canvas = null, ctx = null, btn = null, statusEl = null;
  let titleEl = null, subEl = null, emojiEl = null;
  let rafId = 0, mg = null, last = 0;

  function $(id) { return document.getElementById(id); }

  function ensureDom() {
    if (overlay) return true;
    overlay = $("mg-overlay");
    if (!overlay) return false;
    canvas = $("mg-canvas");
    ctx = canvas ? canvas.getContext("2d") : null;
    btn = $("mg-btn");
    statusEl = $("mg-status");
    titleEl = $("mg-title");
    subEl = $("mg-sub");
    emojiEl = $("mg-emoji");
    if (btn) btn.addEventListener("click", onBtn);
    const close = $("mg-close");
    if (close) close.addEventListener("click", closeMinigame);
    return true;
  }

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 150;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function openMinigame(kind) {
    if (!ensureDom() || !ctx) return;
    if (typeof state === "undefined") return;
    if (kind === "cook") mg = newCook();
    else if (kind === "tuco") mg = newTuco();
    else return;
    if (!mg) return;
    if (titleEl) titleEl.textContent = mg.title;
    if (subEl) subEl.textContent = mg.sub;
    if (emojiEl) emojiEl.textContent = mg.emoji;
    if (statusEl) statusEl.textContent = mg.status();
    if (btn) { btn.textContent = mg.btnLabel(); btn.disabled = false; }
    overlay.classList.remove("hidden");
    resizeCanvas();
    last = 0;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function closeMinigame() {
    if (overlay) overlay.classList.add("hidden");
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    mg = null;
  }

  function loop(ts) {
    if (!mg || !overlay || overlay.classList.contains("hidden")) { rafId = 0; return; }
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
    last = ts;
    mg.update(dt);
    mg.draw(ctx, canvas.clientWidth, canvas.clientHeight, ts / 1000);
    rafId = requestAnimationFrame(loop);
  }

  function onBtn() {
    if (!mg) return;
    mg.tap();
    if (statusEl) statusEl.textContent = mg.status();
    if (btn) { btn.textContent = mg.btnLabel(); btn.disabled = mg.finished; }
  }

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // ---------- Mini-jeu 1 : Cuisson de précision ----------
  function newCook() {
    const rounds = [
      { zone: 0.30, speed: 1.15 },
      { zone: 0.22, speed: 1.5 },
      { zone: 0.15, speed: 1.9 },
    ];
    const centers = [0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.4];
    let ri = 0, pos = 0, dir = 1, results = [], finished = false, flash = 0, lastResult = "";

    function gradeText() {
      const score = results.reduce((a, b) => a + b, 0);
      return score >= 6 ? "Grade S — pur comme Heisenberg" :
             score >= 4 ? "Grade A — beau boulot" :
             score >= 2 ? "Grade B — correct" : "Grade C — ça ira quand même";
    }

    const g = {
      title: "Cuisson de précision",
      sub: "Arrête le curseur dans la zone verte — 3 manches",
      emoji: "⚗️",
      finished: false,
      update(dt) {
        if (finished) { flash *= 0.92; return; }
        const r = rounds[ri];
        pos += dir * r.speed * dt;
        if (pos > 1) { pos = 1; dir = -1; }
        if (pos < 0) { pos = 0; dir = 1; }
        if (flash > 0) flash *= 0.9;
      },
      draw(c, w, h, t) {
        c.clearRect(0, 0, w, h);
        const barY = h * 0.40, barH = 26, mx = 14, bw = w - mx * 2;
        c.fillStyle = "#141a0c";
        rr(c, mx, barY, bw, barH, 8); c.fill();
        c.strokeStyle = "#3a4a22"; c.lineWidth = 2;
        rr(c, mx, barY, bw, barH, 8); c.stroke();
        c.strokeStyle = "rgba(255,255,255,0.08)";
        for (let i = 1; i < 10; i++) {
          const gx = mx + (bw * i) / 10;
          c.beginPath(); c.moveTo(gx, barY + 4); c.lineTo(gx, barY + barH - 4); c.stroke();
        }
        const r = rounds[Math.min(ri, rounds.length - 1)];
        const cz = centers[Math.min(ri, centers.length - 1)];
        if (!finished) {
          const zx = mx + bw * (cz - r.zone / 2), zw = bw * r.zone;
          const zg = c.createLinearGradient(zx, 0, zx + zw, 0);
          zg.addColorStop(0, "rgba(122,182,72,0.35)");
          zg.addColorStop(0.5, "rgba(122,182,72,0.75)");
          zg.addColorStop(1, "rgba(122,182,72,0.35)");
          c.fillStyle = zg;
          c.fillRect(zx, barY + 3, zw, barH - 6);
          const pw = zw * 0.5;
          c.fillStyle = "rgba(217,240,180,0.9)";
          c.fillRect(mx + bw * cz - pw / 2, barY + 6, pw, barH - 12);
          const cx = mx + bw * pos;
          c.fillStyle = flash > 0.3 ? "#ffe9a0" : "#b6ff6e";
          c.shadowColor = "#7ab648"; c.shadowBlur = 12;
          c.fillRect(cx - 3, barY - 7, 6, barH + 14);
          c.shadowBlur = 0;
        }
        c.font = "bold 12px sans-serif";
        c.textAlign = "left"; c.fillStyle = "#9ab87a";
        c.fillText("Manche " + Math.min(ri + 1, 3) + "/3", mx, barY - 12);
        results.forEach((res, i) => {
          c.fillStyle = res >= 2 ? "#b6ff6e" : res === 1 ? "#ffd970" : "#ff7a6a";
          c.fillText((i + 1) + ": " + (res >= 2 ? "PARFAIT" : res === 1 ? "bien" : "raté"), mx + 86 + i * 96, barY - 12);
        });
        if (lastResult) {
          c.font = "bold 16px sans-serif";
          c.textAlign = "center";
          c.fillStyle = flash > 0.2 ? "#ffe9a0" : "#d9e8c0";
          c.globalAlpha = Math.min(1, flash + 0.25);
          c.fillText(lastResult, w / 2, barY + barH + 28);
          c.globalAlpha = 1;
        }
        if (finished) {
          c.font = "bold 17px sans-serif";
          c.textAlign = "center";
          c.fillStyle = "#ffe9a0";
          c.fillText(gradeText(), w / 2, h - 12);
        }
      },
      status() {
        return finished ? "Le lot est coulé. Retourne cuisiner, chef." : "Précision = pureté. Le profil attend tes ordres.";
      },
      btnLabel() { return finished ? "Terminé ✔" : "🧪 STOP — couler le lot"; },
      tap() {
        if (finished) return;
        const r = rounds[ri];
        const d = Math.abs(pos - centers[ri]);
        let res = 0;
        if (d <= r.zone * 0.25) res = 2;
        else if (d <= r.zone * 0.7) res = 1;
        results.push(res);
        flash = 1;
        lastResult = res === 2 ? "PARFAIT ! 🧪" : res === 1 ? "Bien." : "Raté...";
        playSfx(res >= 2 ? "good" : res === 1 ? "tap" : "bad");
        if (typeof haptic === "function") haptic(res === 2 ? 25 : 10);
        ri += 1;
        if (ri >= rounds.length) {
          finished = true; g.finished = true;
          const score = results.reduce((a, b) => a + b, 0);
          const purityBonus = Math.min(6, results.filter((x) => x === 2).length * 2 + results.filter((x) => x === 1).length);
          state.purity = cap(state.purity + purityBonus, 0, 100);
          const gain = Math.round((400 + 500 * score) * (1 + totalBizLevels() * 0.15));
          state.dirty += gain;
          state.mgCookDay = state.day;
          log("⚗️ Cuisson de précision : " + gradeText() + " — pureté +" + purityBonus + ", +" + fmt(gain) + "$ sale.", score >= 4 ? "good" : "info");
          playSfx(score >= 4 ? "good" : "event");
          if (typeof render === "function") render();
          if (typeof save === "function") save();
        }
      },
    };
    return g;
  }

  // ---------- Mini-jeu 2 : Négociation avec Tuco ----------
  function newTuco() {
    const speeds = [1.5, 1.9, 2.3];
    let ri = 0, temper = 50, phase = Math.random() * 6.28, t = 0;
    let mult = 1, rages = 0, finished = false, flash = 0, shake = 0, lastMsg = "";

    const g = {
      title: "Négociation avec Tuco",
      sub: "Propose quand son humeur est calme — 3 manches",
      emoji: "🤝",
      finished: false,
      update(dt) {
        t += dt;
        temper = 50 + 44 * Math.sin(t * speeds[Math.min(ri, 2)] + phase) + 6 * Math.sin(t * 3.7);
        temper = Math.max(2, Math.min(98, temper));
        flash *= 0.9; shake *= 0.9;
      },
      draw(c, w, h, time) {
        c.clearRect(0, 0, w, h);
        const barY = h * 0.45, barH = 24, mx = 14, bw = w - mx * 2;
        c.fillStyle = "#1a0e0a";
        rr(c, mx, barY, bw, barH, 8); c.fill();
        c.strokeStyle = "#5a2a1a"; c.lineWidth = 2;
        rr(c, mx, barY, bw, barH, 8); c.stroke();
        const zx = mx + bw * 0.38, zw = bw * 0.24;
        c.fillStyle = "rgba(122,182,72,0.55)";
        c.fillRect(zx, barY + 3, zw, barH - 6);
        c.fillStyle = "rgba(200,58,50,0.4)";
        c.fillRect(mx + bw * 0.86, barY + 3, bw * 0.14, barH - 6);
        const nx = mx + bw * (temper / 100);
        c.fillStyle = temper > 62 ? "#ff8a5c" : "#ffd970";
        c.shadowColor = "#ff8a5c"; c.shadowBlur = shake > 0.2 ? 18 : 8;
        c.fillRect(nx - 3, barY - 6, 6, barH + 12);
        c.shadowBlur = 0;
        c.font = "26px sans-serif"; c.textAlign = "center";
        const face = temper > 62 ? "😡" : temper < 38 ? "😆" : "🤨";
        c.fillText(face, w / 2, barY - 14 + (shake > 0.2 ? Math.sin(time * 60) * 3 : 0));
        c.font = "bold 12px sans-serif"; c.fillStyle = "#d9a88a"; c.textAlign = "left";
        c.fillText("Manche " + Math.min(ri + 1, 3) + "/3 — multiplicateur ×" + mult.toFixed(1), mx, barY + barH + 22);
        if (lastMsg) {
          c.font = "bold 14px sans-serif"; c.textAlign = "center";
          c.fillStyle = flash > 0.2 ? "#ffb0a0" : "#e8d0b0";
          c.globalAlpha = Math.min(1, flash + 0.3);
          c.fillText(lastMsg, w / 2, h - 10);
          c.globalAlpha = 1;
        }
      },
      status() {
        return finished ? "Négociation terminée." : "Zone verte = humeur calme. Trop tendu = colère.";
      },
      btnLabel() { return finished ? "Terminé ✔" : "🤝 Proposer l'offre"; },
      tap() {
        if (finished) return;
        if (temper >= 38 && temper <= 62) {
          mult *= 1.6;
          lastMsg = "TIGHT, TIGHT, TIGHT ! Marché conclu ! ×1,6";
          flash = 1;
          playSfx("good");
          if (typeof haptic === "function") haptic(25);
        } else if (temper < 38) {
          mult *= 0.7;
          lastMsg = "Tu rigoles ? C'est de la petite cuisine. ×0,7";
          flash = 0.5;
          playSfx("bad");
          if (typeof haptic === "function") haptic(10);
        } else {
          rages += 1;
          shake = 1; flash = 1;
          addHeat(2);
          lastMsg = "NO MORE HALF MEASURES ! Manche perdue !";
          playSfx("bad");
          if (typeof haptic === "function") haptic(40);
        }
        ri += 1;
        if (ri >= 3 || rages >= 2) {
          finished = true; g.finished = true;
          state.mgTucoDay = state.day;
          if (rages < 2 && mult > 0) {
            const gain = Math.round(1200 * mult * (1 + totalBizLevels() * 0.2));
            state.dirty += gain;
            log("🤝 Tuco serre ta main : +" + fmt(gain) + "$ sale (multiplicateur ×" + mult.toFixed(1) + ").", "good");
          } else {
            addHeat(6);
            log("🤝 Tuco a failli te casser la figure. Tu t'es tiré sans rien. Chaleur +8 au total.", "bad");
          }
          playSfx(rages < 2 ? "good" : "bad");
          if (typeof render === "function") render();
          if (typeof save === "function") save();
        }
      },
    };
    return g;
  }

  window.openMinigame = openMinigame;
  window.closeMinigame = closeMinigame;
})();
