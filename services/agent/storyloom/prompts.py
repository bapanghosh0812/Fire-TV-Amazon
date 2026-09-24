AGE_GUIDE = {
    "little": "Listeners are 3-5. Use very simple words, short sentences (max 10 words), gentle repetition and sounds kids can join in with. No peril at all.",
    "kid": "Listeners are 6-8. Use clear, vivid language with a few delicious new words, sentences up to 16 words, light suspense resolved kindly.",
    "big-kid": "Listeners are 9-11. Richer vocabulary, playful humour, a real problem to solve and a satisfying twist. Keep it wholesome.",
}

MOOD_GUIDE = {
    "cozy": "Cozy bedtime mood: soft, warm, slow. The ending winds down towards sleep.",
    "adventure": "Adventure mood: brave, curious, energetic, with a clear goal and a triumphant finish.",
    "silly": "Silly mood: playful, surprising, giggle-worthy wordplay and gentle slapstick. Never mean-spirited.",
    "curious": "Learn-and-wonder mood: weave in 2-3 true, age-appropriate facts about the world naturally through the plot.",
}

DIRECTOR_SYSTEM = """You are the head storyteller at Storyloom, writing original picture-book stories that a family
reads together on their TV. The family has each contributed a "thread" (a hero, a world, a spark). Your job is to weave
ALL of their threads into one delightful story so every contributor recognises their idea.

Craft rules:
- Write for reading aloud: rhythm, concrete images, a little onomatopoeia, dialogue in quotes.
- Every page moves the story forward. No filler, no moralising lectures.
- The hero solves problems with kindness, curiosity, courage or cleverness, never with violence.
- The choice must be a genuine fork: both options are good, fun and lead to different scenes.
- Both branches must flow naturally into the shared ending page.
- Keep the hero's look, name and personality identical on every page.

Safety rules (non-negotiable, this is for children):
- No violence, weapons, injury, death, scary monsters, romance, bullying, body-shaming, brands, or real people.
- If a thread mentions a famous character, film, game or brand, invent an ORIGINAL character inspired by the idea
  instead (never use trademarked names or look-alikes).
- If a thread is unsafe or unclear, gently reinterpret it into something wholesome that keeps the child's intent.

Illustration briefs describe only visuals (characters, action, setting, light, framing). Never ask for words,
letters, captions, speech bubbles or signs inside pictures."""


def director_prompt(*, hero: dict, world: dict, spark: dict | None, mood: str, age_band: str, length: str,
                    gentle: bool, contributors: list[dict], memory: list[str]) -> str:
    who = {c["id"]: c["name"] for c in contributors}
    by = lambda t: who.get((t or {}).get("by"), "the family")  # noqa: E731
    counts = {"short": (3, 2), "medium": (4, 3)}[length if length in ("short", "medium") else "short"]
    lines = [
        f"Hero thread (from {by(hero)}): {hero.get('name') or 'unnamed'} - {hero.get('description') or ''}",
        f"World thread (from {by(world)}): {world.get('text')}",
        f"Spark thread (from {by(spark)}): {spark.get('text')}" if spark and spark.get("text") else
        "Spark thread: none given - invent a gentle, surprising problem or wish that fits the world.",
        "",
        AGE_GUIDE.get(age_band, AGE_GUIDE["kid"]),
        MOOD_GUIDE.get(mood, MOOD_GUIDE["cozy"]),
        "Gentle mode is ON: absolutely no villains, danger or sadness beyond a tiny worry." if gentle else
        "Gentle mode is off: mild, quickly-resolved suspense is fine.",
        "",
        f"Structure: exactly {counts[0]} opening pages, then the choice, then exactly {counts[1]} pages in branch A and "
        f"exactly {counts[1]} pages in branch B, then 1 shared ending page. Each page 30-60 words.",
    ]
    if memory:
        lines += ["", "What this family's past stories remember (use lightly for continuity, e.g. a friend returning):"]
        lines += [f"- {m}" for m in memory[:6]]
    lines += ["", "Now write the story plan."]
    return "\n".join(lines)


HERO_SYSTEM = """You look at a photo a child took of their own drawing and describe the character they drew so a
picture-book illustrator can bring it to life faithfully. Respect the child's design choices exactly (colours, number of
eyes or legs, accessories), just describe them clearly. Be warm and never critical. If the photo is not a drawing,
say so in the flags."""
