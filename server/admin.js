// Admin API: login with a signed, HttpOnly session cookie; list and delete entries.
import { Router } from "express";
import crypto from "node:crypto";
import { db } from "./db.js";
import { rateLimit } from "./rate-limit.js";

const USER = process.env.ADMIN_USER || "admin";
const PASS = process.env.ADMIN_PASS || "admin";
// Without SESSION_SECRET a new one is made on each start, which just logs the admin out.
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const COOKIE = "admin_session";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

if (!process.env.ADMIN_PASS) {
  console.warn("⚠ ADMIN_PASS тохируулаагүй тул анхдагч admin/admin ашиглаж байна.");
}

const hmac = data => crypto.createHmac("sha256", SECRET).update(data).digest("base64url");

function safeEqual(a, b) {
  const x = Buffer.from(String(a ?? ""));
  const y = Buffer.from(String(b ?? ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${hmac(data)}`;
}

function verify(token) {
  const [data, mac] = String(token ?? "").split(".");
  if (!data || !mac || !safeEqual(mac, hmac(data))) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

function readCookie(req, name) {
  const pair = (req.headers.cookie ?? "").split(/;\s*/).find(c => c.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}

function setSessionCookie(req, res, value, maxAgeMs) {
  const parts = [`${COOKIE}=${value}`, "Path=/", "HttpOnly", "SameSite=Strict", `Max-Age=${Math.floor(maxAgeMs / 1000)}`];
  if (req.secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

function requireAdmin(req, res, next) {
  if (verify(readCookie(req, COOKIE))) return next();
  res.status(401).json({ ok: false, error: "unauthorized" });
}

const allRsvps = db.prepare("SELECT id, name, attendance, adults, kids, created_at, updated_at FROM rsvps ORDER BY updated_at DESC, id DESC");
const allWishes = db.prepare("SELECT id, author, message, created_at FROM wishes ORDER BY id DESC");
const deleteRsvp = db.prepare("DELETE FROM rsvps WHERE id = ?");
const deleteWish = db.prepare("DELETE FROM wishes WHERE id = ?");

export const adminRouter = Router();

adminRouter.post("/login", rateLimit({ windowMs: 15 * 60_000, max: 10 }), (req, res) => {
  const { username, password } = req.body ?? {};
  const userOk = safeEqual(username, USER);
  const passOk = safeEqual(password, PASS);
  if (!(userOk && passOk)) return res.status(401).json({ ok: false, error: "unauthorized" });
  setSessionCookie(req, res, sign({ u: USER, exp: Date.now() + TTL_MS }), TTL_MS);
  res.json({ ok: true });
});

adminRouter.post("/logout", (req, res) => {
  setSessionCookie(req, res, "", 0);
  res.json({ ok: true });
});

adminRouter.get("/data", requireAdmin, (req, res) => {
  res.json({ ok: true, rsvps: allRsvps.all(), wishes: allWishes.all() });
});

adminRouter.delete("/rsvps/:id", requireAdmin, (req, res) => {
  deleteRsvp.run(Number(req.params.id));
  res.json({ ok: true });
});

adminRouter.delete("/wishes/:id", requireAdmin, (req, res) => {
  deleteWish.run(Number(req.params.id));
  res.json({ ok: true });
});
