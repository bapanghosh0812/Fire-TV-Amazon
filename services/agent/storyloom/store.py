"""DynamoDB + S3 persistence for rooms, heroes and stories."""

import datetime as dt
from decimal import Decimal

from .config import bucket, client, table


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def put_media(key: str, data: bytes, content_type: str) -> str:
    client("s3").put_object(Bucket=bucket(), Key=key, Body=data, ContentType=content_type, CacheControl="private, max-age=31536000, immutable")
    return key


def get_media(key: str) -> bytes:
    return client("s3").get_object(Bucket=bucket(), Key=key)["Body"].read()


def get_room(room_id: str) -> dict | None:
    return table().get_item(Key={"pk": f"ROOM#{room_id}", "sk": "META"}).get("Item")


def set_room_thread(room_id: str, thread: dict) -> None:
    table().update_item(
        Key={"pk": f"ROOM#{room_id}", "sk": "META"},
        UpdateExpression="SET threads.#k = :t",
        ConditionExpression="attribute_exists(pk)",
        ExpressionAttributeNames={"#k": thread["kind"]},
        ExpressionAttributeValues={":t": _ddb(thread)},
    )


def save_story(household_id: str, story: dict) -> None:
    t = table()
    item = _ddb(story)
    t.put_item(Item={"pk": f"STORY#{story['id']}", "sk": "META", "householdId": household_id, **item})
    t.put_item(Item={
        "pk": f"HH#{household_id}",
        "sk": f"STORY#{story['createdAt']}#{story['id']}",
        **{k: item.get(k) for k in ("id", "title", "summary", "coverKey", "palette", "mood", "createdAt", "status", "contributors") if item.get(k) is not None},
        "heroName": story["hero"]["name"],
    })


def save_character(household_id: str, hero: dict) -> None:
    table().put_item(Item={"pk": f"HH#{household_id}", "sk": f"CHAR#{hero['id']}", **_ddb(hero), "createdAt": now()})


def _ddb(value):
    """Floats aren't allowed in DynamoDB; convert recursively."""
    if isinstance(value, float):
        return Decimal(str(round(value, 4)))
    if isinstance(value, dict):
        return {k: _ddb(v) for k, v in value.items() if v is not None}
    if isinstance(value, list):
        return [_ddb(v) for v in value]
    return value
