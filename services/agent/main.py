"""Storyloom agent entrypoint on Amazon Bedrock AgentCore Runtime.

Each invocation is acknowledged immediately; the work continues in a tracked
background task (AgentCore reports the session as busy until it finishes),
while progress streams to the family's TV and phones over WebSocket.
"""

import logging
import threading

from bedrock_agentcore import BedrockAgentCoreApp

from storyloom import hero, weave

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("storyloom")

app = BedrockAgentCoreApp()

TASKS = {"hero": hero.run, "weave": weave.run}


@app.entrypoint
def invoke(payload: dict, context=None) -> dict:
    task = payload.get("task")
    run = TASKS.get(task)
    if not run:
        return {"accepted": False, "error": f"unknown task {task!r}"}

    task_id = app.add_async_task(task, {"room": payload.get("roomId"), "story": payload.get("storyId")})

    def work():
        try:
            run(payload)
        except Exception:
            log.exception("task %s crashed", task)
        finally:
            app.complete_async_task(task_id)

    threading.Thread(target=work, name=f"storyloom-{task}", daemon=True).start()
    return {"accepted": True, "task": task}


if __name__ == "__main__":
    app.run()
