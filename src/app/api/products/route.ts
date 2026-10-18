import { api, json } from "@/server/http";
import { getContainer } from "@/server/container";

/** Lay the san pham theo danh sach id (trang Yeu thich cua khach) */
export const GET = api(async (req: Request) => {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 100);
  return json({ items: ids.length ? await getContainer().products.byIds(ids) : [] });
});
