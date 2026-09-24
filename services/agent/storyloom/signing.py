"""CloudFront signed URLs so every picture and sound stays private to the family."""

import datetime as dt
import json
from functools import lru_cache

from botocore.signers import CloudFrontSigner
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

from .config import client, env


@lru_cache(maxsize=1)
def _signer() -> CloudFrontSigner:
    secret = client("secretsmanager").get_secret_value(SecretId=env("CF_PRIVATE_KEY_SECRET_ARN"))["SecretString"]
    key = serialization.load_pem_private_key(secret.encode(), password=None)

    def rsa_signer(message: bytes) -> bytes:
        return key.sign(message, padding.PKCS1v15(), hashes.SHA1())  # CloudFront requires SHA-1 here

    return CloudFrontSigner(env("CF_KEY_PAIR_ID"), rsa_signer)


def signed_url(key: str | None, hours: int = 12) -> str | None:
    if not key:
        return None
    expires = dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=hours)
    return _signer().generate_presigned_url(f"https://{env('MEDIA_DOMAIN')}/{key}", date_less_than=expires)


def sign_story(story: dict) -> dict:
    """Returns a client-ready copy of a stored story with fresh signed URLs."""
    s = json.loads(json.dumps(story, default=str))
    s["coverUrl"] = signed_url(s.pop("coverKey", None))
    hero = s.get("hero", {})
    hero["portraitUrl"] = signed_url(hero.pop("portraitKey", None))
    hero["cutoutUrl"] = signed_url(hero.pop("cutoutKey", None))
    hero.pop("drawingKey", None)
    for p in s.get("pages", []):
        p["imageUrl"] = signed_url(p.pop("imageKey", None))
        p["audioUrl"] = signed_url(p.pop("audioKey", None))
    if s.get("choice"):
        for o in s["choice"]["options"]:
            o["imageUrl"] = signed_url(o.pop("imageKey", None))
    for k in ("pk", "sk", "householdId"):
        s.pop(k, None)
    return s
