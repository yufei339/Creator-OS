from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.sync import sync_youtube

router = APIRouter(prefix="/internal")


@router.post("/sync/youtube")
def trigger_youtube_sync(db: Session = Depends(get_db)):
    """手动触发一次 YouTube 同步(方便测试)。"""
    return sync_youtube(db)
