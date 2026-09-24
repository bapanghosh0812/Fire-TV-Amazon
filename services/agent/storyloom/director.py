"""The Director agent plans the whole story (with the fork) as structured output."""

import logging

from strands import Agent
from strands.models import BedrockModel

from .config import REGION, TEXT_MODEL
from .models import StoryPlan
from .prompts import DIRECTOR_SYSTEM, director_prompt

log = logging.getLogger(__name__)


def _agent(temperature: float = 0.8) -> Agent:
    model = BedrockModel(model_id=TEXT_MODEL, region_name=REGION, temperature=temperature, max_tokens=6000)
    return Agent(model=model, system_prompt=DIRECTOR_SYSTEM, callback_handler=None, name="director")


def plan_story(**kwargs) -> StoryPlan:
    prompt = director_prompt(**kwargs)
    result = _agent()(prompt, structured_output_model=StoryPlan)
    plan: StoryPlan = result.structured_output
    return _normalise(plan)


def revise_story(plan: StoryPlan, issues: list[str], **kwargs) -> StoryPlan:
    """Self-correction loop: the Guardian's findings go back to the Director."""
    prompt = (
        director_prompt(**kwargs)
        + "\n\nA safety reviewer flagged these passages in your previous draft. Rewrite the whole plan so none of them "
        "remain, keeping everything else the family loved:\n"
        + "\n".join(f"- {i}" for i in issues)
        + "\n\nPrevious draft:\n"
        + plan.model_dump_json()
    )
    result = _agent(temperature=0.6)(prompt, structured_output_model=StoryPlan)
    return _normalise(result.structured_output)


def _normalise(plan: StoryPlan) -> StoryPlan:
    # Guard against off-by-one structures and malformed colours from the model.
    palette = [c if isinstance(c, str) and c.startswith("#") and len(c) in (4, 7) else "#2A2163" for c in plan.palette]
    while len(palette) < 5:
        palette.append(["#141045", "#5B3E8F", "#FFD98A", "#2A2163", "#120D33"][len(palette)])
    plan.palette = palette[:5]
    n = max(1, min(len(plan.branch_a), len(plan.branch_b)))
    plan.branch_a = plan.branch_a[:n]
    plan.branch_b = plan.branch_b[:n]
    plan.opening = plan.opening[:5]
    return plan
