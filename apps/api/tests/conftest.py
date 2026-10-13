"""Test configuration — initialise in-memory DB before any test runs."""

import os
import sys

sys.path.insert(
    0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "packages")
)

# Use in-memory SQLite for tests (fast, isolated)
os.environ["DB_PATH"] = ":memory:"

# Ensure tests use mock responses (no real OpenAI calls).
# Must be set before imports AND after, because load_dotenv() in
# openai_service.py re-loads from .env at import time.
os.environ.pop("OPENAI_API_KEY", None)

# Mock plans stream instantly in tests.
os.environ["MOCK_STREAM_DELAY"] = "0"

import spice.llm as _llm
from spice.db import init_db

# Re-clear after imports (load_dotenv may have restored it)
os.environ.pop("OPENAI_API_KEY", None)
_llm._client = None

# Initialise once per test session
init_db()
