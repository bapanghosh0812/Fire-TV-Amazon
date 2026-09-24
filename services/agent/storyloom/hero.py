"""The drawing comes alive: a child's photo becomes an illustrated hero."""

import logging
import uuid

from strands import Agent
from strands.models import BedrockModel

from . import illustrator, memory
from .config import REGION, VISION_MODEL, client
from .events import Room
from .models import HeroSheet
from .prompts import HERO_SYSTEM
from .signing import signed_url
from .store import get_media, put_media, save_character, set_room_thread

log = logging.getLogger(__name__)

DRAWING_LABELS = {"Drawing", "Sketch", "Art", "Doodle", "Painting", "Child Art", "Cartoon", "Crayon", "Paper", "Illustration", "Graphics"}


def screen(image: bytes) -> str | None:
    """Rekognition safety + privacy screen. Returns a friendly reason to reject, or None."""
    rk = client("rekognition")
    mod = rk.detect_moderation_labels(Image={"Bytes": image}, MinConfidence=70)
    if mod.get("ModerationLabels"):
        return "Let’s try a different drawing for our story."
    labels = {lbl["Name"]: lbl["Confidence"] for lbl in rk.detect_labels(Image={"Bytes": image}, MaxLabels=25, MinConfidence=60)["Labels"]}
    is_art = any(name in DRAWING_LABELS for name in labels)
    has_person = labels.get("Person", 0) > 85 or labels.get("Face", 0) > 85
    if has_person and not is_art:
        # Privacy: we never turn real people (especially children) into characters.
        return "That looks like a photo of a person. Please snap a drawing instead!"
    return None


def describe(image: bytes, name_hint: str) -> HeroSheet:
    agent = Agent(
        model=BedrockModel(model_id=VISION_MODEL, region_name=REGION, temperature=0.3, max_tokens=800),
        system_prompt=HERO_SYSTEM,
        callback_handler=None,
        name="hero-vision",
    )
    prompt = [
        {"image": {"format": "jpeg", "source": {"bytes": image}}},
        {"text": f"The child named their hero: {name_hint!r}." if name_hint else "The child didn't name their hero yet."},
    ]
    return agent(prompt, structured_output_model=HeroSheet).structured_output


def run(job: dict) -> None:
    room = Room(job["roomId"])
    by = job["playerId"]
    try:
        drawing = get_media(job["drawingKey"])
        reason = screen(drawing)
        if reason:
            room.emit({"type": "error", "message": reason})
            room.emit({"type": "thread.clear", "kind": "hero"})
            return

        sheet = describe(drawing, job.get("name") or "")
        if sheet.looks_like_real_person and not sheet.is_drawing:
            room.emit({"type": "error", "message": "That looks like a photo of a person. Please snap a drawing instead!"})
            room.emit({"type": "thread.clear", "kind": "hero"})
            return

        hero_id = uuid.uuid4().hex
        seed = int(hero_id[:8], 16)
        portrait = illustrator.hero_from_drawing(drawing, sheet.visual_prompt, illustrator.DEFAULT_STYLE, seed)
        base = f"heroes/{job['householdId']}/{hero_id}"
        portrait_key = put_media(f"{base}/portrait.png", portrait, "image/png")
        cutout_key = None
        try:
            cutout_key = put_media(f"{base}/cutout.png", illustrator.remove_background(portrait), "image/png")
        except Exception as e:  # nice-to-have
            log.warning("background removal failed: %s", e)

        name = (job.get("name") or sheet.suggested_name or "Our hero").strip()[:24]
        stored = {
            "kind": "hero",
            "by": by,
            "id": hero_id,
            "name": name,
            "description": sheet.description,
            "visualPrompt": sheet.visual_prompt,
            "drawingKey": job["drawingKey"],
            "portraitKey": portrait_key,
            "cutoutKey": cutout_key,
        }
        set_room_thread(job["roomId"], stored)
        save_character(job["householdId"], {k: v for k, v in stored.items() if k != "drawingKey"})
        memory.remember(job["householdId"], f"hero-{hero_id}", f"New character drawn by the family: {name}, {sheet.description}.")

        room.emit({
            "type": "thread.set",
            "thread": {
                "kind": "hero",
                "by": by,
                "name": name,
                "description": sheet.description,
                "drawingUrl": signed_url(job["drawingKey"], 2),
                "portraitUrl": signed_url(portrait_key),
                "cutoutUrl": signed_url(cutout_key),
            },
        })
    except Exception:
        log.exception("hero pipeline failed")
        room.emit({"type": "error", "message": "The magic paintbrush slipped. Please try the photo again."})
        room.emit({"type": "thread.clear", "kind": "hero"})
