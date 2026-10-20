"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/** Nut "Xuất" dang menu (Excel co dropdown phan loai / CSV / JSON) — giu bo loc trang thai dang chon */
export function ExportMenu({ status }: { status?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const href = (format: string) => `/api/admin/export?format=${format}${status ? `&status=${status}` : ""}`;
  const items = [
    { format: "xlsx", label: "Excel (.xlsx)", hint: "Có dropdown phân loại, nhập lại được", Icon: FileSpreadsheet },
    { format: "csv", label: "CSV", hint: "UTF-8, 33 cột chuẩn", Icon: FileText },
    { format: "json", label: "JSON", hint: "Sao lưu đầy đủ", Icon: FileJson },
  ];
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} className="btn btn-ghost !px-5" onClick={() => setOpen(!open)}>
        <Download size={15} /> Xuất <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[52px] w-72 border border-line bg-paper p-1.5 shadow-xl animate-fade-up" style={{ zIndex: "var(--z-mega)" }}>
          {status && <p className="px-3 pb-1.5 pt-1 text-[11px] text-muted">Chỉ xuất sản phẩm đang lọc theo trạng thái</p>}
          {items.map(({ format, label, hint, Icon }) => (
            <a key={format} role="menuitem" href={href(format)} onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 px-3 py-2 hover:bg-sand">
              <Icon size={18} strokeWidth={1.6} className="shrink-0 text-gold-deep" />
              <span><span className="block text-sm font-semibold">{label}</span><span className="block text-xs text-muted">{hint}</span></span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
