// Public API used by the invitation page.
import { Router } from "express";
import { db } from "./db.js";
import { rateLimit } from "./rate-limit.js";

export const ATTENDANCE = ["Очно", "Гэр бүлээрээ очно", "Очиж чадахгүй"];
const NOT_COMING = ATTENDANCE[2];

const text = (v, max) => String(v ?? "").trim().slice(0, max);
const count = (v, min, max) => {
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? min : Math.min(max, Math.max(min, n));
};

const upsertRsvp = db.prepare(`
  INSERT INTO rsvps (guest_id, name, attendance, adults, kids) VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(guest_id) DO UPDATE SET
    name = excluded.name,
    attendance = excluded.attendance,
    adults = excluded.adults,
    kids = excluded.kids,
    updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
`);
const insertWish = db.prepare("INSERT INTO wishes (author, message) VALUES (?, ?)");
const latestWishes = db.prepare("SELECT id, author, message, created_at FROM wishes ORDER BY id DESC LIMIT 30");

export const guestRouter = Router();
const writeLimit = rateLimit({ windowMs: 60_000, max: 10 });

guestRouter.post("/rsvp", writeLimit, (req, res) => {
  const b = req.body ?? {};
  const guestId = text(b.guestId, 64);
  const name = text(b.name, 60);
  const attendance = ATTENDANCE.includes(b.attendance) ? b.attendance : null;
  if (!/^[\w-]{8,64}$/.test(guestId) || !name || !attendance) {
    return res.status(400).json({ ok: false, error: "invalid" });
  }
  const coming = attendance !== NOT_COMING;
  upsertRsvp.run(guestId, name, attendance, coming ? count(b.adults, 1, 10) : 0, coming ? count(b.kids, 0, 10) : 0);
  res.json({ ok: true });
});

guestRouter.get("/wishes", (req, res) => {
  res.json({ ok: true, wishes: latestWishes.all() });
});

guestRouter.post("/wishes", writeLimit, (req, res) => {
  const b = req.body ?? {};
  const message = text(b.text, 240);
  if (!message) return res.status(400).json({ ok: false, error: "invalid" });
  const info = insertWish.run(text(b.from, 40), message);
  res.json({ ok: true, id: Number(info.lastInsertRowid) });
});
