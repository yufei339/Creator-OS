"""Cloudflare R2 封装(S3 兼容,boto3)。"""

from functools import lru_cache

import boto3
from botocore.config import Config

from app.config import settings


@lru_cache(maxsize=1)
def _client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        config=Config(signature_version="s3v4", region_name="auto"),
    )


def upload_bytes(key: str, data: bytes, content_type: str) -> str:
    _client().put_object(
        Bucket=settings.r2_bucket, Key=key, Body=data, ContentType=content_type
    )
    return key


def presigned_get_url(key: str, expires: int = 3600) -> str:
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.r2_bucket, "Key": key},
        ExpiresIn=expires,
    )


def presigned_put_url(key: str, content_type: str, expires: int = 3600) -> str:
    """A4 上传发布物用:客户端直传 R2 的预签名 PUT。"""
    return _client().generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.r2_bucket,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=expires,
    )


def delete_object(key: str) -> None:
    _client().delete_object(Bucket=settings.r2_bucket, Key=key)
