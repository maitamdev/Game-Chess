import GameHub, { type GameMode } from "@/components/ui/GameHub";

const modes: GameMode[] = [
  {
    href: "/caro/online",
    title: "Đấu online",
    description: "Tạo phòng bằng mã hoặc vào bàn Caro đang mở, đồng bộ trạng thái phía máy chủ.",
    note: "Chỉ cần nhập tên hiển thị",
    kind: "online",
  },
  {
    href: "/caro/computer",
    title: "Đấu với máy",
    description: "AI nhận diện chuỗi tấn công và phòng thủ với 5 mức độ.",
    note: "Chơi ngay trên trình duyệt",
    kind: "computer",
  },
  {
    href: "/caro/local",
    title: "Hai người một máy",
    description: "Đặt quân luân phiên trên cùng thiết bị, thao tác kéo và phóng to mượt.",
    note: "Không cần mạng",
    kind: "local",
  },
];

export default function CaroHubPage() {
  return (
    <GameHub
      title="Cờ Caro"
      tagline="Bàn giao điểm rộng, thao tác mượt và luật năm quân quen thuộc cho mọi cuộc đấu nhanh."
      guideHref="/caro/guide"
      mark="×"
      modes={modes}
    />
  );
}
