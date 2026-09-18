import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import storage, youtube
from app.db import get_db
from app.models import Publication, PublicationMetric
from app.routers.scripts import get_script_or_404
from app.schemas.publication import (
    MetricCreate,
    MetricOut,
    PublicationCreate,
    PublicationOut,
    PublicationUpdate,
    UploadUrlIn,
    UploadUrlOut,
)

router = APIRouter()


def get_publication_or_404(publication_id: uuid.UUID, db: Session) -> Publication:
    pub = db.get(Publication, publication_id)
    if pub is None:
        raise HTTPException(status_code=404, detail="publication not found")
    return pub


def _latest_metric(publication_id: uuid.UUID, db: Session) -> PublicationMetric | None:
    q = (
        select(PublicationMetric)
        .where(PublicationMetric.publication_id == publication_id)
        .order_by(PublicationMetric.recorded_at.desc())
        .limit(1)
    )
    return db.scalars(q).first()


def _to_out(pub: Publication, db: Session) -> PublicationOut:
    out = PublicationOut.model_validate(pub)
    latest = _latest_metric(pub.id, db)
    out.latest_metric = MetricOut.model_validate(latest) if latest else None
    return out


@router.get("/scripts/{script_id}/publications", response_model=list[PublicationOut])
def list_publications(script_id: uuid.UUID, db: Session = Depends(get_db)):
    get_script_or_404(script_id, db)
    q = (
        select(Publication)
        .where(Publication.script_id == script_id)
        .order_by(Publication.created_at.desc())
    )
    return [_to_out(pub, db) for pub in db.scalars(q).all()]


@router.post(
    "/scripts/{script_id}/publications",
    response_model=PublicationOut,
    status_code=201,
)
def create_publication(
    script_id: uuid.UUID, body: PublicationCreate, db: Session = Depends(get_db)
):
    get_script_or_404(script_id, db)

    # YouTube 链接解析出 videoId 存 external_id(为 A5 自动同步铺路),失败留空不报错
    external_id = None
    if body.platform.lower() == "youtube" and body.source == "link":
        external_id = youtube.parse_video_id(body.external_url)

    pub = Publication(
        script_id=script_id,
        type=body.type,
        source=body.source,
        platform=body.platform,
        external_url=body.external_url,
        external_id=external_id,
        published_at=body.published_at,
    )
    db.add(pub)
    db.commit()
    db.refresh(pub)
    return _to_out(pub, db)


@router.post("/publications/{publication_id}/upload-url", response_model=UploadUrlOut)
def create_upload_url(
    publication_id: uuid.UUID,
    body: UploadUrlIn | None = None,
    db: Session = Depends(get_db),
):
    pub = get_publication_or_404(publication_id, db)
    if pub.source != "upload":
        raise HTTPException(
            status_code=400, detail="publication source is not 'upload'"
        )
    key = f"publications/{pub.script_id}/{uuid.uuid4()}"
    default_type = "video/mp4" if pub.type == "video" else "image/jpeg"
    content_type = (body.content_type if body else None) or default_type
    url = storage.presigned_put_url(key, content_type)

    # 记下 storage_key,客户端 PUT 完就有据可查
    pub.storage_key = key
    db.commit()
    return UploadUrlOut(upload_url=url, storage_key=key)


@router.patch("/publications/{publication_id}", response_model=PublicationOut)
def update_publication(
    publication_id: uuid.UUID,
    body: PublicationUpdate,
    db: Session = Depends(get_db),
):
    pub = get_publication_or_404(publication_id, db)
    pub.track_status = body.track_status
    db.commit()
    db.refresh(pub)
    return _to_out(pub, db)


@router.delete("/publications/{publication_id}", status_code=204)
def delete_publication(publication_id: uuid.UUID, db: Session = Depends(get_db)):
    pub = get_publication_or_404(publication_id, db)
    db.delete(pub)
    db.commit()


@router.get("/publications/{publication_id}/metrics", response_model=list[MetricOut])
def list_metrics(publication_id: uuid.UUID, db: Session = Depends(get_db)):
    get_publication_or_404(publication_id, db)
    q = (
        select(PublicationMetric)
        .where(PublicationMetric.publication_id == publication_id)
        .order_by(PublicationMetric.recorded_at.desc())
    )
    return db.scalars(q).all()


@router.post(
    "/publications/{publication_id}/metrics",
    response_model=MetricOut,
    status_code=201,
)
def create_metric(
    publication_id: uuid.UUID, body: MetricCreate, db: Session = Depends(get_db)
):
    get_publication_or_404(publication_id, db)
    metric = PublicationMetric(
        publication_id=publication_id,
        views=body.views,
        likes=body.likes,
        comments=body.comments,
        shares=body.shares,
        saves=body.saves,
        completion_rate=body.completion_rate,
        collected_by="manual",
    )
    if body.recorded_at is not None:
        metric.recorded_at = body.recorded_at
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric
