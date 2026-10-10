import "dotenv/config";
import { defineConfig } from "prisma/config";
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // Fall back to a placeholder so `prisma generate` succeeds during build
  // even when DATABASE_URL is not injected (e.g. Render build phase).
  // The real DATABASE_URL is still read from the environment at runtime.
  datasource: { url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder" }
});
