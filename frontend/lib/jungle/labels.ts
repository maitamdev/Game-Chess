import { JG_EMOJI, type JgColor, type JgRank } from "./rules";
import { playSound } from "@/lib/sounds";

/** emoji các thú màu `capturedColor` đã bị bên kia bắt (tới nước upTo) */
export function jgCapturedEmoji(
  moves: readonly { captured?: JgRank; color: JgColor }[],
  upTo: number,
  capturedColor: JgColor,
): string {
  let out = "";
  for (let i = 0; i < upTo && i < moves.length; i++) {
    const m = moves[i];
    if (m.captured !== undefined && m.color !== capturedColor) {
      out += JG_EMOJI[m.captured];
    }
  }
  return out;
}

export const JG_TERMINATION_LABELS: Record<string, string> = {
  den: "Vào được hang đối phương",
  no_pieces: "Đối phương hết sạch thú",
  stalemate: "Hết nước đi — thua cuộc",
  repetition: "Hoà do lặp thế 3 lần",
  timeout: "Hết giờ",
  resignation: "Đầu hàng",
  agreement: "Hoà theo thoả thuận",
  aborted: "Không có nước đi nào — không tính Elo",
};

export function jgResultTitle(winner: JgColor | null, termination: string): string {
  if (termination === "aborted") return "Ván bị huỷ";
  if (winner === "r") return "Đỏ thắng";
  if (winner === "b") return "Xanh thắng";
  return "Ván hoà";
}

export function playJgMoveSound(captured: boolean, gameEnd: boolean) {
  if (gameEnd) return playSound("game-end");
  if (captured) return playSound("capture");
  playSound("move");
}
