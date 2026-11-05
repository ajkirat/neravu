// Vercel build: apply database migrations, then build the app.
// - Only PRODUCTION deploys change the database. Preview deploys of other branches skip it, so a
//   half-reviewed branch can never alter the live database.
// - Several builds can start at once; Prisma holds a database lock while migrating, so a second
//   build may have to wait. Retry a few times instead of failing the whole deploy.
import { spawnSync } from "node:child_process";

const run = (args) => spawnSync("npx", args, { stdio: "inherit", shell: process.platform === "win32" }).status ?? 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (process.env.VERCEL_ENV === "preview") {
  console.log("Preview build: skipping database migrations (they only run for production deploys).");
} else {
  let code = 1;
  for (let attempt = 1; attempt <= 4 && code !== 0; attempt++) {
    if (attempt > 1) {
      console.log(`Migration attempt ${attempt - 1} failed. Waiting before trying again...`);
      await sleep(15_000);
    }
    code = run(["prisma", "migrate", "deploy"]);
  }
  if (code !== 0) process.exit(code);
}
process.exit(run(["next", "build"]));
