import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/eleonore" },
  strict: true,
});
