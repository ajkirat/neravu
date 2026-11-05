// Storage adapter. Postgres when DATABASE_URL/POSTGRES_URL is set (hosted, e.g. Vercel + Neon);
// otherwise a local SQLite file for development. All methods are async.
import path from "node:path";
import fs from "node:fs";

export const databaseUrl = () => process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

export async function createDb(dataDir) {
  return databaseUrl() ? pgDb(databaseUrl()) : sqliteDb(dataDir);
}

async function pgDb(url) {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 3 });
  const ready = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      salt TEXT NOT NULL, hash TEXT NOT NULL, created_at TEXT NOT NULL)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS records (
      owner_id TEXT NOT NULL, collection TEXT NOT NULL, id TEXT NOT NULL, data JSONB NOT NULL,
      seq BIGSERIAL, PRIMARY KEY (owner_id, collection, id))`);
    await pool.query("CREATE INDEX IF NOT EXISTS records_coll_id ON records (collection, id)");
  })();
  const q = async (text, params) => { await ready; return pool.query(text, params); };
  const UPSERT = "INSERT INTO records (owner_id,collection,id,data) VALUES ($1,$2,$3,$4) ON CONFLICT (owner_id,collection,id) DO UPDATE SET data=EXCLUDED.data";
  return {
    kind: "postgres",
    userByEmail: async email => (await q("SELECT * FROM users WHERE email=$1", [email])).rows[0],
    userById: async id => (await q("SELECT id,email,name FROM users WHERE id=$1", [id])).rows[0],
    insertUser: async u => { await q("INSERT INTO users VALUES ($1,$2,$3,$4,$5,$6)", [u.id, u.email, u.name, u.salt, u.hash, u.created_at]); },
    allRecords: async owner => (await q("SELECT collection,data FROM records WHERE owner_id=$1 ORDER BY seq", [owner])).rows,
    getRecord: async (owner, c, id) => (await q("SELECT data FROM records WHERE owner_id=$1 AND collection=$2 AND id=$3", [owner, c, id])).rows[0]?.data ?? null,
    findRecord: async (c, id) => (await q("SELECT owner_id,data FROM records WHERE collection=$1 AND id=$2 LIMIT 1", [c, id])).rows[0] ?? null,
    countRecords: async (owner, c) => +(await q("SELECT COUNT(*) AS n FROM records WHERE owner_id=$1 AND collection=$2", [owner, c])).rows[0].n,
    insertRecord: async (owner, c, id, data) => { await q("INSERT INTO records (owner_id,collection,id,data) VALUES ($1,$2,$3,$4)", [owner, c, id, JSON.stringify(data)]); },
    updateRecord: async (owner, c, id, data) => { await q("UPDATE records SET data=$4 WHERE owner_id=$1 AND collection=$2 AND id=$3", [owner, c, id, JSON.stringify(data)]); },
    async applyOps(owner, ops) {
      await ready;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const op of ops) {
          if (op.t === "clear") await client.query("DELETE FROM records WHERE owner_id=$1", [owner]);
          else if (op.t === "put") await client.query(UPSERT, [owner, op.c, op.id, JSON.stringify(op.data)]);
          else await client.query("DELETE FROM records WHERE owner_id=$1 AND collection=$2 AND id=$3", [owner, op.c, op.id]);
        }
        await client.query("COMMIT");
      } catch (e) { await client.query("ROLLBACK").catch(() => {}); throw e; } finally { client.release(); }
    },
  };
}

async function sqliteDb(dataDir) {
  const { DatabaseSync } = await import("node:sqlite");
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, "neravu.db"));
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      salt TEXT NOT NULL, hash TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS records (owner_id TEXT NOT NULL, collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
      PRIMARY KEY (owner_id, collection, id));
    CREATE INDEX IF NOT EXISTS records_coll_id ON records (collection, id);
  `);
  const UPSERT = "INSERT INTO records VALUES (?,?,?,?) ON CONFLICT(owner_id,collection,id) DO UPDATE SET data=excluded.data";
  return {
    kind: "sqlite",
    userByEmail: async email => db.prepare("SELECT * FROM users WHERE email=?").get(email),
    userById: async id => db.prepare("SELECT id,email,name FROM users WHERE id=?").get(id),
    insertUser: async u => { db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?)").run(u.id, u.email, u.name, u.salt, u.hash, u.created_at); },
    allRecords: async owner => db.prepare("SELECT collection,data FROM records WHERE owner_id=? ORDER BY rowid").all(owner).map(r => ({ collection: r.collection, data: JSON.parse(r.data) })),
    getRecord: async (owner, c, id) => { const r = db.prepare("SELECT data FROM records WHERE owner_id=? AND collection=? AND id=?").get(owner, c, id); return r ? JSON.parse(r.data) : null; },
    findRecord: async (c, id) => { const r = db.prepare("SELECT owner_id,data FROM records WHERE collection=? AND id=? LIMIT 1").get(c, id); return r ? { owner_id: r.owner_id, data: JSON.parse(r.data) } : null; },
    countRecords: async (owner, c) => db.prepare("SELECT COUNT(*) AS n FROM records WHERE owner_id=? AND collection=?").get(owner, c).n,
    insertRecord: async (owner, c, id, data) => { db.prepare("INSERT INTO records VALUES (?,?,?,?)").run(owner, c, id, JSON.stringify(data)); },
    updateRecord: async (owner, c, id, data) => { db.prepare("UPDATE records SET data=? WHERE owner_id=? AND collection=? AND id=?").run(JSON.stringify(data), owner, c, id); },
    async applyOps(owner, ops) {
      try {
        db.exec("BEGIN");
        for (const op of ops) {
          if (op.t === "clear") db.prepare("DELETE FROM records WHERE owner_id=?").run(owner);
          else if (op.t === "put") db.prepare(UPSERT).run(owner, op.c, op.id, JSON.stringify(op.data));
          else db.prepare("DELETE FROM records WHERE owner_id=? AND collection=? AND id=?").run(owner, op.c, op.id);
        }
        db.exec("COMMIT");
      } catch (e) { db.exec("ROLLBACK"); throw e; }
    },
  };
}
