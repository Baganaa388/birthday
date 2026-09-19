/* Shared helpers and derived event data. Loaded right after config.js. */
window.App = (function () {
  const C = window.CONFIG;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** Create an element: h("li", { class: "x", text: "y", attrs: {...} }, ...children) */
  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    if (props.class) el.className = props.class;
    if (props.text != null) el.textContent = props.text;
    if (props.attrs) Object.entries(props.attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (props.style) Object.assign(el.style, props.style);
    children.flat().filter(Boolean).forEach(c => el.append(c));
    return el;
  }

  const fill = str => String(str)
    .replace(/\{fullName\}/g, C.child.fullName || C.child.name)
    .replace(/\{name\}/g, C.child.name);

  // Date parts in Ulaanbaatar time, independent of the guest's phone timezone.
  function ubParts(d) {
    const f = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ulaanbaatar", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false
    });
    const o = {};
    f.formatToParts(d).forEach(p => (o[p.type] = p.value));
    return o;
  }

  const WEEKDAYS = { Sun: "Ням", Mon: "Даваа", Tue: "Мягмар", Wed: "Лхагва", Thu: "Пүрэв", Fri: "Баасан", Sat: "Бямба" };
  const start = new Date(C.event.start);
  const end = new Date(C.event.end);
  const s = ubParts(start), e = ubParts(end);

  const when = {
    start, end,
    day: String(+s.day),
    month: String(+s.month),
    dateShort: `${s.month}.${s.day}`,
    dateLong: `${s.year} оны ${+s.month} сарын ${+s.day}`,
    monthLabel: `${+s.month} сар`,
    weekday: WEEKDAYS[s.weekday],
    time: `${s.hour}:${s.minute}`,
    endTime: `${e.hour}:${e.minute}`
  };

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const store = {
    get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {} }
  };

  return { C, $, $$, h, fill, when, reducedMotion, isIOS, store };
})();
