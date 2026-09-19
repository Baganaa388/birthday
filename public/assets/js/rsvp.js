/* RSVP form: guests pick an arrival time slot and it is saved on the server.
   Falls back to SMS when there is no server. */
(function () {
  const { C, $, $$, h, when, isIOS, store, api, guestId } = App;

  const form = $("#rsvpForm");
  const msg = $("#rsvpMsg");
  const thanks = $("#rsvpThanks");
  const NO = "Очиж чадахгүй";
  const SLOTS = C.event.slots;
  let lastText = "";

  /* ---------- time slot choices ---------- */
  $("#slotChoices").replaceChildren(...SLOTS.map((slot, i) =>
    h("label", { class: "choice" },
      h("input", { attrs: { type: "radio", name: "slot", value: slot } }),
      h("span", {},
        h("b", { class: "choice__time", text: slot }),
        h("em", { class: "choice__count", attrs: { "data-slot": slot } })))
  ));

  // "N хүн бүртгүүлсэн" next to each slot; stays empty when there is no server.
  async function loadCounts() {
    try {
      const { counts } = await api("slots");
      $$(".choice__count").forEach(el => {
        const people = counts[el.dataset.slot]?.people || 0;
        el.textContent = people ? `${people} хүн бүртгүүлсэн` : "Одоогоор хоосон";
      });
    } catch (_) { /* no server: hide the counts */ }
  }
  loadCounts();

  /* ---------- steppers ---------- */
  $$(".stepper").forEach(st => {
    const out = $("output", st);
    const min = +st.dataset.min, max = +st.dataset.max;
    st.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      out.textContent = Math.min(max, Math.max(min, +out.textContent + +b.dataset.step));
    });
  });

  // Slot and head count only matter for guests who are coming.
  form.addEventListener("change", () => {
    $("#comingFields").hidden = form.att.value === NO;
  });

  function setMsg(text, isError) {
    msg.textContent = text;
    msg.classList.toggle("is-error", !!isError);
  }

  function composeText(d) {
    return d.attendance === NO
      ? `Төрсөн өдрийн урилгын хариу: ${d.name}, очиж чадахгүй нь. Төрсөн өдрийн мэнд хүргэе!`
      : `Төрсөн өдрийн урилгын хариу: ${d.name}, ${d.attendance.toLowerCase()}. ${d.slot} цагт. Том хүн ${d.adults}, хүүхэд ${d.kids}.`;
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const name = $("#rName").value.trim();
    if (!name) {
      setMsg("Нэрээ бичнэ үү.", true);
      $("#rName").focus();
      return;
    }
    const attendance = form.att.value;
    const coming = attendance !== NO;
    const slot = coming ? form.slot.value : "";
    if (coming && !slot) {
      setMsg("Ирэх цагаа сонгоно уу.", true);
      $("#slotChoices input").focus();
      return;
    }
    const data = {
      name,
      attendance,
      slot,
      adults: coming ? +$("#adults").textContent : 0,
      kids: coming ? +$("#kids").textContent : 0
    };
    lastText = composeText(data);

    const submit = form.querySelector("[type=submit]");
    submit.disabled = true;
    setMsg("Илгээж байна…");
    try {
      await api("rsvp", { method: "POST", body: { guestId: guestId(), ...data } });
      data.via = "server";
      loadCounts();
    } catch (err) {
      if (err.message !== "unavailable") {
        setMsg(err.message === "too_many_requests"
          ? "Хэт олон удаа илгээлээ. Түр хүлээгээд дахин оролдоно уу."
          : "Илгээж чадсангүй. Нэр, цагаа шалгаад дахин оролдоно уу.", true);
        submit.disabled = false;
        return;
      }
      data.via = "sms";
      location.href = `sms:${C.rsvp.phone}${isIOS ? "&" : "?"}body=${encodeURIComponent(lastText)}`;
    }
    submit.disabled = false;
    store.set("rsvp", data);
    App.setCalendarSlot?.(data.slot);
    showThanks(data, true);
  });

  function showThanks(d, celebrate) {
    form.hidden = true;
    thanks.hidden = false;
    setMsg("");
    const bySms = d.via === "sms";
    $("#copyRsvp").hidden = !bySms;
    $("#copyNote").hidden = !bySms;
    lastText = lastText || composeText(d);
    $("#rsvpThanksText").textContent = d.attendance === NO
      ? `${d.name}, мэдэгдсэнд баярлалаа.`
      : `${d.name}, баярлалаа! ${when.month} сарын ${when.day}-нд ${d.slot || when.time} цагт хүлээж байна.`;
    if (celebrate && d.attendance !== NO) {
      const r = thanks.getBoundingClientRect();
      App.burst(innerWidth / 2, r.top + 40, 90);
    }
  }

  // Editing an answer: put the saved choices back into the form.
  function fillForm(d) {
    $("#rName").value = d.name;
    const att = form.querySelector(`[name=att][value="${d.attendance}"]`);
    if (att) att.checked = true;
    const slot = d.slot && form.querySelector(`[name=slot][value="${d.slot}"]`);
    if (slot) slot.checked = true;
    if (d.adults) $("#adults").textContent = d.adults;
    $("#kids").textContent = d.kids || 0;
    $("#comingFields").hidden = d.attendance === NO;
  }

  $("#rsvpAgain").addEventListener("click", () => {
    const saved = store.get("rsvp");
    if (saved) fillForm(saved);
    form.hidden = false;
    thanks.hidden = true;
    $("#rName").focus();
  });

  $("#copyRsvp").addEventListener("click", async () => {
    const note = $("#copyNote");
    try {
      await navigator.clipboard.writeText(lastText);
      note.textContent = `Хуулагдлаа. ${C.rsvp.phone.replace(/^\+976/, "")} дугаар руу мессежээр илгээгээрэй.`;
    } catch (_) {
      note.textContent = lastText;
    }
  });

  const saved = store.get("rsvp");
  if (saved && saved.name) {
    fillForm(saved);
    showThanks(saved, false);
  }
})();
