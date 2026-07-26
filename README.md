# Kỳ Đài — Nền tảng chơi cờ trực tuyến

Bốn game — **Cờ Vua**, **Cờ Tướng**, **Cờ Caro 200×200** và **Cờ Thú** — mỗi
game đủ ba chế độ:

- **Đấu online** — ghép cặp tự động theo Elo (Elo riêng cho từng game), đồng hồ phía server, xếp hạng. Cần đăng nhập.
- **Đấu với máy** — engine minimax chạy trong Web Worker, 5 mức độ. Không cần đăng nhập.
- **Hai người một máy** — thay phiên trên cùng thiết bị, bàn cờ tự xoay. Không cần mạng.

Luật cờ tướng, caro và cờ thú tự viết hai bản (TypeScript client + Python
server) và kiểm chứng chéo bằng fuzz: cờ tướng perft khớp chuẩn (44 / 1 920 /
79 666) + 200 ván ~20k thế khớp tuyệt đối; caro 300 ván 5-in-row khớp; cờ thú
250 ván ~37k thế khớp (kèm spot-test chuột ăn voi, nhảy sông bị chuột chặn).
Bàn caro 200×200 virtualized (kéo di chuyển, lăn chuột phóng to); bàn cờ thú
có sông gợn sóng, bẫy khắc chéo, hang ⛩, đĩa thú kèm huy hiệu cấp.

## Chạy trên máy này

Cần **hai** tiến trình: backend (cổng 8000) và frontend (cổng 3000).

### 1. Backend

```bash
cd backend
.venv/Scripts/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

(Nếu chưa có `.venv`: `python -m venv .venv` rồi `.venv/Scripts/pip install -r requirements.txt`.)

### 2. Frontend

```bash
cd frontend
npm run dev
```

Mở http://localhost:3000. Muốn thử đấu online một mình: mở 2 cửa sổ trình duyệt
(một cửa sổ ẩn danh để đăng nhập 2 tài khoản khác nhau), cùng bấm **Tìm trận**.

## Cấu hình

Backend đọc biến môi trường (hoặc `backend/.env`):

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:///./chess.db` | Sản xuất: `postgresql+asyncpg://user:pass@host/db` (bật `asyncpg` trong requirements.txt, chạy `alembic upgrade head`) |
| `JWT_SECRET` | giá trị dev | **Bắt buộc đổi khi triển khai** |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | |

Frontend: `NEXT_PUBLIC_API_URL` (mặc định `http://localhost:8000`).

## Khác biệt so với đặc tả gốc (do môi trường máy local)

- **SQLite thay cho PostgreSQL 16** — cùng models SQLAlchemy 2.0 async; đổi
  `DATABASE_URL` là chạy PostgreSQL, schema quản lý bằng Alembic (scaffold sẵn).
- **Không dùng Redis** — hàng đợi ghép cặp + phiên ván giữ trong bộ nhớ, đủ cho
  **một** tiến trình backend. Chạy nhiều tiến trình phải bổ sung Redis pub/sub
  (điểm nối: `app/ws/manager.py` + `matchmaking.py`).
- **Âm thanh `.wav` tự tổng hợp** trong `frontend/public/sounds/` (máy không có
  bộ mã hoá MP3). Client tự ưu tiên `.mp3` nếu bạn thay file.
- Thông điệp WebSocket mở rộng ngoài spec: `view_only` (2 tab cùng ván),
  `server_time` trong `move_made`, kết quả `aborted` khi huỷ ván.

## Cấu trúc

```
frontend/   Next.js 15 + TypeScript + Tailwind v4 + Zustand + TanStack Query
  app/                /, /chess, /play/* (cờ vua), /xiangqi/* (cờ tướng),
                      /game/[id] (xem lại), /u/[username], /leaderboard, /login, /register
  components/board/   bàn cờ vua tự dựng (CSS Grid, kéo-thả + nhấp, premove, phong cấp tại ô)
  components/xiangqi/ bàn cờ tướng (giao điểm 9×10, sông, cung, quân đĩa chữ Hán)
  components/game/    đồng hồ, thẻ người chơi, biên bản, modal kết thúc (dùng chung)
  lib/engine/         engine cờ vua: minimax + alpha-beta + quiescence (Web Worker)
  lib/xiangqi/        luật cờ tướng + engine + worker riêng
  lib/ws.ts           client WebSocket, tự kết nối lại (backoff ≤30s), ping 20s
backend/    FastAPI + SQLAlchemy async + python-chess
  app/api/            REST: auth (JWT), users, games, leaderboard (?variant=)
  app/ws/             ghép cặp theo (game, thể thức), phiên ván + đồng hồ monotonic, Elo, PGN
  app/core/           chess_rules (python-chess) + xiangqi_rules (tự viết) + elo + security
  alembic/            migration cho PostgreSQL
```
