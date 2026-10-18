import { describe, expect, it } from "vitest";
import { CSV_HEAD, ImportService } from "@/server/services/import.service";
import { buildProductWorkbook } from "@/server/services/xlsx-template";
import { readUpload } from "@/server/services/spreadsheet";
import { sampleTaxonomy } from "./fixtures";

const AFF = `Mã sản phẩm,Tên sản phẩm,Giá,Doanh thu,Tên cửa hàng,Tỉ lệ hoa hồng,Hoa hồng,Link sản phẩm,Link ưu đãi
49266478361,"Túi xách nữ da cánh bướm","298,0k",1k+,Lason ơi,"10,5%",₫29.800,https://shopee.vn/product/1807288249/49266478361,https://s.shopee.vn/2BFjnfVqGa
`;

function admin() {
  const saved = new Map<string, Record<string, unknown>>();
  return {
    saved,
    admin: { prepare: async (v: Record<string, unknown>) => v, findByItemId: async () => null, findBySlug: async () => null, upsertWrite: async (_i: number | null, w: Record<string, unknown>) => { saved.set(String(w.itemId), w); return 1; } },
  };
}

async function load(buf: Buffer) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as never);
  return wb;
}

describe("Template Excel", () => {
  it("template trống có đủ 33 cột và dropdown lấy từ phân loại hiện có", async () => {
    const t = sampleTaxonomy();
    const wb = await load(await buildProductWorkbook({ head: CSV_HEAD, rows: [], taxonomy: t, title: "x" }));
    expect(wb.worksheets.map((w) => w.name)).toEqual(["SanPham", "DanhMuc", "HuongDan"]);
    const ws = wb.getWorksheet("SanPham")!;
    expect(CSV_HEAD.length).toBe(33);
    expect((ws.getRow(1).values as string[]).slice(1)).toEqual([...CSV_HEAD]);
    const dv = (h: string, r = 2) => ws.getCell(r, CSV_HEAD.indexOf(h as never) + 1).dataValidation;
    expect(dv("Phong cách")?.type).toBe("list");
    expect(dv("Phong cách")?.formulae?.[0]).toMatch(/^DanhMuc!\$A\$2:\$A\$\d+$/);
    expect(dv("Thể loại")?.formulae?.[0]).toMatch(/^DanhMuc!\$B\$2:\$B\$\d+$/);
    expect(dv("Loại")?.formulae?.[0]).toMatch(/OFFSET/);
    expect(dv("Sàn bán")?.formulae?.[0]).toBe('"shopee,tiktok,lazada,other"');
    expect(dv("Tên sản phẩm")).toBeUndefined();
    expect(dv("Phong cách", 2001)).toBeDefined();
    const ref = wb.getWorksheet("DanhMuc")!;
    const styles = ref.getColumn(1).values.slice(2).filter(Boolean);
    expect(styles).toEqual(t.styles.filter((s) => s.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map((s) => s.name));
  });

  it("template trống đọc lại không lỗi 'thiếu cột' (chọn đúng sheet SanPham)", async () => {
    const buf = await buildProductWorkbook({ head: CSV_HEAD, rows: [], taxonomy: sampleTaxonomy(), title: "x" });
    const text = await readUpload(new File([new Uint8Array(buf)], "t.xlsx"));
    expect(text.split(/\r?\n/)[0]).toContain("Tên sản phẩm");
    const r = await new ImportService(admin().admin as never, async () => sampleTaxonomy()).run(text, "u1");
    expect(r.errors.map((e) => e.message).join()).toMatch(/rỗng hoặc thiếu dòng dữ liệu/); // không phải "Thiếu cột bắt buộc"
  });

  it("vòng đầy đủ: Shopee → template xlsx → nhập lại", async () => {
    const a = admin();
    const svc = new ImportService(a.admin as never, async () => sampleTaxonomy());
    const { rows, report } = await svc.template(AFF);
    expect(report.errors).toEqual([]);
    const buf = await buildProductWorkbook({ head: CSV_HEAD, rows, taxonomy: sampleTaxonomy(), title: "x" });
    const text = await readUpload(new File([new Uint8Array(buf)], "t.xlsx"));
    const r = await svc.run(text, "u1");
    expect(r.errors).toEqual([]);
    expect(r.created).toBe(1);
    const p = a.saved.get("49266478361")!;
    expect(p.price).toBe(298000);
    expect(p.itemId).toBe("49266478361"); // mã 11 số không bị đổi thành 4.9E+10
  });

  it("CSV lưu ANSI (windows-1258/1252) từ Excel vẫn đọc được tiêu đề", async () => {
    const csv = "Tên sản phẩm,Giá\nÁo thun,100000\n";
    const bytes = new Uint8Array([...csv].map((ch) => { const c = ch.charCodeAt(0); return c < 256 ? c : 63; }));
    const text = await readUpload(new File([bytes], "x.csv"));
    expect(text.split("\n")[0]).toBeTruthy();
  });
});
