# dk_lab_system_clothes - Đặc tả hệ thống (Éleonore)

## 1. Mục tiêu
Website bán quần áo theo mô hình **affiliate**: giới thiệu sản phẩm theo phong cách, dẫn khách sang Shopee/TikTok Shop, ghi nhận click, quản trị nội dung + người dùng. Dựa trên hệ thống DK Lab affiliate (hồ sơ trong Project) và giao diện rechicbrand.com.

## 2. Công nghệ
| Lớp | Lựa chọn |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4 |
| DB | PostgreSQL (extension `unaccent`, `pg_trgm`), Drizzle ORM + postgres.js, migration SQL trong `/drizzle`. Bản Vercel dùng **Supabase** (pooler) + `@supabase/supabase-js`; migration 0002 bật **RLS** cho mọi bảng |
| Auth | JWT HS256 (jose) + refresh token opaque xoay vòng; Google OAuth (code + PKCE + nonce) |
| Tìm kiếm | Rule parser tiếng Việt + Gemini qua LangChain (`@langchain/google-genai`, structured output) |
| UI | Radix Dialog, motion (scroll reveal), lucide-react, fontsource (Montserrat, Cormorant Garamond) |
| Ảnh | sharp → WebP, kiểm tra magic bytes, driver `local` / `inline` / **`cloudinary`** (signed upload REST, thư mục `system_clothes/{avatars,products,banners}`) |

## 3. Cấu trúc dữ liệu & menu
`styles` (menu cấp 1) × `categories` (submenu **dùng chung**: Quần áo, Chân váy & váy liền, Túi xách, Phụ kiện, Giày dép, Set đồ hoàn chỉnh) → `product_types` thuộc 1 thể loại (vd. *Đầm babydoll* ∈ Quần áo).
Sản phẩm: phong cách + thể loại + loại cụ thể + màu + size + giá/giá gốc + sàn + link affiliate + `item_id` (duy nhất theo sàn) + `search_text` (đã bỏ dấu, có GIN trigram).
Bảng: styles, categories, product_types, products, clicks, favorites, users, user_styles, refresh_tokens, audit_log, site_settings, newsletter_subscribers, search_logs.

## 4. Trang
Public: `/`, `/phong-cach/[style]`, `/phong-cach/[style]/[category]`, `/san-pham`, `/san-pham/[slug]`, `/moi-ve`, `/ban-chay`, `/giam-gia`, `/tim-kiem`, `/yeu-thich`, `/dang-nhap`, `/dang-ky`, `/chinh-sach/[slug]`, `/go/[slug]`, sitemap, robots.
Tài khoản: `/tai-khoan` (họ tên, SĐT, ngày sinh, giới tính, địa chỉ, CCCD, size, chiều cao, ngân sách, phong cách yêu thích, avatar, đổi mật khẩu).
Admin: `/admin` (dashboard click 30 ngày, top sản phẩm, từ khoá tìm không ra, nhật ký), `/admin/san-pham` (+ form chọn Phong cách → Thể loại → Loại), `/admin/phan-loai`, `/admin/nhap-csv`, `/admin/nguoi-dung`, `/admin/cai-dat`. Ảnh bìa admin = banner; avatar admin mặc định = ảnh người mẫu.

## 5. Tìm kiếm (Gemini + LangChain)
`parsePrice` (dưới 500k, 200-400k, từ 1tr2…) → `parseQuery` (alias index dài-nhất-trước: loại → phong cách → thể loại, màu, sắp xếp) → nếu câu chưa tự giải thích và có `GEMINI_API_KEY`: `ChatGoogleGenerativeAI.withStructuredOutput(zod)` → kết quả được **lọc theo slug có thật trong DB** → `mergePlans` (luật ưu tiên số/slug) → SQL. 0 kết quả → nới dần: từ khoá → màu → loại → giá → thể loại, và báo rõ đã bỏ gì.
Ví dụ: "Quần áo phong cách y2k" → Y2K + Quần áo; "quần áo y2k dưới 500k" → + giá < 500.000₫.
Gemini lỗi/hết hạn mức → tự rơi về luật, tìm kiếm không hỏng. Plan cache 10 phút.

## 6. Bảo mật
- Access JWT 15 phút (`el_at`), refresh 30 ngày (`el_rt`, hash SHA-256 trong DB, xoay vòng, phát hiện dùng lại → huỷ cả họ), cookie httpOnly/SameSite=Lax/secure theo https. `token_version` → đổi quyền/mật khẩu có hiệu lực ngay.
- scrypt cho mật khẩu; khoá 15 phút sau 5 lần sai; hash giả chống dò email.
- RBAC: customer / editor / admin (`can(role, perm)`), kiểm ở proxy + server component + API.
- CCCD: AES-256-GCM, chỉ hiện 4 số cuối, admin xem đầy đủ có ghi `audit_log`, tự ẩn sau 15s.
- CSRF: same-origin check cho request ghi; rate limit (RAM, 1 instance); CSP + security headers; open-redirect guard; upload kiểm magic bytes, chống path traversal.
- `/go/` chỉ chuyển hướng http(s), `rel="sponsored nofollow"`.

## 7. Biến môi trường
Xem `.env.example`: `DATABASE_URL`, `AUTH_SECRET` (≥32 ký tự), `PII_ENCRYPTION_KEY` (32 byte base64 - **đừng mất/đổi khi đã có CCCD**), `APP_URL`, `SEED_ADMIN_*`, `GOOGLE_*`, `GEMINI_API_KEY/MODEL`, `UPLOAD_DRIVER/DIR`, `DB_POOL_MAX`, `TRUST_PROXY`; Supabase: `DIRECT_URL` (migration), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (tuỳ chọn, chỉ server); Cloudinary: `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET/FOLDER`.

## 8. Quyết định & đánh đổi
- **Drizzle thay Prisma**: môi trường build chặn tải binary Prisma; Drizzle thuần JS, nhẹ hơn trên serverless. Đổi lại ít tooling GUI hơn.
- **Vercel vs Docker**: Vercel nhanh/rẻ để demo; Docker (VPS tại VN) phù hợp khi lưu CCCD thật (lưu trữ dữ liệu trong nước, upload ra đĩa, 1 instance nên rate limit RAM đủ dùng).
- **Cache**: trang `force-dynamic` + `unstable_cache` tag `catalog` (300s), admin sửa → `revalidateTag('catalog',{expire:0})` xoá ngay.

## 9. Giới hạn đã biết / chưa kiểm chứng
- Link affiliate trong dữ liệu mẫu là link **tìm kiếm Shopee**, không phải link affiliate thật; ảnh mẫu là ảnh minh hoạ trừu tượng, không phải ảnh sản phẩm thật. Sản phẩm thật phải được kiểm tra (còn hàng, đúng mô tả) trước khi đưa vào danh mục.
- Chưa thử trực tiếp: đăng nhập Google và Gemini (cần khoá thật), build image Docker (sandbox không có Docker daemon; `docker compose config` hợp lệ và build standalone + migrate/seed đã chạy thật ngoài container).
- Rate limit trong RAM; upload `inline` chỉ hợp lý cho ít ảnh nhỏ.

## 10. Supabase + Cloudinary (bản Vercel)
- App vẫn truy cập dữ liệu nghiệp vụ qua Drizzle/postgres.js bằng role `postgres` (chủ bảng, không bị RLS chặn). `supabase-js` (`src/server/supabase.ts`, `src/lib/supabase/browser.ts`) dùng publishable key, chịu RLS.
- `0002_supabase_rls.sql`: bật RLS 13 bảng; `anon/authenticated` chỉ SELECT `styles`, `categories`, `product_types` (is_active) và `products` (status=published). `users`, `refresh_tokens`, `audit_log`, `clicks`... khoá hoàn toàn. Migration an toàn trên Postgres thường (không có role anon thì chỉ bật RLS). **Bảng mới phải tự bật RLS.**
- `pgOptions()` tự bật TLS cho `*.supabase.co/com`; migration/seed ưu tiên `DIRECT_URL`.
- `/api/health/supabase` kiểm tra danh mục đọc được và bảng riêng tư bị khoá.
- Cloudinary: `cloudinaryDriver` ký SHA-1 theo tài liệu Cloudinary (test khớp vector mẫu), timeout 20s, lỗi không lộ chi tiết ra client.
- `supabase/setup.sql` = 0000+0001+0002 gộp để dán vào SQL Editor khi chưa có mật khẩu DB (không có dữ liệu mẫu; không chạy chung với `db:migrate`).
- Chưa kiểm chứng: kết nối thật tới Supabase/Cloudinary (sandbox chặn mạng ra ngoài). Đã kiểm: migrate + RLS (role anon giả lập) trên Postgres 16, build, 38 test.
