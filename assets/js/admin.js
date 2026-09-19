/* Admin page: logs in against the Apps Script backend and lists RSVPs and wishes.
   The username/password are checked on the Google side, never in this file. */
(function () {
  const C = window.CONFIG;
  const $ = s => document.querySelector(s);
  const URL_ = C.rsvp.sheetUrl;
  const NO = "Очиж чадахгүй";
  const SESSION_KEY = "admin-login";

  let data = { rsvp: [], wishes: [] };
  let tab = "rsvp";

  $("#adminKicker").textContent = `${C.child.fullName || C.child.name} ${C.child.age} нас`;

  const session = {
    get() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (_) { return null; } },
    set(v) { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(v)); } catch (_) {} },
    clear() { try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {} }
  };

  const ERRORS = {
    unauthorized: "Нэвтрэх нэр эсвэл нууц үг буруу байна.",
    not_configured: "Apps Script-ийн Script properties-д ADMIN_USER, ADMIN_PASS нэмээгүй байна.",
    no_url: "config.js-ийн rsvp.sheetUrl хоосон байна. backend/README.md-ийн дагуу холбоно уу.",
    network: "Хүснэгттэй холбогдож чадсангүй. Интернэтээ шалгаад дахин оролдоно уу."
  };

  async function fetchList(creds) {
    if (!URL_) throw new Error("no_url");
    let res;
    try {
      res = await fetch(URL_, { method: "POST", body: JSON.stringify({ action: "list", ...creds }) });
    } catch (_) {
      throw new Error("network");
    }
    const body = await res.json().catch(() => ({ ok: false, error: "network" }));
    if (!body.ok) throw new Error(body.error || "network");
    return body;
  }

  /* ---------- login ---------- */
  const loginMsg = $("#loginMsg");
  $("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const creds = { username: $("#aUser").value.trim(), password: $("#aPass").value };
    if (!creds.username || !creds.password) {
      loginMsg.textContent = "Нэр, нууц үгээ оруулна уу.";
      loginMsg.classList.add("is-error");
      return;
    }
    loginMsg.classList.remove("is-error");
    loginMsg.textContent = "Шалгаж байна…";
    $("#loginBtn").disabled = true;
    try {
      data = await fetchList(creds);
      session.set(creds);
      showDash();
    } catch (err) {
      loginMsg.textContent = ERRORS[err.message] || ERRORS.network;
      loginMsg.classList.add("is-error");
    } finally {
      $("#loginBtn").disabled = false;
    }
  });

  function showDash() {
    $("#loginView").hidden = true;
    $("#dashView").hidden = false;
    $("#updated").textContent = `Сүүлд шинэчилсэн: ${new Date().toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
    render();
  }

  /* ---------- dashboard ---------- */
  const fmtDate = iso => {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const p = n => String(n).padStart(2, "0");
    return `${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function render() {
    // Keep only the latest answer per guest name, so edits don't double count.
    const seen = new Set();
    const latest = data.rsvp.filter(r => {
      const key = String(r["Нэр"]).trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const coming = latest.filter(r => r["Ирэх эсэх"] !== NO);
    const adults = coming.reduce((s, r) => s + (+r["Том хүн"] || 0), 0);
    const kids = coming.reduce((s, r) => s + (+r["Хүүхэд"] || 0), 0);
    $("#stGuests").textContent = adults + kids;
    $("#stAdults").textContent = adults;
    $("#stKids").textContent = kids;
    $("#stNo").textContent = latest.length - coming.length;
    $("#cntRsvp").textContent = latest.length;
    $("#cntWish").textContent = data.wishes.length;

    const q = $("#search").value.trim().toLowerCase();
    const list = $("#list");
    list.replaceChildren();

    if (tab === "rsvp") {
      latest.filter(r => String(r["Нэр"]).toLowerCase().includes(q)).forEach(r => {
        const no = r["Ирэх эсэх"] === NO;
        const li = el("li", "entry");
        const top = el("div", "entry__top");
        top.append(el("span", "entry__name", r["Нэр"]), el("span", "entry__date", fmtDate(r["Огноо"])));
        const meta = el("div", "entry__meta");
        meta.append(el("span", `badge ${no ? "badge--no" : "badge--yes"}`, r["Ирэх эсэх"]));
        if (!no) {
          meta.append(el("span", "badge", `Том хүн ${r["Том хүн"]}`), el("span", "badge", `Хүүхэд ${r["Хүүхэд"]}`));
        }
        li.append(top, meta);
        list.append(li);
      });
    } else {
      data.wishes.filter(w => String(w["Хэнээс"]).toLowerCase().includes(q)).forEach(w => {
        const li = el("li", "entry");
        const top = el("div", "entry__top");
        top.append(el("span", "entry__name", w["Хэнээс"] || "Нэргүй"), el("span", "entry__date", fmtDate(w["Огноо"])));
        li.append(top, el("p", "entry__text", w["Ерөөл"]));
        list.append(li);
      });
    }

    const empty = $("#empty");
    empty.hidden = list.children.length > 0;
    empty.textContent = q ? "Хайлтад тохирох зүйл олдсонгүй." : tab === "rsvp" ? "Одоогоор хариу ирээгүй байна." : "Одоогоор ерөөл ирээгүй байна.";
  }

  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => {
    tab = b.dataset.tab;
    document.querySelectorAll(".tab").forEach(t => {
      t.classList.toggle("is-active", t === b);
      t.setAttribute("aria-selected", String(t === b));
    });
    render();
  }));
  $("#search").addEventListener("input", render);

  $("#refreshBtn").addEventListener("click", async () => {
    const btn = $("#refreshBtn");
    btn.disabled = true;
    btn.textContent = "Шинэчилж байна…";
    try {
      data = await fetchList(session.get());
      showDash();
    } catch (err) {
      $("#updated").textContent = ERRORS[err.message] || ERRORS.network;
    } finally {
      btn.disabled = false;
      btn.textContent = "Шинэчлэх";
    }
  });

  $("#logoutBtn").addEventListener("click", () => {
    session.clear();
    data = { rsvp: [], wishes: [] };
    $("#aPass").value = "";
    $("#dashView").hidden = true;
    $("#loginView").hidden = false;
    loginMsg.textContent = "";
  });

  /* ---------- resume session ---------- */
  const saved = session.get();
  if (saved) {
    $("#aUser").value = saved.username;
    fetchList(saved).then(d => { data = d; showDash(); }).catch(() => session.clear());
  }
})();
