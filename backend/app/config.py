from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """从 .env 读取配置。后续任务卡需要的 key 先声明为可选。"""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str

    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = ""
    anthropic_api_key: str = ""
    image_api_key: str = ""
    youtube_api_key: str = ""

    # A5 定时同步:每天几点跑(本地时区,24 小时制)
    youtube_sync_hour: int = 3


settings = Settings()
