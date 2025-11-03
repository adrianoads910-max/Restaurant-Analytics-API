# backend/app/settings.py
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    APP_NAME: str = "Restaurant Analytics API"
    API_PREFIX: str = "/api"

    DB_HOST: str = Field(default="localhost")
    DB_PORT: int = Field(default=5432)
    DB_NAME: str = Field(default="challenge_db")
    DB_USER: str = Field(default="challenge")
    DB_PASSWORD: str = Field(default="challenge_2024")

    # ✅ variáveis de IA (Groq)
    GROQ_API_KEY: str = Field(..., env="GROQ_API_KEY")
    GROQ_MODEL: str = Field(default="llama-3.3-70b-versatile")

    CORS_ORIGINS: list[str] = ["http://localhost:5173", "*"]

    class Config:
        env_file = ".env"        # ✅ importante
        env_file_encoding = "utf-8"


settings = Settings()
