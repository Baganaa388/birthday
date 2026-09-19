/* RSVP form: sends by SMS, or to Google Sheets when CONFIG.rsvp.sheetUrl is set. */
(function () {
  const { C, $, $$, when, isIOS, store } = App;

  const form = $("#rsvpForm");
  const msg = $("#rsvpMsg");
  const thanks = $("#rsvpThanks");
  const NO = "Очиж чадахгүй";
  let lastText = "";

  /* steppers */
  $$(".stepper").forEach(st => {
    const out = $("output", st);
    const min = +st.dataset.min, max = +st.dataset.max;
    st.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      out.textContent = Math.min(max, Math.max(min, +out.textContent + +b.dataset.step));
    });
  });

  form.addEventListener("change", () => {
    $("#countsRow").hidden = form.att.value === NO;
  });

  function setMsg(text, isError) {
    msg.textContent = text;
    msg.classList.toggle("is-error", !!isError);
  }

  function composeText(d) {
    return d.attendance === NO
      ? `Төрсөн өдрийн урилгын хариу: ${d.name}, очиж чадахгүй нь. Төрсөн өдрийн мэнд хүргэе!`
      : `Төрсөн өдрийн урилгын хариу: ${d.name}, ${d.attendance.toLowerCase()}. Том хүн ${d.adults}, хүүхэд ${d.kids}.`;
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
    const data = {
      name,
      attendance,
      adults: coming ? +$("#adults").textContent : 0,
      kids: coming ? +$("#kids").textContent : 0,
      time: new Date().toISOString()
    };
    lastText = composeText(data);

    if (C.rsvp.sheetUrl) {
      setMsg("Илгээж байна…");
      try {
        await fetch(C.rsvp.sheetUrl, { method: "POST", mode: "no-cors", body: JSON.stringify({ type: "rsvp", ...data }) });
      } catch (_) {
        setMsg("Илгээж чадсангүй. Интернэтээ шалгаад дахин оролдоно уу.", true);
        return;
      }
    } else {
      location.href = `sms:${C.rsvp.phone}${isIOS ? "&" : "?"}body=${encodeURIComponent(lastText)}`;
    }
    store.set("rsvp", data);
    showThanks(data, true);
  });

  function showThanks(d, celebrate) {
    form.hidden = true;
    thanks.hidden = false;
    setMsg("");
    $("#copyRsvp").hidden = !!C.rsvp.sheetUrl;
    lastText = lastText || composeText(d);
    $("#rsvpThanksText").textContent = d.attendance === NO
      ? `${d.name}, мэдэгдсэнд баярлалаа. Доор ерөөлөө үлдээгээрэй.`
      : `${d.name}, баярлалаа! ${when.month} сарын ${when.day}-нд ${when.time} цагт хүлээж байна.`;
    if (celebrate && d.attendance !== NO) {
      const r = thanks.getBoundingClientRect();
      App.burst(innerWidth / 2, r.top + 40, 90);
    }
  }

  $("#rsvpAgain").addEventListener("click", () => {
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
    $("#rName").value = saved.name;
    showThanks(saved, false);
  }
})();
