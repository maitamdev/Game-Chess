import type { Metadata } from "next";
import GuideLayout, { type GuideData } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "Hướng dẫn chơi Ô Ăn Quan — Kỳ Đài",
  description:
    "Luật ô ăn quan đầy đủ: cách rải sỏi hai chiều, luật ăn cách ô và ăn chuỗi, vay nợ rải lại, tính điểm khi hết quan tàn dân — và cách thao tác trên Kỳ Đài.",
};

const data: GuideData = {
  backHref: "/oanquan",
  backLabel: "Ô Ăn Quan",
  title: "Hướng dẫn chơi Ô Ăn Quan",
  tagline:
    "Trò chơi sân gạch tuổi thơ: mười ô dân, hai ô quan, một vốc sỏi — rải khéo léo để ăn nhiều điểm nhất khi \"hết quan tàn dân\".",
  objective:
    "Kết thúc ván với nhiều điểm hơn đối thủ. Mỗi dân ăn được tính 1 điểm, mỗi quan tính 10 điểm; ván kết thúc khi cả hai quan đều bị ăn — dân còn lại trên hàng ai thuộc về người đó (\"hết quan tàn dân, thu quân kéo về\").",
  setup: [
    "Bàn gồm 12 ô xếp thành vòng: 2 hàng × 5 ô dân (hàng dưới của bên Đỏ, hàng trên của bên Xanh) và 2 ô quan hình bán nguyệt ở hai đầu. Khởi đầu mỗi ô dân có 5 dân, mỗi ô quan có 1 quan.",
    "Bên Đỏ đi trước. Đến lượt, bạn chọn một ô dân bên mình còn sỏi, chọn chiều (sang trái hoặc sang phải), bốc hết sỏi trong ô rồi rải mỗi ô kế tiếp 1 viên — rải cả vào ô quan — đi vòng quanh bàn.",
  ],
  piecesTitle: "Quân trên bàn",
  pieces: [
    {
      glyph: { char: "🪨" },
      name: "Dân",
      count: "50",
      rule: "Viên sỏi nhỏ, mỗi ô dân khởi đầu có 5 viên. Là thứ được bốc lên rải và bị ăn qua lại suốt ván. Mỗi dân trong kho khi tính sổ = 1 điểm.",
    },
    {
      glyph: { char: "🟡" },
      name: "Quan",
      count: "2",
      rule: "Viên đá lớn nằm trong hai ô bán nguyệt, không bao giờ được bốc lên rải — chỉ có thể bị ăn theo luật ăn cách ô. Mỗi quan = 10 điểm. Cả hai quan bị ăn là ván kết thúc.",
    },
  ],
  specialRules: [
    "Rải hết tay, xét ô liền sau viên cuối: nếu là ô dân còn sỏi — bốc hết ô đó rải tiếp cùng chiều (dây chuyền); nếu là ô quan — dừng lượt.",
    "Ăn cách ô: nếu ô liền sau viên cuối là ô dân trống và ô kế tiếp có quân — bạn ăn toàn bộ ô đó (kể cả ô quan còn quan/dân). Sau ô vừa ăn, nếu lại gặp đúng cảnh \"ô dân trống rồi ô có quân\" thì ăn tiếp — chuỗi ăn có thể quét sạch nửa bàn.",
    "Nếu ô liền sau viên cuối là ô dân trống mà ô kế tiếp cũng trống — mất lượt, không ăn gì.",
    "Rải lại: đến lượt mà cả 5 ô bên bạn đều trống, bạn tự động lấy 5 dân trong kho đặt mỗi ô 1 viên rồi đi bình thường; kho không đủ thì vay — mỗi dân vay bị trừ 1 điểm khi tính sổ.",
    "Quan không bao giờ được rải đi — dân rải vào ô quan sẽ nằm đó làm \"của chìm\" cho người ăn được quan.",
    "Lưới an toàn: ván kéo dài quá 400 nước sẽ tính sổ ngay tại chỗ (hiếm khi xảy ra).",
  ],
  winConditions: [
    "Nhiều điểm hơn khi tính sổ: kho dân + 10 điểm mỗi quan − nợ vay, cộng dân còn trên 5 ô phía mình.",
    "Đối thủ hết giờ — trong ô ăn quan hết giờ luôn xử thua, không có ngoại lệ.",
    "Đối thủ đầu hàng.",
    "Online: đối thủ mất kết nối và không quay lại trong khoảng 60 giây.",
  ],
  drawConditions: [
    "Hai bên bằng điểm khi tính sổ — ván hoà.",
    "Online: hoà theo thoả thuận qua nút Cầu hoà.",
  ],
  clock: [
    "Chế độ hai người và đấu máy có thể chọn: Tắt đồng hồ, 5+0, 10+0 hoặc 15+10 (cộng 10 giây sau mỗi nước đi). Đấu online có bốn thể thức: 3+2, 5+0, 10+0 và 15+10.",
    "Đồng hồ chỉ bắt đầu chạy sau nước đi đầu tiên. Hết giờ là thua vô điều kiện.",
  ],
  uiTips: [
    "Nhấp một ô dân bên mình còn sỏi — hai mũi tên ◀ ▶ hiện ra, nhấp mũi tên để chọn chiều rải. Nhấp lại ô đang chọn để bỏ chọn.",
    "Nhịp rải lan vàng đồng qua từng ô theo đường sỏi đi; ô bị ăn nháy đỏ gạch. Con số góc mỗi ô là tổng sỏi trong ô (ô quan ghi \"10+n\" khi còn quan và có n dân).",
    "Kho điểm của mỗi bên hiện trên thẻ người chơi, kèm số quan đã ăn và nợ vay nếu có.",
    "Nhấp một nước trong danh sách để xem lại thế cờ cũ; quay về nước cuối mới đi tiếp được. Ký hiệu ×n sau nước đi nghĩa là nước đó ăn được n điểm.",
    "Đấu máy: nút Gợi ý tô xanh lá ô nên bốc kèm chiều rải; Hoàn tác tự lùi cả nước máy về đúng lượt bạn; chọn phe Đỏ / Xanh / Ngẫu nhiên trước ván.",
    "Đấu online: Đầu hàng bấm 2 lần trong 3 giây để xác nhận; Cầu hoà gửi đề nghị cho đối thủ; mở ván ở tab thứ hai thì tab mới giành quyền chơi, tab cũ chuyển sang chỉ xem.",
  ],
  notation:
    "Mỗi nước ghi dạng Ô<số><chiều>, ví dụ Ô3▸ là bốc ô số 3 rải theo chiều kim ▸; thêm ×n khi ăn được n điểm (vd Ô3▸×12). Ô 1–5 thuộc bên Đỏ, ô 7–11 thuộc bên Xanh.",
  modes: [
    {
      href: "/oanquan/online",
      label: "Đấu online",
      note: "Cần đăng nhập — Elo ô ăn quan riêng",
    },
    {
      href: "/oanquan/computer",
      label: "Đấu với máy",
      note: "5 mức độ, chạy ngay trong trình duyệt",
    },
    {
      href: "/oanquan/local",
      label: "Hai người một máy",
      note: "Thay phiên trên cùng thiết bị, không cần mạng",
    },
  ],
};

export default function OanquanGuidePage() {
  return <GuideLayout data={data} />;
}
