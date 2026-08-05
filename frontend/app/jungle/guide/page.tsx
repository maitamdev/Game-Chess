import type { Metadata } from "next";
import GuideLayout, { type GuideData } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "Hướng dẫn chơi Cờ Thú - Kỳ Đài",
  description:
    "Luật cờ thú (Jungle) đầy đủ: cấp bậc 8 con thú, Chuột ăn Voi, nhảy sông, bẫy và hang - và cách thao tác trên Kỳ Đài.",
};

const data: GuideData = {
  backHref: "/jungle",
  backLabel: "Cờ Thú",
  title: "Hướng dẫn chơi Cờ Thú",
  tagline:
    "Tám con thú, hai dòng sông, sáu chiếc bẫy và hai cái hang - Voi sợ Chuột, Chuột bơi sông, Sư tử và Hổ nhảy phắt qua bờ.",
  objective:
    "Đưa bất kỳ con thú nào của bạn vào hang của đối phương - hoặc loại đối phương khỏi cuộc chơi bằng cách ăn sạch thú của họ hay dồn họ đến hết nước đi. Bên Đỏ đi trước.",
  setup: [
    "Bàn có 7 cột và 9 hàng; Đỏ ở dưới, Xanh ở trên. Giữa bàn là hai vùng sông, mỗi vùng rộng 2×3 ô. Mỗi bên có một hang ở chính giữa hàng cuối và ba ô bẫy vây quanh hang.",
    "Mỗi bên có 8 con thú, mỗi loại một con, xếp đối xứng hai đầu bàn: Sư tử và Hổ ở hai góc hàng đáy, Chó và Mèo ở hàng nhì, Chuột - Báo - Sói - Voi dàn ở hàng ba.",
  ],
  piecesTitle: "Tám con thú theo cấp bậc",
  pieces: [
    {
      glyph: { img: "/images/jungle/elephant.webp" },
      name: "Voi - cấp 8",
      count: "1",
      rule: "Đi 1 ô ngang hoặc dọc trên cạn. Ăn được mọi thú - trừ Chuột: Voi không ăn được Chuột (ngoại lệ duy nhất của bàn cờ).",
    },
    {
      glyph: { img: "/images/jungle/lion.webp" },
      name: "Sư tử - cấp 7",
      count: "1",
      rule: "Đi 1 ô ngang hoặc dọc; đứng sát mép sông thì nhảy thẳng qua cả vùng sông theo hàng hoặc cột, đáp xuống ô cạn đối diện - kể cả nhảy để ăn quân. Bị chặn nếu có Chuột nằm trên đường nước.",
    },
    {
      glyph: { img: "/images/jungle/tiger.webp" },
      name: "Hổ - cấp 6",
      count: "1",
      rule: "Giống hệt Sư tử: đi 1 ô và nhảy thẳng qua sông, bị Chuột đứng dưới nước chặn đường nhảy.",
    },
    {
      glyph: { img: "/images/jungle/leopard.webp" },
      name: "Báo - cấp 5",
      count: "1",
      rule: "Đi 1 ô ngang hoặc dọc trên cạn, không xuống sông, không nhảy.",
    },
    {
      glyph: { img: "/images/jungle/wolf.webp" },
      name: "Sói - cấp 4",
      count: "1",
      rule: "Đi 1 ô ngang hoặc dọc trên cạn, không xuống sông.",
    },
    {
      glyph: { img: "/images/jungle/dog.webp" },
      name: "Chó - cấp 3",
      count: "1",
      rule: "Đi 1 ô ngang hoặc dọc trên cạn, không xuống sông.",
    },
    {
      glyph: { img: "/images/jungle/cat.webp" },
      name: "Mèo - cấp 2",
      count: "1",
      rule: "Đi 1 ô ngang hoặc dọc trên cạn, không xuống sông. Ăn được Mèo và Chuột đối phương.",
    },
    {
      glyph: { img: "/images/jungle/rat.webp" },
      name: "Chuột - cấp 1",
      count: "1",
      rule: "Con duy nhất được bơi xuống sông. Trên cạn ăn được Chuột đối phương và cả Voi. Dưới nước không bị quân trên cạn ăn nhưng cũng không ăn được quân trên cạn; hai Chuột cùng dưới nước ăn nhau bình thường. Chuột nằm trong sông chặn đường nhảy của Sư tử và Hổ - kể cả Chuột phe mình.",
    },
  ],
  specialRules: [
    "Ăn quân theo cấp: chỉ ăn được thú cấp thấp hơn hoặc bằng cấp mình - với đúng một ngoại lệ: Chuột (cấp 1) ăn được Voi (cấp 8), còn Voi không ăn được Chuột.",
    "Mọi nước đi đều đúng 1 ô ngang hoặc dọc - không có nước chéo - trừ cú nhảy sông của Sư tử và Hổ.",
    "Sông: chỉ Chuột được xuống nước, và cấm mọi nước ăn băng ranh giới nước-cạn (quân trên cạn không ăn được Chuột dưới nước, và ngược lại).",
    "Bẫy: thú địch đứng trong bẫy phe bạn bị hạ về cấp 0 - mọi thú của bạn đều ăn được, kể cả Voi ăn Chuột nằm bẫy. Đứng trong bẫy phe mình thì vô sự.",
    "Hang: không thú nào được bước vào hang phe mình (kể cả điểm đáp khi nhảy); bước vào hang đối phương là thắng ngay lập tức.",
    "Hết nước đi là thua - giống cờ tướng, không phải hoà.",
  ],
  winConditions: [
    "Đưa một con thú vào hang của đối phương.",
    "Đối phương hết sạch thú.",
    "Đối phương đến lượt nhưng không còn nước đi hợp lệ nào.",
    "Đối phương hết giờ (khi bật đồng hồ).",
    "Đối phương đầu hàng; online còn xử thua khi họ mất kết nối quá 60 giây.",
  ],
  drawConditions: [
    "Lặp thế 3 lần: cùng một thế bàn với cùng bên đến lượt xuất hiện lần thứ ba.",
    "Online: hoà theo thoả thuận qua nút Cầu hoà.",
  ],
  clock: [
    "Chế độ hai người và đấu máy có thể chọn: Tắt đồng hồ, 5+0, 10+0 hoặc 15+10 (cộng 10 giây sau mỗi nước đi). Đấu online có bốn thể thức: 3+2, 5+0, 10+0 và 15+10, đồng hồ tính phía máy chủ.",
    "Đồng hồ chỉ chạy sau nước đi đầu tiên. Hết giờ là bên kia thắng.",
  ],
  uiTips: [
    "Nhấp vào thú của mình để chọn: ô đi hợp lệ hiện chấm xanh lá (ô trống) hoặc vòng xanh lá (quân ăn được); nhấp ô đích để đi, hoặc kéo-thả thẳng tới nơi.",
    "Mỗi thú hiển thị bằng huy hiệu minh hoạ kèm số cấp ở góc; hai ô của nước vừa đi được tô màu đồng.",
    "Nhấp một nước trong danh sách để xem lại thế cờ cũ; quay về nước cuối mới đi tiếp được.",
    "Chế độ hai người: bàn tự xoay về phía người đến lượt (tắt được), có nút xoay tay và Hoàn tác từng nước.",
    "Đấu máy: nút Gợi ý tô ô xanh lá cho nước máy khuyên; Hoàn tác tự lùi cả nước máy về đúng lượt bạn; chọn phe Đỏ / Xanh / Ngẫu nhiên trước ván.",
    "Đấu online: Đầu hàng bấm 2 lần trong 3 giây để xác nhận; Cầu hoà gửi đề nghị cho đối thủ Đồng ý/Từ chối; mở ván ở tab khác thì tab cũ chỉ xem, có nút giành lại quyền chơi.",
    "Thú bị bắt hiện thành dãy huy hiệu thu nhỏ trên thẻ người chơi; âm thanh bật hoặc tắt bằng nút loa; sau ván có thể đóng hộp kết quả để xem lại bàn cờ.",
  ],
  notation:
    "Mỗi nước ghi bằng tên thú kèm ô đi và ô đến, ví dụ Chuột a2a3 - cột a-g từ trái, hàng 0-8 tính từ phía Đỏ.",
  modes: [
    {
      href: "/jungle/online",
      label: "Đấu online",
      note: "Nhập tên hiển thị, tạo phòng hoặc vào bằng mã",
    },
    {
      href: "/jungle/computer",
      label: "Đấu với máy",
      note: "5 mức độ, chạy ngay trong trình duyệt",
    },
    {
      href: "/jungle/local",
      label: "Hai người một máy",
      note: "Thay phiên trên cùng thiết bị, không cần mạng",
    },
  ],
};

export default function JungleGuidePage() {
  return <GuideLayout data={data} />;
}
