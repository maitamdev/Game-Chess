import { Chess } from "chess.js";

/**
 * Bộ khai cuộc cho mức 5 - 20 biến phổ biến (mục 6).
 * Tra theo FEN (4 trường đầu) nên bắt được cả chuyển vị.
 */
const LINES: string[] = [
  // Ván mở Ý
  "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O",
  "e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 O-O d6 c3 a6",
  // Ruy Lopez: chính và Berlin
  "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6",
  "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5",
  // Scotch
  "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5",
  // Sicilian: Najdorf, Dragon, Sveshnikov
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7",
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O",
  "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6",
  // Pháp: Steinitz và Tấn công
  "e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6",
  "e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6",
  // Caro-Kann cổ điển
  "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7",
  // Scandinavian
  "e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5",
  // Pirc
  "e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6",
  // Gambit Hậu: từ chối, Slav, chấp nhận
  "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6",
  "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4",
  "d4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6",
  // Nimzo-Indian, King's Indian
  "d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O Nc6",
  "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6",
  // London
  "d4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Nd2 e6 Ngf3 Bd6",
  // Anh
  "c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7",
];

function positionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

let bookMap: Map<string, string[]> | null = null;

function buildBook(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const line of LINES) {
    try {
      const chess = new Chess();
      for (const san of line.split(" ")) {
        const key = positionKey(chess.fen());
        const list = map.get(key) ?? [];
        if (!list.includes(san)) list.push(san);
        map.set(key, list);
        chess.move(san);
      }
    } catch {
      // một biến lỗi không được làm hỏng cả bộ sách
      continue;
    }
  }
  return map;
}

/** Trả về nước đi (uci) từ sổ khai cuộc, hoặc null nếu không có. */
export function probeBook(fen: string): { uci: string; san: string } | null {
  if (!bookMap) bookMap = buildBook();
  const candidates = bookMap.get(positionKey(fen));
  if (!candidates || candidates.length === 0) return null;
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true });
  const playable = candidates
    .map((san) => legal.find((m) => m.san === san))
    .filter((m) => m !== undefined);
  if (playable.length === 0) return null;
  const pick = playable[Math.floor(Math.random() * playable.length)];
  return { uci: `${pick.from}${pick.to}${pick.promotion ?? ""}`, san: pick.san };
}
