"""The Guardian: every word a child will hear passes Amazon Bedrock Guardrails."""

import logging
import os

from .config import client
from .models import StoryPlan

log = logging.getLogger(__name__)


def _texts(plan: StoryPlan) -> list[str]:
    pages = plan.opening + plan.branch_a + plan.branch_b + [plan.ending]
    return (
        [plan.title, plan.summary, plan.choice.prompt, plan.choice.option_a, plan.choice.option_b]
        + [p.text for p in pages]
    )


def check_text(text: str, source: str = "OUTPUT") -> tuple[bool, str | None]:
    guardrail_id = os.environ.get("GUARDRAIL_ID")
    if not guardrail_id or not text.strip():
        return True, None
    r = client("bedrock-runtime").apply_guardrail(
        guardrailIdentifier=guardrail_id,
        guardrailVersion=os.environ.get("GUARDRAIL_VERSION", "DRAFT"),
        source=source,
        content=[{"text": {"text": text}}],
    )
    if r.get("action") == "GUARDRAIL_INTERVENED":
        return False, text
    return True, None


def review(plan: StoryPlan) -> list[str]:
    """Returns the passages that were blocked (empty list = safe)."""
    issues: list[str] = []
    for t in _texts(plan):
        ok, bad = check_text(t)
        if not ok and bad:
            issues.append(bad[:200])
    if issues:
        log.info("guardian flagged %d passages", len(issues))
    return issues
