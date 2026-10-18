import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./config/env";

/**
 * Supabase client phia server.
 * - `supabasePublic()`: dung publishable key -> chiu RLS (chi doc duoc danh muc cong khai).
 * - `supabaseAdmin()`: dung SUPABASE_SECRET_KEY -> BO QUA RLS. Chi goi trong code server da kiem tra quyen.
 * Du lieu nghiep vu chinh (nguoi dung, CCCD, click...) van di qua Drizzle/Postgres truc tiep; supabase-js dung cho
 * truy van danh muc nhanh, realtime, storage... khi can mo rong.
 */
const g = globalThis as unknown as { __sbPublic?: SupabaseClient; __sbAdmin?: SupabaseClient };
const opts = { auth: { persistSession: false, autoRefreshToken: false } } as const;

export function supabasePublic(): SupabaseClient | null {
  const e = env();
  if (!e.NEXT_PUBLIC_SUPABASE_URL || !e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
  return (g.__sbPublic ??= createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, opts));
}

export function supabaseAdmin(): SupabaseClient | null {
  const e = env();
  if (!e.NEXT_PUBLIC_SUPABASE_URL || !e.SUPABASE_SECRET_KEY) return null;
  return (g.__sbAdmin ??= createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SECRET_KEY, opts));
}
