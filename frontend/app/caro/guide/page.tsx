import type { Metadata } from "next";
import GuideLayout, { type GuideData } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "Hướng dẫn chơi Cờ Caro — Kỳ Đài",
  description:
    "Luật cờ caro trên bàn 200×200: nối đủ 5 quân liên tiếp là thắng, không luật cấm — cùng cách pan, zoom và thao tác trên Kỳ Đài.",
};

const data: GuideData = {
  backHref: "/caro",
  backLabel: "Cờ Caro",
  title: "Hướng dẫn chơi Cờ Caro",
  tagline:
    "Caro giấy đúng nghĩa trên bàn 200×200 giao điểm: nối đủ 5 quân liên tiếp là thắng, không luật cấm, không chặn hai đầu.",
  objective:
    "Là người đầu tiên nối được 5 quân trở lên của mình liên tiếp theo hàng ngang, dọc hoặc chéo. Chuỗi dài hơn 5 vẫn tính thắng, và bị chặn hai đầu vẫn thắng nếu đủ 5 — đúng kiểu caro tự do (freestyle).",
  setup: [
    "Bàn có 200×200 giao điểm — bốn vạn ô, rộng như tờ giấy caro không bao giờ hết mép — bắt đầu trống hoàn toàn, chính giữa bàn có chấm mốc.",
    "X luôn đi trước, sau đó hai bên luân phiên, mỗi lượt đặt một quân vào ô trống bất kỳ. Khi đấu máy, nếu máy đi nước đầu tiên nó sẽ đặt vào giữa bàn.",
  ],
  piecesTitle: "Hai quân X và O",
  pieces: [
    {
      glyph: { char: "✕" },
      name: "X — đi trước",
      count: "∞",
      rule: "Mỗi lượt đặt 1 quân vào một ô trống bất kỳ. Quân đã đặt nằm đó đến hết ván — không di chuyển, không bị ăn.",
    },
    {
      glyph: { char: "○" },
      name: "O — đi sau",
      count: "∞",
      rule: "Đi sau X, luật đặt quân giống hệt. Trong ván online, hệ thống tự phân bên cầm X hoặc O khi ghép cặp.",
    },
  ],
  specialRules: [
    "Thắng khi có từ 5 quân liên tiếp trở lên — chuỗi 6, 7 quân (overline) vẫn thắng.",
    "Không có luật cấm: không cấm nước đôi ba, đôi bốn; không có luật chặn hai đầu. Đủ 5 là thắng, chấm hết.",
    "Đường thắng được tô sáng màu đồng trên bàn khi ván kết thúc.",
    "Khác cờ vua và cờ tướng: hết giờ trong caro luôn là thua, không có ngoại lệ xử hoà.",
  ],
  winConditions: [
    "Nối đủ 5 quân trở lên liên tiếp theo ngang, dọc hoặc chéo.",
    "Đối thủ hết giờ.",
    "Đối thủ đầu hàng.",
    "Online: đối thủ mất kết nối và không quay lại trong khoảng 60 giây.",
  ],
  drawConditions: [
    "Bàn đầy cả 40.000 ô mà chưa ai nối đủ 5 — trên thực tế gần như không bao giờ xảy ra.",
    "Online: hoà theo thoả thuận qua nút Cầu hoà.",
  ],
  clock: [
    "Chế độ hai người và đấu máy có thể chọn: Tắt đồng hồ, 5+0, 10+0 hoặc 15+10 (cộng 10 giây sau mỗi nước đi). Đấu online có bốn thể thức: 3+2, 5+0, 10+0 và 15+10.",
    "Đồng hồ chỉ bắt đầu chạy sau nước đi đầu tiên của ván (10 giây cộng thêm cũng tính từ nước thứ hai). Hết giờ là thua vô điều kiện.",
  ],
  uiTips: [
    "Nhấp vào ô trống để đặt quân — ô đang trỏ hiện quân mờ xem trước, toạ độ hiện ở góc dưới trái bàn.",
    "Nhấn giữ và kéo để di chuyển khung nhìn quanh bàn 200×200; thả tay khi đang kéo sẽ không đặt quân nhầm.",
    "Lăn chuột để phóng to / thu nhỏ tại vị trí con trỏ, hoặc dùng nút + / − ở góc bàn.",
    "Nút ⌖ đưa khung nhìn về nước đi mới nhất; khi đối thủ đi ngoài khung nhìn, bàn tự cuộn theo.",
    "Nhấp một nước trong danh sách để xem lại thế cờ cũ; quay về nước cuối mới đặt quân tiếp được.",
    "Đấu máy: có nút Gợi ý (tô ô xanh lá), Hoàn tác và Đầu hàng. Chế độ hai người có Hoàn tác từng nước.",
    "Đấu online: Đầu hàng bấm 2 lần trong 3 giây để xác nhận; Cầu hoà gửi đề nghị cho đối thủ; mở ván ở tab thứ hai thì tab mới giành quyền chơi, tab cũ chuyển sang chỉ xem — tab chỉ xem có nút \"Chơi ở tab này\" để giành lại quyền.",
  ],
  notation:
    "Mỗi nước ghi dạng quân + toạ độ cột.hàng, ví dụ X104.98 — quân X đặt ở cột 104, hàng 98. Toạ độ đếm từ 0 đến 199, hiện ở góc bàn khi trỏ chuột.",
  modes: [
    {
      href: "/caro/online",
      label: "Đấu online",
      note: "Cần đăng nhập — Elo caro riêng",
    },
    {
      href: "/caro/computer",
      label: "Đấu với máy",
      note: "5 mức độ, chạy ngay trong trình duyệt",
    },
    {
      href: "/caro/local",
      label: "Hai người một máy",
      note: "Thay phiên trên cùng thiết bị, không cần mạng",
    },
  ],
};

export default function CaroGuidePage() {
  return <GuideLayout data={data} />;
}
