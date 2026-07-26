"use client";

/**
 * Client WebSocket + tự kết nối lại (mục 5.3, 9):
 * - ping mỗi 20 giây
 * - đứt kết nối: thử lại theo cấp số nhân, tối đa 30 giây
 * - token hết hạn (mã đóng 4401): refresh rồi nối lại
 * - singleton giữ nguyên qua điều hướng (màn chờ → màn ván đấu)
 */

import { WS_URL, refreshAccessToken } from "./api";
import { useAuthStore } from "@/stores/authStore";

export type SocketStatus = "closed" | "connecting" | "open" | "reconnecting";

type MessageHandler = (msg: Record<string, unknown>) => void;
type StatusHandler = (status: SocketStatus) => void;

const PING_INTERVAL_MS = 20_000;
const MAX_BACKOFF_MS = 30_000;

class GameSocket {
  private ws: WebSocket | null = null;
  private wantOpen = false;
  private attempts = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private queue: string[] = [];
  private messageHandlers = new Set<MessageHandler>();
  private statusHandlers = new Set<StatusHandler>();
  status: SocketStatus = "closed";

  connect(): void {
    this.wantOpen = true;
    // huỷ lịch kết nối lại đang chờ — tránh mở 2 socket song song
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.open();
  }

  private setStatus(status: SocketStatus) {
    this.status = status;
    for (const h of this.statusHandlers) h(status);
  }

  private open(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return; // đã có socket sống — không mở thêm
    }
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    this.setStatus(this.attempts > 0 ? "reconnecting" : "connecting");
    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    this.ws = ws;

    ws.onopen = () => {
      this.attempts = 0;
      // xả hàng đợi TRƯỚC khi báo trạng thái — statusHandler thường gửi lại
      // join_queue/sync, làm sau sẽ thành gửi trùng hai lần
      for (const raw of this.queue.splice(0)) ws.send(raw);
      this.startPing();
      this.setStatus("open");
    };

    ws.onmessage = (e) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(e.data as string);
      } catch {
        return;
      }
      for (const h of this.messageHandlers) h(msg);
    };

    ws.onclose = async (e) => {
      if (this.ws !== ws) return; // socket cũ đã bị thay — không đụng ping/timer
      this.stopPing();
      this.ws = null;
      if (!this.wantOpen) {
        this.setStatus("closed");
        return;
      }
      this.setStatus("reconnecting");
      if (e.code === 4401) {
        await refreshAccessToken();
      }
      const delay = Math.min(1000 * 2 ** this.attempts, MAX_BACKOFF_MS);
      this.attempts++;
      this.reconnectTimer = setTimeout(() => this.open(), delay);
    };

    ws.onerror = () => {
      // onclose sẽ xử lý kết nối lại
    };
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ type: "ping" });
    }, PING_INTERVAL_MS);
  }

  private stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  send(msg: Record<string, unknown>): void {
    const raw = JSON.stringify(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(raw);
    } else if (this.wantOpen && msg.type !== "ping") {
      this.queue.push(raw);
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => this.statusHandlers.delete(handler);
  }

  close(): void {
    this.wantOpen = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.stopPing();
    this.queue = [];
    this.ws?.close();
    this.ws = null;
    this.setStatus("closed");
  }
}

let socket: GameSocket | null = null;

export function getGameSocket(): GameSocket {
  if (!socket) socket = new GameSocket();
  return socket;
}
