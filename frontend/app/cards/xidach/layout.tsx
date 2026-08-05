import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xì Dách | Kỳ Đài",
  description:
    "Chơi Xì Dách luật Việt Nam với Xì Bàn, Xì Dách, Ngũ Linh và choét.",
};

export default function XiDachLayout({ children }: { children: React.ReactNode }) {
  return children;
}
