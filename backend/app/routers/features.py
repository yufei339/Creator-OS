from fastapi import APIRouter

from app.config import settings

router = APIRouter()


@router.get("/features")
def get_features():
    """告诉前端哪些可选能力已配置可用(未启用的功能前端显示占位)。"""
    image_gen = bool(
        settings.image_api_key
        and settings.r2_account_id
        and settings.r2_access_key_id
        and settings.r2_secret_access_key
        and settings.r2_bucket
    )
    return {
        "image_gen": image_gen,
        "learning": False,  # A6 学习层做完后改为按配置判断
    }
