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

  // ---------- v24 : ambiance sonore par scène (nappes générées) ----------
  let ambNodes = [];

  function stopAmbient() {
    const nodes = ambNodes;
    ambNodes = [];
    for (const n of nodes) {
      try { n.gain.gain.exponentialRampToValueAtTime(0.001, n.ctx.currentTime + 0.4); } catch (e) {}
      setTimeout(() => { try { n.src.stop(); if (n.lfo) n.lfo.stop(); } catch (e) {} }, 600);
    }
  }

  function startAmbient(kind, wet) {
    const c = ensureCtx();
    if (!c) return;
    stopAmbient();
    const presets = {
      desert: { type: "lowpass", freq: 380, vol: 0.05 },
      desert2: { type: "lowpass", freq: 380, vol: 0.05 },
      station: { type: "lowpass", freq: 380, vol: 0.05 },
      ranch: { type: "lowpass", freq: 380, vol: 0.05 },
      industrial: { type: "lowpass", freq: 200, vol: 0.08 },
      junkyard: { type: "lowpass", freq: 260, vol: 0.06 },
      city: { type: "bandpass", freq: 700, vol: 0.05 },
      street: { type: "bandpass", freq: 800, vol: 0.05 },
      plaza: { type: "bandpass", freq: 900, vol: 0.045 },
      office: { type: "lowpass", freq: 500, vol: 0.04 },
      tower: { type: "lowpass", freq: 500, vol: 0.04 },
      restaurant: { type: "bandpass", freq: 620, vol: 0.045 },
      suburb: { type: "lowpass", freq: 440, vol: 0.04 },
      backyard: { type: "lowpass", freq: 440, vol: 0.04 },
      apartment: { type: "bandpass", freq: 520, vol: 0.04 },
    };
    const p = presets[kind] || { type: "lowpass", freq: 500, vol: 0.045 };
    const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = p.type;
    filter.frequency.value = p.freq;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(p.vol, c.currentTime + 1.2);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start();
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 0.13;
    lfoGain.gain.value = p.freq * 0.3;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    ambNodes.push({ src, gain, lfo, ctx: c });
    if (wet) {
      const rbuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const rdata = rbuf.getChannelData(0);
      for (let i = 0; i < rdata.length; i++) rdata[i] = Math.random() * 2 - 1;
      const rsrc = c.createBufferSource();
      rsrc.buffer = rbuf;
      rsrc.loop = true;
      const rf = c.createBiquadFilter();
      rf.type = "highpass";
      rf.frequency.value = 1800;
      const rg = c.createGain();
      rg.gain.setValueAtTime(0.001, c.currentTime);
      rg.gain.exponentialRampToValueAtTime(0.045, c.currentTime + 1.5);
      rsrc.connect(rf).connect(rg).connect(c.destination);
      rsrc.start();
      ambNodes.push({ src: rsrc, gain: rg, ctx: c });
    }
  }

  // ---------- v34 : nappe musicale de tension (cinématiques) ----------
  let cineNodes = [];
  function stopCine() {
    const nodes = cineNodes;
    cineNodes = [];
    for (const n of nodes) {
      try { n.gain.gain.exponentialRampToValueAtTime(0.001, n.ctx.currentTime + 0.5); } catch (e) {}
      setTimeout(() => { try { n.osc.stop(); if (n.lfo) n.lfo.stop(); } catch (e) {} }, 700);
    }
  }
  function startCine() {
    const c = ensureCtx();
    if (!c) return;
    stopCine();
    // basse grave + quinte + pupitre, façon tension de série
    const freqs = [55, 82.5, 110];
    freqs.forEach((f, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = i === 2 ? "triangle" : "sawtooth";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.001, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05 - i * 0.012, c.currentTime + 0.8);
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 420;
      osc.connect(lp).connect(gain).connect(c.destination);
      osc.start();
      cineNodes.push({ osc, gain, ctx: c });
    });
    // pouls lent par-dessus
    const pulse = c.createOscillator();
    const pGain = c.createGain();
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    pulse.type = "sine";
    pulse.frequency.value = 110;
    pGain.gain.value = 0.028;
    lfo.frequency.value = 1.6;
    lfoGain.gain.value = 0.028;
    lfo.connect(lfoGain).connect(pGain.gain);
    pulse.connect(pGain).connect(c.destination);
    pulse.start();
    lfo.start();
    cineNodes.push({ osc: pulse, gain: pGain, ctx: c, lfo });
  }

   return {
    get muted() { return muted; },
    ambient: { start: startAmbient, stop: stopAmbient },
    cine: { start: startCine, stop: stopCine },
    unlock() {
      try {
        if (!ctx) ensureCtx();
        if (ctx && ctx.state === "suspended") ctx.resume();
      } catch (e) {}
    },
    toggle() {
      muted = !muted;
      try { localStorage.setItem("heisenberg-tycoon-muted", muted ? "1" : "0"); } catch (e) {}
      if (muted) stopAmbient();
      return muted;
    },
    click()  { tone(600, 0.06, "square", 0.06); },
    bip()    { tone(440 + Math.random() * 320, 0.045, "square", 0.04); },
    shot()   { noise(0.18, 0.22, 0, 900); tone(90, 0.2, "sawtooth", 0.12, 0, 40); }, // v35
    horn()   { tone(310, 0.28, "sawtooth", 0.1); tone(415, 0.28, "sawtooth", 0.08, 0.02); }, // v35
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
  };
})();
