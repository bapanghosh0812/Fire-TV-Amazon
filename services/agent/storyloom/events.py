"""Streams progress to everyone in the room over the API Gateway WebSocket."""

import json
import logging

from boto3.dynamodb.conditions import Key

from .config import client, env, table

log = logging.getLogger(__name__)


class Room:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self._api = client("apigatewaymanagementapi", endpoint_url=env("WS_ENDPOINT"))

    def _connections(self) -> list[dict]:
        r = table().query(KeyConditionExpression=Key("pk").eq(f"ROOM#{self.room_id}") & Key("sk").begins_with("CONN#"))
        return r.get("Items", [])

    def emit(self, event: dict, only: str | None = None) -> None:
        data = json.dumps(event, default=str).encode()
        for conn in self._connections():
            if only and conn.get("role") != only:
                continue
            try:
                self._api.post_to_connection(ConnectionId=conn["connectionId"], Data=data)
            except self._api.exceptions.GoneException:
                t = table()
                t.delete_item(Key={"pk": f"CONN#{conn['connectionId']}", "sk": "CONN"})
                t.delete_item(Key={"pk": f"ROOM#{self.room_id}", "sk": f"CONN#{conn['connectionId']}"})
            except Exception as e:  # never let a flaky socket break the story
                log.warning("emit failed: %s", e)

    def progress(self, story_id: str, stage: str, message: str, pct: float) -> None:
        self.emit({"type": "weave.progress", "storyId": story_id, "stage": stage, "message": message, "pct": round(pct, 3)})
