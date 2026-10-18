// Build tren Vercel: neu dat RUN_MIGRATIONS=1 thi chay migrate (va seed khi SEED_ON_BUILD=1) truoc khi build.
import { spawnSync } from "node:child_process";

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

if (process.env.RUN_MIGRATIONS === "1") {
  if (!process.env.DATABASE_URL) { console.error("RUN_MIGRATIONS=1 nhung thieu DATABASE_URL"); process.exit(1); }
  run("npx", ["tsx", "scripts/migrate.ts"]);
  if (process.env.SEED_ON_BUILD === "1") run("npx", ["tsx", "scripts/seed.ts"]);
}
run("npx", ["next", "build"]);
