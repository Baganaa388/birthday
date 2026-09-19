/* Fills the page with content from CONFIG. */
(function () {
  const { C, $, $$, h, fill, when } = App;

  const PASTELS = ["butter", "mint", "lilac", "rose"];
  const EMOJI = ["👶", "🍼", "👣", "🎂", "🌼", "🎀"];

  /* ---------- simple text bindings ---------- */
  const bind = {
    name: C.child.name,
    fullName: C.child.fullName || C.child.name,
    initial: C.child.initial,
    age: C.child.age,
    parents: C.parents,
    greeting: C.letter.greeting,
    venue: C.event.venue,
    address: C.event.address,
    parking: C.event.parking,
    deadline: C.rsvp.deadline,
    phoneLabel: C.rsvp.phone.replace(/^\+976/, ""),
    ...when
  };
  $$("[data-bind]").forEach(el => {
    const v = bind[el.dataset.bind];
    if (v != null) el.textContent = v;
  });

  /* ---------- personal greeting: ?to=Болд ах ---------- */
  const guest = new URLSearchParams(location.search).get("to");
  if (guest) {
    $("#coverGuest").textContent = guest;
    $("#rName").value = guest;
  }

  /* ---------- letter ---------- */
  $("#letterBody").replaceChildren(...C.letter.paragraphs.map(p => h("p", { text: fill(p) })));

  /* ---------- bunting ---------- */
  $$(".bunting").forEach(b => {
    const n = 11;
    const flags = h("div", { class: "bunting__flags" });
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const y = 72 * t * (1 - t);                       // matches the SVG string curve
      const angle = Math.atan((72 * (1 - 2 * t)) / 420) * 57.3;
      flags.append(h("span", {
        class: `bunting__flag bunting__flag--${PASTELS[i % PASTELS.length]}`,
        style: { top: `${y}px`, transform: `rotate(${angle}deg)` }
      }));
    }
    b.append(flags);
  });

  /* ---------- photos ---------- */
  function photo(src, alt, i, fallbackText) {
    const pic = h("div", { class: `pic pic--${PASTELS[i % PASTELS.length]}` },
      h("span", { class: "pic__fallback", text: fallbackText || EMOJI[i % EMOJI.length], attrs: { "aria-hidden": "true" } }));
    if (src) {
      // In the DOM from the start so lazy loading works; the emoji stays until it loads.
      const img = h("img", { attrs: { alt, loading: "lazy", decoding: "async" } });
      img.onload = () => pic.firstChild.remove();
      img.onerror = () => img.remove();
      img.src = src;
      pic.append(img);
    }
    return pic;
  }

  /* hero portrait: cutout standing in a pastel circle */
  const portrait = $("#portraitImg");
  portrait.alt = C.child.name;
  portrait.onerror = () => portrait.closest(".portrait").classList.add("is-empty");
  if (C.heroPhoto.position) portrait.style.objectPosition = C.heroPhoto.position;
  portrait.src = C.heroPhoto.src;
  $("#heroCaption").textContent = C.heroPhoto.caption;

  /* photos fanned out behind the RSVP card */
  const peeks = (C.peekPhotos || []).slice(0, 5);
  const mid = (peeks.length - 1) / 2;
  const peekWrap = $("#peekWrap");
  // More photos sit closer together so the fan still fits a phone screen.
  peekWrap.style.setProperty("--gap", `${Math.min(26, 58 / Math.max(1, peeks.length - 1))}%`);
  peekWrap.style.setProperty("--w", `${peeks.length > 3 ? 104 : 116}px`);
  peeks.forEach((src, i) => {
    const off = i - mid;                              // -2 … 2, 0 is the middle photo
    const img = h("img", { class: "peek", attrs: { alt: "", decoding: "async", loading: "lazy" } });
    img.style.setProperty("--x", off);
    img.style.setProperty("--y", Math.abs(off));
    img.style.setProperty("--i", i);
    img.style.zIndex = 10 - Math.round(Math.abs(off));
    img.onerror = () => img.remove();
    img.src = src;
    peekWrap.append(img);
  });
  if (!peeks.length) peekWrap.remove();

  $("#gallery").replaceChildren(...C.photos.map((p, i) =>
    h("li", { class: "polaroid" },
      h("span", { class: "polaroid__pin", attrs: { "aria-hidden": "true" } }),
      photo(p.src, p.caption, i),
      h("span", { class: "polaroid__caption", text: p.caption }))
  ));

  /* ---------- time slots on the ticket ---------- */
  $("#ticketSlots").replaceChildren(...C.event.slots.map(s => h("span", { class: "ticket__slot", text: s })));

  /* ---------- map & phone ---------- */
  const { lat, lng } = C.event;
  $("#mapFrame").src = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  $("#mapBtn").href = C.event.mapUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  $$("[data-tel]").forEach(a => (a.href = `tel:${C.rsvp.phone}`));
})();
