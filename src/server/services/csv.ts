/** Doc CSV theo RFC 4180 (nhay kep, xuong dong trong o, BOM). Tu nhan dau phay hoac cham phay. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (q) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}
