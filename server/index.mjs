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

const COLLECTIONS = ["properties", "rooms", "tenants", "invoices", "expenses", "complaints", "leads", "settings"];
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
const makeThrottle = (max, tag) => (req, res, next) => {
  const k = tag + req.ip, now = Date.now();
  const arr = (hits.get(k) || []).filter(t => now - t < 15 * 60e3);
  if (arr.length >= max) return res.status(429).json({ error: "Too many attempts. Try again later." });
  arr.push(now); hits.set(k, arr); next();
};
const throttle = makeThrottle(20, "a");
const pubThrottle = makeThrottle(120, "p");

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

// ---- Public enquiry (QR) endpoints: no login, tightly validated ----
const propertyLookup = id => {
  const row = typeof id === "string" && db.prepare("SELECT owner_id, data FROM records WHERE collection='properties' AND id=?").get(id);
  if (!row) return null;
  const prop = JSON.parse(row.data);
  const st = db.prepare("SELECT data FROM records WHERE owner_id=? AND collection='settings' AND id='main'").get(row.owner_id);
  const settings = st ? JSON.parse(st.data) : {};
  return { owner: row.owner_id, prop, pgName: settings.pgName || prop.name, phone: settings.ownerPhone || "" };
};
app.get("/api/public/property/:id", (req, res) => {
  const f = propertyLookup(req.params.id);
  if (!f) return res.status(404).json({ error: "This enquiry link is not valid" });
  res.json({ name: f.prop.name, address: f.prop.address, city: f.prop.city, pgName: f.pgName, phone: f.phone });
});
app.post("/api/public/enquiry", throttle, (req, res) => {
  const { propertyId, name, phone, note } = req.body ?? {};
  const f = propertyLookup(propertyId);
  if (!f) return res.status(404).json({ error: "This enquiry link is not valid" });
  const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const n = str(name, 80), ph = str(phone, 20), nt = str(note, 500);
  if (!n || !/^[0-9+\- ]{7,20}$/.test(ph)) return res.status(400).json({ error: "Enter your name and a valid phone number" });
  const count = db.prepare("SELECT COUNT(*) c FROM records WHERE owner_id=? AND collection='leads'").get(f.owner).c;
  if (count >= 5000) return res.status(429).json({ error: "Please contact the owner directly" });
  const id = crypto.randomUUID().slice(0, 8);
  const lead = { id, name: n, phone: ph, propertyId, source: "qr", note: nt, status: "new", createdAt: new Date().toISOString().slice(0, 10) };
  db.prepare("INSERT INTO records VALUES (?,?,?,?)").run(f.owner, "leads", id, JSON.stringify(lead));
  res.json({ ok: true });
});

// Public pay page: a tenant opens /pay/:invoiceId from a reminder and pays the owner's UPI ID directly.
const invoiceLookup = id => {
  const row = typeof id === "string" && /^[\w-]{2,40}$/.test(id) &&
    db.prepare("SELECT owner_id, data FROM records WHERE collection='invoices' AND id=?").get(id);
  if (!row) return null;
  const inv = JSON.parse(row.data);
  const get = (c, i) => { const r = db.prepare("SELECT data FROM records WHERE owner_id=? AND collection=? AND id=?").get(row.owner_id, c, i); return r ? JSON.parse(r.data) : null; };
  const settings = get("settings", "main") || {}, tenant = get("tenants", inv.tenantId);
  const balance = inv.amount - (inv.payments || []).reduce((s, p) => s + p.amount, 0);
  return { owner: row.owner_id, inv, settings, tenant, balance };
};
app.get("/api/public/pay/:id", pubThrottle, (req, res) => {
  const f = invoiceLookup(req.params.id);
  if (!f || !f.tenant) return res.status(404).json({ error: "This payment link is not valid" });
  res.json({
    pgName: f.settings.pgName || "Your PG", tenantName: String(f.tenant.name).split(" ")[0], month: f.inv.month,
    balance: Math.max(f.balance, 0), dueDate: f.inv.dueDate, upiId: f.settings.upiId || "", claimed: !!f.inv.claimedAt,
  });
});
app.post("/api/public/pay/:id/claim", pubThrottle, (req, res) => {
  const f = invoiceLookup(req.params.id);
  if (!f || !f.tenant) return res.status(404).json({ error: "This payment link is not valid" });
  if (f.balance <= 0) return res.json({ ok: true });
  const inv = { ...f.inv, claimedAt: new Date().toISOString().slice(0, 10) };
  db.prepare("UPDATE records SET data=? WHERE owner_id=? AND collection='invoices' AND id=?").run(JSON.stringify(inv), f.owner, inv.id);
  res.json({ ok: true });
});

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

const dist = path.join(root, "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Neravu API on http://localhost:${port}`));
