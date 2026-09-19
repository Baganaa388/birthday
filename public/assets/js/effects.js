/* Confetti bursts and background music. Exposes App.burst and App.music. */
(function () {
  const { C, $, reducedMotion } = App;

  /* ---------- confetti ---------- */
  const canvas = $("#confetti");
  const ctx = canvas.getContext("2d");
  const COLORS = ["#F2A7B8", "#FFE3A1", "#BFE6D4", "#D6CCF5", "#7A2342", "#FFFFFF"];
  let bits = [];
  let raf = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener("resize", resize);
  resize();

  function frame() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    bits = bits.filter(b => b.life < 200 && b.y < innerHeight + 40);
    for (const b of bits) {
      b.life++;
      b.vy += 0.22;
      b.vx *= 0.985;
      b.x += b.vx;
      b.y += b.vy;
      b.rot += b.vr;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = b.color;
      if (b.round) {
        ctx.beginPath();
        ctx.arc(0, 0, b.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.life / 8)));
      }
      ctx.restore();
    }
    raf = bits.length ? requestAnimationFrame(frame) : 0;
  }

  App.burst = function (x, y, count = 120) {
    if (reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 4 + Math.random() * 8;
      bits.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 6,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4,
        color: COLORS[i % COLORS.length],
        round: i % 5 === 0,
        life: 0
      });
    }
    if (!raf) raf = requestAnimationFrame(frame);
  };

  /* ---------- music ---------- */
  // Music-box "Happy Birthday" (public domain) in 3/4 with a soft accompaniment.
  // Melody: [semitones from C5, beats]. It starts with a one-beat pickup.
  const MELODY = [
    [-5, .75], [-5, .25], [-3, 1], [-5, 1], [0, 1], [-1, 2],
    [-5, .75], [-5, .25], [-3, 1], [-5, 1], [2, 1], [0, 2],
    [-5, .75], [-5, .25], [7, 1], [4, 1], [0, 1], [-1, 1], [-3, 2],
    [5, .75], [5, .25], [4, 1], [0, 1], [2, 1], [0, 3]
  ];
  // One chord per bar after the pickup: [bass, chord tone, chord tone].
  const C_MAJ = [-24, -8, -5], G_MAJ = [-29, -13, -10], F_MAJ = [-31, -15, -12];
  const CHORDS = [C_MAJ, G_MAJ, G_MAJ, C_MAJ, C_MAJ, F_MAJ, C_MAJ, C_MAJ];
  const BEAT = 0.46;
  let actx = null, bus = null, audio = null, loopTimer = 0, playing = false;
  const btn = $("#musicBtn");

  // Output bus with a gentle echo so the music box sounds "roomy".
  function buildBus() {
    const master = actx.createGain();
    master.gain.value = 0.8;
    const delay = actx.createDelay(1);
    delay.delayTime.value = 0.32;
    const feedback = actx.createGain();
    feedback.gain.value = 0.3;
    const tone = actx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2600;
    const wet = actx.createGain();
    wet.gain.value = 0.28;
    master.connect(actx.destination);
    master.connect(delay);
    delay.connect(tone).connect(feedback).connect(delay);
    delay.connect(wet).connect(actx.destination);
    return master;
  }

  // Bell-like tone: a few decaying partials.
  function note(t, semi, dur, vol = 1) {
    const f = 523.25 * Math.pow(2, semi / 12);
    const ring = Math.max(0.8, dur * 1.8);
    [[1, .15], [2, .045], [3.01, .02], [4.2, .01]].forEach(([mult, peak]) => {
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = "sine";
      osc.frequency.value = f * mult;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(peak * vol, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + ring / mult ** 0.3);
      osc.connect(gain).connect(bus);
      osc.start(t);
      osc.stop(t + ring + 0.1);
    });
  }

  function playPass(t0, octave, accompany) {
    let t = t0;
    for (const [semi, beats] of MELODY) {
      note(t, semi + octave, beats * BEAT, octave ? 0.7 : 1);
      t += beats * BEAT;
    }
    if (accompany) {
      CHORDS.forEach(([bass, a, b], bar) => {
        const start = t0 + (1 + bar * 3) * BEAT;
        note(start, bass, BEAT * 3, 0.55);
        [1, 2].forEach(beat => {
          note(start + beat * BEAT, a, BEAT, 0.28);
          note(start + beat * BEAT, b, BEAT, 0.28);
        });
      });
    }
    return t;
  }

  function playTune() {
    const t0 = actx.currentTime + 0.1;
    const t1 = playPass(t0, 0, true) + BEAT;          // first time with chords
    const end = playPass(t1, 12, false);              // second time, an octave up and lighter
    loopTimer = setTimeout(() => playing && playTune(), (end - actx.currentTime + 2.5) * 1000);
  }

  function setState(on) {
    playing = on;
    btn.classList.toggle("is-playing", on);
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", on ? "Хөгжим унтраах" : "Хөгжим асаах");
  }

  App.music = {
    start() {
      try {
        if (C.music) {
          audio = audio || Object.assign(new Audio(C.music), { loop: true });
          audio.play().catch(() => setState(false));
        } else {
          actx = actx || new (window.AudioContext || window.webkitAudioContext)();
          bus = bus || buildBus();
          actx.resume();
          clearTimeout(loopTimer);
          playTune();
        }
        setState(true);
      } catch (_) {
        setState(false);
      }
    },
    stop() {
      clearTimeout(loopTimer);
      if (audio) audio.pause();
      if (bus) {             // drop notes that were already scheduled
        bus.disconnect();
        bus = null;
      }
      setState(false);
    }
  };

  btn.addEventListener("click", () => (playing ? App.music.stop() : App.music.start()));
})();
