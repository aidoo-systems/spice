"""SPICE API – FastAPI application."""

import logging
import os
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from spice.db import close_db, init_db
from spice.routes import router

__version__ = "0.9.0"

log_level = os.environ.get("LOG_LEVEL", "info").upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("spice")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Database initialised")
    yield
    close_db()
    logger.info("Database connection closed")


app = FastAPI(title="SPICE API", version=__version__, lifespan=lifespan)

# CORS — restrict in production via CORS_ORIGINS env var
_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3737").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "version": __version__}


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = uuid.uuid4().hex[:8]
    request.state.request_id = request_id
    start = time.time()
    response = await call_next(request)
    elapsed = round((time.time() - start) * 1000)
    logger.info(
        "req=%s method=%s path=%s status=%s ms=%d",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        elapsed,
    )
    return response


app.include_router(router, prefix="/v1")
