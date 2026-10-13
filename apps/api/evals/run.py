"""Run the SPICE eval set against the configured model.

    cd apps/api
    OPENAI_API_KEY=... PYTHONPATH="../../packages:." python3 -m evals.run [--min-pass 0.9] [--only NAME] [--report out.json]

Each case goes through the same pipeline as production (prompt, strict
schema, sanitize, checks), bypassing the cache and the daily budget.
Exits non-zero when the share of fully-passing cases is below --min-pass.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path

# Isolated, cache-free run: nothing touches the real DB or budget.
os.environ["DB_PATH"] = ":memory:"
os.environ["GENERATION_CACHE_TTL_DAYS"] = "0"
os.environ["DAILY_LLM_CAP"] = "0"

from shared.schemas import SuggestRequest

from evals.scoring import score
from spice import engine, llm
from spice.db import init_db

CASES = Path(__file__).with_name("cases.json")


async def run_case(case: dict) -> dict:
    req = SuggestRequest.model_validate(case["request"])
    started = time.monotonic()
    try:
        resp = await engine.run_to_response(engine.prepare_suggest(req))
    except engine.GenerationError as exc:
        return {
            "name": case["name"],
            "passed": False,
            "error": exc.message,
            "results": [],
        }
    results = score(case, resp)
    return {
        "name": case["name"],
        "passed": all(r.passed for r in results),
        "seconds": round(time.monotonic() - started, 1),
        "title": resp.title or resp.rejection,
        "results": [r.__dict__ for r in results],
    }


async def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--min-pass", type=float, default=0.9)
    parser.add_argument("--only", action="append", default=[])
    parser.add_argument("--report", type=Path)
    parser.add_argument("--concurrency", type=int, default=4)
    args = parser.parse_args()

    if not llm.is_live():
        print("OPENAI_API_KEY is not set; evals need a real model.", file=sys.stderr)
        return 2

    init_db()
    cases = [
        c
        for c in json.loads(CASES.read_text())
        if not args.only or c["name"] in args.only
    ]
    sem = asyncio.Semaphore(args.concurrency)

    async def guarded(case: dict) -> dict:
        async with sem:
            return await run_case(case)

    outcomes = await asyncio.gather(*(guarded(c) for c in cases))

    print(f"model: {llm.model_name()}\n")
    for o in outcomes:
        mark = "PASS" if o["passed"] else "FAIL"
        print(
            f"{mark}  {o['name']:<30} {o.get('seconds', '-')}s  {o.get('title') or o.get('error', '')}"
        )
        for r in o["results"]:
            if not r["passed"]:
                print(f"        ✗ {r['name']}: {r['detail']}")

    rate = sum(o["passed"] for o in outcomes) / max(len(outcomes), 1)
    print(
        f"\n{sum(o['passed'] for o in outcomes)}/{len(outcomes)} cases passed ({rate:.0%}); threshold {args.min_pass:.0%}"
    )
    if args.report:
        args.report.write_text(
            json.dumps(
                {"model": llm.model_name(), "pass_rate": rate, "cases": outcomes},
                indent=2,
            )
        )
    return 0 if rate >= args.min_pass else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
