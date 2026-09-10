# Kỳ Đài — game bàn cờ, game bài và minigame

Kỳ Đài là ứng dụng Next.js trong `frontend/`. UI và Route Handler API chạy chung; dữ liệu online dùng PostgreSQL/Supabase.

## Phạm vi hiện tại

### Bàn cờ

- Cờ Vua, Cờ Tướng, Caro, Cờ Thú và Ô Ăn Quan: local, đấu máy và phòng online.
- Cờ Gánh, Reversi/Othello, Connect Four, Cờ Vây 9×9, Chinese Checkers, Cờ Đam và Dots & Boxes: game mới, local và đấu máy tại `/coganh`, `/reversi`, `/connect4`, `/covay`, `/checkers`, `/draughts` và `/dots`.

### Game nhiều người

- UNO: phòng online 2–4 người.
- Tiến Lên Miền Nam: phòng online 4 người, server chia bài và kiểm tra bộ bài.
- Cá Ngựa: phòng online 4 người, server gieo xúc xắc và kiểm tra nước đi.
- Xì Dách và Bài Cào: phòng online 2–4 người, server chia/lật bài và tính kết quả.
- Các phòng có mã phòng, danh sách công khai, reconnect bằng cookie guest, chat và rematch.
- Ván bàn cờ đang chơi có thể xem công khai tại `/spectate/<game_id>`.

### Tài khoản và cạnh tranh

- Guest session vẫn là lối vào nhanh.
- Đăng ký/đăng nhập tùy chọn, hồ sơ, lịch sử ván, leaderboard và rating Elo theo game.
- Matchmaking theo variant, time control và khoảng rating tự nới theo thời gian chờ.

## Kiến trúc

```text
frontend/
  app/                 trang UI và Route Handler API
  components/          bàn game, room UI, chat và component dùng chung
  lib/                 luật game, AI, client state và tiện ích
  lib/server/          session, database, room, rating và matchmaking
  supabase/migrations/ schema PostgreSQL và constraint
  tests/               unit, integration và E2E local
```

Online dùng HTTP polling thay vì WebSocket:

- live board đọc state khoảng mỗi 1.5 giây;
- card room đọc state khoảng mỗi 1.1 giây;
- server lưu state, version và timestamp trong database;
- mọi nước đi, random bài/xúc xắc và kết quả đều được kiểm tra hoặc tạo ở server;
- clock, timeout, resign, draw và disconnect được quyết định từ timestamp;
- transaction/version ngăn hai action hợp lệ cùng lúc ghi đè nhau.

## Chạy local

```bash
cd frontend
npm install
npm run db:migrate
npm run dev
```

Tạo `.env.local` từ `.env.example` và cấu hình:

```env
DATABASE_URL=postgresql://...
GUEST_SESSION_SECRET=chuoi-ngau-nhien-dai
```

Mở http://localhost:3000. `/api/health` kiểm tra kết nối database.

## Kiểm tra

```bash
cd frontend
npm test
npm run typecheck
npm run build
npm run test:e2e:local
```

E2E local tự tạo PostgreSQL tạm bằng PGlite, chạy migration, khởi động Next production và kiểm tra room board/card, chat, rematch, tài khoản, matchmaking và health check khi database mất kết nối.

## Nguyên tắc phát triển

- Server là nguồn sự thật cho mọi trận online.
- Random bài, xúc xắc và seed phải được tạo hoặc xác nhận ở server.
- Luật dùng chung giữa client/server và phải có test cho trường hợp biên.
- Room nhiều người dùng participant/seat thay vì mô hình cố định trắng/đen.
- Mỗi migration mới phải bật RLS cho bảng dữ liệu server-owned.
- Mỗi mốc mới phải chạy test, typecheck và build trước khi bàn giao.
