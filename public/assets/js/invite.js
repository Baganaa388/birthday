/* Envelope opening, candle, countdown and "add to calendar". */
(function () {
  const { C, $, when, reducedMotion } = App;

  /* ---------- envelope ---------- */
  const cover = $("#cover");

  function openInvite() {
    if (cover.classList.contains("is-open")) return;
    cover.classList.add("is-open");
    App.music.start();
    $("#musicBtn").hidden = false;

    const done = () => {
      cover.hidden = true;
      document.body.classList.remove("is-locked");
      App.burst(innerWidth / 2, innerHeight * 0.3, 140);
      $("#top").focus({ preventScroll: true });
      App.opened = true;
      document.dispatchEvent(new Event("invite:open"));
    };
    reducedMotion ? done() : setTimeout(done, 1500);
  }
  $("#openBtn").addEventListener("click", openInvite);
  $("#seal").addEventListener("click", openInvite);

  /* ---------- candle ---------- */
  const flame = $("#flameBtn");
  const hint = $("#blowHint");
  flame.addEventListener("click", () => {
    const out = flame.classList.toggle("is-out");
    flame.setAttribute("aria-label", out ? "Лааг дахин асаах" : "Лааг үлээх");
    if (out) {
      const r = flame.getBoundingClientRect();
      App.burst(r.left + r.width / 2, r.top + r.height / 2, 160);
      hint.textContent = `Хүсэл тань биелэх болтугай, ${C.child.name}!`;
      if (navigator.vibrate) navigator.vibrate(40);
    } else {
      hint.textContent = "Дахиад үлээгээрэй";
    }
  });

  /* ---------- countdown ---------- */
  const units = { d: $("#cdD"), h: $("#cdH"), m: $("#cdM"), s: $("#cdS") };
  function tick() {
    const now = Date.now();
    const ms = when.start - now;
    if (ms <= 0) {
      const text = now < when.end ? "Баяр яг одоо болж байна!" : "Хамт тэмдэглэсэн та бүхэндээ баярлалаа!";
      $("#countdown").replaceWith(App.h("p", { class: "countdown-done", text }));
      return;
    }
    const sec = Math.floor(ms / 1000);
    units.d.textContent = Math.floor(sec / 86400);
    units.h.textContent = Math.floor((sec % 86400) / 3600);
    units.m.textContent = Math.floor((sec % 3600) / 60);
    units.s.textContent = sec % 60;
    setTimeout(tick, 1000 - (Date.now() % 1000));
  }
  tick();

  /* ---------- calendar (.ics) ---------- */
  const stamp = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = s => s.replace(/([,;\\])/g, "\\$1");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//birthday-invite//MN", "BEGIN:VEVENT",
    `UID:${stamp(when.start)}-birthday@invite`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(when.start)}`,
    `DTEND:${stamp(when.end)}`,
    `SUMMARY:${esc(`${C.child.name} ${C.child.age} насны төрсөн өдөр`)}`,
    `LOCATION:${esc(`${C.event.venue}, ${C.event.address}`)}`,
    "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Маргааш төрсөн өдөр!", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR"
  ].join("\r\n");
  $("#calBtn").href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
})();
