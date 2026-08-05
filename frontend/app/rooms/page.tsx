import RoomLobby from "@/components/online/RoomLobby";

export const metadata = {
  title: "Phòng chơi | Kỳ Đài",
  description:
    "Tạo phòng, nhập mã hoặc chọn một phòng công khai để chơi cùng bạn bè.",
};

export default function RoomsPage() {
  return <RoomLobby />;
}
