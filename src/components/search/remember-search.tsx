"use client";
import { useEffect } from "react";
import { pushSearch } from "@/lib/history";

/** Trang /tim-kiem?q=... (go tu form, link chia se, back) -> luu vao "Tim kiem gan day" */
export function RememberSearch({ q }: { q: string }) {
  useEffect(() => { if (q) pushSearch(q); }, [q]);
  return null;
}
