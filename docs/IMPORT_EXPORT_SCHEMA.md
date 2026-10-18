# Chuẩn nhập/xuất sản phẩm `eleonore.products.v1`

Trang: **Admin → Nhập dữ liệu / Nhập Shopee** (`/admin/nhap-du-lieu`, `/admin/nhap-shopee`), nút *Xuất JSON/CSV* ở danh sách sản phẩm, API `GET /api/admin/export?format=json|csv&status=&ids=1,2`.

## JSON
```json
{ "format": "eleonore.products.v1", "products": [ { ...item } ] }
```
(Cũng nhận mảng trần `[ {...} ]`.) Mẫu: `public/admin/mau-nhap.json`.

| Trường | Ghi chú |
|---|---|
| itemId + merchant | khoá chống trùng (không có thì dùng slug); trùng → cập nhật |
| name*, style*, category*, type, price* | style/category/type khớp tên, slug hoặc bí danh |
| originalPrice, colors[], sizes[], tags[], images[], material, description, badge | |
| affiliateUrl, productUrl, commissionRate, status, isFeatured | |
| rating, reviewCount, sold | |
| detail | stock, likeCount, soldText, video, variants[{name,options[{name,image}]}], attributes[{label,value}], sourcePath[], shipping, guarantees[], shop, ratingBreakdown |
| reviews[] | author, rating 1-5, content, variant, reviewedAt, media[], sellerReply, likes, source(own\|similar). Có `reviews` → thay toàn bộ đánh giá cũ |
| raw | JSON gốc, lưu nguyên vào cột `products.raw_data` (mặc định = cả item) |

Tên khoá chấp nhận cả tiếng Việt/Anh/camelCase.

## CSV
UTF-8, cột nhận diện không phân biệt hoa/thường/dấu. Danh sách mảng cách nhau `|`. Cột JSON: `Chi tiết JSON`, `Đánh giá JSON`, `Dữ liệu gốc JSON`. File xuất ra nhập lại được nguyên vẹn (round-trip). Giới hạn 4MB/lần.

## DB
Migration `0003_product_detail_reviews`: `products.detail jsonb`, `products.raw_data jsonb`, bảng `product_reviews` (RLS bật). Chạy `pnpm db:migrate`.


## Excel (.xlsx) — khuyên dùng

* `GET /api/admin/import/template?format=xlsx` — template trống đủ 33 cột; `POST` cùng đường dẫn chuyển file Shopee Affiliate thành template đã điền sẵn.
* `GET /api/admin/export?format=xlsx` — xuất sản phẩm hiện có dạng Excel.
* Sheet `SanPham` có **dropdown** Phong cách / Thể loại / Loại (phụ thuộc thể loại) / Sàn bán / Trạng thái / Nổi bật lấy từ **Admin → Phân loại**; sheet `DanhMuc` là danh sách tham chiếu, `HuongDan` giải thích từng cột.
* Trang nhập: `/admin/nhap-shopee` (file Shopee Affiliate) và `/admin/nhap-du-lieu` (template chuẩn / dữ liệu tool cào).
