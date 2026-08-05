# Kết nối Supabase

Ứng dụng chỉ dùng Supabase PostgreSQL làm database. Không dùng Supabase Auth,
không cần `NEXT_PUBLIC_SUPABASE_URL` và không đưa khóa database xuống trình
duyệt.

## Tạo database

1. Tạo một project trên Supabase.
2. Mở `Project Settings > Database`.
3. Sao chép connection string của `Transaction Pooler`.
4. Tạo file `.env.local` từ `.env.example`.
5. Điền `DATABASE_URL` và một `GUEST_SESSION_SECRET` ngẫu nhiên.

Ví dụ:

```env
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:6543/postgres?sslmode=require
DATABASE_POOL_MAX=5
DATABASE_CONNECT_TIMEOUT=10
GUEST_SESSION_SECRET=thay-bang-mot-chuoi-ngau-nhien-dai
```

Nếu mật khẩu database có ký tự đặc biệt, URL-encode mật khẩu trước khi đặt vào
connection string.

## Chạy migration

```bash
npm run db:migrate
```

Lệnh migration tự nạp `.env.local` và dừng với thông báo rõ ràng nếu chưa có
`DATABASE_URL`.

Migration nằm trong `supabase/migrations`. Các bảng đã bật Row Level Security
và không có policy truy cập trực tiếp từ anon key. Mọi thao tác phòng đi qua
Next.js Route Handlers ở phía server.

Sau khi deploy, `GET /api/health` chỉ trả HTTP 200 khi server kết nối và truy
vấn được database. Khi database không sẵn sàng, endpoint trả HTTP 503 mà không
làm lộ chuỗi kết nối.

## Luồng phiên khách

- Người chơi chỉ nhập tên hiển thị.
- Server tạo một dòng tạm trong bảng `players`.
- Phiên khách chỉ gồm tên hiển thị và cookie HTTP-only đã ký.
- Phòng chờ tự hết hạn sau 6 giờ.

## Kiểm thử

Kiểm tra migration, constraint và luật phòng/UNO:

```bash
npm test
```

Kiểm tra toàn bộ luồng bằng một lệnh, không cần cài PostgreSQL cục bộ:

```bash
npm run test:e2e:local
```

Lệnh này tự build production, khởi động PostgreSQL tạm trong bộ nhớ, áp toàn bộ
migration, bật `next start`, mô phỏng nhiều trình duyệt khách cho năm game bàn
cờ và phòng UNO 2/3/4 người, sau đó tự dọn server.
