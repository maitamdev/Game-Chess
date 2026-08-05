import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UNO Arena | Kỳ Đài",
  description:
    "Chơi UNO miễn phí cùng ba đối thủ máy, đầy đủ lá đổi chiều, cấm lượt, cộng hai, đổi màu và cộng bốn.",
};

export default function UnoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
