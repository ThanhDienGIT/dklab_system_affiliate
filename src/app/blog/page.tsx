import type { Metadata } from "next";
import Link from "next/link";
import { getContainer } from "@/server/container";
import { Breadcrumb } from "@/components/ui/section";
import { PageTitle } from "@/components/ui/page-title";
import { SmartImage } from "@/components/ui/smart-image";

export const revalidate = 300;
export const metadata: Metadata = { title: "Blog", description: "Gợi ý phối đồ, review và kinh nghiệm chọn sản phẩm thời trang tại Éleonore." };

export default async function BlogIndex() {
  const posts = await getContainer().blogRepo.listPublished(30, 0);
  return (
    <>
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Blog" }]} />
      <PageTitle title="Blog" sub="Gợi ý phối đồ & kinh nghiệm chọn mua" />
      {posts.length === 0 ? <p className="py-16 text-center text-muted">Chưa có bài viết nào.</p> : (
        <ul className="grid gap-x-5 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/blog/${p.slug}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden bg-sand">{p.coverUrl && <SmartImage src={p.coverUrl} alt={p.title} sizes="(min-width:1280px) 33vw, (min-width:768px) 50vw, 100vw" />}</div>
                <h2 className="mt-3 text-2xl leading-snug group-hover:underline">{p.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{p.excerpt}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
