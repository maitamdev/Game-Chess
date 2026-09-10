"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ChatCircleDots } from "@phosphor-icons/react/ChatCircleDots";
import { PaperPlaneRight } from "@phosphor-icons/react/PaperPlaneRight";

import Button from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";

interface RoomMessage {
  id: number;
  player_id: string;
  username: string;
  body: string;
  created_at: number;
}

export default function RoomChat({ code }: { code: string }) {
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const cursor = useRef(0);
  const stopped = useRef(false);

  const load = useCallback(async () => {
    try {
      const result = await api<{ messages: RoomMessage[]; next_after: number }>(
        `/api/rooms/chat?code=${encodeURIComponent(code)}&after=${cursor.current}`,
      );
      if (stopped.current) return;
      if (result.messages.length > 0) {
        cursor.current = result.next_after;
        setMessages((current) => [...current, ...result.messages].slice(-80));
      }
      setError(null);
    } catch (cause) {
      if (!stopped.current) {
        setError(cause instanceof ApiError ? cause.message : "Không tải được chat phòng");
      }
    }
  }, [code]);

  useEffect(() => {
    stopped.current = false;
    void load();
    const timer = setInterval(load, 1600);
    return () => {
      stopped.current = true;
      clearInterval(timer);
    };
  }, [load]);

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message) return;
    setDraft("");
    try {
      const created = await api<RoomMessage>("/api/rooms/chat", {
        body: { code, message },
      });
      cursor.current = Math.max(cursor.current, created.id);
      setMessages((current) => [...current, created].slice(-80));
      setError(null);
    } catch (cause) {
      setDraft(message);
      setError(cause instanceof ApiError ? cause.message : "Không gửi được tin nhắn");
    }
  };

  return (
    <section className="rounded-[14px] border border-line bg-slate p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <ChatCircleDots size={20} className="text-brass" aria-hidden />
        <h2 className="font-bold text-parchment">Chat phòng</h2>
        <span className="ml-auto text-xs text-muted">Tối đa 280 ký tự</span>
      </div>
      <div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-[10px] border border-line bg-ink/35 p-3">
        {messages.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted">Chưa có tin nhắn. Chào đối thủ đi!</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="text-sm leading-5">
              <span className="font-semibold text-brass">{message.username}</span>
              <span className="mx-2 text-muted">·</span>
              <span className="text-parchment">{message.body}</span>
            </div>
          ))
        )}
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, 280))}
          maxLength={280}
          placeholder="Nhắn trong phòng..."
          className="min-h-10 min-w-0 flex-1 rounded-[8px] border border-line bg-ink px-3 text-sm text-parchment outline-none placeholder:text-muted focus:border-brass"
        />
        <Button type="submit" size="sm" variant="primary" disabled={!draft.trim()} aria-label="Gửi tin nhắn">
          <PaperPlaneRight size={17} aria-hidden />
        </Button>
      </form>
      {error && <p className="mt-2 text-xs text-[#e48a78]">{error}</p>}
    </section>
  );
}
