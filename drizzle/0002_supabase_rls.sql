-- Supabase: bang trong schema public duoc PostgREST/supabase-js lo ra qua khoa "anon" (publishable key - khoa nay nam o trinh duyet).
-- => BAT RLS cho MOI bang: khong co policy thi anon/authenticated khong doc/ghi duoc gi (users, refresh_tokens, audit_log... an toan).
-- App Next.js ket noi bang role `postgres` (chu bang) nen KHONG bi RLS chan.
-- Chay duoc ca tren Postgres thuong (Docker/local): khong co role anon thi chi bat RLS.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

    -- Chi cho doc cong khai du lieu danh muc (khong co du lieu ca nhan)
    GRANT SELECT ON public.styles, public.categories, public.product_types, public.products TO anon, authenticated;

    DROP POLICY IF EXISTS "public read styles" ON public.styles;
    CREATE POLICY "public read styles" ON public.styles FOR SELECT TO anon, authenticated USING (is_active);
    DROP POLICY IF EXISTS "public read categories" ON public.categories;
    CREATE POLICY "public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (is_active);
    DROP POLICY IF EXISTS "public read product_types" ON public.product_types;
    CREATE POLICY "public read product_types" ON public.product_types FOR SELECT TO anon, authenticated USING (is_active);
    DROP POLICY IF EXISTS "public read products" ON public.products;
    CREATE POLICY "public read products" ON public.products FOR SELECT TO anon, authenticated USING (status = 'published');
  END IF;
END
$$;
