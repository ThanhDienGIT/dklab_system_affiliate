import { beforeEach, describe, expect, it } from "vitest";
import { clearSearches, mergeSearches, pushSearch, pushViewed, recentSearches, recentViewed, removeSearch, shouldCountView } from "@/lib/history";

class MemStore { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, v); } removeItem(k: string) { this.m.delete(k); } }
beforeEach(() => { Object.assign(globalThis, { localStorage: new MemStore(), sessionStorage: new MemStore() }); });

describe("lịch sử tìm kiếm", () => {
  it("mới nhất lên đầu, không trùng (không phân biệt hoa/khoảng trắng), tối đa 10", () => {
    pushSearch("đầm y2k"); pushSearch("túi xách"); pushSearch("  Đầm   Y2K ");
    expect(recentSearches()).toEqual(["Đầm Y2K", "túi xách"]);
    for (let i = 0; i < 15; i++) pushSearch(`q${i}`);
    expect(recentSearches()).toHaveLength(10);
  });
  it("bỏ từ khoá quá ngắn, xoá từng mục và xoá hết", () => {
    pushSearch("a"); pushSearch("váy"); removeSearch("VÁY");
    expect(recentSearches()).toEqual([]);
    pushSearch("váy"); clearSearches(); expect(recentSearches()).toEqual([]);
  });
  it("gộp lịch sử tài khoản, ưu tiên máy hiện tại", () => {
    pushSearch("váy đen");
    expect(mergeSearches(["Váy đen", "áo croptop"])).toEqual(["váy đen", "áo croptop"]);
  });
  it("storage hỏng vẫn không vỡ", () => {
    localStorage.setItem("el_q", "{hỏng");
    expect(recentSearches()).toEqual([]);
  });
});

describe("sản phẩm đã xem", () => {
  it("không trùng, mới nhất đầu", () => { pushViewed(1); pushViewed(2); pushViewed(1); expect(recentViewed()).toEqual([1, 2]); });
  it("chống đếm trùng trong 30 phút", () => { expect(shouldCountView(5)).toBe(true); expect(shouldCountView(5)).toBe(false); expect(shouldCountView(6)).toBe(true); });
});
