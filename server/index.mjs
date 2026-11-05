// Standalone server (local dev and self-hosting): API + built frontend.
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "./app.mjs";

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Neravu on http://localhost:${port}`));
