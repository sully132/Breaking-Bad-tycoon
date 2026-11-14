// ============================================================
// HEISENBERG TYCOON — Effets sonores (WebAudio, zéro asset)
// Sons synthétisés à la volée. Aucun fichier audio requis.
// ============================================================

const sfx = (() => {
  let ctx = null;
  let muted = false;

  try {
    muted = localStorage.getItem("heisenberg-tycoon-muted") === "1";
  } catch (e) { /* pas de stockage */ }

  function ensureCtx() {
    if (muted) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = "sine", vol = 0.15, when = 0, slideTo = null) {
    const c = ensureCtx();
    if (!c) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol = 0.1, when = 0, filterFreq = 800) {
    const c = ensureCtx();
    if (!c) return;
    const t0 = c.currentTime + when;
    const buffer = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t0);
  }

   return {
    get muted() { return muted; },
    unlock() {
      try {
        if (!ctx) ensureCtx();
        if (ctx && ctx.state === "suspended") ctx.resume();
      } catch (e) {}
    },
    toggle() {
      muted = !muted;
      try { localStorage.setItem("heisenberg-tycoon-muted", muted ? "1" : "0"); } catch (e) {}
      return muted;
    },
    click()  { tone(600, 0.06, "square", 0.06); },
    tap()    { tone(880, 0.08, "triangle", 0.1); tone(1320, 0.1, "triangle", 0.07, 0.03); },
    cash()   { tone(880, 0.09, "square", 0.1); tone(1174, 0.09, "square", 0.1, 0.07); tone(1568, 0.14, "square", 0.1, 0.14); },
    spend()  { tone(440, 0.1, "square", 0.08); tone(330, 0.12, "square", 0.08, 0.08); },
    cook()   { noise(0.5, 0.06, 0, 500); tone(160, 0.3, "sine", 0.05, 0.1, 90); },
    crystal() { tone(1760, 0.12, "sine", 0.08); tone(2637, 0.16, "sine", 0.06, 0.08); },
    upgrade(){ tone(523, 0.1, "triangle", 0.12); tone(659, 0.1, "triangle", 0.12, 0.08); tone(784, 0.1, "triangle", 0.12, 0.16); tone(1047, 0.2, "triangle", 0.12, 0.24); },
    event()  { tone(740, 0.12, "sine", 0.1); tone(554, 0.18, "sine", 0.1, 0.1); },
    alarm()  { for (let i = 0; i < 4; i++) { tone(700, 0.18, "sawtooth", 0.1, i * 0.4, 1100); } },
    lose()   { tone(392, 0.3, "sawtooth", 0.12); tone(311, 0.3, "sawtooth", 0.12, 0.25); tone(233, 0.5, "sawtooth", 0.12, 0.5); },
    win()    { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, "triangle", 0.12, i * 0.12)); },
    golden() { [1319, 1568, 2093, 2637].forEach((f, i) => tone(f, 0.1, "sine", 0.1, i * 0.06)); },
    prestige() { tone(220, 0.7, "sawtooth", 0.12, 0, 55); tone(440, 0.5, "triangle", 0.08, 0.3, 110); tone(880, 0.4, "sine", 0.08, 0.5, 1760); },
  };  };
})();
