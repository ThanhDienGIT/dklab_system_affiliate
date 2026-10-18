import { describe, expect, it } from "vitest";
import { ImportService } from "@/server/services/import.service";
import { classifyProduct, parseCount, parseShopeeUrl } from "@/server/services/classify";
import { parseCsv } from "@/server/services/csv";
import { sampleTaxonomy } from "./fixtures";

/* Dong lay tu file that "Lay link san pham hang loat" cua Shopee Affiliate */
const AFF = `Mã sản phẩm,Tên sản phẩm,Giá,Doanh thu,Tên cửa hàng,Tỉ lệ hoa hồng,Hoa hồng,Link sản phẩm,Link ưu đãi
49266478361,"Hộp quà tặng Lason Gối thảo dược Ấm êm, Quà tặng 20/10 chăm sóc sức khỏe, Hộp quà dành tặng cho phụ nữ","298,0k",1k+,Lason ơi,"10,5%",₫29.800,https://shopee.vn/product/1807288249/49266478361,https://s.shopee.vn/2BFjnfVqGa
41034271604,"[BST HoaPAS 20.10] Bộ Quà Tặng ""Lung Linh"" Nước Hoa Và Trang Sức HAPAS","1,2tr",65,HAPAS Jewelry,15%,₫172.950,https://shopee.vn/product/1368971665/41034271604,https://s.shopee.vn/4B0oBLOEDA
28146027112,"[HOẢ TỐC 2H] Pop Socket từ tính mạnh Ngôi Sao Pastel Caro Hồng Xanh","110,4k",39,Phụ kiện bánh mì sandwich,"7,5%",₫7.728,https://shopee.vn/product/379563184/28146027112,https://s.shopee.vn/30oqnCSfZr
19094980397,"Chổi Quét Trần Nhà JYoohome Có Điều Chỉnh Độ Dài Tới 2,8m","16,0k",100k+,JYooHome Official Store,"7,5%",₫1.120,https://shopee.vn/product/745623397/19094980397,https://s.shopee.vn/4qGUyZLgrM
`;

function fakeAdmin() {
  const saved = new Map<string, Record<string, unknown>>();
  let id = 0;
  return {
    saved,
    admin: {
      prepare: async (v: Record<string, unknown>) => v,
      findByItemId: async (_m: string, itemId: string) => (saved.has(itemId) ? { id: 1 } : null),
      findBySlug: async () => null,
      upsertWrite: async (_id: number | null, w: Record<string, unknown>) => { saved.set(String(w.itemId), w); return ++id; },
    },
  };
}

describe("parseCount / parseShopeeUrl", () => {
  it("đọc số kiểu Shopee", () => {
    expect(parseCount("1k+")).toBe(1000);
    expect(parseCount("100k+")).toBe(100000);
    expect(parseCount("1,2tr")).toBe(1200000);
    expect(parseCount("90")).toBe(90);
    expect(parseCount("1.234")).toBe(1234);
    expect(parseCount("abc")).toBeNull();
  });
  it("tách shopId/itemId", () => {
    expect(parseShopeeUrl("https://shopee.vn/product/1807288249/49266478361")).toEqual({ shopId: "1807288249", itemId: "49266478361" });
    expect(parseShopeeUrl("https://shopee.vn/Ao-thun-i.123.456?x=1")).toEqual({ shopId: "123", itemId: "456" });
  });
});

describe("classifyProduct", () => {
  const t = sampleTaxonomy();
  const cat = (n: string) => t.categories.find((c) => c.id === classifyProduct(n, t).categoryId)?.slug ?? null;
  it("so khớp có dấu: 'túi giấy' không thành Giày dép", () => expect(cat("Set quà kèm túi giấy sang trọng")).toBe("qua-tang"));
  it("loại cụ thể", () => expect(cat("Pop Socket từ tính giá đỡ")).toBe("phu-kien"));
  it("túi xách", () => expect(cat("Túi xách nữ da cánh bướm")).toBe("tui-xach"));
  it("không khớp → null", () => expect(classifyProduct("Chổi quét trần nhà", t).categoryId).toBeNull());
});

describe("Nhập file Shopee Affiliate", () => {
  it("nhập trực tiếp: phân loại, hoa hồng, đã bán, shop, lưu nháp khi thiếu ảnh", async () => {
    const { admin, saved } = fakeAdmin();
    const svc = new ImportService(admin as never, async () => sampleTaxonomy());
    const r = await svc.run(AFF, "u1");
    expect(r.errors).toEqual([]);
    expect(r.created).toBe(4);
    const p = saved.get("49266478361")!;
    expect(p.price).toBe(298000);
    expect(p.commissionRate).toBe(10.5);
    expect(p.sold).toBe(1000);
    expect(p.status).toBe("draft");
    expect(p.merchant).toBe("shopee");
    expect(p.affiliateUrl).toBe("https://s.shopee.vn/2BFjnfVqGa");
    expect(p.detail).toMatchObject({ soldText: "1k+", shop: { name: "Lason ơi", url: "https://shopee.vn/shop/1807288249" } });
    expect((p.rawData as Record<string, string>)["Hoa hồng"]).toBe("₫29.800");
    expect(saved.get("41034271604")!.price).toBe(1200000);
    expect(r.notes.some((n) => n.message.includes("Nháp"))).toBe(true);
  });

  it("thiếu thể loại 'Khác' → tự tạo khi nhập thật, không tạo khi chạy thử", async () => {
    const base = sampleTaxonomy();
    const t = { ...base, categories: base.categories.filter((c) => c.slug !== "khac") };
    const created: string[] = [];
    const ensure = async (slug: string) => { created.push(slug); return { id: 999, slug, name: "Khác", aliases: [], sortOrder: 99, isActive: true }; };
    const dry = await new ImportService(fakeAdmin().admin as never, async () => t, ensure).run(AFF, "u1", { dryRun: true });
    expect(dry.errors).toEqual([]);
    expect(created).toEqual([]);
    const { admin, saved } = fakeAdmin();
    await new ImportService(admin as never, async () => t, ensure).run(AFF, "u1");
    expect(created).toEqual(["khac"]);
    expect(saved.get("19094980397")!.categoryId).toBe(999);
  });

  it("thể loại mặc định được ưu tiên hơn 'Khác'", async () => {
    const t = sampleTaxonomy();
    const def = t.categories.find((c) => c.slug === "phu-kien")!;
    const { admin, saved } = fakeAdmin();
    await new ImportService(admin as never, async () => t).run(AFF, "u1", { defaultCategoryId: def.id });
    expect(saved.get("19094980397")!.categoryId).toBe(def.id);
  });

  it("template chuẩn → (tool cào điền ảnh, phân loại) → nhập lại", async () => {
    const svc = new ImportService(null as never, async () => sampleTaxonomy());
    const { csv, report } = await svc.template(AFF);
    expect(report.created).toBe(4);
    const rows = parseCsv(csv);
    const h = rows[0]!;
    const at = (r: string[], n: string) => r[h.indexOf(n)]!;
    expect(at(rows[1]!, "Thể loại")).toBe("Quà tặng");
    expect(at(rows[1]!, "Tỉ lệ hoa hồng")).toBe("10.5%");
    expect(at(rows[1]!, "Hoa hồng")).toBe("29800");
    expect(at(rows[1]!, "Đã bán")).toBe("1000");
    // gia lap tool cao
    rows[1]![h.indexOf("Ảnh")] = "https://down-vn.img.susercontent.com/file/a|https://down-vn.img.susercontent.com/file/b";
    rows[1]![h.indexOf("Phân loại")] = JSON.stringify([{ name: "Màu", options: [{ name: "Hồng", image: null }] }]);
    rows[1]![h.indexOf("Mô tả")] = "Mô tả cào về";
    const back = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
    const { admin, saved } = fakeAdmin();
    const r = await new ImportService(admin as never, async () => sampleTaxonomy()).run(back, "u1");
    expect(r.errors).toEqual([]);
    const p = saved.get("49266478361")!;
    expect(p.images).toHaveLength(2);
    expect(p.status).toBe("published");
    expect(p.description).toBe("Mô tả cào về");
    expect(p.commissionRate).toBe(10.5);
    expect(p.detail).toMatchObject({ variants: [{ name: "Màu", options: [{ name: "Hồng" }] }], soldText: "1k+" });
  });
});

describe("Đọc file Excel (.xlsx)", () => {
  it("xlsx (có ô số, ô hyperlink) → CSV → template", async () => {
    const ExcelJS = (await import("exceljs")).default;
    const { readUpload } = await import("@/server/services/spreadsheet");
    const rows = parseCsv(AFF);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Sheet1");
    rows.forEach((r, i) => ws.addRow(i === 0 ? r : r.map((c, j) => (j === 7 ? { text: c, hyperlink: c } : j === 0 ? Number(c) : c))));
    const buf = await wb.xlsx.writeBuffer();
    const txt = await readUpload(new File([buf as ArrayBuffer], "aff.xlsx"));
    const back = parseCsv(txt);
    expect(back).toHaveLength(5);
    expect(back[1]![0]).toBe("49266478361");
    expect(back[1]![7]).toBe("https://shopee.vn/product/1807288249/49266478361");
    const { report } = await new ImportService(null as never, async () => sampleTaxonomy()).template(txt);
    expect(report.created).toBe(4);
  });
});
