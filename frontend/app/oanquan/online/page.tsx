"use client";

import QueuePanel from "@/components/online/QueuePanel";
import { useAuthStore } from "@/stores/authStore";

export default function OanquanQueuePage() {
  const user = useAuthStore((s) => s.user);
  return (
    <QueuePanel
      variant="oanquan"
      title="Ô ăn quan — đấu online"
      eloLabel="Elo ô ăn quan"
      eloValue={user?.oq_elo}
      basePath="/oanquan/online"
    />
  );
}
