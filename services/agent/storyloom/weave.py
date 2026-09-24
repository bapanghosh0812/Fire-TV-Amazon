"""Weaving: the multi-agent pipeline that turns the family's threads into a story.

  Director (Nova 2 Lite, structured output)  ->  Guardian (Bedrock Guardrails, revise loop)
     -> Illustrator (Stability AI on Bedrock, hero-styled pages, in parallel)
     -> Narrator (Polly generative voices + read-along timing, in parallel)
     -> Curator (DynamoDB/S3, bookshelf, AgentCore Memory)
Progress streams to the TV and phones the whole time.
"""

import logging
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed

from . import director, guardian, illustrator, languages, memory, narrator
from .events import Room
from .models import PagePlan, StoryPlan
from .signing import sign_story
from .store import get_media, now, put_media, save_story

log = logging.getLogger(__name__)

SAFE_FALLBACK_ISSUE = "Keep everything gentle, kind and cozy."


def _plan(job: dict, room: Room, story_id: str) -> StoryPlan:
    r = job["room"]
    threads = r.get("threads", {})
    settings = job.get("settings", {})
    hero = threads.get("hero", {})
    kwargs = dict(
        hero=hero,
        world=threads.get("world", {}),
        spark=threads.get("spark"),
        mood=r.get("mood", "cozy"),
        age_band=settings.get("ageBand", "kid"),
        length=r.get("length", "short"),
        gentle=bool(settings.get("gentleMode", True)),
        contributors=r.get("players", []),
        memory=memory.recall(job["householdId"], f"{hero.get('name', '')} {threads.get('world', {}).get('text', '')}"),
        language=languages.info(r.get("language")).get("english"),
    )
    room.progress(story_id, "plan", "Planning the adventure…", 0.08)
    plan = director.plan_story(**kwargs)

    room.progress(story_id, "safety", "Making sure it’s just right for little ears…", 0.2)
    for _ in range(2):
        issues = guardian.review(plan)
        if not issues:
            return plan
        plan = director.revise_story(plan, issues, **kwargs)
    if guardian.review(plan):
        plan = director.revise_story(plan, [SAFE_FALLBACK_ISSUE], **{**kwargs, "gentle": True})
        if guardian.review(plan):
            raise RuntimeError("Could not produce a safe story")
    return plan


def run(job: dict) -> None:
    room = Room(job["roomId"])
    story_id = job["storyId"]
    household = job["householdId"]
    r = job["room"]
    settings = job.get("settings", {})
    threads = r.get("threads", {})
    language = languages.info(r.get("language"))["code"]
    # A parent's chosen English narrator applies to English stories; other languages use their native voice.
    voice = settings.get("narrator") if language.startswith("en") else None
    base = f"stories/{story_id}"
    seed = int(uuid.UUID(story_id).hex[:8], 16)

    try:
        plan = _plan(job, room, story_id)
        room.progress(story_id, "write", f"“{plan.title}” is taking shape…", 0.26)

        # --- The hero reference image keeps the character consistent across pages.
        hero_thread = dict(threads.get("hero", {}))
        hero_look = hero_thread.get("visualPrompt") or plan.hero_look
        style = plan.art_style or illustrator.DEFAULT_STYLE
        if hero_thread.get("portraitKey"):
            hero_png = get_media(hero_thread["portraitKey"])
        else:
            room.progress(story_id, "hero", f"Sketching {plan.hero_name}…", 0.3)
            hero_png = illustrator.hero_from_text(hero_look, style, seed)
            hero_thread["portraitKey"] = put_media(f"{base}/hero.png", hero_png, "image/png")

        # --- Everything the story needs, generated in parallel.
        pages: list[tuple[int, str | None, PagePlan]] = []
        for i, p in enumerate(plan.opening):
            pages.append((i, None, p))
        after = len(plan.opening) - 1
        for j, p in enumerate(plan.branch_a):
            pages.append((after + 1 + j, "a", p))
        for j, p in enumerate(plan.branch_b):
            pages.append((after + 1 + j, "b", p))
        pages.append((after + 1 + len(plan.branch_a), None, plan.ending))

        def page_key(idx: int, branch: str | None) -> str:
            return f"{base}/p{idx}{branch or ''}"

        def paint(idx: int, branch: str | None, scene: str, n: int) -> tuple[str, str]:
            jpg = illustrator.page(scene, style, hero_look, hero_png, seed + n)
            return ("image", put_media(f"{page_key(idx, branch)}.jpg", jpg, "image/jpeg"))

        def extra(name: str, scene: str, n: int, aspect: str = "16:9") -> tuple[str, str]:
            jpg = illustrator.page(scene, style, hero_look, hero_png, seed + n, aspect=aspect)
            return (name, put_media(f"{base}/{name}.jpg", jpg, "image/jpeg"))

        def voice_page(idx: int, branch: str | None, text: str) -> tuple[str, dict]:
            mp3, marks, dur = narrator.narrate(text, language, voice)
            key = put_media(f"{page_key(idx, branch)}.mp3", mp3, "audio/mpeg")
            return ("audio", {"audioKey": key, "marks": marks, "durationMs": dur})

        results: dict[tuple[int, str | None], dict] = {(i, b): {} for i, b, _ in pages}
        choice_images: dict[str, str] = {}
        total = len(pages) * 2 + 3
        done = 0

        with ThreadPoolExecutor(max_workers=6) as pool:
            futures = {}
            for n, (i, b, p) in enumerate(pages):
                futures[pool.submit(paint, i, b, p.scene, n)] = (i, b)
                futures[pool.submit(voice_page, i, b, p.text)] = (i, b)
            futures[pool.submit(extra, "choice-a", plan.choice.scene_a, 101)] = ("choice", "a")
            futures[pool.submit(extra, "choice-b", plan.choice.scene_b, 102)] = ("choice", "b")
            world_text = threads.get("world", {}).get("text", "their world")
            cover_scene = f"Book cover scene: {plan.hero_name} in {world_text}, joyful, iconic composition, portrait orientation"
            futures[pool.submit(extra, "cover", cover_scene, 7, "2:3")] = ("cover", None)

            for fut in as_completed(futures):
                kind, value = fut.result()
                slot = futures[fut]
                done += 1
                if kind == "image":
                    results[slot]["imageKey"] = value
                elif kind == "audio":
                    results[slot].update(value)
                elif kind in ("choice-a", "choice-b"):
                    choice_images[kind[-1]] = value
                elif kind == "cover":
                    choice_images["cover"] = value
                painted = sum(1 for v in results.values() if "imageKey" in v)
                voiced = sum(1 for v in results.values() if "audioKey" in v)
                stage, msg = ("paint", f"Painting the pictures… {painted} of {len(pages)}") if painted < len(pages) else ("voice", f"Recording the narrator… {voiced} of {len(pages)}")
                room.progress(story_id, stage, msg, 0.32 + 0.63 * done / total)

        # --- Assemble and save.
        story = {
            "id": story_id,
            "title": plan.title,
            "summary": plan.summary,
            "lesson": plan.lesson,
            "palette": plan.palette,
            "coverKey": choice_images.get("cover"),
            "mood": r.get("mood", "cozy"),
            "ageBand": settings.get("ageBand", "kid"),
            "hero": {**hero_thread, "kind": "hero", "name": hero_thread.get("name") or plan.hero_name, "description": hero_thread.get("description") or plan.hero_look},
            "world": threads.get("world", {}),
            "spark": threads.get("spark") or {"kind": "spark", "by": "tv", "text": ""},
            "pages": [
                {"index": i, "text": p.text, **({"branch": b} if b else {}), **results[(i, b)]}
                for i, b, p in sorted(pages, key=lambda x: (x[0], x[1] or ""))
            ],
            "choice": {
                "afterPage": after,
                "prompt": plan.choice.prompt,
                "options": [
                    {"id": "a", "label": plan.choice.option_a, "imageKey": choice_images.get("a")},
                    {"id": "b", "label": plan.choice.option_b, "imageKey": choice_images.get("b")},
                ],
            },
            "createdAt": now(),
            "contributors": r.get("players", []),
            "narrator": voice or languages.info(language)["voice"],
            "language": language,
            "status": "ready",
        }
        save_story(household, story)
        memory.remember(
            household,
            story_id,
            f"The family made a story called '{plan.title}'. Hero: {story['hero']['name']} ({story['hero']['description']}). "
            f"World: {story['world'].get('text', '')}. Lesson: {plan.lesson}.",
        )
        room.progress(story_id, "done", "Your story is ready", 1.0)
        room.emit({"type": "story.ready", "story": sign_story(story)})
    except Exception as e:
        log.exception("weave failed")
        room.emit({"type": "story.failed", "storyId": story_id, "reason": str(e)[:200]})
