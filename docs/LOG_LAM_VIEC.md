# LOG LÀM VIỆC - dk_lab_system_clothes

## 2026-10-13
- Khởi tạo project Next.js 16 + Tailwind v4 + Drizzle; schema 13 bảng, migration `0000_extensions` (unaccent, pg_trgm) + `0001_init`.
- Dữ liệu mẫu: 6 phong cách (bảng màu, từ khoá nhận diện theo ảnh người dùng gửi), 6 thể loại dùng chung, 37 loại cụ thể, 119 sản phẩm; sinh ảnh mẫu/ảnh thương hiệu (banner 2056×765, avatar cắt từ ảnh người mẫu).
- Search: price parser + rule parser + Gemini/LangChain + nới điều kiện; 26 test ví dụ tiếng Việt.
- Auth: JWT + refresh rotation + Google OAuth; RBAC; CCCD AES-GCM; audit log.
- UI: header + mega menu 6×6, drawer mobile, hero banner, New Arrival/Best Seller/Season Highlights, trang phong cách, catalog + lọc, chi tiết + CTA Shopee + JSON-LD, tìm kiếm overlay, newsletter popup, widget liên hệ, scroll reveal (motion).
- Tài khoản + Admin hoàn chỉnh; nhập CSV; cài đặt.
- Lỗi đã sửa: (1) Postgres local sập vì data dir trong thư mục root-only → dựng lại cluster ở `/var/lib`; (2) `instanceof AppError` sai khi bundler nhân đôi module → dùng duck-typing (trả 500 thay vì 400); (3) schema hồ sơ coi trường thiếu là lỗi → thiếu = null; (4) route `/api/auth/google` đọc env lúc build → làm lazy; (5) class CSS tuỳ biến đè utility Tailwind → đưa vào `@layer components`; (6) số cũ của font Cormorant → `lining-nums`; (7) avatar admin bị banner che.
- Kiểm thử: `tsc` sạch, vitest 34/34, `next build` OK không cần DB, Playwright desktop 1440 + mobile 390 không lỗi console, bản standalone chạy với DB trống (migrate/seed/login/upload/ảnh tối ưu).
- Export: `pnpm export` → 2 zip (Vercel, Docker); `.env` Docker sinh khoá ngẫu nhiên riêng mỗi lần export.
- Chưa làm / ý tưởng: driver ảnh S3/Blob, rate limit Redis, thêm dữ liệu mẫu (mỗi ô mới 3-4 sản phẩm), import trực tiếp từ Shopee Affiliate API, E2E test tự động.

## 2026-10-13 (chiều) - Tích hợp Supabase + Cloudinary vào bản Vercel
- Dựng lại source từ `dk_lab_system_clothes-source.zip` (project trong sandbox đã mất).
- Thêm: `@supabase/supabase-js`, `src/server/supabase.ts`, `src/lib/supabase/browser.ts`, `/api/health/supabase`, CSP `connect-src` theo `NEXT_PUBLIC_SUPABASE_URL`.
- DB: `pgOptions()` (TLS tự bật cho Supabase), `DIRECT_URL` cho migrate/seed/drizzle-kit, migration `0002_supabase_rls.sql` (+ journal), `supabase/setup.sql`.
- Storage: driver `cloudinary` (signed upload bằng fetch, không SDK), env `CLOUDINARY_*`, `UPLOAD_DRIVER=cloudinary`.
- Test: +4 test (38/38), tsc sạch, `next build` OK, migrate trên Postgres 16 với role anon/authenticated giả lập: 13/13 bảng RLS, anon đọc được styles/products, `users` bị `permission denied`; chạy lại migrate idempotent; setup.sql chạy 1 transaction OK.
- Chưa làm được: chạy migration thật vào Supabase (sandbox không ra được internet, chưa có mật khẩu DB), upload thật lên Cloudinary (thiếu Cloud name).
- Lưu ý bảo mật: người dùng đã dán API secret Cloudinary trong chat → nên đổi (rotate) khóa. Không ghi khóa vào docs/log.
