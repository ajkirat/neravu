import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = process.env.DATA_DIR || path.join(root, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

// Session secret: env var, else generated once and persisted.
const secretFile = path.join(DATA_DIR, ".secret");
const SECRET = process.env.SESSION_SECRET || (fs.existsSync(secretFile)
  ? fs.readFileSync(secretFile, "utf8")
  : (() => { const s = crypto.randomBytes(32).toString("hex"); fs.writeFileSync(secretFile, s, { mode: 0o600 }); return s; })());

const db = new DatabaseSync(path.join(DATA_DIR, "neravu.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    salt TEXT NOT NULL, hash TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS records (
    owner_id TEXT NOT NULL, collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
    PRIMARY KEY (owner_id, collection, id)
  );
`);

const COLLECTIONS = ["properties", "rooms", "tenants", "invoices", "expenses", "complaints", "settings"];
const SESSION_DAYS = 30;

const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString("hex");
const sign = v => crypto.createHmac("sha256", SECRET).update(v).digest("base64url");
const makeToken = userId => {
  const body = Buffer.from(JSON.stringify({ u: userId, e: Date.now() + SESSION_DAYS * 864e5 })).toString("base64url");
  return `${body}.${sign(body)}`;
};
function readToken(tok) {
  if (!tok) return null;
  const [body, sig] = tok.split(".");
  if (!body || !sig) return null;
  const good = Buffer.from(sign(body)), got = Buffer.from(sig);
  if (good.length !== got.length || !crypto.timingSafeEqual(good, got)) return null;
  try { const p = JSON.parse(Buffer.from(body, "base64url").toString()); return p.e > Date.now() ? p.u : null; } catch { return null; }
}
const cookieOf = req => Object.fromEntries((req.headers.cookie || "").split(/;\s*/).filter(Boolean).map(c => {
  const i = c.indexOf("="); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
}));
const setSession = (res, userId) => res.setHeader("Set-Cookie",
  `nv_session=${makeToken(userId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);

// Naive in-memory throttle for auth endpoints (per IP).
const hits = new Map();
const throttle = (req, res, next) => {
  const k = req.ip, now = Date.now();
  const arr = (hits.get(k) || []).filter(t => now - t < 15 * 60e3);
  if (arr.length >= 20) return res.status(429).json({ error: "Too many attempts. Try again later." });
  arr.push(now); hits.set(k, arr); next();
};

const auth = (req, res, next) => {
  const uid = readToken(cookieOf(req).nv_session);
  const user = uid && db.prepare("SELECT id,email,name FROM users WHERE id=?").get(uid);
  if (!user) return res.status(401).json({ error: "Not signed in" });
  req.user = user; next();
};

const app = express();
app.use(express.json({ limit: "2mb" }));

app.post("/api/auth/signup", throttle, (req, res) => {
  const { email, password, name } = req.body ?? {};
  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Enter a valid email" });
  if (typeof password !== "string" || password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  const e = email.trim().toLowerCase();
  if (db.prepare("SELECT 1 FROM users WHERE email=?").get(e)) return res.status(409).json({ error: "An account with this email already exists" });
  const id = crypto.randomUUID(), salt = crypto.randomBytes(16).toString("hex");
  const nm = (typeof name === "string" && name.trim()) || e.split("@")[0];
  db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?)").run(id, e, nm, salt, hashPw(password, salt), new Date().toISOString());
  setSession(res, id);
  res.json({ user: { id, email: e, name: nm } });
});

app.post("/api/auth/login", throttle, (req, res) => {
  const { email, password } = req.body ?? {};
  const u = typeof email === "string" && db.prepare("SELECT * FROM users WHERE email=?").get(email.trim().toLowerCase());
  const ok = u && typeof password === "string" &&
    crypto.timingSafeEqual(Buffer.from(hashPw(password, u.salt), "hex"), Buffer.from(u.hash, "hex"));
  if (!ok) return res.status(401).json({ error: "Incorrect email or password" });
  setSession(res, u.id);
  res.json({ user: { id: u.id, email: u.email, name: u.name } });
});

app.post("/api/auth/logout", (_req, res) => {
  res.setHeader("Set-Cookie", "nv_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  res.json({ ok: true });
});

app.get("/api/auth/me", auth, (req, res) => res.json({ user: req.user }));

app.get("/api/data", auth, (req, res) => {
  const out = Object.fromEntries(COLLECTIONS.map(c => [c, []]));
  for (const r of db.prepare("SELECT collection,data FROM records WHERE owner_id=?").all(req.user.id))
    out[r.collection].push(JSON.parse(r.data));
  res.json(out);
});

// Apply a batch of writes atomically. ops: {t:"put",c,id,data} | {t:"del",c,id} | {t:"clear"}
app.post("/api/mutate", auth, (req, res) => {
  const ops = req.body?.ops;
  if (!Array.isArray(ops) || ops.length > 5000) return res.status(400).json({ error: "Bad request" });
  const put = db.prepare("INSERT INTO records VALUES (?,?,?,?) ON CONFLICT(owner_id,collection,id) DO UPDATE SET data=excluded.data");
  const del = db.prepare("DELETE FROM records WHERE owner_id=? AND collection=? AND id=?");
  const clear = db.prepare("DELETE FROM records WHERE owner_id=?");
  const uid = req.user.id;
  try {
    db.exec("BEGIN");
    for (const op of ops) {
      if (op.t === "clear") clear.run(uid);
      else if (!COLLECTIONS.includes(op.c) || typeof op.id !== "string") throw new Error("bad op");
      else if (op.t === "put") put.run(uid, op.c, op.id, JSON.stringify(op.data));
      else if (op.t === "del") del.run(uid, op.c, op.id);
      else throw new Error("bad op");
    }
    db.exec("COMMIT");
    res.json({ ok: true });
  } catch {
    db.exec("ROLLBACK");
    res.status(400).json({ error: "Bad request" });
  }
});

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

const dist = path.join(root, "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Neravu API on http://localhost:${port}`));
