import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations should use a direct (non-pooled) connection when one is provided
// (Vercel + Neon sets DATABASE_URL_UNPOOLED). The app itself uses DATABASE_URL.
// The placeholder lets `prisma generate` run on a machine with no database configured.
const url =
  process.env["DATABASE_URL_UNPOOLED"] ??
  process.env["DATABASE_URL"] ??
  "postgresql://postgres:postgres@localhost:5432/neravu";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url },
});
