# Kỳ Đài — Đấu trường cờ & game trí tuệ

Một ứng dụng **Next.js duy nhất, deploy trọn gói lên Vercel** (không còn
backend Python). Năm game đối kháng — **Cờ Vua**, **Cờ Tướng**, **Cờ Caro
200×200**, **Cờ Thú**, **Ô Ăn Quan** — mỗi game đủ ba chế độ, cộng nhóm
**minigame giải trí** (2048, Dò mìn, Lật thẻ):

- **Đấu online** — ghép cặp tự động theo Elo (Elo riêng từng game), server là
  trọng tài duy nhất, xếp hạng + lịch sử Elo. Cần đăng nhập.
- **Đấu với máy** — engine minimax chạy trong Web Worker, 5 mức độ. Không cần đăng nhập.
- **Hai người một máy** — thay phiên trên cùng thiết bị, bàn cờ tự xoay. Không cần mạng.

## Kiến trúc (một app Next.js)

```
frontend/
  app/                trang UI + app/api/* (route handlers = backend TypeScript)
    api/auth/         đăng ký / đăng nhập / refresh (JWT HS256, bcrypt)
    api/users|games/  hồ sơ, lịch sử ván, rating-history, PGN, leaderboard
    api/queue/        ghép cặp: join / leave / status (poll-driven, dải Elo ±100→±400)
    api/live/         ván online: state / move / resign / draw
  lib/server/         schema Drizzle (libSQL/Turso), auth, elo, live engine,
                      rules adapters (trọng tài server dùng CHUNG bộ luật TS với client)
  lib/online/         useOnlineGame — hook polling + đi nước lạc quan + đồng hồ nội suy
  lib/{engine,xiangqi,caro,jungle,oanquan}/  luật + AI minimax từng game (Web Worker)
  components/         bàn cờ từng game + UI dùng chung + minigames
```

**Online không cần WebSocket** (Vercel serverless không hỗ trợ): client poll
`GET /api/live/:id/state` mỗi 1.5s (kiêm heartbeat hiện diện); đồng hồ, huỷ
ván (30s/120s), xử thua rớt mạng (60s), hết giờ đều phán quyết *lazy* theo
timestamp trong DB ngay khi có request — không cần tiến trình thường trực.
Ghép cặp cũng poll-driven, không có vòng lặp nền.

Luật cờ tướng / caro / cờ thú / ô ăn quan viết một lần bằng TypeScript và dùng
cho **cả client lẫn server** (hết cảnh hai bản Python/TS); cờ vua dùng chess.js.

## Chạy trên máy này

```bash
cd frontend
npm install
npm run db:push   # tạo schema vào SQLite ./local.db (chỉ lần đầu)
npm run dev
```

Mở http://localhost:3000. Muốn thử đấu online một mình: mở 2 cửa sổ trình duyệt
(một cửa sổ ẩn danh để đăng nhập 2 tài khoản khác nhau), cùng bấm **Tìm trận**.

## Deploy lên Vercel (miễn phí)

1. Tạo database [Turso](https://turso.tech) (gói free):
   `turso db create kydai` → lấy URL + token (`turso db show kydai --url`,
   `turso db tokens create kydai`).
2. Đẩy schema: chạy `npm run db:push` trong `frontend/` với
   `DATABASE_URL=libsql://…` và `DATABASE_AUTH_TOKEN=…` trong môi trường.
3. Import repo vào Vercel, **Root Directory = `frontend`**, đặt env:

| Biến | Ghi chú |
|---|---|
| `DATABASE_URL` | `libsql://<db>-<org>.turso.io` (local mặc định `file:./local.db`) |
| `DATABASE_AUTH_TOKEN` | token Turso |
| `JWT_SECRET` | chuỗi ngẫu nhiên dài — **bắt buộc đổi khi triển khai** |

Không cần cấu hình gì thêm — API routes deploy cùng frontend.

## Ghi chú kỹ thuật

- Elo: K = 40/20/10 theo số ván; thay đổi ghi vào `rating_history` từng variant.
- Đề nghị hoà có hiệu lực tới khi bên nhận đi nước; nước đi lạc quan đối chiếu
  bằng `ply` — server state luôn là chân lý.
- Hết giờ mà đối thủ thiếu lực chiếu bí → hoà (cờ vua/cờ tướng/cờ thú).
- Âm thanh `.wav` tự tổng hợp trong `frontend/public/sounds/`.
- Minigame (2048, Dò mìn, Lật thẻ) chạy hoàn toàn client-side, kỷ lục lưu localStorage.
