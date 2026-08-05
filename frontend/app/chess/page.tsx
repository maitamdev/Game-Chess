import GameHub, { type GameMode } from "@/components/ui/GameHub";

const modes: GameMode[] = [
  {
    href: "/play/online",
    title: "Đấu online",
    description:
      "Tạo phòng bằng mã hoặc chọn phòng đang mở, với đồng hồ được giữ phía máy chủ.",
    note: "Chỉ cần nhập tên hiển thị",
    kind: "online",
  },
  {
    href: "/play/computer",
    title: "Đấu với máy",
    description: "Engine chạy ngay trong trình duyệt với 5 mức độ từ nhập môn tới thử thách.",
    note: "Chơi ngay trên trình duyệt",
    kind: "computer",
  },
  {
    href: "/play/local",
    title: "Hai người một máy",
    description: "Thay phiên trên cùng thiết bị, bàn cờ tự xoay về phía người đang đi.",
    note: "Không cần mạng",
    kind: "local",
  },
];

export default function ChessHubPage() {
  return (
    <GameHub
      title="Cờ Vua"
      tagline="Bàn đấu cổ điển với trải nghiệm hiện đại, từ ván nhanh cùng bạn bè tới luyện tập chuyên sâu với máy."
      guideHref="/chess/guide"
      mark="♞"
      modes={modes}
    />
  );
}
