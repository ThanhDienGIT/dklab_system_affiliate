import { api, json } from "@/server/http";
import { getContainer } from "@/server/container";

/** Tu khoa pho bien 14 ngay (co ket qua, >= 2 luot). Cache server 10 phut + CDN 5 phut. */
export const GET = api(async () => {
  const items = await getContainer().popularQueries().catch(() => [] as string[]);
  return json({ items }, { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" } });
});
