// Birthday invitation server: serves public/ and the JSON API.
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { guestRouter } from "./guest.js";
import { adminRouter } from "./admin.js";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const app = express();

app.set("trust proxy", 1);           // correct req.ip / req.secure behind Render, Railway, nginx
app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

app.use("/api/admin", adminRouter);
app.use("/api", guestRouter);
app.use("/api", (req, res) => res.status(404).json({ ok: false, error: "not_found" }));

// index.html needs the site's full address in its og: tags (Messenger/Facebook previews).
app.get(["/", "/index.html"], (req, res, next) => {
  fs.readFile(path.join(publicDir, "index.html"), "utf8", (err, html) => {
    if (err) return next(err);
    const origin = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
    res.type("html").set("Cache-Control", "no-cache").send(html.replaceAll("%ORIGIN%", origin.replace(/\/$/, "")));
  });
});

// Cache files only in production so local text edits show up on refresh.
const isProd = process.env.NODE_ENV === "production";
app.use(express.static(publicDir, { extensions: ["html"], maxAge: isProd ? "1h" : 0 }));

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed" || err.type === "entity.too.large") {
    return res.status(400).json({ ok: false, error: "bad_request" });
  }
  console.error(err);
  res.status(500).json({ ok: false, error: "server_error" });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Урилга: http://localhost:${port}`);
  console.log(`Админ:  http://localhost:${port}/admin`);
});
