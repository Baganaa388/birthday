/* Admin page: logs in to the invitation server and lists the RSVPs.
   The password is checked by the server; the session lives in an HttpOnly cookie. */
(function () {
  const C = window.CONFIG;
  const $ = s => document.querySelector(s);
  const NO = "Очиж чадахгүй";

  let data = { rsvps: [] };

  $("#adminKicker").textContent = `${C.child.fullName || C.child.name} ${C.child.age} нас`;

  const ERRORS = {
    unauthorized: "Нэвтрэх нэр эсвэл нууц үг буруу байна.",
    too_many_requests: "Хэт олон удаа оролдлоо. 15 минутын дараа дахин оролдоно уу.",
    unavailable: "Сервертэй холбогдож чадсангүй. Сайтыг «npm start»-аар ажиллуулсан эсэхээ шалгана уу."
  };

  async function api(path, options = {}) {
    let res;
    try {
      res = await fetch(`api/admin/${path}`, {
        method: options.method || "GET",
        headers: options.body ? { "Content-Type": "application/json" } : undefined,
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: "same-origin"
      });
    } catch (_) {
      throw new Error("unavailable");
    }
    const body = await res.json().catch(() => null);
    if (!body) throw new Error("unavailable");
    if (!body.ok) throw new Error(body.error || "unavailable");
    return body;
  }

  /* ---------- views ---------- */
  function showLogin(message) {
    $("#dashView").hidden = true;
    $("#loginView").hidden = false;
    $("#loginMsg").textContent = message || "";
    $("#loginMsg").classList.toggle("is-error", !!message);
  }

  async function load() {
    data = await api("data");
    $("#loginView").hidden = true;
    $("#dashView").hidden = false;
    $("#updated").textContent = `Сүүлд шинэчилсэн: ${new Date().toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
    render();
  }

  /* ---------- login / logout ---------- */
  $("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const username = $("#aUser").value.trim();
    const password = $("#aPass").value;
    if (!username || !password) return showLogin("Нэр, нууц үгээ оруулна уу.");
    const btn = $("#loginBtn");
    btn.disabled = true;
    $("#loginMsg").classList.remove("is-error");
    $("#loginMsg").textContent = "Шалгаж байна…";
    try {
      await api("login", { method: "POST", body: { username, password } });
      $("#aPass").value = "";
      await load();
    } catch (err) {
      showLogin(ERRORS[err.message] || ERRORS.unavailable);
    } finally {
      btn.disabled = false;
    }
  });

  $("#logoutBtn").addEventListener("click", async () => {
    await api("logout", { method: "POST" }).catch(() => {});
    data = { rsvps: [] };
    showLogin();
  });

  $("#refreshBtn").addEventListener("click", async () => {
    const btn = $("#refreshBtn");
    btn.disabled = true;
    btn.textContent = "Шинэчилж байна…";
    try {
      await load();
    } catch (err) {
      if (err.message === "unauthorized") showLogin("Нэвтрэх хугацаа дууссан. Дахин нэвтэрнэ үү.");
      else $("#updated").textContent = ERRORS[err.message] || ERRORS.unavailable;
    } finally {
      btn.disabled = false;
      btn.textContent = "Шинэчлэх";
    }
  });

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

  function deleteButton(kind, item, label) {
    const b = el("button", "entry__delete", "Устгах");
    b.type = "button";
    b.setAttribute("aria-label", `${label} устгах`);
    b.addEventListener("click", async () => {
      if (!confirm(`«${label}»-г устгах уу? Буцаах боломжгүй.`)) return;
      b.disabled = true;
      try {
        await api(`${kind}/${item.id}`, { method: "DELETE" });
        data[kind] = data[kind].filter(x => x.id !== item.id);
        render();
      } catch (err) {
        b.disabled = false;
        if (err.message === "unauthorized") showLogin("Нэвтрэх хугацаа дууссан. Дахин нэвтэрнэ үү.");
      }
    });
    return b;
  }

  function render() {
    const coming = data.rsvps.filter(r => r.attendance !== NO);
    const adults = coming.reduce((s, r) => s + r.adults, 0);
    const kids = coming.reduce((s, r) => s + r.kids, 0);
    $("#stGuests").textContent = adults + kids;
    $("#stAdults").textContent = adults;
    $("#stKids").textContent = kids;
    $("#stNo").textContent = data.rsvps.length - coming.length;
    $("#cntRsvp").textContent = data.rsvps.length;

    const q = $("#search").value.trim().toLowerCase();
    const list = $("#list");
    list.replaceChildren();

    data.rsvps.filter(r => r.name.toLowerCase().includes(q)).forEach(r => {
      const no = r.attendance === NO;
      const li = el("li", "entry");
      const top = el("div", "entry__top");
      top.append(el("span", "entry__name", r.name), el("span", "entry__date", fmtDate(r.updated_at)));
      const meta = el("div", "entry__meta");
      meta.append(el("span", `badge ${no ? "badge--no" : "badge--yes"}`, r.attendance));
      if (!no) meta.append(el("span", "badge", `Том хүн ${r.adults}`), el("span", "badge", `Хүүхэд ${r.kids}`));
      meta.append(deleteButton("rsvps", r, r.name));
      li.append(top, meta);
      list.append(li);
    });

    const empty = $("#empty");
    empty.hidden = list.children.length > 0;
    empty.textContent = q ? "Хайлтад тохирох зүйл олдсонгүй." : "Одоогоор хариу ирээгүй байна.";
  }

  $("#search").addEventListener("input", render);

  // Already logged in (cookie still valid)? Go straight to the dashboard.
  load().catch(() => showLogin());
})();
