/* Scroll animations: section reveals, butterflies that land on cards,
   butterflies that fly with the scroll, and the sparkle trail they leave. */
(function () {
  const { $, $$, h, reducedMotion } = App;

  const WING_COLORS = ["#CDBDF7", "#F7B5C8", "#B8E3F2", "#FFD98A"];

  function butterfly(color, flap) {
    const wing = side => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 50 60");
      const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
      use.setAttribute("href", "#wing");
      svg.append(use);
      return h("span", { class: `bfly__wing bfly__wing--${side}` }, svg);
    };
    return h("span", { class: "bfly", style: { color, "--flap": `${flap}s` } },
      wing("l"), wing("r"), h("span", { class: "bfly__body" }));
  }

  /* ---------- 1. reveals ---------- */
  // [selector, variant, stagger between siblings in ms]
  const REVEALS = [
    [".hero__kicker", "down", 0],
    [".hero__name", "down", 0],
    [".cake", "pop", 0],
    [".hero__age, .hero__hint, .date-pill", "up", 90],
    [".letter", "up", 0],
    [".portrait", "pop", 0],
    [".section__title", "up", 0],
    [".ticket", "up", 0],
    [".countdown__tile", "pop", 90],
    ["#calBtn", "up", 0],
    [".timeline__item", "left", 110],
    [".sticky", "pop", 110],
    [".polaroid", "swing", 120],
    [".card:not(.card--front)", "up", 0],
    [".peek-wrap", "peek", 0],
    [".footer > *", "up", 90]
  ];

  const revealObserver = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("is-visible");
      revealObserver.unobserve(e.target);
    }
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });

  // Classes go on right away (hidden behind the envelope); observing starts after opening.
  const revealEls = [];
  if (!reducedMotion) {
    for (const [sel, variant, stagger] of REVEALS) {
      $$(sel).forEach((el, i) => {
        el.classList.add("reveal", `reveal--${variant}`);
        if (stagger) el.style.setProperty("--delay", `${(i % 6) * stagger}ms`);
        revealEls.push(el);
      });
    }
  }
  const setupReveals = () => revealEls.forEach(el => revealObserver.observe(el));

  /* ---------- 2. butterflies landing on cards ---------- */
  const perchObserver = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const perch = e.target.querySelector(":scope > .perch");
      setTimeout(() => {
        perch.classList.add("is-landed");
        setTimeout(() => {
          const r = perch.getBoundingClientRect();
          sparkleBurst(r.left + r.width / 2, r.top + r.height / 2, 14);
        }, 1100);
      }, 250);
      perchObserver.unobserve(e.target);
    }
  }, { threshold: 0.35 });

  function setupPerches() {
    $$("[data-perch]").forEach((host, i) => {
      const side = host.dataset.perch;
      const perch = h("span", { class: `perch perch--${side}`, attrs: { "aria-hidden": "true" } },
        butterfly(WING_COLORS[i % WING_COLORS.length], 0.18 + (i % 3) * 0.03));
      host.append(perch);
      perchObserver.observe(host);
    });
  }

  /* ---------- 3. sparkles canvas ---------- */
  const canvas = $("#sparkles");
  const ctx = canvas.getContext("2d");
  const SPARK_COLORS = ["255,255,255", "255,217,138", "205,189,247", "247,181,200"];
  let sparks = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function addSpark(x, y, spread = 6) {
    if (sparks.length > 70) return;
    sparks.push({
      x: x + (Math.random() - 0.5) * spread,
      y: y + (Math.random() - 0.5) * spread,
      vx: (Math.random() - 0.5) * 0.6,
      vy: Math.random() * 0.3 + 0.1,
      r: Math.random() * 2 + 1.6,
      life: 0,
      max: 50 + Math.random() * 40,
      color: SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0]
    });
  }

  function sparkleBurst(x, y, n) {
    for (let i = 0; i < n; i++) addSpark(x, y, 36);
  }

  function drawSparks() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    sparks = sparks.filter(s => s.life < s.max);
    for (const s of sparks) {
      s.life++;
      s.x += s.vx;
      s.y += s.vy;
      const a = Math.sin((s.life / s.max) * Math.PI);  // fade in, then out
      const len = s.r * (1.6 + a * 1.4);               // star arms twinkle with the fade
      ctx.fillStyle = `rgba(${s.color},${a})`;
      ctx.beginPath();                                 // 4-point star
      ctx.moveTo(s.x, s.y - len);
      ctx.quadraticCurveTo(s.x, s.y, s.x + len, s.y);
      ctx.quadraticCurveTo(s.x, s.y, s.x, s.y + len);
      ctx.quadraticCurveTo(s.x, s.y, s.x - len, s.y);
      ctx.quadraticCurveTo(s.x, s.y, s.x, s.y - len);
      ctx.fill();
    }
  }

  /* ---------- 4. butterflies flying with the scroll ---------- */
  const flyers = [];
  function setupFlyers() {
    const layer = $("#flyers");
    const specs = [
      { x: 0.14, seed: 0.1, speed: 0.55, size: 1, color: WING_COLORS[0] },
      { x: 0.86, seed: 0.55, speed: 0.75, size: 0.8, color: WING_COLORS[1] },
      { x: 0.5, seed: 0.8, speed: 0.4, size: 0.65, color: WING_COLORS[2] }
    ];
    for (const s of specs) {
      const el = butterfly(s.color, 0.16 + s.size * 0.06);
      el.classList.add("bfly--flying");
      layer.append(el);
      flyers.push({ ...s, el, px: 0, py: 0 });
    }
  }

  let lastY = scrollY;
  let velocity = 0;
  let running = false;

  function frame(t) {
    const time = t / 1000;
    const y = scrollY;
    velocity = velocity * 0.85 + (y - lastY) * 0.15;
    lastY = y;
    const vh = innerHeight, vw = Math.min(innerWidth, 560), offsetX = (innerWidth - vw) / 2;
    const span = vh + 200;

    for (const f of flyers) {
      // Drift upward slowly on their own; scrolling down pushes them up faster.
      const travel = f.seed * span + time * 18 * f.speed + y * f.speed;
      const py = span - (travel % span) - 100;
      const px = offsetX + f.x * vw + Math.sin(time * 0.8 + f.seed * 9) * 26 + Math.sin(y * 0.004 + f.seed * 5) * 40;
      const angle = Math.max(-35, Math.min(35, (px - f.px) * 4));
      f.el.style.transform = `translate(${px}px, ${py}px) rotate(${angle}deg) scale(${f.size})`;
      // Leave a sparkle trail while the page is moving.
      if (Math.abs(velocity) > 0.8 && Math.random() < Math.min(0.22, Math.abs(velocity) / 40) && py > -40 && py < vh + 40) {
        addSpark(px + 33 * f.size, py + 27 * f.size, 34);
      }
      f.px = px;
      f.py = py;
    }
    // a few idle twinkles
    if (Math.random() < 0.05) addSpark(Math.random() * innerWidth, Math.random() * vh, 0);

    drawSparks();
    requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    setupReveals();
    setupPerches();
    if (reducedMotion) return;
    resize();
    addEventListener("resize", resize);
    setupFlyers();
    requestAnimationFrame(frame);
  }

  // Wait until the envelope is opened so the first reveals happen in view.
  if (App.opened || $("#cover").hidden) start();
  else document.addEventListener("invite:open", start, { once: true });
})();
