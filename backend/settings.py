from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    dev: bool = False
    db_libdir: str | None = None
    db_drivername: str = "oracle+oracledb"
    db_username: str = "server"
    db_password: str = "server"
    db_host: str = "localhost"
    db_port: int = 1521
    db_name: str = "FREEPDB1"
    echo_sql: bool = False

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
