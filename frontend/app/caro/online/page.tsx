"use client";

import QueuePanel from "@/components/online/QueuePanel";
import { useAuthStore } from "@/stores/authStore";

export default function CaroQueuePage() {
  const user = useAuthStore((s) => s.user);
  return (
    <QueuePanel
      variant="caro"
      title="Cờ caro — đấu online"
      eloLabel="Elo caro"
      eloValue={user?.caro_elo}
      basePath="/caro/online"
    />
  );
}
