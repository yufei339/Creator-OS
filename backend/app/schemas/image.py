import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ImageGenerateIn(BaseModel):
    prompt: str
    provider: str | None = None  # 现在只有 gemini-nano-banana,留作扩展


class ImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    script_id: uuid.UUID
    storage_key: str
    prompt: str | None
    provider: str | None
    created_at: datetime
    url: str | None = None  # presigned GET url,路由层填充
