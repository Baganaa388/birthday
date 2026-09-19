// Public API used by the invitation page.
import { Router } from "express";
import { db } from "./db.js";
import { rateLimit } from "./rate-limit.js";

export const ATTENDANCE = ["Очно", "Гэр бүлээрээ очно", "Очиж чадахгүй"];
const NOT_COMING = ATTENDANCE[2];
// Slots come from public/assets/js/config.js; the server only checks the "HH:MM–HH:MM" shape.
const SLOT_RE = /^\d{1,2}:\d{2}\s?[–-]\s?\d{1,2}:\d{2}$/;

const text = (v, max) => String(v ?? "").trim().slice(0, max);
const count = (v, min, max) => {
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? min : Math.min(max, Math.max(min, n));
};

const upsertRsvp = db.prepare(`
  INSERT INTO rsvps (guest_id, name, attendance, slot, adults, kids) VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(guest_id) DO UPDATE SET
    name = excluded.name,
    attendance = excluded.attendance,
    slot = excluded.slot,
    adults = excluded.adults,
    kids = excluded.kids,
    updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
`);

const slotCounts = db.prepare(`
  SELECT slot, COUNT(*) AS guests, SUM(adults + kids) AS people
  FROM rsvps
  WHERE attendance != ? AND slot != ''
  GROUP BY slot
`);

export const guestRouter = Router();
const writeLimit = rateLimit({ windowMs: 60_000, max: 10 });

guestRouter.post("/rsvp", writeLimit, (req, res) => {
  const b = req.body ?? {};
  const guestId = text(b.guestId, 64);
  const name = text(b.name, 60);
  const attendance = ATTENDANCE.includes(b.attendance) ? b.attendance : null;
  const coming = attendance !== NOT_COMING;
  const slot = coming ? text(b.slot, 20) : "";
  if (!/^[\w-]{8,64}$/.test(guestId) || !name || !attendance || (coming && !SLOT_RE.test(slot))) {
    return res.status(400).json({ ok: false, error: "invalid" });
  }
  upsertRsvp.run(guestId, name, attendance, slot, coming ? count(b.adults, 1, 10) : 0, coming ? count(b.kids, 0, 10) : 0);
  res.json({ ok: true });
});

// How many people have picked each slot so far (shown next to each option).
guestRouter.get("/slots", (req, res) => {
  const counts = {};
  for (const r of slotCounts.all(NOT_COMING)) counts[r.slot] = { guests: r.guests, people: r.people };
  res.json({ ok: true, counts });
});
