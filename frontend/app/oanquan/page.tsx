import GameHub, { type GameMode } from "@/components/ui/GameHub";

const modes: GameMode[] = [
  {
    href: "/oanquan/online",
    title: "Đấu online",
    description: "Tạo phòng bằng mã hoặc vào bàn Ô Ăn Quan đang mở, trạng thái được lưu phía máy chủ.",
    note: "Chỉ cần nhập tên hiển thị",
    kind: "online",
  },
  {
    href: "/oanquan/computer",
    title: "Đấu với máy",
    description: "AI tính chuỗi rải và ăn quân với 5 mức độ.",
    note: "Chơi ngay trên trình duyệt",
    kind: "computer",
  },
  {
    href: "/oanquan/local",
    title: "Hai người một máy",
    description: "Ngồi cùng nhau và thay phiên rải sỏi trên một thiết bị.",
    note: "Không cần mạng",
    kind: "local",
  },
];

export default function OanquanHubPage() {
  return (
    <GameHub
      title="Ô Ăn Quan"
      tagline="Mười ô dân, hai ô quan và từng vòng rải sỏi đòi hỏi tính toán đường dài."
      guideHref="/oanquan/guide"
      mark="田"
      modes={modes}
    />
  );
}
