"""生图封装:Gemini Nano Banana(gemini-2.5-flash-image)。

IMAGE_API_KEY 填 Google AI Studio 的 API key。
"""

import base64

import httpx

from app.config import settings

MODEL = "gemini-2.5-flash-image"
API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{MODEL}:generateContent"
)

PROVIDER_NAME = "gemini-nano-banana"


class ImageGenError(Exception):
    pass


def generate(prompt: str) -> bytes:
    """生成一张图,返回 PNG 字节。生图通常要 10~30 秒。"""
    if not settings.image_api_key:
        raise ImageGenError("IMAGE_API_KEY 未配置")

    resp = httpx.post(
        API_URL,
        headers={
            "x-goog-api-key": settings.image_api_key,
            "Content-Type": "application/json",
        },
        json={"contents": [{"parts": [{"text": prompt}]}]},
        timeout=120,
    )
    if resp.status_code != 200:
        raise ImageGenError(f"Gemini API {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    try:
        parts = data["candidates"][0]["content"]["parts"]
    except (KeyError, IndexError):
        raise ImageGenError(f"Gemini 返回结构异常: {str(data)[:300]}")

    for part in parts:
        inline = part.get("inlineData") or part.get("inline_data")
        if inline and inline.get("data"):
            return base64.b64decode(inline["data"])

    # 没有图片 part,通常是 prompt 被拒或只回了文字
    texts = " ".join(p.get("text", "") for p in parts)
    raise ImageGenError(f"Gemini 未返回图片: {texts[:300]}")
