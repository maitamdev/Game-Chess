"""Quản lý kết nối WebSocket (mục 9).

Một tiến trình duy nhất giữ mọi kết nối trong bộ nhớ. Khi triển khai
nhiều tiến trình, phần phát thông điệp phải chuyển qua Redis pub/sub
(mục 9 spec) — điểm nối duy nhất là Connection.send / broadcast.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from fastapi import WebSocket


@dataclass(eq=False)  # so sánh/băm theo danh tính — mỗi kết nối là duy nhất
class Connection:
    ws: WebSocket
    user_id: uuid.UUID
    username: str
    last_ping: float = field(default_factory=time.monotonic)

    async def send(self, message: dict[str, Any]) -> None:
        try:
            await self.ws.send_json(message)
        except Exception:
            # kết nối đã đứt — vòng đời sẽ được dọn ở endpoint
            pass


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: set[Connection] = set()

    def register(self, conn: Connection) -> None:
        self.connections.add(conn)

    def unregister(self, conn: Connection) -> None:
        self.connections.discard(conn)

    def touch_ping(self, conn: Connection) -> None:
        conn.last_ping = time.monotonic()

    def stale_connections(self, timeout_seconds: float) -> list[Connection]:
        """Các kết nối không ping trong `timeout_seconds` (spec: 45 giây)."""
        now = time.monotonic()
        return [c for c in self.connections if now - c.last_ping > timeout_seconds]


manager = ConnectionManager()
