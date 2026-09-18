import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import imagegen, storage
from app.db import get_db
from app.models import Image
from app.routers.scripts import get_script_or_404
from app.schemas.image import ImageGenerateIn, ImageOut

logger = logging.getLogger(__name__)
router = APIRouter()


def _to_out(img: Image) -> ImageOut:
    out = ImageOut.model_validate(img)
    out.url = storage.presigned_get_url(img.storage_key)
    return out


@router.get("/scripts/{script_id}/images", response_model=list[ImageOut])
def list_images(script_id: uuid.UUID, db: Session = Depends(get_db)):
    get_script_or_404(script_id, db)
    q = (
        select(Image)
        .where(Image.script_id == script_id)
        .order_by(Image.created_at.desc())
    )
    return [_to_out(img) for img in db.scalars(q).all()]


@router.post(
    "/scripts/{script_id}/images/generate", response_model=ImageOut, status_code=201
)
def generate_image(
    script_id: uuid.UUID, body: ImageGenerateIn, db: Session = Depends(get_db)
):
    get_script_or_404(script_id, db)
    try:
        png = imagegen.generate(body.prompt)
    except imagegen.ImageGenError as e:
        raise HTTPException(status_code=502, detail=str(e))

    key = f"images/{script_id}/{uuid.uuid4()}.png"
    storage.upload_bytes(key, png, "image/png")

    img = Image(
        script_id=script_id,
        storage_key=key,
        prompt=body.prompt,
        provider=imagegen.PROVIDER_NAME,
    )
    db.add(img)
    db.commit()
    db.refresh(img)
    return _to_out(img)


@router.delete("/images/{image_id}", status_code=204)
def delete_image(image_id: uuid.UUID, db: Session = Depends(get_db)):
    img = db.get(Image, image_id)
    if img is None:
        raise HTTPException(status_code=404, detail="image not found")
    try:
        storage.delete_object(img.storage_key)
    except Exception:
        # R2 删除失败不阻塞记录删除,记日志即可
        logger.warning("R2 删除失败: %s", img.storage_key, exc_info=True)
    db.delete(img)
    db.commit()
