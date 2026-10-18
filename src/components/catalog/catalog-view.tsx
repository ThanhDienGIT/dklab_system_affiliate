import Link from "next/link";
import { getContainer } from "@/server/container";
import type { ProductFilter } from "@/server/domain/types";
import type { SortKey } from "@/lib/constants";
import { stateToFilter, type CatalogState } from "@/lib/catalog-params";
import { ProductGrid } from "@/components/product/product-grid";
import { FilterPanel, SortSelect } from "./filter-panel";
import { Pagination } from "./pagination";
import { StyleTree } from "./style-tree";

/** Trang danh sach dung chung: phong cach / the loai / moi ve / ban chay / giam gia / tat ca. */
export async function CatalogView({ path, state, base, defaultSort = "popular", styleSlug, categorySlug, lockStyle, lockCategory, showTree = true, emptyHint }: {
  path: string; state: CatalogState; base: ProductFilter; defaultSort?: SortKey; styleSlug?: string; categorySlug?: string;
  lockStyle?: boolean; lockCategory?: boolean; showTree?: boolean; emptyHint?: string;
}) {
  const c = getContainer();
  const filter = stateToFilter(state, base);
  const [result, facets, taxo, menu] = await Promise.all([
    c.catalog.list(filter), c.catalog.facets({ ...filter, typeSlug: undefined, page: 1 }), c.catalog.taxonomy(), c.catalog.menu(),
  ]);
  return (
    <div className="container-x grid gap-10 pb-4 pt-8 lg:grid-cols-[250px_1fr] xl:grid-cols-[270px_1fr]">
      <div data-lenis-prevent className="lg:sticky lg:top-[132px] lg:max-h-[calc(100dvh-148px)] lg:self-start lg:overflow-y-auto lg:pr-2 no-scrollbar">
        {showTree && <div className="hidden lg:block"><StyleTree menu={menu} style={styleSlug} category={categorySlug} /></div>}
        <FilterPanel path={path} state={state} facets={facets} defaultSort={defaultSort} total={result.total}
          styles={taxo.styles} categories={taxo.categories} lockStyle={lockStyle} lockCategory={lockCategory} />
      </div>
      <div className="min-w-0">
        <div className="mb-6 hidden items-center justify-between lg:flex">
          <p className="text-sm text-muted" role="status">{result.total} sản phẩm</p>
          <SortSelect path={path} state={state} defaultSort={defaultSort} />
        </div>
        <p className="mb-4 text-sm text-muted lg:hidden" role="status">{result.total} sản phẩm</p>
        {result.items.length === 0 ? (
          <div className="grid place-items-center gap-4 border border-dashed border-line py-20 text-center">
            <p className="font-display text-3xl">Chưa có sản phẩm phù hợp</p>
            <p className="max-w-sm text-sm text-muted">{emptyHint ?? "Thử bỏ bớt bộ lọc hoặc khám phá phong cách khác."}</p>
            <Link href={path} className="btn btn-ghost">Xoá bộ lọc</Link>
          </div>
        ) : (
          <ProductGrid items={result.items} cols={3} showStyle={!lockStyle} priorityFirst={4} />
        )}
        <Pagination path={path} state={state} page={result.page} pageCount={result.pageCount} defaultSort={defaultSort} />
      </div>
    </div>
  );
}
