import { api, assertSameOrigin, bustCatalog, json, requirePermissionApi } from "@/server/http";
import { AppError } from "@/server/domain/errors";
import { getContainer } from "@/server/container";

export const POST = api(async (req: Request) => {
  assertSameOrigin(req);
  const u = await requirePermissionApi("import.run");
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw new AppError("VALIDATION", "Chưa chọn tệp JSON/CSV");
  if (file.size > 4 * 1024 * 1024) throw new AppError("VALIDATION", "Tệp tối đa 4MB (tách nhỏ nếu lớn hơn)");
  const report = await getContainer().importer.run(await file.text(), u.id, { dryRun: dry });
  if (!dry) bustCatalog();
  return json(report);
});
