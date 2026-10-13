"""SQLite persistence for anonymous combo tracking and community feedback."""

import hashlib
import os
import sqlite3
import threading

_DB_PATH = os.environ.get(
    "DB_PATH", os.path.join(os.path.dirname(__file__), "data", "spice.db")
)
_conn: sqlite3.Connection | None = None
_lock = threading.Lock()


def init_db() -> None:
    """Create tables (idempotent) and enable WAL mode."""
    global _conn
    if _DB_PATH != ":memory:":
        os.makedirs(os.path.dirname(_DB_PATH), exist_ok=True)
    _conn = sqlite3.connect(_DB_PATH, check_same_thread=False)
    _conn.execute("PRAGMA foreign_keys=ON")
    _conn.execute("PRAGMA journal_mode=WAL")
    _conn.executescript("""
        CREATE TABLE IF NOT EXISTS combos (
            combo_hash   TEXT PRIMARY KEY,
            combo_sig    TEXT NOT NULL,
            hit_count    INTEGER NOT NULL DEFAULT 0,
            cooked_count INTEGER NOT NULL DEFAULT 0,
            created_at   TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_combos_hit_count ON combos(hit_count DESC);

        CREATE TABLE IF NOT EXISTS feedback (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            combo_hash    TEXT NOT NULL REFERENCES combos(combo_hash),
            feedback_type TEXT NOT NULL CHECK(feedback_type IN ('too_salty','too_bland','perfect','needs_spice')),
            created_at    TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_feedback_combo ON feedback(combo_hash);

        CREATE TABLE IF NOT EXISTS generations (
            cache_key     TEXT PRIMARY KEY,
            response_json TEXT NOT NULL,
            created_at    TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS usage (
            day        TEXT PRIMARY KEY,
            llm_calls  INTEGER NOT NULL DEFAULT 0
        );
    """)
    # Migrate pre-0.8 databases: hit_count used to be shown as "people cooked
    # this", but it counts generation requests. cooked_count starts honest at 0.
    cols = {r[1] for r in _conn.execute("PRAGMA table_info(combos)").fetchall()}
    if "cooked_count" not in cols:
        _conn.execute(
            "ALTER TABLE combos ADD COLUMN cooked_count INTEGER NOT NULL DEFAULT 0"
        )
    _conn.commit()


def close_db() -> None:
    """Close the database connection."""
    global _conn
    if _conn is not None:
        _conn.close()
        _conn = None


def _get_conn() -> sqlite3.Connection:
    if _conn is None:
        raise RuntimeError("Database not initialised — call init_db() first")
    return _conn


def normalize_ingredient(name: str) -> str:
    """Lowercase, trim, and collapse internal whitespace.

    Must stay in lockstep with the frontend `normalizeIngredient` in
    lib/feedback.ts so combo signatures match across client and server.
    """
    return " ".join(name.strip().lower().split())


def make_combo_hash(
    ingredients: list[str], flavour_mode: str | None
) -> tuple[str, str]:
    """Return (combo_sig, combo_hash). Matches frontend makeSignature exactly."""
    normalized = sorted(normalize_ingredient(i) for i in ingredients)
    sig = ",".join(normalized) + "|" + (flavour_mode or "none")
    h = hashlib.sha256(sig.encode()).hexdigest()
    return sig, h


def record_combo(combo_sig: str, combo_hash: str) -> int:
    """Upsert combo, bump its request counter (internal analytics only), and
    return the cooked_count — the number users actually see."""
    conn = _get_conn()
    with _lock:
        conn.execute(
            """INSERT INTO combos (combo_hash, combo_sig, hit_count)
               VALUES (?, ?, 1)
               ON CONFLICT(combo_hash) DO UPDATE
               SET hit_count = hit_count + 1, updated_at = datetime('now')""",
            (combo_hash, combo_sig),
        )
        conn.commit()
        row = conn.execute(
            "SELECT cooked_count FROM combos WHERE combo_hash = ?", (combo_hash,)
        ).fetchone()
    return row[0] if row else 0


def record_cooked(combo_hash: str) -> int:
    """Increment and return cooked_count for an existing combo."""
    conn = _get_conn()
    with _lock:
        conn.execute(
            "UPDATE combos SET cooked_count = cooked_count + 1, updated_at = datetime('now') WHERE combo_hash = ?",
            (combo_hash,),
        )
        conn.commit()
        row = conn.execute(
            "SELECT cooked_count FROM combos WHERE combo_hash = ?", (combo_hash,)
        ).fetchone()
    return row[0] if row else 0


def combo_exists(combo_hash: str) -> bool:
    conn = _get_conn()
    with _lock:
        row = conn.execute(
            "SELECT 1 FROM combos WHERE combo_hash = ?", (combo_hash,)
        ).fetchone()
    return row is not None


def record_feedback(combo_hash: str, feedback_type: str) -> None:
    conn = _get_conn()
    with _lock:
        conn.execute(
            "INSERT INTO feedback (combo_hash, feedback_type) VALUES (?, ?)",
            (combo_hash, feedback_type),
        )
        conn.commit()


def get_feedback_breakdown(combo_hash: str) -> tuple[dict[str, int], int]:
    """Return (percentage_dict, total_count) for a combo's feedback."""
    conn = _get_conn()
    with _lock:
        rows = conn.execute(
            "SELECT feedback_type, COUNT(*) FROM feedback WHERE combo_hash = ? GROUP BY feedback_type",
            (combo_hash,),
        ).fetchall()
    total = sum(r[1] for r in rows)
    if total == 0:
        return {}, 0
    breakdown = {r[0]: round(r[1] / total * 100) for r in rows}
    return breakdown, total


_CACHE_TTL_DAYS = int(os.environ.get("GENERATION_CACHE_TTL_DAYS", "30"))


def get_cached_generation(cache_key: str) -> str | None:
    """Return a stored generation JSON blob younger than the TTL, or None."""
    conn = _get_conn()
    with _lock:
        row = conn.execute(
            "SELECT response_json FROM generations WHERE cache_key = ? AND created_at > datetime('now', ?)",
            (cache_key, f"-{_CACHE_TTL_DAYS} days"),
        ).fetchone()
    return row[0] if row else None


def store_generation(cache_key: str, response_json: str) -> None:
    """Persist a generation JSON blob under its full-request cache key."""
    conn = _get_conn()
    with _lock:
        conn.execute(
            """INSERT INTO generations (cache_key, response_json)
               VALUES (?, ?)
               ON CONFLICT(cache_key) DO UPDATE
               SET response_json = excluded.response_json, created_at = datetime('now')""",
            (cache_key, response_json),
        )
        conn.commit()


def reserve_llm_call(daily_cap: int) -> bool:
    """Count one live model call against today's budget.

    Returns False (and counts nothing) once the cap is reached, so a leaked
    URL or a scripted client can't run up an unbounded bill. 0 disables it.
    """
    conn = _get_conn()
    with _lock:
        row = conn.execute(
            "SELECT llm_calls FROM usage WHERE day = date('now')"
        ).fetchone()
        used = row[0] if row else 0
        if daily_cap > 0 and used >= daily_cap:
            return False
        conn.execute(
            """INSERT INTO usage (day, llm_calls) VALUES (date('now'), 1)
               ON CONFLICT(day) DO UPDATE SET llm_calls = llm_calls + 1"""
        )
        conn.commit()
    return True
