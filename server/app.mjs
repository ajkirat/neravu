import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDb, databaseUrl } from "./db.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DATA_DIR = process.env.DATA_DIR || path.join(root, "data");

// Session secret: SESSION_SECRET (required when hosted, since there is no writable disk),
// else generated once and persisted for local use.
function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (databaseUrl() || process.env.VERCEL) throw new Error("SESSION_SECRET must be set when using a hosted database");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const f = path.join(DATA_DIR, ".secret");
  if (fs.existsSync(f)) return fs.readFileSync(f, "utf8");
  const s = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(f, s, { mode: 0o600 });
  return s;
}
const SECRET = loadSecret();
const dbp = createDb(DATA_DIR);
dbp.catch(() => {}); // surfaced per-request below

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
const secure = () => (process.env.NODE_ENV === "production" ? "; Secure" : "");
const setSession = (res, userId) => res.setHeader("Set-Cookie",
  `nv_session=${makeToken(userId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure()}`);

// Naive in-memory throttle (per server instance; on serverless it only slows bursts hitting one instance).
const hits = new Map();
const makeThrottle = (max, tag) => (req, res, next) => {
  const k = tag + req.ip, now = Date.now();
  const arr = (hits.get(k) || []).filter(t => now - t < 15 * 60e3);
  if (arr.length >= max) return res.status(429).json({ error: "Too many attempts. Try again later." });
  arr.push(now); hits.set(k, arr); next();
};
const throttle = makeThrottle(20, "a");
const pubThrottle = makeThrottle(120, "p");

// Async handler wrapper (Express 4 does not catch rejected promises) that also injects the db.
const h = fn => (req, res, next) => dbp.then(db => fn(req, res, db)).catch(next);

const auth = (req, res, next) => dbp.then(async db => {
  const uid = readToken(cookieOf(req).nv_session);
  const user = uid && await db.userById(uid);
  if (!user) return res.status(401).json({ error: "Not signed in" });
  req.user = user; next();
}).catch(next);
const authed = fn => [auth, h(fn)];

export const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "2mb" }));

app.post("/api/auth/signup", throttle, h(async (req, res, db) => {
  const { email, password, name } = req.body ?? {};
  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Enter a valid email" });
  if (typeof password !== "string" || password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  const e = email.trim().toLowerCase();
  if (await db.userByEmail(e)) return res.status(409).json({ error: "An account with this email already exists" });
  const id = crypto.randomUUID(), salt = crypto.randomBytes(16).toString("hex");
  const nm = (typeof name === "string" && name.trim()) || e.split("@")[0];
  try { await db.insertUser({ id, email: e, name: nm, salt, hash: hashPw(password, salt), created_at: new Date().toISOString() }); }
  catch { return res.status(409).json({ error: "An account with this email already exists" }); }
  setSession(res, id);
  res.json({ user: { id, email: e, name: nm } });
}));

app.post("/api/auth/login", throttle, h(async (req, res, db) => {
  const { email, password } = req.body ?? {};
  const u = typeof email === "string" && await db.userByEmail(email.trim().toLowerCase());
  const ok = u && typeof password === "string" &&
    crypto.timingSafeEqual(Buffer.from(hashPw(password, u.salt), "hex"), Buffer.from(u.hash, "hex"));
  if (!ok) return res.status(401).json({ error: "Incorrect email or password" });
  setSession(res, u.id);
  res.json({ user: { id: u.id, email: u.email, name: u.name } });
}));

app.post("/api/auth/logout", (_req, res) => {
  res.setHeader("Set-Cookie", "nv_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  res.json({ ok: true });
});

app.get("/api/auth/me", ...authed(async (req, res) => res.json({ user: req.user })));

app.get("/api/data", ...authed(async (req, res, db) => {
  const out = Object.fromEntries(COLLECTIONS.map(c => [c, []]));
  for (const r of await db.allRecords(req.user.id)) if (out[r.collection]) out[r.collection].push(r.data);
  res.json(out);
}));

// Apply a batch of writes atomically. ops: {t:"put",c,id,data} | {t:"del",c,id} | {t:"clear"}
app.post("/api/mutate", ...authed(async (req, res, db) => {
  const ops = req.body?.ops;
  const valid = Array.isArray(ops) && ops.length <= 5000 && ops.every(op =>
    op?.t === "clear" || ((op?.t === "put" || op?.t === "del") && COLLECTIONS.includes(op.c) && typeof op.id === "string" && op.id.length <= 64));
  if (!valid) return res.status(400).json({ error: "Bad request" });
  try { await db.applyOps(req.user.id, ops); } catch { return res.status(400).json({ error: "Bad request" }); }
  res.json({ ok: true });
}));

// ---- Public endpoints (no login), tightly validated ----
const propertyLookup = async (db, id) => {
  const row = typeof id === "string" && /^[\w-]{2,40}$/.test(id) && await db.findRecord("properties", id);
  if (!row) return null;
  const settings = (await db.getRecord(row.owner_id, "settings", "main")) || {};
  return { owner: row.owner_id, prop: row.data, pgName: settings.pgName || row.data.name, phone: settings.ownerPhone || "" };
};
app.get("/api/public/property/:id", pubThrottle, h(async (req, res, db) => {
  const f = await propertyLookup(db, req.params.id);
  if (!f) return res.status(404).json({ error: "This enquiry link is not valid" });
  res.json({ name: f.prop.name, address: f.prop.address, city: f.prop.city, pgName: f.pgName, phone: f.phone });
}));
app.post("/api/public/enquiry", throttle, h(async (req, res, db) => {
  const { propertyId, name, phone, note } = req.body ?? {};
  const f = await propertyLookup(db, propertyId);
  if (!f) return res.status(404).json({ error: "This enquiry link is not valid" });
  const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const n = str(name, 80), ph = str(phone, 20), nt = str(note, 500);
  if (!n || !/^[0-9+\- ]{7,20}$/.test(ph)) return res.status(400).json({ error: "Enter your name and a valid phone number" });
  if (await db.countRecords(f.owner, "leads") >= 5000) return res.status(429).json({ error: "Please contact the owner directly" });
  const id = crypto.randomUUID().slice(0, 8);
  await db.insertRecord(f.owner, "leads", id, { id, name: n, phone: ph, propertyId, source: "qr", note: nt, status: "new", createdAt: new Date().toISOString().slice(0, 10) });
  res.json({ ok: true });
}));

// Public pay page: a tenant opens /pay/:invoiceId from a reminder and pays the owner's UPI ID directly.
const invoiceLookup = async (db, id) => {
  const row = typeof id === "string" && /^[\w-]{2,40}$/.test(id) && await db.findRecord("invoices", id);
  if (!row) return null;
  const inv = row.data;
  const settings = (await db.getRecord(row.owner_id, "settings", "main")) || {};
  const tenant = await db.getRecord(row.owner_id, "tenants", inv.tenantId);
  const balance = inv.amount - (inv.payments || []).reduce((s, p) => s + p.amount, 0);
  return { owner: row.owner_id, inv, settings, tenant, balance };
};
app.get("/api/public/pay/:id", pubThrottle, h(async (req, res, db) => {
  const f = await invoiceLookup(db, req.params.id);
  if (!f || !f.tenant) return res.status(404).json({ error: "This payment link is not valid" });
  res.json({
    pgName: f.settings.pgName || "Your PG", tenantName: String(f.tenant.name).split(" ")[0], month: f.inv.month,
    balance: Math.max(f.balance, 0), dueDate: f.inv.dueDate, upiId: f.settings.upiId || "", claimed: !!f.inv.claimedAt,
  });
}));
app.post("/api/public/pay/:id/claim", pubThrottle, h(async (req, res, db) => {
  const f = await invoiceLookup(db, req.params.id);
  if (!f || !f.tenant) return res.status(404).json({ error: "This payment link is not valid" });
  if (f.balance > 0) await db.updateRecord(f.owner, "invoices", f.inv.id, { ...f.inv, claimedAt: new Date().toISOString().slice(0, 10) });
  res.json({ ok: true });
}));

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});
