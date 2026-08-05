import { XQ_PIECE_CHARS, type XqColor, type XqMove } from "./rules";
import { playSound } from "@/lib/sounds";

export function playXqMoveSound(captured: boolean, check: boolean, gameEnd: boolean) {
  if (gameEnd) return playSound("game-end");
  if (check) return playSound("check");
  if (captured) return playSound("capture");
  playSound("move");
}

export const XQ_TERMINATION_LABELS: Record<string, string> = {
  checkmate: "Chiếu bí",
  stalemate: "Hết nước đi - thua cuộc (luật cờ tướng)",
  repetition: "Hoà do lặp thế 3 lần",
  perpetual_check: "Chiếu dai - bên chiếu liên tục bị xử thua",
  fifty_move: "Hoà theo luật 60 nước không ăn quân",
  insufficient: "Hoà - hai bên hết quân tấn công",
  timeout: "Hết giờ",
  resignation: "Đầu hàng",
  agreement: "Hoà theo thoả thuận",
  aborted: "Ván chưa bắt đầu",
};

export function xqResultTitle(winner: XqColor | null, termination: string): string {
  if (termination === "aborted") return "Ván bị huỷ";
  if (winner === "r") return "Đỏ thắng";
  if (winner === "b") return "Đen thắng";
  return "Ván hoà";
}

/** Chuỗi chữ Hán các quân màu `capturedColor` đã bị bên kia bắt. */
export function xqCapturedChars(
  moves: readonly XqMove[],
  upTo: number,
  capturedColor: XqColor,
): string {
  let out = "";
  for (let i = 0; i < upTo && i < moves.length; i++) {
    const m = moves[i];
    // quân bị bắt thuộc màu của bên KHÔNG đi nước đó
    if (m.captured && m.color !== capturedColor) {
      out += XQ_PIECE_CHARS[capturedColor][m.captured];
    }
  }
  return out;
}
