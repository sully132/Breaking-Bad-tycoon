// App mobile — v8
// Splash screen, onglets, installation PWA, vibrations, plein écran.
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
    initTabs();
    initInstall();
    initFullscreen();
    initServiceWorker();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
