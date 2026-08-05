import RoomLobby from "@/components/online/RoomLobby";

export default function OnlineRoomsPage() {
  return (
    <RoomLobby
      initialGame="chess"
      lockedGame
      heading="Cờ vua online"
    />
  );
}
