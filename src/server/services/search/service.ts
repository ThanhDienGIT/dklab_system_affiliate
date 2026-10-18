import type { Paged, ProductCard, ProductFilter, SearchPlan, Taxonomy } from "@/server/domain/types";
import type { ProductRepository, } from "@/server/repositories/product.repo";
import type { MiscRepository } from "@/server/repositories/user.repo";
import { limit } from "@/server/security/rate-limit";
import { env } from "@/server/config/env";
import type { AiConfigService } from "../ai-config.service";
import { colorName } from "@/lib/constants";
import { formatVnd, shortVnd } from "@/lib/format";
import { buildAliasIndex, isSelfExplained, parseQuery } from "./rules";
import { planWithGemini } from "./llm";

export type Planner = "rules" | "llm" | "rules+llm";

export interface SearchOutcome {
  query: string; plan: SearchPlan; planner: Planner; labels: string[];
  result: Paged<ProductCard>; relaxed: string[]; llmError: string | null;
}

export interface SearchOptions { page?: number; pageSize?: number; mode?: "full" | "fast"; userId?: string | null; log?: boolean }

/** Gop ke hoach: luat (chinh xac voi so/slug) uu tien, LLM bo sung cho cau tu nhien. */
export function mergePlans(rule: SearchPlan, llm: SearchPlan): SearchPlan {
  const hasType = rule.typeSlug ?? llm.typeSlug;
  return {
    styleSlug: rule.styleSlug ?? llm.styleSlug,
    typeSlug: hasType,
    categorySlug: rule.categorySlug ?? llm.categorySlug,
    colors: [...new Set([...rule.colors, ...llm.colors])],
    priceMin: rule.priceMin ?? llm.priceMin,
    priceMax: rule.priceMax ?? llm.priceMax,
    keywords: llm.keywords.length ? llm.keywords : rule.keywords,
    sort: rule.sort ?? llm.sort,
    onSale: rule.onSale ?? llm.onSale,
  };
}

export function planToFilter(p: SearchPlan, extra: Partial<ProductFilter> = {}): ProductFilter {
  return {
    styleSlug: p.styleSlug, categorySlug: p.categorySlug, typeSlug: p.typeSlug,
    colors: p.colors.length ? p.colors : undefined, priceMin: p.priceMin, priceMax: p.priceMax,
    keywords: p.keywords.length ? p.keywords : undefined, rawQuery: p.keywords.join(" "),
    onSale: p.onSale, sort: p.sort ?? (p.keywords.length ? "relevance" : "popular"), ...extra,
  };
}

export function describePlan(p: SearchPlan, t: Taxonomy): string[] {
  const out: string[] = [];
  const style = t.styles.find((s) => s.slug === p.styleSlug);
  const cat = t.categories.find((c) => c.slug === p.categorySlug);
  const type = t.types.find((x) => x.slug === p.typeSlug && (!cat || x.categoryId === cat.id));
  if (style) out.push(`Phong cách: ${style.name}`);
  if (cat) out.push(`Thể loại: ${cat.name}`);
  if (type) out.push(`Loại: ${type.name}`);
  if (p.priceMin !== undefined && p.priceMax !== undefined) out.push(`Giá: ${shortVnd(p.priceMin)} – ${shortVnd(p.priceMax)}`);
  else if (p.priceMax !== undefined) out.push(`Giá: dưới ${formatVnd(p.priceMax)}`);
  else if (p.priceMin !== undefined) out.push(`Giá: từ ${formatVnd(p.priceMin)}`);
  if (p.colors.length) out.push(`Màu: ${p.colors.map(colorName).join(", ")}`);
  if (p.onSale) out.push("Đang giảm giá");
  if (p.keywords.length) out.push(`Từ khoá: ${p.keywords.join(" ")}`);
  return out;
}

const PLAN_CACHE_MS = 10 * 60_000;
const planCache = new Map<string, { at: number; plan: SearchPlan }>();

export class SearchService {
  private idx: { for: Taxonomy; value: ReturnType<typeof buildAliasIndex> } | null = null;

  constructor(
    private products: ProductRepository,
    private misc: MiscRepository,
    private getTaxonomy: () => Promise<Taxonomy>,
    private ai?: Pick<AiConfigService, "resolve">,
  ) {}

  private aliasIndex(t: Taxonomy) {
    if (!this.idx || this.idx.for !== t) this.idx = { for: t, value: buildAliasIndex(t) };
    return this.idx.value;
  }

  async plan(query: string, mode: "full" | "fast"): Promise<{ plan: SearchPlan; planner: Planner; llmError: string | null; taxonomy: Taxonomy }> {
    const taxonomy = await this.getTaxonomy();
    const rule = parseQuery(query, taxonomy, this.aliasIndex(taxonomy));
    if (mode === "fast" || isSelfExplained(rule)) return { plan: rule, planner: "rules", llmError: null, taxonomy };
    // Model/API key do admin cau hinh (ai_settings) -> chuc nang "search"; khong co key -> chi dung luat
    const cfg = await this.ai?.resolve("search").catch(() => null);
    if (!cfg) return { plan: rule, planner: "rules", llmError: null, taxonomy };

    const key = `${cfg.model}|${query.trim().toLowerCase()}`;
    const hit = planCache.get(key);
    if (hit && Date.now() - hit.at < PLAN_CACHE_MS) return { plan: mergePlans(rule, hit.plan), planner: "rules+llm", llmError: null, taxonomy };
    // Tran toan he thong (chi tinh cac lan that su goi Gemini, khong tinh cache): bot nhieu IP cung khong dot het quota
    if (!(await limit("llm:search:hour", env().LLM_SEARCH_HOURLY_CAP, 3_600_000)).ok) return { plan: rule, planner: "rules", llmError: null, taxonomy };
    try {
      const llm = await planWithGemini(query, taxonomy, cfg);
      if (planCache.size > 500) planCache.clear();
      planCache.set(key, { at: Date.now(), plan: llm });
      return { plan: mergePlans(rule, llm), planner: "rules+llm", llmError: null, taxonomy };
    } catch (e) {
      // Gemini loi / het han muc / timeout -> van tra ket qua bang luat, khong lam hong tim kiem
      return { plan: rule, planner: "rules", llmError: e instanceof Error ? e.message.slice(0, 160) : "llm_error", taxonomy };
    }
  }

  async search(query: string, opts: SearchOptions = {}): Promise<SearchOutcome> {
    const q = query.trim().slice(0, 200);
    const { plan, planner, llmError, taxonomy } = await this.plan(q, opts.mode ?? "full");
    const base = { page: opts.page ?? 1, pageSize: opts.pageSize ?? 24 };

    // Neu 0 ket qua: noi dan tung dieu kien (tu khoa -> mau -> loai -> gia -> the loai) va bao ro da bo gi
    const steps: { label: string; apply: (p: SearchPlan) => SearchPlan }[] = [
      { label: "từ khoá", apply: (p) => ({ ...p, keywords: [] }) },
      { label: "màu sắc", apply: (p) => ({ ...p, colors: [] }) },
      { label: "loại cụ thể", apply: (p) => ({ ...p, typeSlug: undefined }) },
      { label: "khoảng giá", apply: (p) => ({ ...p, priceMin: undefined, priceMax: undefined }) },
      { label: "thể loại", apply: (p) => ({ ...p, categorySlug: undefined }) },
    ];
    let used = plan;
    let result = await this.products.list(planToFilter(used, base));
    const relaxed: string[] = [];
    if (result.total === 0 && opts.mode !== "fast") {
      for (const s of steps) {
        const next = s.apply(used);
        if (JSON.stringify(next) === JSON.stringify(used)) continue;
        used = next; relaxed.push(s.label);
        result = await this.products.list(planToFilter(used, base));
        if (result.total > 0) break;
      }
    }
    if (opts.log !== false && opts.mode !== "fast" && q) {
      void this.misc.logSearch({
        query: q, plan: plan as unknown as Record<string, unknown>, planner,
        resultCount: relaxed.length ? 0 : result.total, userId: opts.userId ?? null,
      }).catch(() => {});
    }
    return { query: q, plan, planner, labels: describePlan(plan, taxonomy), result, relaxed, llmError };
  }
}
