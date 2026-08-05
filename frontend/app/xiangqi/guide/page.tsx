import type { Metadata } from "next";
import GuideLayout, { type GuideData } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "Hướng dẫn chơi Cờ Tướng - Kỳ Đài",
  description:
    "Luật cờ tướng đầy đủ: cách đi 7 loại quân, cản mã, mắt tượng, lộ mặt tướng, chiếu dai, luật hết nước đi - và cách thao tác trên Kỳ Đài.",
};

const data: GuideData = {
  backHref: "/xiangqi",
  backLabel: "Cờ Tướng",
  title: "Hướng dẫn chơi Cờ Tướng",
  tagline:
    "Bàn 9×10 với sông và cung tướng - đủ luật cản mã, mắt tượng, lộ mặt tướng, chiếu dai, và một điều khác hẳn cờ vua: hết nước đi là thua.",
  objective:
    "Chiếu bí Tướng đối phương, hoặc dồn đối phương vào thế hết nước đi hợp lệ - trong cờ tướng, hết nước đi là thua kể cả khi không bị chiếu. Bạn cũng thắng khi đối thủ hết giờ, đầu hàng, hoặc bị xử thua vì chiếu dai.",
  setup: [
    "Bàn có 9 cột (a-i) và 10 hàng, quân đặt trên giao điểm chứ không phải trong ô. Giữa bàn là sông (楚河 - 漢界) chia đôi hai bên; mỗi bên có cung 3×3 vẽ gạch chéo, là nơi Tướng và Sĩ đóng quân suốt ván.",
    "Bố trí ban đầu mỗi bên: hàng đáy xếp Xe - Mã - Tượng - Sĩ - Tướng - Sĩ - Tượng - Mã - Xe; hai Pháo đứng ở hàng thứ ba (cột b và h); năm Tốt dàn ở hàng thứ tư (cột a, c, e, g, i). Bên Đỏ đi trước.",
  ],
  piecesTitle: "Bảy loại quân",
  pieces: [
    {
      glyph: { char: "帥", serif: true },
      name: "Tướng (帥 / 將)",
      count: "1",
      rule: "Đi và ăn 1 bước ngang hoặc dọc, chỉ trong cung 3×3. Hai Tướng không bao giờ được đối mặt nhau trên cùng một cột trống - luật lộ mặt tướng.",
    },
    {
      glyph: { char: "仕", serif: true },
      name: "Sĩ (仕 / 士)",
      count: "2",
      rule: "Đi và ăn 1 bước chéo, không bao giờ rời khỏi cung 3×3.",
    },
    {
      glyph: { char: "相", serif: true },
      name: "Tượng (相 / 象)",
      count: "2",
      rule: "Đi và ăn đúng 2 điểm chéo (hình chữ điền). Không được qua sông; bị cản nếu giao điểm giữa đường chéo có quân - luật mắt tượng.",
    },
    {
      glyph: { char: "傌", serif: true },
      name: "Mã (傌 / 馬)",
      count: "2",
      rule: "Đi và ăn theo hình 2 bước thẳng + 1 bước ngang. Bị cản chân mã: nếu giao điểm kề sát Mã theo hướng 2 bước có quân (bất kể phe nào) thì không đi được hướng đó.",
    },
    {
      glyph: { char: "俥", serif: true },
      name: "Xe (俥 / 車)",
      count: "2",
      rule: "Đi và ăn theo đường thẳng ngang hoặc dọc, xa tuỳ ý, không nhảy qua quân. Quân mạnh nhất bàn cờ.",
    },
    {
      glyph: { char: "炮", serif: true },
      name: "Pháo (炮 / 砲)",
      count: "2",
      rule: "Khi không ăn: đi thẳng như Xe. Khi ăn: bắt buộc nhảy qua đúng một quân bất kỳ làm ngòi và ăn quân địch đầu tiên phía sau ngòi trên cùng đường thẳng - cách ngòi bao xa cũng được.",
    },
    {
      glyph: { char: "兵", serif: true },
      name: "Tốt (兵 / 卒)",
      count: "5",
      rule: "Đi và ăn 1 bước thẳng về phía trước. Sau khi qua sông được đi và ăn thêm 1 bước sang ngang. Không bao giờ lùi, không phong cấp.",
    },
  ],
  specialRules: [
    "Hết nước đi hợp lệ là thua ngay, kể cả khi không bị chiếu - khác hẳn luật pat của cờ vua.",
    "Lộ mặt tướng: cấm mọi nước đi khiến hai Tướng nhìn thẳng mặt nhau trên một cột không có quân cản.",
    "Cản chân mã và mắt tượng: Mã và Tượng đều bị quân đứng chắn ở giao điểm giữa đường khoá nước đi - kể cả quân phe mình.",
    "Pháo chỉ ăn được khi có đúng một ngòi; không ngòi hoặc từ hai ngòi trở lên đều không ăn được.",
    "Chiếu dai bị xử thua: khi một thế cờ lặp lại lần thứ ba mà mọi nước trong chu kỳ lặp của một bên đều là nước chiếu (bên kia thì không), bên chiếu dai thua. Nếu không rơi vào trường hợp đó, lặp thế 3 lần là hoà.",
    "Bàn cờ chặn sẵn mọi nước bất hợp lệ - bạn không thể vô tình phạm luật.",
  ],
  winConditions: [
    "Chiếu bí Tướng đối phương.",
    "Đối phương hết nước đi hợp lệ - dù không bị chiếu.",
    "Đối phương chiếu dai (lặp thế 3 lần mà chỉ mình họ chiếu liên tục).",
    "Đối phương hết giờ, khi bạn còn ít nhất một quân tấn công (Xe, Pháo, Mã hoặc Tốt).",
    "Đối phương đầu hàng.",
    "Online: đối phương mất kết nối quá 60 giây không quay lại - khi bạn còn quân tấn công; nếu không, ván xử hoà.",
  ],
  drawConditions: [
    "Lặp thế 3 lần (không thuộc trường hợp chiếu dai một chiều).",
    "60 nước liên tiếp không có quân nào bị ăn.",
    "Hai bên đều hết quân tấn công - chỉ còn Tướng, Sĩ, Tượng.",
    "Một bên hết giờ nhưng bên kia không còn quân tấn công nào.",
    "Online: hoà theo thoả thuận qua nút Cầu hoà.",
  ],
  clock: [
    "Chế độ hai người và đấu máy có thể chọn: Tắt đồng hồ, 5+0, 10+0 hoặc 15+10 (cộng 10 giây sau mỗi nước đi). Đấu online có bốn thể thức: 3+2 và 5+0 (cờ chớp), 10+0 và 15+10 (cờ nhanh), đồng hồ tính phía máy chủ.",
    "Hết giờ là thua - nhưng nếu bên còn giờ không còn quân tấn công nào (Xe, Pháo, Mã, Tốt) thì ván xử hoà.",
  ],
  uiTips: [
    "Đi quân theo 2 cách: nhấp chọn quân rồi nhấp giao điểm đích, hoặc kéo-thả. Nhấp lại quân đang chọn để bỏ chọn.",
    "Chọn quân sẽ hiện nước hợp lệ: chấm xanh ở giao điểm trống, vòng xanh ở quân ăn được; Tướng bị chiếu có hiệu ứng đỏ nhấp nháy.",
    "Bàn tự xoay về phía bên bạn cầm; chế độ hai người có tự xoay theo lượt (tắt được) và nút xoay tay.",
    "Nhấp một nước trong danh sách để xem lại thế cờ cũ; quay về nước cuối mới đi tiếp được.",
    "Đấu máy: nút Gợi ý hiện hai chấm xanh lá cho nước engine khuyên; nút Hoàn tác lùi ván về đúng lượt của bạn.",
    "Đấu online: Đầu hàng bấm 2 lần trong 3 giây để xác nhận; Cầu hoà gửi đề nghị cho đối thủ Đồng ý/Từ chối; mở ván ở tab thứ hai thì tab mới giành quyền chơi, tab cũ chuyển sang chỉ xem - tab chỉ xem có nút \"Chơi ở tab này\" để giành lại quyền.",
    "Quân bị ăn hiện bằng chữ Hán trên thẻ người chơi; kết thúc ván có hộp kết quả kèm lý do rõ ràng.",
  ],
  notation:
    "Mỗi nước ghi bằng chữ Hán của quân kèm toạ độ đi-đến, ví dụ 炮b2e2 là Pháo từ b2 sang e2. Cột a-i tính từ trái bên Đỏ, hàng 0-9 từ đáy bên Đỏ.",
  modes: [
    {
      href: "/xiangqi/online",
      label: "Đấu online",
      note: "Nhập tên hiển thị, tạo phòng hoặc vào bằng mã",
    },
    {
      href: "/xiangqi/computer",
      label: "Đấu với máy",
      note: "5 mức độ, chạy ngay trong trình duyệt",
    },
    {
      href: "/xiangqi/local",
      label: "Hai người một máy",
      note: "Thay phiên trên cùng thiết bị, không cần mạng",
    },
  ],
};

export default function XiangqiGuidePage() {
  return <GuideLayout data={data} />;
}
