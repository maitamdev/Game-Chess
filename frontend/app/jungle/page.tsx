import GameHub, { type GameMode } from "@/components/ui/GameHub";

const modes: GameMode[] = [
  {
    href: "/jungle/online",
    title: "Đấu online",
    description: "Tạo phòng bằng mã hoặc vào bàn Cờ Thú đang mở với đồng hồ phía máy chủ.",
    note: "Chỉ cần nhập tên hiển thị",
    kind: "online",
  },
  {
    href: "/jungle/computer",
    title: "Đấu với máy",
    description: "AI tính đường đi qua sông, bẫy và hang với 5 cấp độ.",
    note: "Chơi ngay trên trình duyệt",
    kind: "computer",
  },
  {
    href: "/jungle/local",
    title: "Hai người một máy",
    description: "Chơi luân phiên trên cùng thiết bị, bàn tự xoay theo lượt.",
    note: "Không cần mạng",
    kind: "local",
  },
];

export default function JungleHubPage() {
  return (
    <GameHub
      title="Cờ Thú"
      tagline="Tám cấp bậc, sông, bẫy và hang tạo nên một bàn đấu gọn nhưng đầy bất ngờ."
      guideHref="/jungle/guide"
      mark="虎"
      modes={modes}
    />
  );
}
