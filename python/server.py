"""Private service entrypoint. Queue subscribers are registered at build time."""
from fastapi import FastAPI

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


@app.get("/health")
def health():
    return {"service": "property-processing", "status": "ready"}
