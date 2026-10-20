"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Header / footer / widget cua website: an o /admin (trang quan tri co khung rieng: sidebar + header) */
export function SiteChrome({ children }: { children: ReactNode }) {
  const path = usePathname();
  return path === "/admin" || path.startsWith("/admin/") ? null : <>{children}</>;
}
