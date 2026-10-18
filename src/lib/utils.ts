import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toInt(v: unknown, fallback: number): number {
  const n = typeof v === "string" ? Number.parseInt(v, 10) : typeof v === "number" ? Math.trunc(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function first<T>(v: T | T[] | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function asArray(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean);
}
