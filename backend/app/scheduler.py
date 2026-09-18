"""APScheduler:每天定时跑一次 YouTube 同步。"""

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import settings
from app.sync import sync_youtube

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def _job():
    try:
        sync_youtube()
    except Exception:
        logger.exception("定时 YouTube 同步任务异常")


def start_scheduler() -> None:
    if scheduler.running:
        return
    scheduler.add_job(
        _job,
        trigger=CronTrigger(hour=settings.youtube_sync_hour, minute=0),
        id="youtube_sync",
        replace_existing=True,
    )
    scheduler.start()
    job = scheduler.get_job("youtube_sync")
    logger.info("YouTube 同步定时任务已注册,下次运行: %s", job.next_run_time)


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
