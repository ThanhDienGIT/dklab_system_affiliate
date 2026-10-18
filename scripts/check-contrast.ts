// Kiem tra do tuong phan WCAG AA cho cac cap mau chu/nen chinh (chay: pnpm check:contrast)
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

const C = { ivory: "#faf7f2", paper: "#ffffff", sand: "#f1ebe0", ink: "#1b1613", inkSoft: "#4a423b", muted: "#6f655b", gold: "#a8834a", goldDeep: "#7d5f2e", goldSoft: "#d9c39a", rose: "#b5495b" };
const pairs: [string, string, string, number][] = [
  ["chu chinh / nen", C.ink, C.ivory, 4.5], ["chu phu / nen", C.inkSoft, C.ivory, 4.5], ["chu mo (muted) / nen", C.muted, C.ivory, 4.5],
  ["eyebrow vang dam / nen", C.goldDeep, C.ivory, 4.5], ["chu / sand", C.ink, C.sand, 4.5], ["muted / sand", C.muted, C.sand, 4.5],
  ["nut: ivory / ink", C.ivory, C.ink, 4.5], ["footer: vang nhat / ink", C.goldSoft, C.ink, 4.5], ["gia giam: trang / rose", "#ffffff", C.rose, 4.5],
  ["link sale: rose / nen", C.rose, C.ivory, 4.5],
];
let fail = 0;
for (const [name, fg, bg, min] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${r.toFixed(2).padStart(5)}  (>= ${min})  ${name}`);
}
process.exit(fail ? 1 : 0);
