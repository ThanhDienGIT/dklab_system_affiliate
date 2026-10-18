import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/session";
import { getContainer } from "@/server/container";
import { BlogEditor } from "@/components/admin/blog-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sửa bài blog" };

export default async function EditBlog({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  await requirePermission("product.write", `/admin/blog/${id}`);
  if (!Number.isInteger(id)) notFound();
  const c = getContainer();
  const post = await c.blogRepo.findById(id);
  if (!post) notFound();
  const products = await c.blogRepo.productIdsOf(id).then((ids) => c.products.byIds(ids));
  return (
    <BlogEditor
      post={{ id: post.id, slug: post.slug, title: post.title, excerpt: post.excerpt, content: post.content, coverUrl: post.coverUrl, status: post.status,
        sourceMode: post.sourceMode, sources: post.sources, imageCandidates: post.imageCandidates, aiModel: post.aiModel }}
      products={products.map((p) => ({ id: p.id, name: p.name, slug: p.slug }))}
    />
  );
}
