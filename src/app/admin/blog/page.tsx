import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/session";
import { getContainer } from "@/server/container";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Blog" };
const MODE = { db: "Database", web: "Cào web", both: "DB + web" } as Record<string, string>;

export default async function AdminBlog() {
  await requirePermission("product.write", "/admin/blog");
  const posts = await getContainer().blogRepo.listAdmin(100, 0);
  return (
    <>
      <PageHeader title="Blog" crumbs={[{ label: "Nội dung" }, { label: "Blog" }]}
        description={<>Tạo bài mới bằng AI từ trang <Link className="underline" href="/admin/san-pham">Sản phẩm</Link> (nút “Blog AI” ở mỗi dòng). Bài AI tạo luôn là bản nháp, cần bạn duyệt rồi mới xuất bản.</>} />
      {posts.length === 0 ? <p className="py-10 text-muted">Chưa có bài viết.</p> : (
        <ul className="divide-y divide-line border border-line bg-paper">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/blog/${p.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 hover:bg-sand/40">
                <span className="min-w-0"><span className="block truncate font-medium">{p.title}</span>
                  <span className="text-xs text-muted">{MODE[p.sourceMode] ?? p.sourceMode} · {p.createdAt.toLocaleDateString("vi-VN")}</span></span>
                <span className={`text-xs uppercase tracking-wider ${p.status === "published" ? "text-green-700" : "text-muted"}`}>{p.status === "published" ? "Đã xuất bản" : "Nháp"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
