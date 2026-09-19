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
    arrival: C.event.arrival,
    dressTitle: C.dressCode.title,
    dressNote: C.dressCode.note,
    deadline: C.rsvp.deadline,
    phoneLabel: C.rsvp.phone.replace(/^\+976/, ""),
    ...when
  };
  $$("[data-bind]").forEach(el => {
    const v = bind[el.dataset.bind];
    if (v != null) el.textContent = v;
  });
  document.title = `${C.child.fullName || C.child.name} ${C.child.age} нас`;

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
  portrait.src = C.heroPhoto.src;
  $("#heroCaption").textContent = C.heroPhoto.caption;

  /* peeking photo above the RSVP card */
  if (C.peekPhoto) {
    const peek = $("#peekImg");
    peek.onerror = () => peek.remove();
    peek.src = C.peekPhoto;
  } else {
    $("#peekImg").remove();
  }

  $("#gallery").replaceChildren(...C.photos.map((p, i) =>
    h("li", { class: "polaroid" },
      h("span", { class: "polaroid__pin", attrs: { "aria-hidden": "true" } }),
      photo(p.src, p.caption, i),
      h("span", { class: "polaroid__caption", text: p.caption }))
  ));

  /* ---------- program ---------- */
  $("#program").replaceChildren(...C.program.map(p =>
    h("li", { class: "timeline__item" },
      h("time", { class: "timeline__time", text: p.time }),
      h("div", { class: "timeline__body" },
        h("strong", { text: fill(p.title) }),
        p.note ? h("span", { text: fill(p.note) }) : null))
  ));

  /* ---------- facts ---------- */
  $("#facts").replaceChildren(...C.facts.map((f, i) =>
    h("li", { class: `sticky sticky--${PASTELS[i % PASTELS.length]}` },
      h("span", { class: "sticky__label", text: fill(f.label) }),
      h("b", { class: "sticky__value", text: fill(f.value) }))
  ));

  /* ---------- map & phone ---------- */
  const { lat, lng } = C.event;
  $("#mapFrame").src = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  $("#mapBtn").href = C.event.mapUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  $$("[data-tel]").forEach(a => (a.href = `tel:${C.rsvp.phone}`));
})();
