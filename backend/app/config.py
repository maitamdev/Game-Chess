from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Cấu hình qua biến môi trường; mặc định phục vụ chạy local.

    Sản xuất: đặt DATABASE_URL=postgresql+asyncpg://user:pass@host/db
    và REDIS_URL khi chạy nhiều tiến trình (mục 9 spec).
    """

    database_url: str = "sqlite+aiosqlite:///./chess.db"
    jwt_secret: str = "dev-secret-doi-khi-trien-khai"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3002"]

    # Ghép cặp (mục 5.3): dải Elo ban đầu ±100, mỗi 5s nới 50, tối đa ±400
    mm_base_band: int = 100
    mm_band_step: int = 50
    mm_step_seconds: float = 5.0
    mm_max_band: int = 400

    # Mất kết nối quá 60s → xử thua; ping 20s, quá 45s không ping → mất kết nối
    disconnect_forfeit_seconds: float = 60.0
    ping_timeout_seconds: float = 45.0
    # Ván không nước đi trong 30s đầu và một bên chưa từng kết nối → huỷ
    abort_seconds: float = 30.0

    class Config:
        env_file = ".env"


settings = Settings()
