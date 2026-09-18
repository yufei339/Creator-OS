import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

PubType = Literal["video", "image_text"]
PubSource = Literal["link", "upload"]
TrackStatus = Literal["active", "paused"]


class PublicationCreate(BaseModel):
    type: PubType
    source: PubSource
    platform: str
    external_url: str | None = None
    published_at: datetime | None = None


class PublicationUpdate(BaseModel):
    track_status: TrackStatus


class MetricCreate(BaseModel):
    views: int | None = None
    likes: int | None = None
    comments: int | None = None
    shares: int | None = None
    saves: int | None = None
    completion_rate: float | None = None
    # 手动回填历史数据时可指定时间点;不传则用 now()
    recorded_at: datetime | None = None


class MetricOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    publication_id: uuid.UUID
    views: int | None
    completion_rate: float | None
    likes: int | None
    comments: int | None
    shares: int | None
    saves: int | None
    collected_by: str
    recorded_at: datetime


class PublicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    script_id: uuid.UUID
    type: str
    source: str
    platform: str
    external_url: str | None
    storage_key: str | None
    external_id: str | None
    track_status: str
    published_at: datetime | None
    created_at: datetime
    latest_metric: MetricOut | None = None


class UploadUrlIn(BaseModel):
    # 客户端实际要上传的 MIME 类型;不传则按发布物类型取默认值
    content_type: str | None = None


class UploadUrlOut(BaseModel):
    upload_url: str
    storage_key: str
