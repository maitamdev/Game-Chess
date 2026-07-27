"use client";

import QueuePanel from "@/components/online/QueuePanel";
import { useAuthStore } from "@/stores/authStore";

export default function JungleQueuePage() {
  const user = useAuthStore((s) => s.user);
  return (
    <QueuePanel
      variant="jungle"
      title="Cờ thú — đấu online"
      eloLabel="Elo cờ thú"
      eloValue={user?.jg_elo}
      basePath="/jungle/online"
    />
  );
}
