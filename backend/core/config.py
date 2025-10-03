"""
Application configuration settings
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application settings
    dev: bool = False
    
    # Database settings
    db_libdir: str | None = "C:/Users/kdanylenko/Oracle/instantclient_23_6"
    db_drivername: str = "oracle+oracledb"
    db_username: str = "SOEK"
    db_password: str = "P#roatom1234"
    db_host: str = "10.107.6.188"
    db_port: int = 1521
    db_name: str = "APEX222"
    echo_sql: bool = True

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()

