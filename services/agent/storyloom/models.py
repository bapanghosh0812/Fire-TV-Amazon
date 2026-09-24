from pydantic import BaseModel, Field


class PagePlan(BaseModel):
    text: str = Field(description="What the narrator reads on this page: 2-4 short sentences, read-aloud friendly.")
    scene: str = Field(
        description="Illustration brief for this page: who is in it, what they are doing, the setting, time of day, mood "
        "and camera framing. Never describe text, letters or signs in the picture."
    )


class ChoicePlan(BaseModel):
    prompt: str = Field(description="The question the family votes on, e.g. 'How should Luna bring the light back?'")
    option_a: str = Field(description="First option, 3-7 words, starts with a verb.")
    option_b: str = Field(description="Second option, 3-7 words, starts with a verb, clearly different from A.")
    scene_a: str = Field(description="Illustration brief for option A.")
    scene_b: str = Field(description="Illustration brief for option B.")


class StoryPlan(BaseModel):
    title: str = Field(description="Warm, memorable title, max 8 words, includes the hero's name.")
    summary: str = Field(description="One-sentence bookshelf blurb, max 22 words.")
    hero_name: str
    hero_look: str = Field(
        description="Precise, reusable visual description of the hero (species/body, colours, clothing, distinctive "
        "features) so every illustration shows the same character. Max 45 words."
    )
    art_style: str = Field(description="One consistent picture-book art style for every page, max 25 words.")
    palette: list[str] = Field(description="Exactly 5 hex colours for the story's mood: sky top, sky bottom, glow, land near, land far.")
    opening: list[PagePlan] = Field(description="Pages before the family's choice.")
    choice: ChoicePlan
    branch_a: list[PagePlan] = Field(description="Pages that follow if the family picks option A.")
    branch_b: list[PagePlan] = Field(description="Pages that follow if the family picks option B.")
    ending: PagePlan = Field(description="Shared final page that works after either branch and gently closes the story.")
    lesson: str = Field(description="The quiet takeaway in 6-12 words, e.g. 'Small hands can make big light'.")


class HeroSheet(BaseModel):
    is_drawing: bool = Field(description="True if the photo shows a hand-made drawing, painting or craft.")
    looks_like_real_person: bool = Field(description="True if the photo mainly shows a real human (not a drawing).")
    suggested_name: str = Field(description="A friendly name for the character if none was given, max 2 words.")
    description: str = Field(description="Kid-friendly one-line description of the hero, max 16 words, e.g. 'a purple dragon with a crooked crown'.")
    visual_prompt: str = Field(
        description="Detailed visual description for an illustrator that preserves the child's design: body shape, "
        "colours, number of legs/eyes, accessories, expression. Max 60 words."
    )
