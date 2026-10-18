import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { blogPostProducts, blogPosts, type BlogSource } from "../db/schema";

export interface BlogPostRow {
  id: number; slug: string; title: string; excerpt: string; content: string; coverUrl: string | null;
  status: "draft" | "published"; sourceMode: string; sources: BlogSource[]; imageCandidates: string[];
  primaryProductId: number | null; aiModel: string | null; createdAt: Date; updatedAt: Date; publishedAt: Date | null;
}
export type BlogListItem = Pick<BlogPostRow, "id" | "slug" | "title" | "excerpt" | "coverUrl" | "status" | "publishedAt" | "createdAt" | "sourceMode">;
export interface NewPost {
  slug: string; title: string; excerpt: string; content: string; coverUrl: string | null; sourceMode: string;
  sources: BlogSource[]; imageCandidates: string[]; primaryProductId: number | null; aiModel: string | null; authorId: string | null; productIds: number[];
}
export interface PostPatch { title?: string; slug?: string; excerpt?: string; content?: string; coverUrl?: string | null; status?: "draft" | "published"; productIds?: number[] }

export interface BlogRepository {
  create(p: NewPost): Promise<number>;
  slugTaken(slug: string, exceptId?: number): Promise<boolean>;
  findById(id: number): Promise<BlogPostRow | null>;
  findPublishedBySlug(slug: string): Promise<BlogPostRow | null>;
  productIdsOf(postId: number): Promise<number[]>;
  update(id: number, patch: PostPatch): Promise<void>;
  remove(id: number): Promise<void>;
  listAdmin(limit: number, offset: number): Promise<BlogListItem[]>;
  listPublished(limit: number, offset: number): Promise<BlogListItem[]>;
  publishedByProduct(productId: number, limit: number): Promise<BlogListItem[]>;
}

const listCols = {
  id: blogPosts.id, slug: blogPosts.slug, title: blogPosts.title, excerpt: blogPosts.excerpt, coverUrl: blogPosts.coverUrl,
  status: blogPosts.status, publishedAt: blogPosts.publishedAt, createdAt: blogPosts.createdAt, sourceMode: blogPosts.sourceMode,
};
const asItem = (r: Record<string, unknown>) => r as unknown as BlogListItem;

export class DrizzleBlogRepository implements BlogRepository {
  constructor(private db: Db) {}
  async create(p: NewPost) {
    return this.db.transaction(async (tx) => {
      const { productIds, ...row } = p;
      const [r] = await tx.insert(blogPosts).values(row).returning({ id: blogPosts.id });
      if (!r) throw new Error("Khong tao duoc bai viet");
      if (productIds.length) await tx.insert(blogPostProducts).values([...new Set(productIds)].map((productId) => ({ postId: r.id, productId }))).onConflictDoNothing();
      return r.id;
    });
  }
  async slugTaken(slug: string, exceptId?: number) {
    const r = await this.db.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
    return r.length > 0 && r[0]?.id !== exceptId;
  }
  async findById(id: number) {
    const [r] = await this.db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
    return (r as BlogPostRow | undefined) ?? null;
  }
  async findPublishedBySlug(slug: string) {
    const [r] = await this.db.select().from(blogPosts).where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published"))).limit(1);
    return (r as BlogPostRow | undefined) ?? null;
  }
  async productIdsOf(postId: number) {
    const r = await this.db.select({ id: blogPostProducts.productId }).from(blogPostProducts).where(eq(blogPostProducts.postId, postId));
    return r.map((x) => x.id);
  }
  async update(id: number, patch: PostPatch) {
    await this.db.transaction(async (tx) => {
      const { productIds, status, ...rest } = patch;
      const set: Record<string, unknown> = { ...rest, updatedAt: new Date() };
      if (status) {
        set.status = status;
        if (status === "published") set.publishedAt = sql`coalesce(${blogPosts.publishedAt}, now())`;
      }
      await tx.update(blogPosts).set(set).where(eq(blogPosts.id, id));
      if (productIds) {
        await tx.delete(blogPostProducts).where(eq(blogPostProducts.postId, id));
        if (productIds.length) await tx.insert(blogPostProducts).values([...new Set(productIds)].map((productId) => ({ postId: id, productId })));
      }
    });
  }
  async remove(id: number) { await this.db.delete(blogPosts).where(eq(blogPosts.id, id)); }
  async listAdmin(limit: number, offset: number) {
    return (await this.db.select(listCols).from(blogPosts).orderBy(desc(blogPosts.createdAt)).limit(limit).offset(offset)).map(asItem);
  }
  async listPublished(limit: number, offset: number) {
    return (await this.db.select(listCols).from(blogPosts)
      .where(and(eq(blogPosts.status, "published"), isNotNull(blogPosts.publishedAt)))
      .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.id)).limit(limit).offset(offset)).map(asItem);
  }
  async publishedByProduct(productId: number, limit: number) {
    const ids = this.db.select({ id: blogPostProducts.postId }).from(blogPostProducts).where(eq(blogPostProducts.productId, productId));
    return (await this.db.select(listCols).from(blogPosts)
      .where(and(eq(blogPosts.status, "published"), inArray(blogPosts.id, ids)))
      .orderBy(desc(blogPosts.publishedAt)).limit(limit)).map(asItem);
  }
}
