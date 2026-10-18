import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getContainer } from "@/server/container";
import { Breadcrumb } from "@/components/ui/section";
import { Markdown } from "@/components/blog/markdown";
import { ProductGrid } from "@/components/product/product-grid";

export const revalidate = 300;
const load = cache((slug: string) => getContainer().blogRepo.findPublishedBySlug(slug));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return {};
  return { title: p.title, description: p.excerpt, openGraph: { title: p.title, description: p.excerpt, type: "article", images: p.coverUrl ? [p.coverUrl] : undefined } };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const post = await load((await params).slug);
  if (!post) notFound();
  const c = getContainer();
  const mentioned = await c.blogRepo.productIdsOf(post.id).then((ids) => c.products.byIds(ids));
  return (
    <>
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Blog", href: "/blog" }, { label: post.title }]} />
      <article className="mx-auto max-w-3xl">
        <h1 className="text-4xl leading-tight md:text-5xl">{post.title}</h1>
        {post.publishedAt && <time className="mt-2 block text-sm text-muted" dateTime={post.publishedAt.toISOString()}>{post.publishedAt.toLocaleDateString("vi-VN")}</time>}
        {post.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverUrl} alt={post.title} referrerPolicy="no-referrer" className="my-6 w-full" />
        )}
        <Markdown>{post.content}</Markdown>
      </article>
      {mentioned.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-5 text-3xl">Sản phẩm được nhắc tới</h2>
          <ProductGrid items={mentioned} cols={4} />
        </section>
      )}
    </>
  );
}
