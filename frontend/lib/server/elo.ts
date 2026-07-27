/**
 * Công thức Elo — port nguyên vẹn từ backend cũ.
 * elo_mới = elo_cũ + K × (kết_quả − kỳ_vọng)
 * K: 40 nếu dưới 30 ván, 20 nếu dưới 100 ván, 10 nếu từ 100 ván trở lên.
 */

export function kFactor(gamesPlayed: number): number {
  if (gamesPlayed < 30) return 40;
  if (gamesPlayed < 100) return 20;
  return 10;
}

export function expectedScore(ownElo: number, opponentElo: number): number {
  return 1 / (1 + 10 ** ((opponentElo - ownElo) / 400));
}

export function eloChanges(
  whiteElo: number,
  blackElo: number,
  whiteGames: number,
  blackGames: number,
  result: "white" | "black" | "draw",
): { whiteDelta: number; blackDelta: number } {
  const whiteScore = result === "white" ? 1 : result === "black" ? 0 : 0.5;
  const blackScore = 1 - whiteScore;
  return {
    whiteDelta: Math.round(
      kFactor(whiteGames) * (whiteScore - expectedScore(whiteElo, blackElo)),
    ),
    blackDelta: Math.round(
      kFactor(blackGames) * (blackScore - expectedScore(blackElo, whiteElo)),
    ),
  };
}
