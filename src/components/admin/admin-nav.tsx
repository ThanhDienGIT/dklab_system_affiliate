"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Quản trị" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0">
      {items.map((i) => {
        const on = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
            className={cn("shrink-0 border-b-2 px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] transition-colors", on ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink")}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
