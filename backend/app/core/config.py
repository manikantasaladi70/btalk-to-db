from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    OPENAI_API_KEY: Optional[str] = None
    GROQ_API_KEY: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    QUERY_CACHE_TTL: int = 300

    class Config:
        env_file = ".env"


settings = Settings()