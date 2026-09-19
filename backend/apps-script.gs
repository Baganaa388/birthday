/**
 * Урилгын хариу, ерөөлийг Google Sheets-т хадгалж, админд харуулна.
 *
 * Суулгах заавар: backend/README.md
 * Админы нэр, нууц үгийг энд бичихгүй. Apps Script → Project Settings →
 * Script properties хэсэгт ADMIN_USER, ADMIN_PASS гэж нэмнэ.
 */

const SHEETS = {
  rsvp: { name: "Хариу", headers: ["Огноо", "Нэр", "Ирэх эсэх", "Том хүн", "Хүүхэд"] },
  wish: { name: "Ерөөл", headers: ["Огноо", "Хэнээс", "Ерөөл"] }
};

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: "bad_request" });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (body.action === "list") return json(list(body));
    if (body.type === "rsvp") {
      append("rsvp", [new Date(), clean(body.name, 60), clean(body.attendance, 40), num(body.adults), num(body.kids)]);
      return json({ ok: true });
    }
    if (body.type === "wish") {
      append("wish", [new Date(), clean(body.from, 40), clean(body.text, 300)]);
      return json({ ok: true });
    }
    return json({ ok: false, error: "unknown_type" });
  } finally {
    lock.releaseLock();
  }
}

function list(body) {
  const props = PropertiesService.getScriptProperties();
  const user = props.getProperty("ADMIN_USER");
  const pass = props.getProperty("ADMIN_PASS");
  if (!user || !pass) return { ok: false, error: "not_configured" };
  if (body.username !== user || body.password !== pass) return { ok: false, error: "unauthorized" };
  return { ok: true, rsvp: rows("rsvp"), wishes: rows("wish") };
}

function sheet(kind) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = SHEETS[kind];
  let sh = ss.getSheetByName(cfg.name);
  if (!sh) {
    sh = ss.insertSheet(cfg.name);
    sh.appendRow(cfg.headers);
    sh.setFrozenRows(1);
  }
  return sh;
}

function append(kind, values) {
  sheet(kind).appendRow(values);
}

function rows(kind) {
  const values = sheet(kind).getDataRange().getValues();
  const headers = values.shift();
  return values.map(r => {
    const o = {};
    headers.forEach((h, i) => (o[h] = r[i] instanceof Date ? r[i].toISOString() : r[i]));
    return o;
  }).reverse(); // newest first
}

// Strip leading =,+,-,@ so guests cannot inject spreadsheet formulas.
function clean(v, max) {
  return String(v == null ? "" : v).trim().slice(0, max).replace(/^[=+\-@]+/, "");
}

function num(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : Math.max(0, Math.min(20, n));
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
