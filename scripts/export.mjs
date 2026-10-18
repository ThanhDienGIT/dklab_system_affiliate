// Dong goi 2 ban: Vercel va Docker.   Dung:  pnpm export   ->  exports/eleonore-vercel.zip, exports/eleonore-docker.zip
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "exports");
const SKIP = new Set(["node_modules", ".next", ".git", "exports", "dist-export", "uploads", "deploy", "tsconfig.tsbuildinfo", "next-env.d.ts", "AGENTS.md", ".env", ".env.local", ".vercel"]);
const b64 = (n) => randomBytes(n).toString("base64");
const b64u = (n) => randomBytes(n).toString("base64url");

function copyBase(dest) {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(root, dest, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(root, src);
      if (!rel) return true;
      return !SKIP.has(rel.split(path.sep)[0]);
    },
  });
}

function zip(dir, name) {
  const file = path.join(out, `${name}.zip`);
  rmSync(file, { force: true });
  const r = spawnSync("zip", ["-qr", file, path.basename(dir)], { cwd: path.dirname(dir), stdio: "inherit" });
  if (r.status !== 0) {
    const tgz = file.replace(/\.zip$/, ".tar.gz");
    spawnSync("tar", ["-czf", tgz, "-C", path.dirname(dir), path.basename(dir)], { stdio: "inherit" });
    return tgz;
  }
  return file;
}

mkdirSync(out, { recursive: true });
const stage = mkdtempSync(path.join(tmpdir(), "eleonore-export-"));

// ---------- VERCEL ----------
{
  const dir = path.join(stage, "eleonore-vercel");
  copyBase(dir);
  cpSync(path.join(root, "deploy/vercel/vercel.json"), path.join(dir, "vercel.json"));
  cpSync(path.join(root, "deploy/vercel/vercel-build.mjs"), path.join(dir, "scripts/vercel-build.mjs"));
  cpSync(path.join(root, "deploy/vercel/.env.vercel.example"), path.join(dir, ".env.vercel.example"));
  cpSync(path.join(root, "deploy/vercel/README_VERCEL.md"), path.join(dir, "README_VERCEL.md"));
  console.log("OK  ", zip(dir, "eleonore-vercel"));
}

// ---------- DOCKER ----------
{
  const dir = path.join(stage, "eleonore-docker");
  copyBase(dir);
  for (const f of ["Dockerfile", "docker-compose.yml", ".dockerignore", "README_DOCKER.md"]) cpSync(path.join(root, "deploy/docker", f), path.join(dir, f));
  // .env rieng cho ban export nay: khoa bi mat ngau nhien, chay duoc ngay
  const adminPw = b64u(12) + "Aa1!";
  writeFileSync(path.join(dir, ".env"), [
    "# Sinh tu dong luc export. GIU BI MAT va SAO LUU file nay (dac biet PII_ENCRYPTION_KEY).",
    `POSTGRES_PASSWORD=${b64u(24)}`,
    `AUTH_SECRET=${b64u(48)}`,
    `PII_ENCRYPTION_KEY=${b64(32)}`,
    "APP_URL=http://localhost:3000",
    "WEB_PORT=3000",
    "SEED_ADMIN_EMAIL=admin@eleonore.vn",
    `SEED_ADMIN_PASSWORD=${adminPw}`,
    "SEED_DEMO_USER=true",
    "GOOGLE_CLIENT_ID=",
    "GOOGLE_CLIENT_SECRET=",
    "GEMINI_API_KEY=",
    "GEMINI_MODEL=gemini-2.5-flash",
    "",
  ].join("\n"));
  console.log("OK  ", zip(dir, "eleonore-docker"));
}
rmSync(stage, { recursive: true, force: true });
console.log("Xong. Mat khau admin ban Docker nam trong .env cua file zip (SEED_ADMIN_PASSWORD).");
