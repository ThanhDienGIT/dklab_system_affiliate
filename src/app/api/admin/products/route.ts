import { api, assertSameOrigin, bustCatalog, json, readJson, requirePermissionApi } from "@/server/http";
import { getContainer } from "@/server/container";

export const POST = api(async (req: Request) => {
  assertSameOrigin(req);
  const u = await requirePermissionApi("product.write");
  const id = await getContainer().productAdmin.create(await readJson(req), u.id);
  bustCatalog();
  return json({ id }, 201);
});
