import { describe, expect, it } from "vitest";
import { parsePrice } from "@/server/services/search/price";
import { parseQuery } from "@/server/services/search/rules";
import { parseMoney } from "@/server/services/import.service";
import { sampleTaxonomy } from "./fixtures";

const T = sampleTaxonomy();
const plan = (q: string) => parseQuery(q, T);

describe("parsePrice", () => {
  it.each([
    ["dưới 500k", undefined, 500_000],
    ["duoi 500 nghin", undefined, 500_000],
    ["< 300k", undefined, 300_000],
    ["tối đa 1tr2", undefined, 1_200_000],
    ["trên 1 triệu", 1_000_000, undefined],
    ["từ 200k đến 400k", 200_000, 400_000],
    ["200-400k", 200_000, 400_000],
    ["500.000đ trở xuống", undefined, 500_000],
    ["300k trở lên", 300_000, undefined],
    ["khoảng 500k", 350_000, 650_000],
  ])("%s", (q, min, max) => {
    const r = parsePrice(q);
    expect(r.min).toBe(min);
    expect(r.max).toBe(max);
  });
  it("không nhầm y2k thành giá", () => {
    const r = parsePrice("quần áo y2k");
    expect(r.min).toBeUndefined();
    expect(r.max).toBeUndefined();
  });
  it("y2k + giá", () => {
    expect(parsePrice("y2k dưới 500k").max).toBe(500_000);
  });
});

describe("parseQuery", () => {
  it("Quần áo phong cách y2k", () => {
    const p = plan("Quần áo phong cách y2k");
    expect(p).toMatchObject({ styleSlug: "y2k", categorySlug: "quan-ao", keywords: [] });
  });
  it("quần áo y2k dưới 500k", () => {
    const p = plan("tìm các quần áo y2k dưới 500k");
    expect(p).toMatchObject({ styleSlug: "y2k", categorySlug: "quan-ao", priceMax: 500_000, keywords: [] });
  });
  it("đầm babydoll phong cách y2k -> loại + thể loại quần áo", () => {
    expect(plan("đầm babydoll phong cách Y2K")).toMatchObject({ styleSlug: "y2k", typeSlug: "dam-babydoll", categorySlug: "quan-ao" });
  });
  it("váy đen dưới 300k", () => {
    expect(plan("váy đen dưới 300k")).toMatchObject({ categorySlug: "chan-vay-va-vay-lien", colors: ["den"], priceMax: 300_000 });
  });
  it("túi màu hồng giá rẻ", () => {
    expect(plan("túi màu hồng giá rẻ")).toMatchObject({ categorySlug: "tui-xach", colors: ["hong"], sort: "price_asc" });
  });
  it("không dấu: tui kep nach gloomy coquette", () => {
    expect(plan("tui kep nach gloomy coquette")).toMatchObject({ styleSlug: "gloomy-coquette", typeSlug: "tui-kep-nach", categorySlug: "tui-xach" });
  });
  it("giữ từ khoá lạ", () => {
    expect(plan("áo morute thêu gấu").keywords).toContain("theu");
  });
  it("màu đỏ có dấu khác 'đồ'", () => {
    expect(plan("váy đỏ").colors).toEqual(["do"]);
    expect(plan("đồ y2k").colors).toEqual([]);
  });
  it("giảm giá", () => {
    expect(plan("baroque đang giảm giá")).toMatchObject({ styleSlug: "baroque", onSale: true });
  });
});

describe("parseMoney (import)", () => {
  it.each([["185.000₫", 185000], ["89k", 89000], ["1tr2", 1_200_000], ["185000", 185000], ["1,5 triệu", 1_500_000]])("%s", (s, n) => {
    expect(parseMoney(s)).toBe(n);
  });
});
