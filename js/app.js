// App mobile — v10
// Splash, menu principal, pages de jeu, badges de notification,
// installation PWA, vibrations, plein écran.
// Charge après map.js. Tout est défensif : le jeu fonctionne même sans ce fichier.

(function () {
  function haptic(ms) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) { /* non supporté */ }
  }
  window.haptic = haptic;

  function initSplash() {
    const splash = document.getElementById("splash");
    const btn = document.getElementById("btn-start");
    if (!splash) return;
    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      splash.classList.add("out");
      haptic(20);
      try {
        if (typeof sfx !== "undefined" && sfx && typeof sfx.unlock === "function") sfx.unlock();
      } catch (e) { /* audio non prêt */ }
      setTimeout(() => splash.remove(), 450);
    }
    if (btn) btn.addEventListener("click", close);
    setTimeout(close, 6000);
  }

  function fmtShort(n) {
    try {
      if (n >= 1e15) return (n / 1e15).toFixed(2) + " Qa$";
      if (n >= 1e12) return (n / 1e12).toFixed(2) + " T$";
      if (n >= 1e9) return (n / 1e9).toFixed(2) + " Md$";
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + " M$";
      if (n >= 1_000) return Math.round(n / 1_000) + " k$";
      return Math.round(n) + "$";
    } catch (e) { return ""; }
  }

  function updateMenuInfo() {
    const info = document.getElementById("menu-info");
    if (!info) return;
    try {
      if (typeof state !== "undefined" && state && state.day > 1) {
        info.textContent = `Continuer — Jour ${state.day} · ${fmtShort(state.cash)} propres · 🎭 ×${(1 + (state.legendPoints || 0) * 0.1).toFixed(2)}`;
        const play = document.getElementById("btn-play");
        if (play) play.textContent = "▶ CONTINUER";
      } else {
        info.textContent = "Nouvelle partie — un RV, un tablier, un rêve.";
      }
    } catch (e) { info.textContent = ""; }
  }

  function showApp() {
    const menu = document.getElementById("menu");
    const app = document.getElementById("app");
    if (menu) menu.classList.add("hidden");
    if (app) app.classList.remove("hidden");
    haptic(15);
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
      if (typeof heismapOnShow === "function") heismapOnShow();
    }, 60);
  }

  function initMenu() {
    const menu = document.getElementById("menu");
    if (!menu) return;
    updateMenuInfo();
    const play = document.getElementById("btn-play");
    if (play) play.addEventListener("click", showApp);

    const ach = document.getElementById("btn-menu-ach");
    if (ach) ach.addEventListener("click", () => {
      if (typeof showAchievements === "function") showAchievements();
    });

    const sound = document.getElementById("btn-menu-sound");
    if (sound) {
      try {
        if (typeof sfx !== "undefined" && sfx && sfx.muted) sound.textContent = "🔇 Son : OFF";
      } catch (e) { /* pas de sfx */ }
      sound.addEventListener("click", () => {
        if (typeof sfx === "undefined" || !sfx) return;
        const muted = sfx.toggle();
        sound.textContent = muted ? "🔇 Son : OFF" : "🔊 Son : ON";
        const topSound = document.getElementById("btn-sound");
        if (topSound) topSound.textContent = muted ? "🔇" : "🔊";
        if (!muted) sfx.click();
      });
    }

    const fs = document.getElementById("btn-menu-fs");
    if (fs) fs.addEventListener("click", () => {
      try {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock("portrait").catch(() => {});
          }
        } else {
          document.exitFullscreen();
        }
      } catch (e) { /* refusé */ }
    });

    const reset = document.getElementById("btn-menu-reset");
    if (reset) reset.addEventListener("click", () => {
      if (confirm("Recommencer une nouvelle vie ? La progression sera perdue.")) {
        if (typeof reset === "function") reset();
        updateMenuInfo();
      }
    });
  }

  function initTabs() {
    const nav = document.getElementById("bottom-nav");
    if (!nav) return;
    const pages = document.querySelectorAll(".tab-page");
    const buttons = nav.querySelectorAll("button[data-tab]");

    function activate(id, btn) {
      pages.forEach((p) => p.classList.toggle("active", p.dataset.page === id));
      buttons.forEach((b) => b.classList.toggle("active", b === btn));
      haptic(10);
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (id === "map" && typeof heismapOnShow === "function") heismapOnShow();
    }

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => activate(btn.dataset.tab, btn));
    });

    const hash = (location.hash || "").replace("#", "");
    const target = Array.from(buttons).find((b) => b.dataset.tab === hash);
    if (target) activate(hash, target);
    else if (buttons[0]) buttons[0].classList.add("active");
  }

  function setBadge(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    if (count > 0) {
      el.textContent = count > 9 ? "9+" : String(count);
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  }

  function updateBadges() {
    try {
      if (typeof state === "undefined" || !state) return;
      let missionReady = 0;
      if (state.dailyMissions && Array.isArray(state.dailyMissions.list) && typeof DAILY_MISSIONS !== "undefined") {
        for (const m of state.dailyMissions.list) {
          const def = DAILY_MISSIONS.find((d) => d.id === m.id);
          if (def && !m.claimed && m.progress >= def.goal) missionReady += 1;
        }
      }
      setBadge("badge-base", missionReady);

      let mapReady = 0;
      if (typeof MAP_LOCATIONS !== "undefined" && state.visitedToday) {
        for (const loc of MAP_LOCATIONS) {
          if (loc.unlock && !loc.unlock(state)) continue;
          for (const it of loc.interactions) {
            if (it.cond && !it.cond(state)) continue;
            if (!state.visitedToday[loc.id + ":" + it.id]) { mapReady += 1; break; }
          }
        }
      }
      setBadge("badge-map", mapReady);

      const bizReady = state.contract && state.stock > 0 ? 1 : 0;
      setBadge("badge-biz", bizReady);

      let empireReady = 0;
      if (typeof BUSINESSES !== "undefined" && typeof bizPoolCap === "function") {
        for (const b of BUSINESSES) {
          const st = state.businesses && state.businesses[b.id];
          if (!st || st.level <= 0) continue;
          if (st.pooled >= 1) empireReady += 1;
        }
      }
      setBadge("badge-empire", empireReady);

      let crewReady = 0;
      if (typeof STAFF !== "undefined") {
        crewReady = STAFF.filter((m) => !state.staff.includes(m.id) && state.cash >= m.cost).length;
      }
      setBadge("badge-crew", crewReady ? 1 : 0);
    } catch (e) { /* état pas prêt */ }
  }

  let deferredInstall = null;
  function initInstall() {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstall = e;
      const btn = document.getElementById("btn-install");
      if (btn) btn.style.display = "";
    });
    const btn = document.getElementById("btn-install");
    if (btn) {
      btn.addEventListener("click", async () => {
        if (!deferredInstall) return;
        deferredInstall.prompt();
        await deferredInstall.userChoice;
        deferredInstall = null;
        btn.style.display = "none";
      });
    }
    const standalone =
      window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
    if (standalone && btn) btn.style.display = "none";
  }

  function initFullscreen() {
    const btn = document.getElementById("btn-fs");
    if (!btn) return;
    btn.addEventListener("click", () => {
      try {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock("portrait").catch(() => {});
          }
        } else {
          document.exitFullscreen();
        }
      } catch (e) { /* refusé */ }
    });
  }

  function initServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "https:" && location.hostname !== "localhost") return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  function init() {
    initSplash();
    initMenu();
    initTabs();
    initInstall();
    initFullscreen();
    initServiceWorker();
    setInterval(updateBadges, 1500);
    setTimeout(updateBadges, 800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
