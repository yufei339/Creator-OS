"""YouTube 相关工具:videoId 解析(A4) + 公开统计数据抓取(A5)。"""

import re
from urllib.parse import parse_qs, urlparse

import httpx

from app.config import settings

# 11 位的 YouTube videoId 字符集
_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")

_STATS_URL = "https://www.googleapis.com/youtube/v3/videos"


class YouTubeError(Exception):
    pass


def parse_video_id(url: str | None) -> str | None:
    """从各种 YouTube 链接里解析 videoId,解析不出返回 None(不抛异常)。

    支持:
      https://www.youtube.com/watch?v=ID
      https://youtu.be/ID
      https://www.youtube.com/shorts/ID
      https://www.youtube.com/embed/ID
    """
    if not url:
        return None
    try:
        parsed = urlparse(url)
    except ValueError:
        return None

    host = (parsed.hostname or "").lower().removeprefix("www.")

    candidate: str | None = None
    if host == "youtu.be":
        candidate = parsed.path.lstrip("/").split("/")[0]
    elif host in ("youtube.com", "m.youtube.com", "music.youtube.com"):
        if parsed.path == "/watch":
            candidate = parse_qs(parsed.query).get("v", [None])[0]
        else:
            parts = parsed.path.strip("/").split("/")
            if len(parts) >= 2 and parts[0] in ("shorts", "embed", "v", "live"):
                candidate = parts[1]

    if candidate and _VIDEO_ID_RE.match(candidate):
        return candidate
    return None


def fetch_stats(video_id: str) -> dict[str, int] | None:
    """抓一个视频的公开统计。视频不存在/私密时返回 None;网络或配置错误抛 YouTubeError。

    返回 {"views", "likes", "comments"}。某些字段可能被创作者隐藏,缺失按 0 计。
    """
    if not settings.youtube_api_key:
        raise YouTubeError("YOUTUBE_API_KEY 未配置")

    resp = httpx.get(
        _STATS_URL,
        params={
            "part": "statistics",
            "id": video_id,
            "key": settings.youtube_api_key,
        },
        timeout=30,
    )
    if resp.status_code != 200:
        raise YouTubeError(f"YouTube API {resp.status_code}: {resp.text[:300]}")

    items = resp.json().get("items", [])
    if not items:
        # 视频被删/私密/id 无效
        return None

    stats = items[0].get("statistics", {})
    return {
        "views": int(stats.get("viewCount", 0)),
        "likes": int(stats.get("likeCount", 0)),
        "comments": int(stats.get("commentCount", 0)),
    }
