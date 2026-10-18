# Éleonore - Bản deploy Vercel (Supabase + Cloudinary)

## 1. Supabase (Postgres)
Dự án: `https://givhfbkzjwqbmxifbohq.supabase.co`. Extension `unaccent`, `pg_trgm` có sẵn, migration tự bật.
Lấy chuỗi kết nối: Supabase → **Connect** → *Transaction pooler* (cổng 6543) → `DATABASE_URL`; *Session pooler* (cổng 5432) → `DIRECT_URL`.
(Không dùng `db.<ref>.supabase.co` trực tiếp nếu mạng không có IPv6, Vercel build dùng pooler.)

## 2. Cloudinary (ảnh)
Cần **Cloud name** (Console → Dashboard; khác với tên của API key), `API Key`, `API Secret`. Ảnh upload được xử lý bằng sharp (kiểm magic bytes → WebP) rồi đẩy lên `system_clothes/{avatars|products|banners}`. URL https lưu vào DB.

## 3. Vercel
Đẩy code lên GitHub → Import vào Vercel (đã có `vercel.json`). Điền biến môi trường theo `.env.vercel.example`.
Lần deploy đầu để `RUN_MIGRATIONS=1` + `SEED_ON_BUILD=1` → build tự chạy migration (0000 extension, 0001 bảng, **0002 RLS**) + 119 sản phẩm mẫu + admin. **Sau đó tắt 2 biến này.**

## 4. Migration về sau
```bash
pnpm db:generate          # sau khi sửa src/server/db/schema/* -> sinh file SQL mới trong /drizzle
pnpm db:migrate           # áp dụng (đọc DIRECT_URL, không có thì DATABASE_URL)
```
Mỗi bảng mới phải bật RLS (xem `drizzle/0002_supabase_rls.sql`), nếu không `anon` key (public) có thể đọc bảng đó.
Không có mật khẩu DB? Dán `supabase/setup.sql` vào **SQL Editor** của Supabase (tạo bảng + RLS, không có dữ liệu mẫu). Chỉ chọn MỘT cách (SQL Editor *hoặc* `db:migrate`), đừng chạy cả hai.

## 5. Kiểm tra sau deploy
- `GET /api/health` → `{ok:true}` (DB).
- `GET /api/health/supabase` → `{ok:true, publicCatalogReadable:true, privateTablesLocked:true}` (supabase-js + RLS).
- Đăng nhập `/dang-nhap` bằng `SEED_ADMIN_*`, vào `/admin`, đổi mật khẩu, thử tải ảnh sản phẩm (phải ra URL `res.cloudinary.com`).

## Bảo mật
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` được phép lộ ở trình duyệt, nhờ RLS: `anon` chỉ đọc `styles, categories, product_types, products(published)`; `users`, `refresh_tokens`, `audit_log`... bị khoá.
- `SUPABASE_SECRET_KEY`, `CLOUDINARY_API_SECRET`, `DATABASE_URL`: chỉ đặt trong Vercel env, không commit, không dùng tiền tố `NEXT_PUBLIC_`.
- CCCD vẫn mã hóa AES-256-GCM trước khi vào DB. Đừng mất `PII_ENCRYPTION_KEY`.
- Nếu lưu CCCD thật: Supabase đặt region ngoài Việt Nam → cân nhắc quy định lưu trữ/chuyển dữ liệu cá nhân (hoặc dùng bản Docker đặt server tại VN).

## Giới hạn
- Rate limit nằm trong RAM từng instance (Vercel nhiều instance → chỉ tương đối). Muốn chặt: Upstash Redis tại `src/server/security/rate-limit.ts`.
- Ảnh cũ đã xóa khỏi sản phẩm vẫn còn trên Cloudinary (chưa có job dọn).
