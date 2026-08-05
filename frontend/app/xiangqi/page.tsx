import GameHub, { type GameMode } from "@/components/ui/GameHub";

const modes: GameMode[] = [
  {
    href: "/xiangqi/online",
    title: "Đấu online",
    description: "Tạo phòng bằng mã hoặc vào phòng Cờ Tướng đang mở, đồng hồ được giữ phía máy chủ.",
    note: "Chỉ cần nhập tên hiển thị",
    kind: "online",
  },
  {
    href: "/xiangqi/computer",
    title: "Đấu với máy",
    description: "Engine Cờ Tướng chạy trong trình duyệt với 5 cấp độ phù hợp mọi trình độ.",
    note: "Chơi ngay trên trình duyệt",
    kind: "computer",
  },
  {
    href: "/xiangqi/local",
    title: "Hai người một máy",
    description: "Chơi trực tiếp trên cùng thiết bị với bàn cờ tự xoay theo lượt.",
    note: "Không cần mạng",
    kind: "local",
  },
];

export default function XiangqiHubPage() {
  return (
    <GameHub
      title="Cờ Tướng"
      tagline="Xe, Pháo, Mã cùng nhịp đấu nhanh và đầy đòn chiến thuật trên bàn cờ 9 × 10."
      guideHref="/xiangqi/guide"
      mark="將"
      modes={modes}
    />
  );
}
