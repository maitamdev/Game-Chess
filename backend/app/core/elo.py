"""Công thức Elo — mục 7 spec.

elo_mới = elo_cũ + K × (kết_quả − kỳ_vọng)
kỳ_vọng = 1 / (1 + 10^((elo_đối_thủ − elo_mình)/400))
K: 40 nếu dưới 30 ván, 20 nếu dưới 100 ván, 10 nếu từ 100 ván trở lên.
"""


def k_factor(games_played: int) -> int:
    if games_played < 30:
        return 40
    if games_played < 100:
        return 20
    return 10


def expected_score(own_elo: int, opponent_elo: int) -> float:
    return 1.0 / (1.0 + 10 ** ((opponent_elo - own_elo) / 400.0))


def elo_changes(
    white_elo: int,
    black_elo: int,
    white_games: int,
    black_games: int,
    result: str,  # 'white' | 'black' | 'draw'
) -> tuple[int, int]:
    """Trả về (delta_trắng, delta_đen), đã làm tròn."""
    white_score = 1.0 if result == "white" else 0.0 if result == "black" else 0.5
    black_score = 1.0 - white_score
    white_delta = k_factor(white_games) * (
        white_score - expected_score(white_elo, black_elo)
    )
    black_delta = k_factor(black_games) * (
        black_score - expected_score(black_elo, white_elo)
    )
    return round(white_delta), round(black_delta)
