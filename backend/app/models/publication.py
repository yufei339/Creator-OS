import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Publication(Base):
    __tablename__ = "publications"
    __table_args__ = (
        CheckConstraint("type IN ('video','image_text')", name="publications_type_check"),
        CheckConstraint("source IN ('link','upload')", name="publications_source_check"),
        CheckConstraint(
            "track_status IN ('active','paused')", name="publications_track_check"
        ),
        Index("idx_pub_script", "script_id"),
        Index("idx_pub_track", "track_status", "platform"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    script_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("scripts.id", ondelete="CASCADE")
    )
    type: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(Text)
    platform: Mapped[str] = mapped_column(Text)
    external_url: Mapped[str | None] = mapped_column(Text)
    storage_key: Mapped[str | None] = mapped_column(Text)
    external_id: Mapped[str | None] = mapped_column(Text)
    track_status: Mapped[str] = mapped_column(Text, server_default=text("'active'"))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )


class PublicationMetric(Base):
    __tablename__ = "publication_metrics"
    __table_args__ = (
        CheckConstraint(
            "collected_by IN ('auto','manual')", name="metrics_collected_check"
        ),
        Index("idx_metrics_pub", "publication_id", "recorded_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    publication_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("publications.id", ondelete="CASCADE")
    )
    views: Mapped[int | None] = mapped_column(Integer)
    completion_rate: Mapped[float | None] = mapped_column(Float)
    likes: Mapped[int | None] = mapped_column(Integer)
    comments: Mapped[int | None] = mapped_column(Integer)
    shares: Mapped[int | None] = mapped_column(Integer)
    saves: Mapped[int | None] = mapped_column(Integer)
    collected_by: Mapped[str] = mapped_column(Text, server_default=text("'manual'"))
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
