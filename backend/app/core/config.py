from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_async_postgres_url(database_url: str) -> str:
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    return database_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Motion Nova API"
    app_env: str = "development"
    database_url: str
    redis_url: str

    jwt_secret_key: str
    jwt_refresh_secret_key: str
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    admin_idle_timeout_minutes: int = 30
    secure_cookies: bool = True
    cookie_domain: str | None = None

    allowed_origins: str = Field(default="http://localhost:3001,http://localhost:5173")

    run_db_migrations: bool = True
    seed_demo_data: bool = False
    serve_frontend: bool = False
    frontend_dist_path: str | None = None

    auth_login_rate_limit: int = 5
    auth_register_rate_limit: int = 3
    auth_refresh_rate_limit: int = 10
    subscription_purchase_rate_limit: int = 5
    auth_rate_limit_window_seconds: int = 60

    access_cookie_name: str = "fcms_access_token"
    refresh_cookie_name: str = "fcms_refresh_token"
    csrf_cookie_name: str = "fcms_csrf_token"

    mcp_api_token: str = "local-dev-mcp-token"
    mcp_public_url: str = "http://localhost:8000/mcp"
    mcp_tool_timeout_seconds: int = 5
    mcp_allowed_hosts: str = Field(
        default="127.0.0.1:*,localhost:*,[::1]:*,motion-backend:*,motion-backend:8000"
    )
    mcp_allowed_origins: str = Field(
        default="http://127.0.0.1:*,http://localhost:*,http://[::1]:*,http://motion-backend:*"
    )

    @property
    def refresh_token_expire_seconds(self) -> int:
        return self.refresh_token_expire_days * 24 * 60 * 60

    @property
    def admin_idle_timeout_seconds(self) -> int:
        return self.admin_idle_timeout_minutes * 60

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def mcp_allowed_hosts_list(self) -> list[str]:
        return [h.strip() for h in self.mcp_allowed_hosts.split(",") if h.strip()]

    @property
    def mcp_allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.mcp_allowed_origins.split(",") if o.strip()]

    def session_key(self, session_id: str) -> str:
        return f"auth:session:{session_id}"

    @model_validator(mode="after")
    def validate_security_defaults(self) -> "Settings":
        self.database_url = normalize_async_postgres_url(self.database_url)

        insecure_values = {
            "change-me",
            "change-me-too",
            "super-secret-jwt-key",
            "super-secret-refresh-key",
            "local-dev-jwt-secret-change-me",
            "local-dev-refresh-secret-change-me",
        }

        if self.app_env != "development":
            if (
                self.jwt_secret_key in insecure_values
                or self.jwt_refresh_secret_key in insecure_values
                or self.mcp_api_token in insecure_values
                or self.mcp_api_token == "local-dev-mcp-token"
            ):
                raise ValueError("JWT and MCP secrets must be overridden outside development")
            if not self.secure_cookies:
                raise ValueError("secure_cookies must stay enabled outside development")

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
