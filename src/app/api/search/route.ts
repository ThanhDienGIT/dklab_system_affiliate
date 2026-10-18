import { api, json } from "@/server/http";
import { getContainer } from "@/server/container";
import { enforceRate } from "@/server/security/rate-limit";
import { currentUser } from "@/server/session";

/** mode=fast: goi y tuc thoi (chi luat, khong goi Gemini, khong ghi log) */
export const GET = api(async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, 200);
  const fast = sp.get("mode") === "fast";
  await enforceRate(fast ? "suggest" : "search", fast ? 120 : 30, 60_000);
  if (!q) return json({ items: [], total: 0, labels: [], planner: "rules" });
  const user = fast ? null : await currentUser();
  const r = await getContainer().search.search(q, { mode: fast ? "fast" : "full", pageSize: fast ? 6 : 24, userId: user?.id ?? null, log: !fast });
  return json({
    items: r.result.items, total: r.result.total, labels: r.labels, planner: r.planner, relaxed: r.relaxed,
  });
});
