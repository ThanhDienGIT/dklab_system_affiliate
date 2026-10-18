import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Client trinh duyet: CHI dung publishable key (an toan de lo ra) va chi doc duoc du lieu RLS cho phep. */
let client: SupabaseClient | null | undefined;

export function supabaseBrowser(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}
