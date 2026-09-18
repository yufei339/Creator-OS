import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

Status = Literal["draft", "ready", "shot", "published"]


class ScriptCreate(BaseModel):
    title: str
    content: str = ""
    series: str | None = None
    tags: list[str] = []


class ScriptUpdate(BaseModel):
    """PATCH 语义:只更新传了的字段。"""

    title: str | None = None
    content: str | None = None
    status: Status | None = None
    series: str | None = None
    tags: list[str] | None = None


class ScriptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    content: str
    status: str
    series: str | None
    tags: list[str]
    created_at: datetime
    updated_at: datetime


class VersionCreate(BaseModel):
    content: str
    change_note: str | None = None


class VersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    script_id: uuid.UUID
    content: str
    change_note: str | None
    created_at: datetime
