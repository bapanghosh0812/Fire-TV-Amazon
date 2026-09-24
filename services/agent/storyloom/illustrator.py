"""The Illustrator: Stability AI image models on Amazon Bedrock.

- A child's drawing becomes the hero with **Control Sketch** (keeps their lines).
- Preset heroes are painted from text with **Stable Image Core**.
- Every page, the cover and the choice cards use **Style Guide** with the hero
  portrait as the reference, so the whole book shares one look.
- **Remove Background** gives the hero cut-out used in TV animations.
"""

import base64
import json
import logging
import os
import random
import time

import boto3
from botocore.config import Config

from .config import REGION, client

log = logging.getLogger(__name__)

SKETCH_MODEL = os.environ.get("SKETCH_MODEL", "us.stability.stable-image-control-sketch-v1:0")
STYLE_MODEL = os.environ.get("STYLE_MODEL", "us.stability.stable-image-style-guide-v1:0")
CUTOUT_MODEL = os.environ.get("CUTOUT_MODEL", "us.stability.stable-image-remove-background-v1:0")
TEXT_IMAGE_MODEL = os.environ.get("TEXT_IMAGE_MODEL", "stability.stable-image-core-v1:1")
TEXT_IMAGE_REGION = os.environ.get("TEXT_IMAGE_REGION", "us-west-2")

DEFAULT_STYLE = (
    "soft watercolour and gouache children's picture-book illustration, warm glowing light, gentle rounded shapes, "
    "textured paper, rich but calm colours, whimsical and cozy, highly detailed background"
)
NEGATIVE = (
    "text, letters, words, captions, watermark, signature, logo, speech bubble, frame, border, blurry, low quality, "
    "deformed, extra limbs, scary, horror, violent, weapon, blood, photorealistic, photograph"
)

_west = None


def _runtime(region: str | None):
    global _west
    if not region or region == REGION:
        return client("bedrock-runtime")
    if _west is None:
        _west = boto3.client("bedrock-runtime", region_name=region, config=Config(retries={"max_attempts": 8, "mode": "adaptive"}, read_timeout=120))
    return _west


def _invoke(model_id: str, body: dict, region: str | None = None, attempts: int = 6) -> bytes:
    rt = _runtime(region)
    body = {k: v for k, v in body.items() if v is not None}
    for i in range(attempts):
        try:
            r = rt.invoke_model(modelId=model_id, body=json.dumps(body), accept="application/json", contentType="application/json")
            payload = json.loads(r["body"].read())
            reason = (payload.get("finish_reasons") or [None])[0]
            if reason:  # e.g. "Filter reason: prompt" — Stability's own safety filter
                raise ContentFiltered(str(reason))
            return base64.b64decode(payload["images"][0])
        except rt.exceptions.ThrottlingException:
            time.sleep(min(20, 2 ** i + random.random()))
        except ContentFiltered:
            if i < attempts - 1 and "prompt" in body:
                body = {**body, "prompt": "gentle, cheerful, wholesome children's book scene. " + body["prompt"]}
                continue
            raise
    raise RuntimeError("The illustrator is busy right now, please retry")


class ContentFiltered(RuntimeError):
    pass


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode()


def _seed(seed: int) -> int:
    return seed % 4294967294 or 1


def hero_from_drawing(drawing: bytes, visual_prompt: str, style: str, seed: int) -> bytes:
    """The magic moment: the child's own lines, painted like a picture book."""
    return _invoke(SKETCH_MODEL, {
        "image": _b64(drawing),
        "prompt": f"{style}. A single friendly character, full body, centred, simple soft glowing background. {visual_prompt}",
        "negative_prompt": NEGATIVE,
        "control_strength": 0.62,
        "seed": _seed(seed),
        "output_format": "png",
    })


def hero_from_text(visual_prompt: str, style: str, seed: int) -> bytes:
    return _invoke(TEXT_IMAGE_MODEL, {
        "prompt": f"{style}. A single friendly character, full body, centred, facing the viewer, simple soft glowing background. {visual_prompt}",
        "negative_prompt": NEGATIVE,
        "aspect_ratio": "1:1",
        "seed": _seed(seed),
        "output_format": "png",
    }, region=TEXT_IMAGE_REGION)


def page(scene: str, style: str, hero_look: str, hero_png: bytes, seed: int, aspect: str = "16:9", fidelity: float = 0.55) -> bytes:
    """A story page in the same style as the hero portrait."""
    return _invoke(STYLE_MODEL, {
        "image": _b64(hero_png),
        "prompt": f"{style}. {scene}. The main character looks exactly like this: {hero_look}.",
        "negative_prompt": NEGATIVE,
        "aspect_ratio": aspect,
        "fidelity": fidelity,
        "seed": _seed(seed),
        "output_format": "jpeg",
    })


def remove_background(png: bytes) -> bytes:
    return _invoke(CUTOUT_MODEL, {"image": _b64(png), "output_format": "png"})
