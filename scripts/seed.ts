import { sql as dsql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { pgOptions } from "../src/server/db/client";
import * as s from "../src/server/db/schema";
import { SEED_CATEGORIES, SEED_STYLES } from "../src/server/seed-data/taxonomy";
import { SEED_PRODUCTS, STYLE_MATERIALS } from "../src/server/seed-data/products";
import { DEFAULT_SETTINGS } from "../src/server/domain/settings";
import { buildSearchText } from "../src/server/services/product-admin.service";
import { hashPassword } from "../src/server/security/password";
import { slugify } from "../src/lib/text";

for (const f of [".env.local", ".env"]) { try { process.loadEnvFile(f); } catch { /* khong co file: dung bien moi truong that */ } }

/** PRNG co dinh de du lieu mau giong nhau moi lan seed */
function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Thiếu DATABASE_URL (hoặc DIRECT_URL)");
  const client = postgres(url, { ...pgOptions(url), max: 1, onnotice: () => {} });
  const db = drizzle(client);
  const prod = process.env.NODE_ENV === "production";

  // ---- phong cach / the loai / loai cu the (khong ghi de neu admin da sua) ----
  for (const [i, st] of SEED_STYLES.entries()) {
    await db.insert(s.styles).values({
      slug: st.slug, name: st.name, tagline: st.tagline, intro: st.intro, palette: st.palette,
      signatureItems: st.signatureItems, keywords: st.keywords, sortOrder: i,
      heroImage: `/media/styles/${st.slug}-hero.webp`,
      moodImages: [1, 2, 3].map((n) => `/media/styles/${st.slug}-mood-${n}.webp`),
    }).onConflictDoNothing();
  }
  for (const [i, c] of SEED_CATEGORIES.entries()) {
    await db.insert(s.categories).values({ slug: c.slug, name: c.name, aliases: c.aliases, sortOrder: i }).onConflictDoNothing();
  }
  const cats = await db.select().from(s.categories);
  const catBySlug = new Map(cats.map((c) => [c.slug, c]));
  for (const c of SEED_CATEGORIES) {
    for (const [i, t] of c.types.entries()) {
      await db.insert(s.productTypes).values({ categoryId: catBySlug.get(c.slug)!.id, slug: t.slug, name: t.name, aliases: t.aliases, sortOrder: i }).onConflictDoNothing();
    }
  }
  const styleRows = await db.select().from(s.styles);
  const types = await db.select().from(s.productTypes);
  const styleBySlug = new Map(styleRows.map((x) => [x.slug, x]));
  const typeKey = (catId: number, slug: string) => types.find((t) => t.categoryId === catId && t.slug === slug);

  // ---- san pham mau ----
  const existing = new Set((await db.select({ slug: s.products.slug }).from(s.products)).map((r) => r.slug));
  let idx = 0, created = 0;
  for (const [styleSlug, byCat] of Object.entries(SEED_PRODUCTS)) {
    const style = styleBySlug.get(styleSlug)!;
    const mats = STYLE_MATERIALS[styleSlug] ?? [""];
    for (const [catSlug, rows] of Object.entries(byCat)) {
      const cat = catBySlug.get(catSlug)!;
      for (const [typeSlug, name, priceK, colorsCsv, origK] of rows) {
        idx++;
        const r = rng(idx * 7919);
        const type = typeKey(cat.id, typeSlug);
        if (!type) throw new Error(`Loại "${typeSlug}" không thuộc "${catSlug}"`);
        const slug = slugify(`${name} ${style.name}`);
        if (existing.has(slug)) continue;
        const colors = colorsCsv.split(",");
        const material = mats[idx % mats.length]!;
        const tags = [style.name, cat.name, type.name, ...style.signatureItems.slice(0, 2)];
        const sold = Math.round(10 + Math.pow(r(), 2.2) * 3400);
        const price = priceK * 1000;
        await db.insert(s.products).values({
          slug, name, styleId: style.id, categoryId: cat.id, typeId: type.id,
          description: `${name} thuộc phong cách ${style.name} — ${style.tagline.toLowerCase()}.\n\nChất liệu: ${material}. Phù hợp phối cùng ${style.signatureItems.slice(0, 2).join(" và ").toLowerCase()} để hoàn thiện tổng thể.\n\nLưu ý: đây là sản phẩm mẫu để minh hoạ giao diện. Hãy thay bằng sản phẩm thật và link affiliate của bạn trong trang quản trị.`,
          price, originalPrice: origK ? origK * 1000 : null, colors, sizes: ["S", "M", "L"], material, tags,
          images: [`/media/sample/${slug}-1.webp`, `/media/sample/${slug}-2.webp`],
          rating: (4.2 + r() * 0.8).toFixed(1), reviewCount: Math.round(5 + r() * 400), sold,
          merchant: "shopee", itemId: `DEMO-${String(idx).padStart(4, "0")}`,
          affiliateUrl: `https://shopee.vn/search?keyword=${encodeURIComponent(name)}`,
          productUrl: `https://shopee.vn/search?keyword=${encodeURIComponent(name)}`,
          commissionRate: "5.00", isFeatured: idx % 7 === 0, isDemo: true,
          searchText: buildSearchText({ name, tags, colors, material }, [style.name, cat.name, type.name]),
          publishedAt: new Date(Date.now() - Math.floor(r() * 70) * 864e5 - Math.floor(r() * 864e5)),
        }).onConflictDoNothing();
        created++;
      }
    }
  }

  // ---- cai dat site ----
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.insert(s.siteSettings).values({ key, value }).onConflictDoNothing();
  }

  // ---- tai khoan ----
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@eleonore.vn").toLowerCase();
  const adminPw = process.env.SEED_ADMIN_PASSWORD ?? "Eleonore@2026";
  await db.insert(s.users).values({
    email: adminEmail, role: "admin", fullName: "Quản trị Éleonore", emailVerified: true, consentAt: new Date(),
    passwordHash: await hashPassword(adminPw), avatarUrl: "/brand/avatar.webp",
  }).onConflictDoNothing();

  if (process.env.SEED_DEMO_USER ? process.env.SEED_DEMO_USER === "true" : !prod) {
    const [u] = await db.insert(s.users).values({
      email: "khach@eleonore.vn", fullName: "Nguyễn Minh Anh", phone: "0901234567", gender: "female", province: "Cần Thơ",
      size: "S", budgetMax: 500000, emailVerified: true, consentAt: new Date(), newsletter: true,
      passwordHash: await hashPassword("Eleonore@2026"),
    }).onConflictDoNothing().returning({ id: s.users.id });
    if (u) {
      const ids = ["y2k", "rococo"].map((k) => styleBySlug.get(k)!.id);
      await db.insert(s.userStyles).values(ids.map((styleId) => ({ userId: u.id, styleId }))).onConflictDoNothing();
    }
  }

  const rows = (await db.execute(dsql`select count(*)::int as n from products`)) as unknown as { n: number }[];
  const n = rows[0]?.n ?? 0;
  console.log(`[seed] OK. Sản phẩm mới: ${created}, tổng: ${n}. Admin: ${adminEmail}`);
  await client.end();
}
main().catch((e) => { console.error("[seed] LỖI:", e); process.exit(1); });
