"""Prompt templates for the SPICE model calls."""

from pathlib import Path

_DIR = Path(__file__).parent


def load(name: str) -> str:
    return (_DIR / f"{name}.md").read_text(encoding="utf-8")


SYSTEM = load("system")
SUGGEST = load("suggest")
FOLLOWUP = load("followup")
