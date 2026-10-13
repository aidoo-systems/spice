"""Tests for the rate limiter and client IP resolution."""

import time

from starlette.requests import Request

from spice.rate_limit import RateLimiter, client_ip


def _req(headers: dict[str, str], peer: str = "9.9.9.9") -> Request:
    return Request(
        {
            "type": "http",
            "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
            "client": (peer, 1234),
        }
    )


def test_allows_requests_under_limit():
    rl = RateLimiter(3, 60)
    assert all(rl.check("ip") for _ in range(3))


def test_blocks_at_limit():
    rl = RateLimiter(3, 60)
    for _ in range(3):
        rl.check("ip")
    assert rl.check("ip") is False


def test_different_ips_have_separate_limits():
    rl = RateLimiter(1, 60)
    assert rl.check("a") is True
    assert rl.check("b") is True
    assert rl.check("a") is False


def test_expired_entries_are_pruned(monkeypatch):
    rl = RateLimiter(1, 60)
    now = time.time()
    monkeypatch.setattr(time, "time", lambda: now)
    assert rl.check("ip") is True
    assert rl.check("ip") is False
    monkeypatch.setattr(time, "time", lambda: now + 61)
    assert rl.check("ip") is True


def test_cleanup_removes_stale_ips(monkeypatch):
    rl = RateLimiter(5, 60)
    now = time.time()
    monkeypatch.setattr(time, "time", lambda: now)
    rl.check("stale")
    monkeypatch.setattr(time, "time", lambda: now + 400)
    rl.check("fresh")
    assert "stale" not in rl._store
    assert "fresh" in rl._store


def test_info_returns_config():
    assert RateLimiter(7, 30).info() == {"max_requests": 7, "window_seconds": 30}


def test_client_ip_uses_rightmost_forwarded_entry(monkeypatch):
    monkeypatch.delenv("CLIENT_IP_HEADER", raising=False)
    monkeypatch.setenv("TRUSTED_PROXY_HOPS", "1")
    assert client_ip(_req({"X-Forwarded-For": "6.6.6.6, 5.5.5.5"})) == "5.5.5.5"


def test_client_ip_respects_hop_count(monkeypatch):
    monkeypatch.delenv("CLIENT_IP_HEADER", raising=False)
    monkeypatch.setenv("TRUSTED_PROXY_HOPS", "2")
    assert (
        client_ip(_req({"X-Forwarded-For": "6.6.6.6, 5.5.5.5, 4.4.4.4"})) == "5.5.5.5"
    )


def test_client_ip_zero_hops_ignores_header(monkeypatch):
    monkeypatch.delenv("CLIENT_IP_HEADER", raising=False)
    monkeypatch.setenv("TRUSTED_PROXY_HOPS", "0")
    assert client_ip(_req({"X-Forwarded-For": "6.6.6.6"})) == "9.9.9.9"


def test_client_ip_header_override(monkeypatch):
    monkeypatch.setenv("CLIENT_IP_HEADER", "cf-connecting-ip")
    assert (
        client_ip(_req({"CF-Connecting-IP": "3.3.3.3", "X-Forwarded-For": "1.1.1.1"}))
        == "3.3.3.3"
    )


def test_client_ip_falls_back_to_peer(monkeypatch):
    monkeypatch.delenv("CLIENT_IP_HEADER", raising=False)
    assert client_ip(_req({})) == "9.9.9.9"
