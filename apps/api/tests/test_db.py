"""Tests for the db module."""

import pytest

from spice.db import (
    combo_exists,
    get_cached_generation,
    get_feedback_breakdown,
    make_combo_hash,
    record_combo,
    record_cooked,
    record_feedback,
    reserve_llm_call,
    store_generation,
)


def test_make_combo_hash_is_deterministic():
    sig1, h1 = make_combo_hash(["b", "a"], "umami")
    sig2, h2 = make_combo_hash(["a", "b"], "umami")
    assert sig1 == sig2
    assert h1 == h2


def test_make_combo_hash_normalizes_case_and_whitespace():
    """Case and surrounding whitespace must not fragment a combo."""
    sig1, h1 = make_combo_hash(["  Onion ", "EGG"], "umami")
    _sig2, h2 = make_combo_hash(["egg", "onion"], "umami")
    assert sig1 == "egg,onion|umami"
    assert h1 == h2


def test_make_combo_hash_collapses_internal_whitespace():
    sig, _ = make_combo_hash(["spring   onions"], None)
    assert sig == "spring onions|none"


def test_generation_cache_round_trip():
    assert get_cached_generation("cache_key_a") is None
    store_generation("cache_key_a", '{"title": "cached"}')
    assert get_cached_generation("cache_key_a") == '{"title": "cached"}'


def test_generation_cache_upserts():
    store_generation("cache_key_b", '{"v": 1}')
    store_generation("cache_key_b", '{"v": 2}')
    assert get_cached_generation("cache_key_b") == '{"v": 2}'


def test_make_combo_hash_sorts_ingredients():
    sig, _ = make_combo_hash(["onion", "garlic", "egg"], None)
    assert sig == "egg,garlic,onion|none"


def test_make_combo_hash_includes_flavour_mode():
    _, h1 = make_combo_hash(["rice"], "umami")
    _, h2 = make_combo_hash(["rice"], "bold_spicy")
    assert h1 != h2


def test_make_combo_hash_none_flavour():
    sig, _ = make_combo_hash(["rice"], None)
    assert sig.endswith("|none")


def test_record_combo_returns_cooked_count_not_requests():
    _, h = make_combo_hash(["db_test_x", "db_test_y"], "test_mode")
    assert record_combo("db_test_x,db_test_y|test_mode", h) == 0
    assert record_combo("db_test_x,db_test_y|test_mode", h) == 0
    assert record_cooked(h) == 1
    assert record_combo("db_test_x,db_test_y|test_mode", h) == 1


def test_reserve_llm_call_enforces_daily_cap():
    from spice.db import _get_conn, _lock

    with _lock:
        _get_conn().execute("DELETE FROM usage")
    assert reserve_llm_call(2) is True
    assert reserve_llm_call(2) is True
    assert reserve_llm_call(2) is False
    assert reserve_llm_call(0) is True  # 0 disables the cap


def test_combo_exists_after_record():
    _, h = make_combo_hash(["exists_a", "exists_b"], None)
    assert combo_exists(h) is False
    record_combo("exists_a,exists_b|none", h)
    assert combo_exists(h) is True


def test_feedback_breakdown_empty():
    _, h = make_combo_hash(["no_feedback_a"], None)
    record_combo("no_feedback_a|none", h)
    breakdown, total = get_feedback_breakdown(h)
    assert total == 0
    assert breakdown == {}


def test_feedback_breakdown_percentages():
    _, h = make_combo_hash(["fb_pct_a", "fb_pct_b"], None)
    record_combo("fb_pct_a,fb_pct_b|none", h)

    record_feedback(h, "perfect")
    record_feedback(h, "perfect")
    record_feedback(h, "perfect")
    record_feedback(h, "too_bland")

    breakdown, total = get_feedback_breakdown(h)
    assert total == 4
    assert breakdown["perfect"] == 75
    assert breakdown["too_bland"] == 25


def test_record_feedback_for_nonexistent_combo_raises():
    """Feedback for a combo that doesn't exist should fail with FK constraint."""
    import hashlib
    import sqlite3

    h = hashlib.sha256(b"nonexistent_fk_test").hexdigest()
    with pytest.raises(sqlite3.IntegrityError):
        record_feedback(h, "perfect")
