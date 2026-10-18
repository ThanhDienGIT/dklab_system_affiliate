/**
 * Sinh anh minh hoa (WebP) cho du lieu mau + xu ly anh thuong hieu.
 *   banner.webp  <- scripts/assets/banner-source.png  (banner chinh + anh bia admin)
 *   avatar.webp  <- scripts/assets/avatar-source.png  (avatar admin mac dinh)
 * Anh san pham mau la tranh truu tuong theo bang mau phong cach; thay bang anh that khi len production.
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { SEED_PRODUCTS } from "../src/server/seed-data/products";
import { SEED_CATEGORIES, SEED_STYLES } from "../src/server/seed-data/taxonomy";
import { COLORS } from "../src/lib/constants";
import { slugify, stripDiacritics } from "../src/lib/text";

const PUB = path.resolve("public");
const out = (p: string) => path.join(PUB, p);

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbToHex = (c: number[]) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a: string, b: string, t: number) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i]! - v) * t)); };
const lum = (h: string) => { const [r, g, b] = hexToRgb(h).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!; };
const ink = (bg: string) => (lum(bg) > 0.45 ? "#1a1512" : "#f6f0e6");

function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const ascii = (s: string) => stripDiacritics(s).toUpperCase();

function colorFill(slug: string, id: string): { defs: string; fill: string; base: string } {
  const c = COLORS.find((x) => x.slug === slug);
  if (!c || c.hex.startsWith("linear")) {
    return {
      base: "#c4a052",
      defs: `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6a4b4"/><stop offset=".5" stop-color="#c4a052"/><stop offset="1" stop-color="#3f6fae"/></linearGradient>`,
      fill: `url(#${id})`,
    };
  }
  return { base: c.hex, defs: `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(c.hex, "#ffffff", 0.18)}"/><stop offset="1" stop-color="${mix(c.hex, "#000000", 0.22)}"/></linearGradient>`, fill: `url(#${id})` };
}

function productSvg(opts: { styleSlug: string; typeName: string; colors: string[]; variant: 1 | 2; seed: number }): string {
  const style = SEED_STYLES.find((s) => s.slug === opts.styleSlug)!;
  const pal = style.palette.map((p) => p.hex);
  const r = rng(opts.seed);
  const W = 800, H = 1000;
  const bgTop = mix(pal[opts.variant === 1 ? 4 : 0]!, "#ffffff", 0.55);
  const bgBot = mix(pal[opts.variant === 1 ? 0 : 2]!, "#ffffff", 0.2);
  const { defs, fill, base } = colorFill(opts.colors[0] ?? "kem", "pf");
  const second = colorFill(opts.colors[1] ?? opts.colors[0] ?? "kem", "pf2");
  const text = ink(mix(bgTop, bgBot, 0.5));
  const cx = W / 2 + (opts.variant === 2 ? (r() - 0.5) * 120 : 0);
  const archW = opts.variant === 1 ? 420 : 340, archTop = 170 + r() * 50, archBottom = 800;
  const rad = archW / 2;
  const arch = `M ${cx - rad} ${archBottom} V ${archTop + rad} A ${rad} ${rad} 0 0 1 ${cx + rad} ${archTop + rad} V ${archBottom} Z`;
  const dots = opts.variant === 2
    ? Array.from({ length: 26 }, () => `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * H).toFixed(0)}" r="${(2 + r() * 5).toFixed(1)}" fill="${mix(pal[1]!, "#ffffff", 0.3)}" opacity=".35"/>`).join("")
    : `<line x1="60" y1="900" x2="${W - 60}" y2="900" stroke="${text}" stroke-opacity=".25"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bgTop}"/><stop offset="1" stop-color="${bgBot}"/></linearGradient>
<radialGradient id="glow" cx="50%" cy="38%" r="55%"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<filter id="soft"><feGaussianBlur stdDeviation="22"/></filter>${defs}${second.defs}</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${dots}
<ellipse cx="${cx}" cy="${archBottom - 20}" rx="${rad + 70}" ry="38" fill="#000" opacity=".12" filter="url(#soft)"/>
<path d="${arch}" fill="${fill}"/>
<path d="${arch}" fill="url(#glow)" opacity=".55"/>
<circle cx="${cx + rad * 0.55}" cy="${archTop + rad * 0.2}" r="${opts.variant === 1 ? 52 : 40}" fill="${second.fill}" opacity=".95"/>
<text x="${W / 2}" y="${archBottom - 130}" text-anchor="middle" font-family="Lora, 'DejaVu Serif', serif" font-style="italic" font-size="190" fill="${ink(base)}" opacity=".9">E</text>
<text x="56" y="76" font-family="Poppins, Inter, sans-serif" font-size="20" letter-spacing="7" fill="${text}" opacity=".7">ELEONORE</text>
<text x="${W - 56}" y="76" text-anchor="end" font-family="Poppins, Inter, sans-serif" font-size="20" letter-spacing="5" fill="${text}" opacity=".7">${ascii(style.name)}</text>
<text x="${W / 2}" y="${H - 64}" text-anchor="middle" font-family="Poppins, Inter, sans-serif" font-size="26" letter-spacing="9" fill="${text}">${ascii(opts.typeName)}</text>
</svg>`;
}

function heroSvg(styleSlug: string, W = 1600, H = 900): string {
  const st = SEED_STYLES.find((s) => s.slug === styleSlug)!;
  const pal = st.palette.map((p) => p.hex);
  const r = rng(styleSlug.length * 131);
  const bands = pal.map((c, i) => `<rect x="${(i * W) / pal.length}" y="0" width="${W / pal.length + 2}" height="${H}" fill="${c}"/>`).join("");
  const arches = pal.map((c, i) => {
    const w = 190 + r() * 60, x = (i + 0.5) * (W / pal.length), top = 150 + r() * 160;
    return `<path d="M ${x - w / 2} ${H} V ${top + w / 2} A ${w / 2} ${w / 2} 0 0 1 ${x + w / 2} ${top + w / 2} V ${H} Z" fill="${mix(c, "#ffffff", 0.35)}" opacity=".55"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><filter id="b"><feGaussianBlur stdDeviation="46"/></filter>
<linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient></defs>
<g filter="url(#b)">${bands}</g>${arches}<rect width="${W}" height="${H}" fill="url(#v)"/>
</svg>`;
}

function moodSvg(styleSlug: string, n: number): string {
  const st = SEED_STYLES.find((s) => s.slug === styleSlug)!;
  const pal = st.palette.map((p) => p.hex);
  const r = rng(styleSlug.length * 977 + n * 31);
  const W = 800, H = 1000;
  const a = pal[(n * 2) % pal.length]!, b = pal[(n * 2 + 1) % pal.length]!, c = pal[(n * 2 + 3) % pal.length]!;
  const shapes = n === 1
    ? `<circle cx="400" cy="420" r="250" fill="${mix(c, "#fff", 0.3)}" opacity=".9"/><circle cx="400" cy="420" r="150" fill="${b}"/>`
    : n === 2
      ? `<path d="M 130 1000 V 440 A 270 270 0 0 1 670 440 V 1000 Z" fill="${mix(c, "#fff", 0.2)}"/><path d="M 250 1000 V 520 A 150 150 0 0 1 550 520 V 1000 Z" fill="${b}"/>`
      : Array.from({ length: 9 }, (_, i) => `<rect x="${60 + (i % 3) * 235}" y="${110 + Math.floor(i / 3) * 285}" width="205" height="255" rx="${r() > 0.5 ? 102 : 12}" fill="${i % 2 ? b : mix(c, "#fff", 0.25)}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(a, "#fff", 0.35)}"/><stop offset="1" stop-color="${a}"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>${shapes}</svg>`;
}

async function save(svg: string, file: string, q = 78) {
  await mkdir(path.dirname(out(file)), { recursive: true });
  await sharp(Buffer.from(svg)).webp({ quality: q }).toFile(out(file));
}

async function main() {
  // --- anh thuong hieu ---
  await mkdir(out("brand"), { recursive: true });
  await sharp("scripts/assets/banner-source.png").webp({ quality: 86 }).toFile(out("brand/banner.webp"));
  await sharp("scripts/assets/banner-source.png").resize(1200, 630, { fit: "cover", position: "centre" }).jpeg({ quality: 84 }).toFile(out("brand/og.jpg"));
  await sharp("scripts/assets/avatar-source.png").extract({ left: 230, top: 555, width: 440, height: 440 }).resize(512, 512).webp({ quality: 88 }).toFile(out("brand/avatar.webp"));

  // --- anh phong cach ---
  for (const st of SEED_STYLES) {
    await save(heroSvg(st.slug), `media/styles/${st.slug}-hero.webp`, 80);
    for (const n of [1, 2, 3]) await save(moodSvg(st.slug, n), `media/styles/${st.slug}-mood-${n}.webp`, 76);
  }

  // --- anh san pham ---
  let seed = 0, count = 0;
  for (const [styleSlug, byCat] of Object.entries(SEED_PRODUCTS)) {
    const style = SEED_STYLES.find((s) => s.slug === styleSlug)!;
    for (const [catSlug, rows] of Object.entries(byCat)) {
      const cat = SEED_CATEGORIES.find((c) => c.slug === catSlug)!;
      for (const [typeSlug, name, , colors] of rows) {
        seed++;
        const typeName = cat.types.find((t) => t.slug === typeSlug)!.name;
        const slug = slugify(`${name} ${style.name}`);
        for (const variant of [1, 2] as const) {
          await save(productSvg({ styleSlug, typeName, colors: colors.split(","), variant, seed: seed * 17 + variant }), `media/sample/${slug}-${variant}.webp`);
          count++;
        }
      }
    }
  }
  await writeFile(out("media/README.txt"), "Anh minh hoa sinh tu scripts/gen-media.ts. Thay bang anh san pham that qua trang quan tri.\n");
  console.log(`[gen-media] OK: ${count} ảnh sản phẩm, ${SEED_STYLES.length * 4} ảnh phong cách, ảnh thương hiệu.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
