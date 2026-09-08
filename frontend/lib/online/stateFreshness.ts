export interface LiveStateRevision {
  ply: number;
  server_time: number;
  status: "active" | "finished";
}

/** Chặn response polling cũ về trễ ghi đè snapshot mới hơn. */
export function isFresherLiveState(
  current: LiveStateRevision | null,
  incoming: LiveStateRevision,
): boolean {
  if (current === null) return true;
  if (current.status === "finished" && incoming.status === "active") return false;
  if (incoming.status === "finished" && current.status === "active") {
    return incoming.ply >= current.ply;
  }
  if (incoming.ply !== current.ply) return incoming.ply > current.ply;
  return incoming.server_time >= current.server_time;
}
