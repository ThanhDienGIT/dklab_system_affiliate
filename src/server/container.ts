import { unstable_cache } from "next/cache";
import { env } from "./config/env";
import { getDb } from "./db/client";
import { DrizzleProductRepository } from "./repositories/product.repo";
import { DrizzleTaxonomyRepository } from "./repositories/taxonomy.repo";
import { DrizzleAnalyticsRepository } from "./repositories/analytics.repo";
import { DrizzleAiConfigRepository } from "./repositories/ai.repo";
import { AiConfigService } from "./services/ai-config.service";
import { DrizzleBlogRepository } from "./repositories/blog.repo";
import { BlogService } from "./services/blog/blog.service";
import { googleCse, tavily } from "./services/blog/search-provider";
import { VerificationService } from "./services/verification.service";
import { mailerFromEnv } from "./services/mailer";
import { decryptPii, encryptPii } from "./security/pii";
import {
  DrizzleFavoriteRepository, DrizzleMiscRepository, DrizzleSettingsRepository, DrizzleTokenRepository, DrizzleUserRepository,
} from "./repositories/user.repo";
import { AuthService } from "./services/auth.service";
import { CatalogService, type CacheWrap } from "./services/catalog.service";
import { ExportService, ImportService } from "./services/import.service";
import { ProductAdminService } from "./services/product-admin.service";
import { ProfileService } from "./services/profile.service";
import { RecommendService } from "./services/recommend.service";
import { SearchService } from "./services/search/service";
import { TrackingService } from "./services/tracking.service";

/** Cache du lieu doc (5 phut) + the "catalog" de admin xoa ngay khi sua (updateTag). */
const nextCache: CacheWrap = (fn, key) => unstable_cache(fn, ["eleonore", ...key], { revalidate: 300, tags: ["catalog"] });

function build() {
  const db = getDb(env().DATABASE_URL, env().DB_POOL_MAX);
  const products = new DrizzleProductRepository(db);
  const taxonomy = new DrizzleTaxonomyRepository(db);
  const users = new DrizzleUserRepository(db);
  const tokens = new DrizzleTokenRepository(db);
  const favorites = new DrizzleFavoriteRepository(db);
  const settings = new DrizzleSettingsRepository(db);
  const misc = new DrizzleMiscRepository(db);
  const analytics = new DrizzleAnalyticsRepository(db);
  const aiConfig = new AiConfigService(
    new DrizzleAiConfigRepository(db),
    () => ({ apiKey: env().GEMINI_API_KEY, model: env().GEMINI_MODEL }),
    { encrypt: encryptPii, decrypt: decryptPii },
  );

  const catalog = new CatalogService(products, taxonomy, settings, favorites, nextCache);
  const productAdmin = new ProductAdminService(products, misc, catalog.taxonomy);
  const verification = new VerificationService(users, misc, mailerFromEnv, () => ({ appUrl: env().APP_URL, brand: env().MAIL_FROM_NAME }));
  const blogRepo = new DrizzleBlogRepository(db);
  const blog = new BlogService({
    blogs: blogRepo, product: (id) => products.findById(id), related: (p) => catalog.related(p, 12), byIds: (ids) => products.byIds(ids), ai: aiConfig,
    search: () => env().TAVILY_API_KEY ? tavily(env().TAVILY_API_KEY!) : env().GOOGLE_CSE_KEY && env().GOOGLE_CSE_CX ? googleCse(env().GOOGLE_CSE_KEY!, env().GOOGLE_CSE_CX!) : null,
  });
  return {
    db, aiConfig, verification, blog, blogRepo, products, taxonomy, users, tokens, favorites, settings, misc, analytics, catalog, productAdmin,
    /** goi y tim kiem pho bien (cache 10 phut, chung moi nguoi) */
    popularQueries: unstable_cache(() => analytics.popularQueries(14, 8), ["eleonore", "popular-queries"], { revalidate: 600 }),
    auth: new AuthService(users, tokens, favorites, misc, verification),
    profile: new ProfileService(users, misc),
    search: new SearchService(products, misc, catalog.taxonomy, aiConfig),
    recommend: new RecommendService(products, users, catalog.taxonomy),
    tracking: new TrackingService(products),
    importer: new ImportService(productAdmin, catalog.taxonomy),
    exporter: new ExportService(products),
  };
}

export type Container = ReturnType<typeof build>;
const g = globalThis as unknown as { __eleonoreContainer?: Container };

export function getContainer(): Container {
  g.__eleonoreContainer ??= build();
  return g.__eleonoreContainer;
}
