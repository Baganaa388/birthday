// SQLite storage (built into Node, no native install needed).
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "birthday.db"));

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS rsvps (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id    TEXT    NOT NULL UNIQUE,  -- random id kept in the guest's browser, so edits update one row
    name        TEXT    NOT NULL,
    attendance  TEXT    NOT NULL,
    adults      INTEGER NOT NULL DEFAULT 0,
    kids        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );
`);

// Added later: the arrival time slot a guest picked (e.g. "11:00–13:00").
const columns = db.prepare("PRAGMA table_info(rsvps)").all().map(c => c.name);
if (!columns.includes("slot")) {
  db.exec("ALTER TABLE rsvps ADD COLUMN slot TEXT NOT NULL DEFAULT ''");
}
