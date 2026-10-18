import { api, assertSameOrigin, bustCatalog, json, requirePermissionApi } from "@/server/http";
import { getContainer } from "@/server/container";
import { readImportForm } from "@/server/http/import-form";

export const maxDuration = 60;

export const POST = api(async (req: Request) => {
  assertSameOrigin(req);
  const u = await requirePermissionApi("import.run");
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const f = await readImportForm(req);
  const report = await getContainer().importer.run(f.text, u.id, { dryRun: dry, defaultStyleId: f.defaultStyleId, defaultCategoryId: f.defaultCategoryId });
  if (!dry) bustCatalog();
  return json(report);
});
