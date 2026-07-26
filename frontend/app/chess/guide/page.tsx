import type { Metadata } from "next";
import GuideLayout, { type GuideData } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "Hướng dẫn chơi Cờ Vua — Kỳ Đài",
  description:
    "Luật cờ vua đầy đủ: cách đi 6 loại quân, nhập thành, bắt Tốt qua đường, phong cấp, các kết cục thắng hoà — và cách thao tác trên Kỳ Đài.",
};

const data: GuideData = {
  backHref: "/chess",
  backLabel: "Cờ Vua",
  title: "Hướng dẫn chơi Cờ Vua",
  tagline:
    "Luật FIDE chuẩn trên bàn 8×8 — từ nước đi đầu tiên đến chiếu bí, kèm mọi thao tác trên bàn cờ của Kỳ Đài.",
  objective:
    "Chiếu bí Vua đối phương: đưa Vua đối phương vào thế bị chiếu mà không còn nước đi hợp lệ nào để thoát. Bạn cũng thắng khi đối thủ hết giờ, đầu hàng, hoặc (khi đấu online) mất kết nối quá lâu không quay lại.",
  setup: [
    "Bàn cờ 8×8 với cột a–h và hàng 1–8. Mỗi bên có 8 Tốt đứng ở hàng 2 (Trắng) và hàng 7 (Đen); hàng cuối xếp lần lượt Xe – Mã – Tượng – Hậu – Vua – Tượng – Mã – Xe. Trắng luôn đi trước, hai bên thay phiên mỗi lượt một nước.",
    "Trên bàn của Kỳ Đài, toạ độ được ghi ở mép bàn, hai ô của nước vừa đi được tô sáng, và ô Vua đang bị chiếu nhấp nháy màu đỏ.",
  ],
  piecesTitle: "Sáu loại quân",
  pieces: [
    {
      glyph: { img: "/pieces/wK.svg" },
      name: "Vua",
      count: "1",
      rule: "Đi 1 ô theo mọi hướng ngang, dọc, chéo; không được đi vào ô đang bị đối phương kiểm soát. Có nước nhập thành cùng Xe khi cả hai chưa từng di chuyển, Vua không bị chiếu, các ô giữa trống và Vua không đi qua ô bị kiểm soát.",
    },
    {
      glyph: { img: "/pieces/wQ.svg" },
      name: "Hậu",
      count: "1",
      rule: "Đi thẳng hoặc chéo bao nhiêu ô tuỳ ý, không nhảy qua quân khác. Quân mạnh nhất bàn cờ.",
    },
    {
      glyph: { img: "/pieces/wR.svg" },
      name: "Xe",
      count: "2",
      rule: "Đi ngang hoặc dọc bao nhiêu ô tuỳ ý, không nhảy qua quân khác. Tham gia nhập thành cùng Vua.",
    },
    {
      glyph: { img: "/pieces/wB.svg" },
      name: "Tượng",
      count: "2",
      rule: "Đi chéo bao nhiêu ô tuỳ ý, không nhảy qua quân khác. Mỗi Tượng suốt ván chỉ đi trên một màu ô.",
    },
    {
      glyph: { img: "/pieces/wN.svg" },
      name: "Mã",
      count: "2",
      rule: "Đi hình chữ L: 2 ô theo một hướng rồi 1 ô vuông góc. Là quân duy nhất được nhảy qua quân khác.",
    },
    {
      glyph: { img: "/pieces/wP.svg" },
      name: "Tốt",
      count: "8",
      rule: "Đi thẳng lên 1 ô (được 2 ô từ vị trí xuất phát) nhưng chỉ ăn chéo 1 ô về phía trước. Có nước bắt Tốt qua đường (en passant). Đến hàng cuối phải phong cấp thành Hậu, Xe, Tượng hoặc Mã.",
    },
  ],
  specialRules: [
    "Mọi nước bất hợp lệ — kể cả nước tự đưa Vua mình vào thế bị chiếu — đều bị bàn cờ chặn, bạn không thể đi nhầm luật.",
    "Nhập thành gần (O-O) và xa (O-O-O): click Vua rồi click ô đích cách 2 cột, Xe tự động nhảy theo.",
    "Bắt Tốt qua đường: ngay sau khi Tốt đối phương vừa đi 2 ô lướt qua cạnh Tốt của bạn, bạn có thể ăn chéo vào ô nó vừa lướt qua — chỉ trong đúng lượt kế tiếp.",
    "Phong cấp: Tốt chạm hàng cuối sẽ mở bảng chọn 4 quân ngay tại ô; bấm Esc hoặc click ra ngoài để huỷ nước đó và đi lại.",
  ],
  winConditions: [
    "Chiếu bí đối phương (checkmate).",
    "Đối thủ hết giờ, khi bạn còn đủ lực chiếu bí.",
    "Đối thủ đầu hàng.",
    "Online: đối thủ mất kết nối và không quay lại trong khoảng 60 giây — khi bạn còn đủ lực chiếu bí; nếu không, ván xử hoà.",
  ],
  drawConditions: [
    "Hết nước đi mà không bị chiếu (pat / stalemate).",
    "Cùng một thế cờ lặp lại 3 lần.",
    "50 nước liên tiếp không ăn quân và không đi Tốt.",
    "Cả hai bên thiếu lực chiếu bí (ví dụ chỉ còn Vua đối Vua).",
    "Một bên hết giờ nhưng bên kia không đủ lực chiếu bí.",
    "Online: hoà theo thoả thuận qua nút Cầu hoà.",
  ],
  clock: [
    "Chế độ hai người và đấu máy có thể chọn: Tắt đồng hồ, 5+0, 10+0 hoặc 15+10 (15 phút, cộng 10 giây sau mỗi nước đi). Đấu online luôn có đồng hồ với bốn thể thức: 3+2 và 5+0 (cờ chớp), 10+0 và 15+10 (cờ nhanh).",
    "Đồng hồ chỉ bắt đầu chạy sau nước đi đầu tiên. Hết giờ là thua — trừ khi đối thủ không đủ lực chiếu bí, khi đó ván xử hoà.",
  ],
  uiTips: [
    "Đi quân theo 2 cách: click chọn quân rồi click ô đích, hoặc kéo-thả thẳng tới ô đích.",
    "Chọn quân sẽ hiện các nước hợp lệ: chấm tròn ở ô trống, viền đánh dấu ở ô có quân ăn được. Click lại quân đang chọn hoặc nhấn Esc để bỏ chọn; có thể chơi hoàn toàn bằng bàn phím (Tab + Enter).",
    "Xem lại ván ngay khi đang chơi: click một nước trong Biên bản hoặc dùng các nút ⏮ ◀ ▶ ⏭. Đang tua lịch sử thì không đi quân được — bấm ⏭ để về thế cờ hiện tại.",
    "Đấu máy: nút Gợi ý tô sáng nước engine khuyên đi; thanh lợi thế dọc cạnh bàn cho biết bên nào đang hơn (tính theo điểm Tốt); Hoàn tác lùi cả nước máy lẫn nước bạn.",
    "Đấu online: có premove — đặt trước một nước khi chưa tới lượt, nước sẽ tự gửi ngay khi đối thủ đi xong (tự huỷ nếu không còn hợp lệ; phong cấp bằng premove mặc định thành Hậu). Không có Hoàn tác; Đầu hàng phải bấm 2 lần trong 3 giây để xác nhận.",
    "Quân bị ăn và điểm chênh lệch lực lượng hiện trên thẻ người chơi; âm thanh đi quân, ăn quân, chiếu... bật/tắt bằng nút ♪.",
  ],
  notation:
    "Biên bản dùng ký hiệu đại số chuẩn (SAN) — ví dụ Nf3 (Mã lên f3), exd5 (Tốt cột e ăn ở d5), O-O (nhập thành gần), e8=Q+ (phong Hậu kèm chiếu), Qxf7# (Hậu ăn f7 chiếu bí).",
  modes: [
    {
      href: "/play/online",
      label: "Đấu online",
      note: "Cần đăng nhập — ghép cặp theo Elo, tính xếp hạng",
    },
    {
      href: "/play/computer",
      label: "Đấu với máy",
      note: "5 mức độ, chạy ngay trong trình duyệt",
    },
    {
      href: "/play/local",
      label: "Hai người một máy",
      note: "Thay phiên trên cùng thiết bị, không cần mạng",
    },
  ],
};

export default function ChessGuidePage() {
  return <GuideLayout data={data} />;
}
