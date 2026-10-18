import type { MetadataRoute } from "next";
import { getContainer } from "@/server/container";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const c = getContainer();
  const [t, slugs, posts] = await Promise.all([c.catalog.taxonomy(), c.products.allSlugs(), c.blogRepo.listPublished(500, 0).catch(() => [])]);
  const now = new Date();
  return [
    { url: base, lastModified: now, priority: 1 },
    ...["moi-ve", "ban-chay", "giam-gia", "san-pham"].map((p) => ({ url: `${base}/${p}`, lastModified: now, priority: 0.8 })),
    ...t.styles.flatMap((s) => [
      { url: `${base}/phong-cach/${s.slug}`, lastModified: now, priority: 0.9 },
      ...t.categories.map((c2) => ({ url: `${base}/phong-cach/${s.slug}/${c2.slug}`, lastModified: now, priority: 0.7 })),
    ]),
    { url: `${base}/blog`, lastModified: now, priority: 0.7 },
    ...posts.map((b) => ({ url: `${base}/blog/${b.slug}`, lastModified: b.publishedAt ?? now, priority: 0.6 })),
    ...slugs.map((p) => ({ url: `${base}/san-pham/${p.slug}`, lastModified: p.updatedAt, priority: 0.6 })),
  ];
}
