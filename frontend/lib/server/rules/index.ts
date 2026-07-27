/**
 * Trọng tài phía server cho 5 game — port interface duck-typed của
 * backend Python (try_move / detect_end / has_mating_material / build_pgn),
 * nhưng tái sử dụng CHÍNH các bộ luật TS đã có ở client (lib/xiangqi,
 * lib/caro, lib/jungle, lib/oanquan — thuần logic, không phụ thuộc DOM)
 * và chess.js cho cờ vua. Chuỗi result/termination giữ nguyên như cũ.
 */

import { Chess } from "chess.js";

import { Caro } from "@/lib/caro/rules";
import { Jungle } from "@/lib/jungle/rules";
import { OAnQuan } from "@/lib/oanquan/rules";
import { Xiangqi } from "@/lib/xiangqi/rules";
import type { Variant } from "@/lib/server/variants";

export type Color = "white" | "black";

export interface AppliedMove {
  san: string;
  uci: string;
  fenAfter: string;
  isCheck: boolean;
}

export interface GameEndInfo {
  result: Color | "draw";
  termination: string;
  /** riêng ô ăn quan: điểm chung cuộc hai bên */
  scoreA?: number;
  scoreB?: number;
}

export interface ServerRules {
  readonly variant: Variant;
  ply(): number;
  turnColor(): Color;
  fen(): string;
  /** Áp nước đi nếu hợp lệ, ngược lại trả null. */
  tryMove(uci: string): AppliedMove | null;
  /** Phát hiện kết thúc tự nhiên sau nước vừa đi. */
  detectEnd(): GameEndInfo | null;
  /** Bên `color` còn đủ lực thắng không — đối thủ hết giờ mà thiếu lực → hoà. */
  hasMatingMaterial(color: Color): boolean;
  buildPgn(
    whiteName: string,
    blackName: string,
    result: string,
    timeControl: string,
    startedAtMs: number,
  ): string;
}

const OTHER: Record<Color, Color> = { white: "black", black: "white" };

function score(result: string): string {
  return result === "white" ? "1-0" : result === "black" ? "0-1" : "1/2-1/2";
}

function pgnDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`;
}

/** PGN kiểu backend cũ cho các game ngoài cờ vua: headers + cặp nước đánh số. */
function variantPgn(
  headers: [string, string][],
  body: string[],
  result: string,
): string {
  const head = headers.map(([k, v]) => `[${k} "${v}"]`).join("\n");
  const pairs: string[] = [];
  for (let i = 0; i < body.length; i += 2) {
    let pair = `${i / 2 + 1}. ${body[i]}`;
    if (i + 1 < body.length) pair += ` ${body[i + 1]}`;
    pairs.push(pair);
  }
  return `${head}\n\n${pairs.join(" ")} ${score(result)}\n`;
}

// ---------------- cờ vua (chess.js) ----------------

class ChessRules implements ServerRules {
  readonly variant: Variant = "chess";
  private board = new Chess();
  private ucis: string[] = [];

  constructor(uciMoves: string[]) {
    for (const uci of uciMoves) {
      if (this.tryMove(uci) === null) {
        throw new Error(`Nước cờ vua không hợp lệ khi dựng lại: ${uci}`);
      }
    }
  }

  ply(): number {
    return this.board.history().length;
  }

  turnColor(): Color {
    return this.board.turn() === "w" ? "white" : "black";
  }

  fen(): string {
    return this.board.fen();
  }

  tryMove(uci: string): AppliedMove | null {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null;
    try {
      const move = this.board.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4],
      });
      this.ucis.push(uci);
      return {
        san: move.san,
        uci,
        fenAfter: this.board.fen(),
        isCheck: this.board.isCheck(),
      };
    } catch {
      return null;
    }
  }

  private halfmoveClock(): number {
    return Number(this.board.fen().split(" ")[4] ?? 0);
  }

  detectEnd(): GameEndInfo | null {
    const b = this.board;
    if (b.isCheckmate()) {
      return {
        result: b.turn() === "w" ? "black" : "white",
        termination: "checkmate",
      };
    }
    if (b.isStalemate()) return { result: "draw", termination: "stalemate" };
    if (b.isInsufficientMaterial()) {
      return { result: "draw", termination: "insufficient" };
    }
    if (b.isThreefoldRepetition()) {
      return { result: "draw", termination: "repetition" };
    }
    if (this.halfmoveClock() >= 100) {
      return { result: "draw", termination: "fifty_move" };
    }
    return null;
  }

  hasMatingMaterial(color: Color): boolean {
    const c = color === "white" ? "w" : "b";
    let minors = 0;
    for (const row of this.board.board()) {
      for (const piece of row) {
        if (!piece || piece.color !== c || piece.type === "k") continue;
        if (piece.type === "p" || piece.type === "r" || piece.type === "q") {
          return true;
        }
        minors++; // n hoặc b
      }
    }
    return minors >= 2;
  }

  buildPgn(
    whiteName: string,
    blackName: string,
    result: string,
    timeControl: string,
    startedAtMs: number,
  ): string {
    const g = new Chess();
    g.setHeader("Event", "Kỳ Đài — ván xếp hạng");
    g.setHeader("Site", "Kỳ Đài");
    g.setHeader("Date", pgnDate(startedAtMs));
    g.setHeader("White", whiteName);
    g.setHeader("Black", blackName);
    g.setHeader("TimeControl", timeControl);
    g.setHeader("Result", score(result));
    for (const uci of this.ucis) {
      g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    }
    return g.pgn();
  }
}

// ---------------- cờ tướng ----------------

class XiangqiRules implements ServerRules {
  readonly variant: Variant = "xiangqi";
  private game = new Xiangqi();
  private ucis: string[] = [];

  constructor(uciMoves: string[]) {
    for (const uci of uciMoves) {
      if (this.tryMove(uci) === null) {
        throw new Error(`Nước cờ tướng không hợp lệ khi dựng lại: ${uci}`);
      }
    }
  }

  ply(): number {
    return this.game.ply;
  }

  turnColor(): Color {
    return this.game.turn() === "r" ? "white" : "black";
  }

  fen(): string {
    return this.game.fen();
  }

  tryMove(uci: string): AppliedMove | null {
    const move = this.game.move(uci);
    if (move === null) return null;
    this.ucis.push(move.uci);
    return {
      san: move.san,
      uci: move.uci,
      fenAfter: this.game.fen(),
      isCheck: this.game.inCheck(),
    };
  }

  detectEnd(): GameEndInfo | null {
    const end = this.game.gameEnd();
    if (end === null) return null;
    return {
      result: end.winner === null ? "draw" : end.winner === "r" ? "white" : "black",
      termination: end.termination,
    };
  }

  hasMatingMaterial(color: Color): boolean {
    return this.game.hasAttackingMaterial(color === "white" ? "r" : "b");
  }

  buildPgn(
    whiteName: string,
    blackName: string,
    result: string,
    timeControl: string,
    startedAtMs: number,
  ): string {
    return variantPgn(
      [
        ["Event", "Kỳ Đài — ván cờ tướng xếp hạng"],
        ["Site", "Kỳ Đài"],
        ["Date", pgnDate(startedAtMs)],
        ["Red", whiteName],
        ["Black", blackName],
        ["TimeControl", timeControl],
        ["Variant", "Xiangqi"],
        ["Result", score(result)],
      ],
      this.ucis,
      result,
    );
  }
}

// ---------------- cờ caro ----------------

class CaroRules implements ServerRules {
  readonly variant: Variant = "caro";
  private game = new Caro();
  private ucis: string[] = [];

  constructor(uciMoves: string[]) {
    for (const uci of uciMoves) {
      if (this.tryMove(uci) === null) {
        throw new Error(`Nước caro không hợp lệ khi dựng lại: ${uci}`);
      }
    }
  }

  ply(): number {
    return this.game.ply;
  }

  turnColor(): Color {
    return this.game.turn() === "x" ? "white" : "black";
  }

  fen(): string {
    return `${this.game.ply} ${this.game.turn()}`;
  }

  tryMove(uci: string): AppliedMove | null {
    if (this.game.gameEnd() !== null) return null;
    const move = this.game.move(uci);
    if (move === null) return null;
    this.ucis.push(move.uci);
    return { san: move.san, uci: move.uci, fenAfter: this.fen(), isCheck: false };
  }

  detectEnd(): GameEndInfo | null {
    const end = this.game.gameEnd();
    if (end === null) return null;
    return {
      result: end.winner === null ? "draw" : end.winner === "x" ? "white" : "black",
      termination: end.termination,
    };
  }

  hasMatingMaterial(): boolean {
    return true; // caro không có khái niệm thiếu lực — hết giờ luôn thua
  }

  buildPgn(
    whiteName: string,
    blackName: string,
    result: string,
    timeControl: string,
    startedAtMs: number,
  ): string {
    return variantPgn(
      [
        ["Event", "Kỳ Đài — ván caro xếp hạng"],
        ["Site", "Kỳ Đài"],
        ["Date", pgnDate(startedAtMs)],
        ["X", whiteName],
        ["O", blackName],
        ["TimeControl", timeControl],
        ["Variant", "Caro 200x200"],
        ["Result", score(result)],
      ],
      this.ucis,
      result,
    );
  }
}

// ---------------- cờ thú ----------------

class JungleRules implements ServerRules {
  readonly variant: Variant = "jungle";
  private game: Jungle;
  private ucis: string[] = [];

  constructor(uciMoves: string[]) {
    this.game = new Jungle();
    for (const uci of uciMoves) {
      if (this.tryMove(uci) === null) {
        throw new Error(`Nước cờ thú không hợp lệ khi dựng lại: ${uci}`);
      }
    }
  }

  ply(): number {
    return this.game.ply;
  }

  turnColor(): Color {
    return this.game.turn() === "r" ? "white" : "black";
  }

  fen(): string {
    return this.game.fen();
  }

  tryMove(uci: string): AppliedMove | null {
    if (this.game.gameEnd() !== null) return null;
    const move = this.game.move(uci);
    if (move === null) return null;
    this.ucis.push(move.uci);
    return {
      san: move.san,
      uci: move.uci,
      fenAfter: this.game.fen(),
      isCheck: false,
    };
  }

  detectEnd(): GameEndInfo | null {
    const end = this.game.gameEnd();
    if (end === null) return null;
    return {
      result: end.winner === null ? "draw" : end.winner === "r" ? "white" : "black",
      termination: end.termination,
    };
  }

  hasMatingMaterial(color: Color): boolean {
    return this.game.hasPieces(color === "white" ? "r" : "b");
  }

  buildPgn(
    whiteName: string,
    blackName: string,
    result: string,
    timeControl: string,
    startedAtMs: number,
  ): string {
    return variantPgn(
      [
        ["Event", "Kỳ Đài — ván cờ thú xếp hạng"],
        ["Site", "Kỳ Đài"],
        ["Date", pgnDate(startedAtMs)],
        ["Red", whiteName],
        ["Black", blackName],
        ["TimeControl", timeControl],
        ["Variant", "Jungle"],
        ["Result", score(result)],
      ],
      this.ucis,
      result,
    );
  }
}

// ---------------- ô ăn quan ----------------

class OanquanRules implements ServerRules {
  readonly variant: Variant = "oanquan";
  private game = new OAnQuan();
  private sans: string[] = [];

  constructor(uciMoves: string[]) {
    for (const uci of uciMoves) {
      if (this.tryMove(uci) === null) {
        throw new Error(`Nước ô ăn quan không hợp lệ khi dựng lại: ${uci}`);
      }
    }
  }

  ply(): number {
    return this.game.ply;
  }

  turnColor(): Color {
    return this.game.turn() === "a" ? "white" : "black";
  }

  fen(): string {
    return this.game.fen();
  }

  tryMove(uci: string): AppliedMove | null {
    if (this.game.gameEnd() !== null) return null;
    const move = this.game.move(uci);
    if (move === null) return null;
    this.sans.push(move.san);
    return {
      san: move.san,
      uci: move.uci,
      fenAfter: this.game.fen(),
      isCheck: false,
    };
  }

  detectEnd(): GameEndInfo | null {
    const end = this.game.gameEnd();
    if (end === null) return null;
    return {
      result: end.winner === null ? "draw" : end.winner === "a" ? "white" : "black",
      termination: end.termination,
      scoreA: end.scoreA,
      scoreB: end.scoreB,
    };
  }

  hasMatingMaterial(): boolean {
    return true; // ô ăn quan không có khái niệm thiếu lực — hết giờ luôn thua
  }

  buildPgn(
    whiteName: string,
    blackName: string,
    result: string,
    timeControl: string,
    startedAtMs: number,
  ): string {
    return variantPgn(
      [
        ["Event", "Kỳ Đài — ván ô ăn quan xếp hạng"],
        ["Site", "Kỳ Đài"],
        ["Date", pgnDate(startedAtMs)],
        ["A", whiteName],
        ["B", blackName],
        ["TimeControl", timeControl],
        ["Variant", "Ô Ăn Quan"],
        ["Result", score(result)],
      ],
      this.sans,
      result,
    );
  }
}

// ---------------- factory ----------------

export function createRules(variant: Variant, uciMoves: string[]): ServerRules {
  switch (variant) {
    case "chess":
      return new ChessRules(uciMoves);
    case "xiangqi":
      return new XiangqiRules(uciMoves);
    case "caro":
      return new CaroRules(uciMoves);
    case "jungle":
      return new JungleRules(uciMoves);
    case "oanquan":
      return new OanquanRules(uciMoves);
  }
}

export { OTHER };
