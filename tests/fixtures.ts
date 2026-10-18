import type { Taxonomy } from "@/server/domain/types";
import { SEED_CATEGORIES, SEED_STYLES } from "@/server/seed-data/taxonomy";

/** Taxonomy mau (khong can DB) dung cho test bo phan tich tim kiem */
export function sampleTaxonomy(): Taxonomy {
  let tid = 0;
  const categories = SEED_CATEGORIES.map((c, i) => ({ id: i + 1, slug: c.slug, name: c.name, aliases: c.aliases, sortOrder: i, isActive: true }));
  return {
    styles: SEED_STYLES.map((s, i) => ({
      id: i + 1, slug: s.slug, name: s.name, tagline: s.tagline, intro: s.intro, palette: s.palette,
      signatureItems: s.signatureItems, keywords: s.keywords, heroImage: null, moodImages: [], sortOrder: i, isActive: true,
    })),
    categories,
    types: SEED_CATEGORIES.flatMap((c, ci) => c.types.map((t, i) => ({
      id: ++tid, categoryId: ci + 1, slug: t.slug, name: t.name, aliases: t.aliases, sortOrder: i, isActive: true,
    }))),
  };
}
