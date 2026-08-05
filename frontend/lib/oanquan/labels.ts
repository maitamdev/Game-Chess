import type { OqColor } from "./rules";
import { playSound } from "@/lib/sounds";

export const OQ_TERMINATION_LABELS: Record<string, string> = {
  quan_out: "Hết quan tàn dân - tính sổ",
  move_limit: "Quá 400 nước - tính sổ",
  timeout: "Hết giờ",
  resignation: "Đầu hàng",
  agreement: "Hoà theo thoả thuận",
  aborted: "Ván chưa bắt đầu",
};

/** Quy ước hiển thị: A = Đỏ ngồi dưới, B = Xanh ngồi trên. */
export function oqResultTitle(winner: OqColor | null, termination: string): string {
  if (termination === "aborted") return "Ván bị huỷ";
  if (winner === "a") return "Bên Đỏ thắng";
  if (winner === "b") return "Bên Xanh thắng";
  return "Ván hoà";
}

export function oqSideName(color: OqColor): "Đỏ" | "Xanh" {
  return color === "a" ? "Đỏ" : "Xanh";
}

export function playOqMoveSound(captured: boolean, gameEnd: boolean) {
  if (gameEnd) return playSound("game-end");
  if (captured) return playSound("capture");
  playSound("move");
}
