import type { Taxonomy } from "../domain/types";
import { COLORS } from "@/lib/constants";

export type Cell = string | number | null | undefined;

/** Hang toi da du lieu co dropdown (o ngoai khoang nay van nhap duoc, chi khong co dropdown) */
const MAX_ROWS = 2000;
/** Excel gioi han 32.767 ky tu/o; cot JSON dai hon se bi bo (xuat JSON de sao luu day du) */
const CELL_MAX = 32_000;
const NUMERIC = new Set(["Giá", "Giá gốc", "Hoa hồng", "Số đánh giá", "Đã bán", "Tồn kho"]);
const TEXT = new Set(["Mã sản phẩm", "Slug", "Tags", "Màu", "Size"]);
const REQUIRED = new Set(["Tên sản phẩm", "Giá"]);
const GUIDE: Record<string, string> = {
  "Mã sản phẩm": "Mã SP trên sàn (Shopee: itemId). Trùng mã sẽ CẬP NHẬT thay vì tạo mới",
  "Sàn bán": "Chọn: shopee / tiktok / lazada / other",
  "Tên sản phẩm": "BẮT BUỘC",
  "Slug": "Để trống để tự tạo từ tên",
  "Phong cách": "Chọn trong dropdown (quản lý ở Admin → Phân loại). Để trống: tự đoán theo tên",
  "Thể loại": "Chọn trong dropdown. Để trống: tự đoán theo tên, không khớp → “Khác”",
  "Loại": "Dropdown phụ thuộc Thể loại đã chọn ở cột bên trái",
  "Giá": "BẮT BUỘC. Số (VND), vd 185000",
  "Giá gốc": "Số (VND), để trống nếu không giảm giá",
  "Màu": `Nhiều giá trị ngăn bởi |. Hợp lệ: ${COLORS.map((c) => c.name).join(", ")}`,
  "Size": "Nhiều giá trị ngăn bởi |, vd S|M|L",
  "Tags": "Nhiều giá trị ngăn bởi |",
  "Ảnh": "Link ảnh (https://…) ngăn bởi |, tối đa 5. Không có ảnh → lưu Nháp",
  "Link affiliate": "Link ưu đãi (https://…)",
  "Link sản phẩm": "Link gốc trên sàn (https://…)",
  "Trạng thái": "published / draft / archived. Để trống: có ảnh → published, chưa có → draft",
  "Tỉ lệ hoa hồng": "vd 10,5% hoặc 10.5",
  "Nổi bật": "Chọn x để đánh dấu nổi bật",
  "Phân loại": "Dạng “Màu sắc: Be|Nâu; Size: S|M”",
  "Thuộc tính": "Dạng “Chất liệu: Da; Xuất xứ: Việt Nam”",
  "Chi tiết JSON": "Tool cào tự điền — không cần sửa tay",
  "Đánh giá JSON": "Tool cào tự điền — không cần sửa tay",
  "Dữ liệu gốc JSON": "Tool cào tự điền — không cần sửa tay",
};

export interface WorkbookInput {
  head: readonly string[];
  rows: Cell[][];
  taxonomy: Taxonomy;
  /** tieu de ghi chu o sheet huong dan */
  title: string;
}

/** Danh sach dropdown ghi thang ("a,b,c"): Excel gioi han 255 ky tu va dau phay la dau ngan -> qua dai / co dau phay thi tra undefined */
const inline = (names: string[]) => {
  if (!names.length || names.some((x) => /[,"]/.test(x))) return undefined;
  const s = `"${names.join(",")}"`;
  return s.length <= 255 ? s : undefined;
};
const normalizeName = (s: string) => s.normalize("NFC").trim().toLowerCase();

const colLetter = (n: number) => {
  let s = "";
  for (let i = n + 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};

/**
 * Tao tep Excel NHAP/XUAT san pham: sheet "SanPham" (du moi cot, header khop 100% voi bo nhap),
 * dropdown Phong cach / The loai / Loai (phu thuoc the loai) / San ban / Trang thai / Noi bat lay tu danh muc hien co,
 * sheet "DanhMuc" (danh sach tham chieu) va "HuongDan". Chon .xlsx de Excel khong lam hong dau tieng Viet nhu .csv.
 */
export async function buildProductWorkbook(input: WorkbookInput): Promise<Buffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Eleonore";
  const ws = wb.addWorksheet("SanPham", { views: [{ state: "frozen", ySplit: 1, xSplit: 3 }] });
  const ref = wb.addWorksheet("DanhMuc");
  const guide = wb.addWorksheet("HuongDan");
  const { head, rows, taxonomy: t } = input;

  /* ---------- DanhMuc: A phong cach | B the loai | C (trong) | D loai theo the loai (sap xep) + E ten the loai cua loai ---------- */
  const styles = t.styles.filter((s) => s.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const cats = t.categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const types = cats.flatMap((c) => t.types.filter((x) => x.isActive && x.categoryId === c.id).sort((a, b) => a.sortOrder - b.sortOrder));
  ref.getRow(1).values = ["Phong cách", "Thể loại", "Loại", "Thuộc thể loại", "Màu", "Sàn bán", "Trạng thái"];
  ref.getRow(1).font = { bold: true };
  const merchants = ["shopee", "tiktok", "lazada", "other"], statuses = ["published", "draft", "archived"];
  const n = Math.max(styles.length, cats.length, types.length, COLORS.length, 4);
  for (let i = 0; i < n; i++) {
    ref.getRow(i + 2).values = [styles[i]?.name ?? null, cats[i]?.name ?? null, types[i]?.name ?? null, types[i] ? catName.get(types[i]!.categoryId) ?? null : null, COLORS[i]?.name ?? null, merchants[i] ?? null, statuses[i] ?? null];
  }
  ref.columns.forEach((c) => { c.width = 22; });
  const range = (col: string, len: number) => `DanhMuc!$${col}$2:$${col}$${Math.max(len, 1) + 1}`;

  /* ---------- SanPham ---------- */
  ws.getRow(1).values = [...head];
  head.forEach((h, i) => {
    const cell = ws.getCell(1, i + 1);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REQUIRED.has(h) ? "FFB3261E" : "FF2B2622" } };
    cell.alignment = { vertical: "middle", wrapText: true };
    if (GUIDE[h]) cell.note = GUIDE[h]!;
    ws.getColumn(i + 1).width = ["Tên sản phẩm", "Mô tả", "Ảnh", "Link affiliate", "Link sản phẩm"].includes(h) ? 36 : ["Chi tiết JSON", "Đánh giá JSON", "Dữ liệu gốc JSON"].includes(h) ? 18 : 15;
  });
  ws.getRow(1).height = 30;
  let dropped = 0;
  rows.forEach((r, ri) => {
    r.forEach((raw, ci) => {
      const h = head[ci]!;
      if (raw === null || raw === undefined || raw === "") return;
      const cell = ws.getCell(ri + 2, ci + 1);
      if (typeof raw === "string" && raw.length > CELL_MAX) { dropped++; return; }
      if (NUMERIC.has(h) && /^-?\d+(\.\d+)?$/.test(String(raw))) { cell.value = Number(raw); if (h.startsWith("Giá") || h === "Hoa hồng") cell.numFmt = "#,##0"; return; }
      cell.value = TEXT.has(h) ? String(raw) : raw;
      if (TEXT.has(h)) cell.numFmt = "@";
    });
  });
  // cot ma SP / slug / tags luon la van ban (tranh Excel doi 11 so thanh 1.2E+10)
  for (const h of TEXT) { const i = head.indexOf(h); if (i >= 0) for (let r = 2; r <= MAX_ROWS + 1; r++) ws.getCell(r, i + 1).numFmt = "@"; }

  // Vung ten (named range): Excel 2007+, Google Sheets, WPS deu hieu; tham chieu thang sang sheet khac thi khong phai app nao cung doc
  wb.definedNames.add(range("A", styles.length), "DM_PhongCach");
  wb.definedNames.add(range("B", cats.length), "DM_TheLoai");
  wb.definedNames.add(range("C", types.length), "DM_Loai");
  wb.definedNames.add(range("D", types.length), "DM_LoaiTheLoai");

  const idx = (h: string) => head.indexOf(h);
  const warn = (title: string, msg: string) => ({ showErrorMessage: true, errorStyle: "warning" as const, errorTitle: title, error: msg, allowBlank: true });
  // 1 quy tac cho ca cot / doan dong, KHONG chong lan (exceljs gan tung o se sinh hang nghin quy tac, Excel bao "can sua tep" va xoa het dropdown)
  const dv = (ws as unknown as { dataValidations: { add(range: string, rule: unknown): void } }).dataValidations;
  const colRange = (h: string, from = 2, to = MAX_ROWS + 1) => `${colLetter(idx(h))}${from}:${colLetter(idx(h))}${to}`;
  const add = (h: string, formula: string, title: string, msg: string, from?: number, to?: number) => {
    if (idx(h) < 0) return;
    dv.add(colRange(h, from, to), { type: "list", formulae: [formula], ...warn(title, msg) });
  };
  add("Sàn bán", inline(merchants)!, "Sàn bán", "Chọn shopee, tiktok, lazada hoặc other");
  add("Phong cách", inline(styles.map((s) => s.name)) ?? "DM_PhongCach", "Phong cách chưa có", "Phong cách này chưa có trong hệ thống — thêm ở Admin → Phân loại, hoặc chọn từ danh sách");
  add("Thể loại", inline(cats.map((c) => c.name)) ?? "DM_TheLoai", "Thể loại chưa có", "Thể loại này chưa có trong hệ thống — thêm ở Admin → Phân loại, hoặc chọn từ danh sách");
  // Loai phu thuoc the loai:
  //  - dong da co the loai (xuat san pham / template Shopee) -> danh sach co dinh cac loai cua dung the loai do (chay ca Google Sheets/Numbers)
  //  - dong trong -> cong thuc: da chon the loai thi chi liet ke loai cua the loai do, chua chon thi liet ke tat ca
  const ci = idx("Thể loại");
  if (idx("Loại") >= 0 && ci >= 0) {
    const catCol = colLetter(ci);
    const formulaAt = (r: number) => types.length
      ? `OFFSET(DanhMuc!$C$2,IF(COUNTIF(DM_LoaiTheLoai,${catCol}${r}),MATCH(${catCol}${r},DM_LoaiTheLoai,0)-1,0),0,IF(COUNTIF(DM_LoaiTheLoai,${catCol}${r}),COUNTIF(DM_LoaiTheLoai,${catCol}${r}),ROWS(DM_Loai)),1)`
      : "DM_Loai";
    const byCat = new Map(cats.map((c) => [normalizeName(c.name), inline(types.filter((x) => x.categoryId === c.id).map((x) => x.name))]));
    const title = "Loại chưa có", msg = "Loại này không thuộc thể loại đã chọn hoặc chưa có — thêm ở Admin → Phân loại";
    // gom cac dong lien tiep cung danh sach thanh 1 quy tac; "" = dung cong thuc
    const keyAt = (r: number) => byCat.get(normalizeName(String(rows[r - 2]?.[ci] ?? ""))) ?? "";
    const last = Math.min(rows.length, MAX_ROWS) + 1; // dong du lieu cuoi cung
    let start = 2;
    for (let r = 3; r <= last + 1; r++) {
      const prev = keyAt(r - 1);
      if (r <= last && keyAt(r) === prev) continue;
      if (r > last && !prev) break; // doan cuoi dung cong thuc -> gop voi phan dong trong ben duoi
      add("Loại", prev || formulaAt(start), title, msg, start, r - 1);
      start = r;
    }
    add("Loại", formulaAt(start), title, msg, start, MAX_ROWS + 1);
  }
  add("Trạng thái", inline(statuses)!, "Trạng thái", "Chọn published, draft hoặc archived");
  add("Nổi bật", `"x"`, "Nổi bật", "Chọn x hoặc để trống");
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: head.length } };

  /* ---------- HuongDan ---------- */
  guide.getColumn(1).width = 26; guide.getColumn(2).width = 110;
  guide.addRow([input.title]).font = { bold: true, size: 14 };
  guide.addRow([]);
  [
    ["Cách dùng", "Điền sheet SanPham (mỗi dòng 1 sản phẩm) → lưu .xlsx → Admin → Nhập dữ liệu → chọn tệp → Kiểm tra thử → Nhập dữ liệu."],
    ["Cột bắt buộc", "Tên sản phẩm và Giá (đầu cột màu đỏ). Cột khác trống thì hệ thống tự đoán hoặc bỏ qua."],
    ["Dropdown", "Phong cách / Thể loại / Loại / Sàn bán / Trạng thái / Nổi bật chọn từ danh sách lấy từ hệ thống (sheet DanhMuc). Muốn thêm giá trị mới: Admin → Phân loại, rồi tải lại template."],
    ["Không thấy mũi tên dropdown?", "Excel mở tệp tải từ Internet ở chế độ Protected View (thanh vàng phía trên) — bấm “Enable Editing / Bật chỉnh sửa” thì dropdown mới hiện. Bấm vào ô (vd cột Thể loại) để thấy mũi tên ▾ bên phải ô."],
    ["Trùng sản phẩm", "Cùng (Sàn bán + Mã sản phẩm) hoặc cùng Slug → cập nhật sản phẩm cũ, không tạo trùng."],
    ["Không đổi tên cột", "Giữ nguyên hàng tiêu đề (dòng 1) và thứ tự cột để nhập không lỗi."],
    ...(dropped ? [["Lưu ý", `${dropped} ô JSON quá dài (>32.000 ký tự) đã bị bỏ khỏi Excel. Dùng “Xuất JSON” nếu cần sao lưu đầy đủ.`]] : []),
  ].forEach((r) => guide.addRow(r));
  guide.addRow([]);
  guide.addRow(["Cột", "Ghi chú"]).font = { bold: true };
  head.forEach((h) => guide.addRow([h, GUIDE[h] ?? ""]));
  guide.eachRow((row) => { row.alignment = { wrapText: true, vertical: "top" }; });

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
