"""Native private Vercel Queue subscriber. No public HTTP endpoint."""
import asyncio
import uuid

from vercel.queue import Message, Topic, subscribe

from .description_adapter import JobStore, generate
from .descriptions import process_job

topic = Topic[dict[str, str]]("property-descriptions")


# Delivery retries can include a busy lease; database provider attempts stay <= 3.
@subscribe(topic=topic, max_attempts=20, max_concurrency=2, retry_after=60)
async def describe_property(message: Message[dict[str, str]]):
    payload = message.payload
    if not isinstance(payload, dict) or set(payload) != {"jobId"}:
        return
    try:
        job_id = str(uuid.UUID(payload["jobId"]))
    except (ValueError, TypeError, AttributeError):
        return
    await asyncio.to_thread(process_job, job_id, JobStore(), generate)
