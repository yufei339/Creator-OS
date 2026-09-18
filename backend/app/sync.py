"""YouTube 自动同步:抓公开数据写入 publication_metrics(collected_by='auto')。"""

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import youtube
from app.db import SessionLocal
from app.models import Publication, PublicationMetric

logger = logging.getLogger(__name__)


def sync_youtube(db: Session | None = None) -> dict[str, int]:
    """同步所有 active + 有 external_id 的 YouTube 发布物。

    单个视频抓失败不中断整批,记日志跳过。返回统计:
    {"total", "updated", "skipped", "failed"}。
    """
    own_session = db is None
    db = db or SessionLocal()
    result = {"total": 0, "updated": 0, "skipped": 0, "failed": 0}
    try:
        q = select(Publication).where(
            Publication.platform == "youtube",
            Publication.track_status == "active",
            Publication.external_id.is_not(None),
        )
        pubs = db.scalars(q).all()
        result["total"] = len(pubs)

        for pub in pubs:
            try:
                stats = youtube.fetch_stats(pub.external_id)
            except youtube.YouTubeError:
                logger.warning(
                    "YouTube 抓取失败,跳过 pub=%s video=%s",
                    pub.id,
                    pub.external_id,
                    exc_info=True,
                )
                result["failed"] += 1
                continue

            if stats is None:
                # 视频被删/私密
                logger.info("视频不可用,跳过 pub=%s video=%s", pub.id, pub.external_id)
                result["skipped"] += 1
                continue

            db.add(
                PublicationMetric(
                    publication_id=pub.id,
                    views=stats["views"],
                    likes=stats["likes"],
                    comments=stats["comments"],
                    collected_by="auto",
                )
            )
            result["updated"] += 1

        db.commit()
    finally:
        if own_session:
            db.close()

    logger.info("YouTube 同步完成: %s", result)
    return result
