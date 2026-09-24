import os
from functools import lru_cache

import boto3
from botocore.config import Config


def env(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if value is None:
        raise RuntimeError(f"Missing environment variable {name}")
    return value


REGION = os.environ.get("AWS_REGION", "us-east-1")

# Amazon Nova models (first-party on Bedrock).
TEXT_MODEL = os.environ.get("TEXT_MODEL", "us.amazon.nova-2-lite-v1:0")
VISION_MODEL = os.environ.get("VISION_MODEL", TEXT_MODEL)
# Image models (Stability AI on Bedrock) are configured in illustrator.py.

_retry = Config(retries={"max_attempts": 8, "mode": "adaptive"}, read_timeout=120, connect_timeout=10)


@lru_cache(maxsize=None)
def client(service: str, **kwargs):
    return boto3.client(service, region_name=REGION, config=_retry, **kwargs)


def table():
    return boto3.resource("dynamodb", region_name=REGION).Table(env("TABLE_NAME"))


def bucket() -> str:
    return env("MEDIA_BUCKET")
