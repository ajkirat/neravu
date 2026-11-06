import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// This test is a safety net for caretaker access. Everything in the app is OWNER-ONLY unless it is on
// the lists below. If you add a page or action, it will be owner-only by default; if you deliberately
// open something to caretakers, add it here and think about what it shows.

const ROOT = join(process.cwd(), "src/app");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const rel = (p: string) => relative(ROOT, p).split("\\").join("/");
const read = (p: string) => readFileSync(p, "utf8");

/** Files allowed to call requireActor(): the pages and the layout caretakers may use. */
const ACTOR_FILES = new Set([
  "(app)/layout.tsx",
  "(app)/more/page.tsx",
  "(app)/dashboard/page.tsx",
  "(app)/tenants/page.tsx",
  "(app)/tenants/[id]/page.tsx",
  "(app)/payments/page.tsx",
  "(app)/payments/[id]/receipt/page.tsx",
  "(app)/complaints/page.tsx",
  "(app)/leads/page.tsx",
  "(app)/expenses/page.tsx",
  "(app)/complaints/[id]/photo/route.ts",
  "(app)/send/route.ts",
  "(app)/expenses/[id]/page.tsx",
  "(app)/expenses/[id]/bill/route.ts",
  "(app)/reminders/page.tsx",
  "actions/payments.ts",
  "actions/reminders.ts",
  "actions/complaints.ts",
  "actions/leads.ts",
  "actions/expenses.ts",
]);

/** Actions a caretaker may call. Anything else that changes data must use requireOwner(). */
const ACTOR_ACTIONS = new Set(["recordPayment", "collectFull", "markReminded", "createComplaint", "setComplaintStatus", "createLead", "setLeadStatus", "setLeadFollowUp", "createExpense"]);

/** Actions anyone may call without signing in (they protect themselves another way). */
const PUBLIC_ACTIONS = new Set([
  "signup", "login", "logout", "staffLogin", "claimPayment", "startRazorpayPayment", "submitEnquiry", "submitJoin", "submitTenantComplaint", "requestLeave",
  "requestPasswordReset", "resetPassword", "resendVerification", "verifyEmailToken", "sendVerificationEmail",
  "setLanguage", "setTextSize",
]);

/** API routes a signed-in caretaker may call. They return nothing stored in the database. */
const CARETAKER_ROUTES = new Set(["api/expenses/scan/route.ts"]);

/** Pages under (app) with no check of their own: they only show static help text. */
const NO_CHECK_PAGES = new Set(["(app)/help/page.tsx"]);

describe("caretaker access", () => {
  const files = walk(ROOT).filter((p) => /\.(ts|tsx)$/.test(p));

  it("only the listed files may call requireActor()", () => {
    const using = files.filter((p) => /requireActor\(/.test(read(p))).map(rel);
    expect(using.filter((f) => !ACTOR_FILES.has(f))).toEqual([]);
  });

  it("every page and route under (app) checks who is signed in", () => {
    const targets = files.filter((p) => /^\(app\)\/.*(page\.tsx|route\.ts)$/.test(rel(p)));
    const missing = targets.filter((p) => {
      const f = rel(p);
      if (NO_CHECK_PAGES.has(f)) return false;
      return !/requireOwner\(|requireActor\(/.test(read(p));
    });
    expect(missing.map(rel)).toEqual([]);
  });

  it("pages that caretakers may open hide their sensitive parts behind an owner check", () => {
    for (const f of ["(app)/tenants/[id]/page.tsx", "(app)/dashboard/page.tsx", "(app)/tenants/page.tsx", "(app)/expenses/page.tsx"]) {
      expect(read(join(ROOT, f)), f).toMatch(/isOwner/);
    }
  });

  it("only the listed server actions may call requireActor(); all others require the owner", () => {
    const problems: string[] = [];
    for (const p of files.filter((x) => rel(x).startsWith("actions/"))) {
      const src = read(p);
      const re = /export async function (\w+)\b[\s\S]*?(?=\nexport (?:async )?function |\n*$)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const [block, name] = m;
        const usesActor = /requireActor\(/.test(block);
        const usesOwner = /requireOwner\(/.test(block);
        if (usesActor && !ACTOR_ACTIONS.has(name)) problems.push(`${rel(p)}:${name} lets caretakers in`);
        if (ACTOR_ACTIONS.has(name) && !usesActor) problems.push(`${rel(p)}:${name} should use requireActor`);
        if (!usesActor && !usesOwner && !PUBLIC_ACTIONS.has(name) && !/currentOwner\(|currentActor\(/.test(block)) problems.push(`${rel(p)}:${name} has no sign-in check`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("API routes that return data require the owner", () => {
    for (const p of files.filter((x) => /\/route\.ts$/.test(rel(x)) && !rel(x).startsWith("(app)/"))) {
      const src = read(p);
      const f = rel(p);
      if (f.startsWith("api/webhooks/") || f.startsWith("api/cron/") || f.startsWith("api/inbound/")) continue; // signature / secret protected
      // Reading a bill photo returns only what is on the photo, so caretakers may use it.
      if (CARETAKER_ROUTES.has(f)) {
        expect(/currentActor\(/.test(src), f).toBe(true);
        continue;
      }
      expect(/currentOwner\(|requireOwner\(/.test(src), f).toBe(true);
    }
  });
});
