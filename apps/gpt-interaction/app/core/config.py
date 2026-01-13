"""
Application configuration management using Pydantic Settings.
Supports environment variables and .env files.
"""

from functools import lru_cache
from pathlib import Path
from typing import Optional
from urllib.parse import quote_plus

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Server
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    debug: bool = Field(default=False, description="Debug mode")
    uvicorn_access_log: bool = Field(default=False, description="Enable Uvicorn access log")

    # Database
    database_url: Optional[str] = Field(
        default=None,
        description="Database connection URL (overrides DB_* settings if provided)"
    )
    db_host: str = Field(default="127.0.0.1", description="Database host")
    db_port: int = Field(default=5432, description="Database port")
    db_user: str = Field(default="postgres", description="Database user")
    db_password: str = Field(default="postgres", description="Database password")
    db_name: str = Field(default="talent_pool", description="Database name")
    db_sslmode: str = Field(default="disable", description="Database SSL mode")
    db_schema: str = Field(default="talent_pool", description="Database schema")
    db_search_path: str = Field(
        default="talent_pool,public",
        description="Database search_path"
    )
    db_echo: bool = Field(default=False, description="Enable SQLAlchemy echo (SQL logging)")
    db_max_open_conns: int = Field(default=20, description="Database max open connections")
    db_max_idle_conns: int = Field(default=10, description="Database max idle connections")
    db_conn_max_lifetime: int = Field(default=3600, description="Connection max lifetime (seconds)")

    # Browser
    browser_headless: bool = Field(default=False, description="Run browser in headless mode")
    browser_user_data_base_path: str = Field(
        default="./user_data",
        description="Base path for user browser data directories"
    )
    browser_new_chat_per_task: bool = Field(
        default=False,
        description="Start a new chat for each task. Disabled by default since each task opens a fresh browser."
    )
    enable_guest: bool = Field(
        default=False,
        description="Allow guest mode (chat without login). If False, will attempt to login even if guest mode is available."
    )

    # User management (extensible for future auth)
    default_user_id: str = Field(
        default="default",
        description="Default user ID for anonymous requests"
    )
    
    # OpenAI Credentials (for auto-login)
    openai_email: Optional[str] = Field(default=None, description="OpenAI account email")
    openai_password: Optional[str] = Field(default=None, description="OpenAI account password")

    # Task execution
    task_timeout_seconds: int = Field(default=300, description="Task timeout in seconds")
    max_concurrent_tasks: int = Field(default=3, description="Maximum concurrent tasks")
    max_concurrent_tasks_per_user: int = Field(
        default=1,
        description="Maximum concurrent tasks per user"
    )

    # Webhook
    webhook_timeout_seconds: int = Field(default=30, description="Webhook request timeout")
    webhook_max_retries: int = Field(default=3, description="Maximum webhook retry attempts")

    # S3 Storage
    s3_endpoint_url: Optional[str] = Field(default=None, description="S3 endpoint URL (e.g., for MinIO)")
    s3_access_key: Optional[str] = Field(default=None, description="S3 access key")
    s3_secret_key: Optional[str] = Field(default=None, description="S3 secret key")
    s3_bucket_name: str = Field(default="chatgpt-sessions", description="S3 bucket name for session storage")
    s3_region_name: Optional[str] = Field(default=None, description="S3 region name")

    # Human-like behavior simulation
    human_min_delay_ms: int = Field(default=80, description="Minimum delay for human simulation")
    human_max_delay_ms: int = Field(default=400, description="Maximum delay for human simulation")
    typing_min_delay_ms: int = Field(default=10, description="Minimum typing delay per character")
    typing_max_delay_ms: int = Field(default=25, description="Maximum typing delay per character")

    def get_user_data_path(self, user_id: Optional[str] = None) -> Path:
        """
        Get the user-specific browser data directory.

        This method supports multi-user scenarios where each user has
        their own browser profile with separate login sessions.

        Args:
            user_id: User identifier. Uses default_user_id if not provided.

        Returns:
            Path to the user's browser data directory.
        """
        uid = user_id or self.default_user_id
        base_path = Path(self.browser_user_data_base_path)
        # Returns the directory containing the "Default" folder
        return base_path / uid / "chatgpt_data"


    def ensure_directories(self) -> None:
        """Create necessary directories if they don't exist."""
        # Data directory for sqlite database
        if self.build_database_url().startswith("sqlite"):
            data_dir = Path("./data")
            data_dir.mkdir(parents=True, exist_ok=True)

        # Base user data directory
        user_data_dir = Path(self.browser_user_data_base_path)
        user_data_dir.mkdir(parents=True, exist_ok=True)

        # Logs directory
        logs_dir = Path("./logs")
        logs_dir.mkdir(parents=True, exist_ok=True)

    def build_database_url(self) -> str:
        """Build the database URL from DB_* settings if not provided."""
        if self.database_url:
            return self.database_url
        user = quote_plus(self.db_user)
        password = quote_plus(self.db_password)
        return (
            f"postgresql+asyncpg://{user}:{password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


@lru_cache
def get_settings() -> Settings:
    """
    Get cached application settings.

    Returns:
        Settings instance (cached for performance).
    """
    return Settings()
