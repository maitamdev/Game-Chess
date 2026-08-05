import type { CaroColor } from "./rules";
import { playSound } from "@/lib/sounds";

export const CARO_TERMINATION_LABELS: Record<string, string> = {
  five_in_row: "Nối đủ 5 quân liên tiếp",
  board_full: "Bàn đầy - hoà",
  timeout: "Hết giờ",
  resignation: "Đầu hàng",
  agreement: "Hoà theo thoả thuận",
  aborted: "Ván chưa bắt đầu",
};

export function caroResultTitle(winner: CaroColor | null, termination: string): string {
  if (termination === "aborted") return "Ván bị huỷ";
  if (winner === "x") return "X thắng";
  if (winner === "o") return "O thắng";
  return "Ván hoà";
}

export function playCaroMoveSound(gameEnd: boolean) {
  if (gameEnd) return playSound("game-end");
  playSound("move");
}
