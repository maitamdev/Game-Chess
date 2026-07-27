"use client";

import QueuePanel from "@/components/online/QueuePanel";
import { useAuthStore } from "@/stores/authStore";

export default function XiangqiQueuePage() {
  const user = useAuthStore((s) => s.user);
  return (
    <QueuePanel
      variant="xiangqi"
      title="Cờ tướng — đấu online"
      eloLabel="Elo cờ tướng"
      eloValue={user?.xq_elo}
      basePath="/xiangqi/online"
    />
  );
}
