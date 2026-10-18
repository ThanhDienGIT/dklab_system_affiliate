import { describe, expect, it } from "vitest";
import { canonKey, normalizeReview } from "@/server/services/import.service";
import { parseReviewDate, productInputSchema } from "@/server/domain/validators";

describe("parseReviewDate", () => {
  it("nhận 'YYYY-MM-DD HH:mm' theo giờ VN", () => expect(parseReviewDate("2025-03-01 20:30")).toBe("2025-03-01T13:30:00.000Z"));
  it("nhận dd/mm/yyyy", () => expect(parseReviewDate("05/03/2025")).toBe("2025-03-04T17:00:00.000Z"));
  it("rỗng/sai → null", () => { expect(parseReviewDate("")).toBeNull(); expect(parseReviewDate("abc")).toBeNull(); });
});

describe("canonKey", () => {
  it("nhận tên cột tiếng Việt và tiếng Anh", () => {
    expect(canonKey("Tên sản phẩm")).toBe(canonKey("name"));
    expect(canonKey("Giá")).toBe(canonKey("price"));
  });
});

describe("normalizeReview", () => {
  it("bỏ giá trị không phải object", () => expect(normalizeReview("x")).toBeNull());
  it("trả về object khi đúng", () => expect(normalizeReview({ author: "a", rating: 5, content: "ok" })).not.toBeNull());
});

describe("productInputSchema", () => {
  const base = { name: "Đầm", description: "", styleId: 1, categoryId: 1, price: 100000, affiliateUrl: "https://s.shopee.vn/x" };
  it("detail mặc định {} và reviews tuỳ chọn", () => {
    const r = productInputSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) { expect(r.data.detail).toEqual({}); expect(r.data.reviews).toBeUndefined(); }
  });
  it("nhận reviews và rawData", () => {
    const r = productInputSchema.safeParse({ ...base, reviews: [{ author: "a", rating: 4, content: "đẹp", reviewedAt: "2025-03-01 20:30" }], rawData: { a: 1 } });
    expect(r.success).toBe(true);
  });
});
