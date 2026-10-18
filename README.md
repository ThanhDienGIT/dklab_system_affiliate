# Éleonore · dk_lab_system_clothes

Website thời trang affiliate (Next.js full-stack) theo 6 phong cách: **Y2K, Gloomy Coquette, Rococo, Baroque, Maximalism, Morute**.
Giao diện theo tinh thần rechicbrand.com; 3 tầng: **Trang chủ → Trang phong cách → Danh sách sản phẩm (lọc)** → nút **"Xem sản phẩm trên Shopee"** qua `/go/<slug>` (ghi click).

## Chạy local
```bash
pnpm install
cp .env.example .env            # điền DATABASE_URL (Postgres 15+), AUTH_SECRET, PII_ENCRYPTION_KEY
pnpm db:setup                   # migrate + seed (6 phong cách × 6 thể loại × 37 loại, 119 sản phẩm mẫu)
pnpm dev                        # http://localhost:3000
```
Admin mặc định (local): `admin@eleonore.vn` / `SEED_ADMIN_PASSWORD` trong `.env` (mặc định `Eleonore@2026`, **chỉ dùng local**).
Khách demo: `khach@eleonore.vn` / `Eleonore@2026`.

Lệnh: `pnpm test` · `pnpm typecheck` · `pnpm build` · `pnpm gen:media` (ảnh mẫu/ảnh thương hiệu) · `pnpm check:contrast` · `pnpm export`.

## Xuất 2 bản triển khai
`pnpm export` → `exports/eleonore-vercel.zip` (xem `README_VERCEL.md`) và `exports/eleonore-docker.zip` (xem `README_DOCKER.md`, gồm Postgres + migrate/seed tự chạy).

## Kiến trúc
`src/server`: `domain` (DTO, zod, errors) → `repositories` (interface + Drizzle) → `services` (nghiệp vụ) → `container.ts` (DI) → route handlers / server components.
Pattern: Repository, Service layer, DI container, Strategy (storage local/inline, planner luật/LLM), Adapter (Google OAuth, Gemini), DTO + validation, RBAC policy.

Chi tiết: `docs/dklab_system_clothes.md`. Nhật ký: `docs/LOG_LAM_VIEC.md`.

## Database (dựng lại từ đầu, an toàn)
- `pnpm db:check`  – chỉ kiểm tra kết nối + liệt kê bảng/số dòng, không sửa gì
- `pnpm db:setup` (= `db:reset`) – kiểm tra → hỏi xác nhận (gõ `XOA`) → xoá bảng cũ → migrate → seed → kiểm tra lại. Cờ: `--yes`, `--no-seed`, `--allow-production`
- `pnpm db:migrate` – chỉ chạy migration mới, KHÔNG xoá dữ liệu (dùng khi deploy)
