from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/callback"
    GROQ_API_KEY: str
    EMAIL_SYNC_DAYS: int = 30
    SYNC_INTERVAL_MINUTES: int = 5
    CHROMA_DB_PATH: str = "./chroma_db"
    SECRET_KEY: str = "change_me"

    class Config:
        env_file = ".env"

settings = Settings()
