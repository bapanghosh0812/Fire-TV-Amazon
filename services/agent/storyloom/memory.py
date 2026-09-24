"""Family memory on Amazon Bedrock AgentCore Memory.

Each household is an actor. After every story we record what happened; the
semantic strategy distils lasting facts ("Luna is Mia's purple dragon") that
the Director recalls next time, so the family's story world grows over time.
"""

import logging
import os

log = logging.getLogger(__name__)
_client = None


def _mem():
    global _client
    memory_id = os.environ.get("MEMORY_ID")
    if not memory_id:
        return None, None
    if _client is None:
        from bedrock_agentcore.memory import MemoryClient

        _client = MemoryClient(region_name=os.environ.get("AWS_REGION", "us-east-1"))
    return _client, memory_id


def recall(household_id: str, query: str, k: int = 5) -> list[str]:
    client, memory_id = _mem()
    if not client:
        return []
    try:
        records = client.retrieve_memories(memory_id=memory_id, namespace=f"/families/{household_id}/facts", query=query, top_k=k)
        return [r.get("content", {}).get("text", "") for r in records if r.get("content", {}).get("text")]
    except Exception as e:  # memory must never block a bedtime story
        log.warning("memory recall failed: %s", e)
        return []


def remember(household_id: str, story_id: str, text: str) -> None:
    client, memory_id = _mem()
    if not client:
        return
    try:
        client.create_event(memory_id=memory_id, actor_id=household_id, session_id=story_id, messages=[(text, "USER")])
    except Exception as e:
        log.warning("memory save failed: %s", e)
