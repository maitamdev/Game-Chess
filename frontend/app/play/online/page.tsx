"use client";

import QueuePanel from "@/components/online/QueuePanel";
import { useAuthStore } from "@/stores/authStore";

export default function OnlineQueuePage() {
  const user = useAuthStore((s) => s.user);
  return (
    <QueuePanel
      variant="chess"
      title="Cờ vua — đấu online"
      eloLabel="Elo cờ vua"
      eloValue={user?.elo}
      basePath="/play/online"
    />
  );
}
