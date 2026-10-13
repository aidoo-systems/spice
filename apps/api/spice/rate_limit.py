"""In-memory per-IP sliding-window rate limiting, plus client IP resolution."""

import os
import threading
import time

from fastapi import Request

_CLEANUP_INTERVAL = 300  # purge stale IPs every 5 minutes
_MAX_STORE_SIZE = 10000  # cap to prevent unbounded memory growth


class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._store: dict[str, list[float]] = {}
        self._lock = threading.Lock()
        self._last_cleanup = 0.0

    def check(self, ip: str) -> bool:
        """Return True if the request is allowed, False if rate-limited."""
        now = time.time()
        cutoff = now - self.window_seconds

        with self._lock:
            if (
                now - self._last_cleanup > _CLEANUP_INTERVAL
                or len(self._store) > _MAX_STORE_SIZE
            ):
                stale = [k for k, v in self._store.items() if not v or v[-1] <= cutoff]
                for k in stale:
                    del self._store[k]
                if len(self._store) > _MAX_STORE_SIZE:
                    by_age = sorted(
                        self._store.items(), key=lambda kv: kv[1][-1] if kv[1] else 0
                    )
                    for k, _ in by_age[: len(self._store) - _MAX_STORE_SIZE]:
                        del self._store[k]
                self._last_cleanup = now

            timestamps = [t for t in self._store.get(ip, []) if t > cutoff]
            if len(timestamps) >= self.max_requests:
                self._store[ip] = timestamps
                return False

            timestamps.append(now)
            self._store[ip] = timestamps
            return True

    def reset(self) -> None:
        with self._lock:
            self._store.clear()

    def info(self) -> dict:
        return {
            "max_requests": self.max_requests,
            "window_seconds": self.window_seconds,
        }


# Generations (suggest + follow-up) cost money; feedback/cooked votes are cheap
# but shape the public community numbers, so both are limited.
suggest_limiter = RateLimiter(
    int(os.environ.get("RATE_LIMIT_MAX", "20")),
    int(os.environ.get("RATE_LIMIT_WINDOW", "3600")),
)
vote_limiter = RateLimiter(
    int(os.environ.get("VOTE_RATE_LIMIT_MAX", "60")),
    int(os.environ.get("VOTE_RATE_LIMIT_WINDOW", "3600")),
)


def client_ip(request: Request) -> str:
    """Resolve the real client IP without trusting client-supplied headers.

    - CLIENT_IP_HEADER (e.g. ``cf-connecting-ip``, ``x-real-ip``): use this
      header verbatim. Only set it when your edge proxy overwrites it.
    - Otherwise X-Forwarded-For is read from the *right*: each trusted proxy
      appends the address it saw, so the entry TRUSTED_PROXY_HOPS from the end
      was written by our own edge proxy. Anything to its left is whatever the
      client sent and is ignored. TRUSTED_PROXY_HOPS=0 ignores the header.
    """
    header = os.environ.get("CLIENT_IP_HEADER", "").strip().lower()
    if header:
        value = request.headers.get(header, "").strip()
        if value:
            return value

    hops = int(os.environ.get("TRUSTED_PROXY_HOPS", "1"))
    forwarded = request.headers.get("x-forwarded-for")
    if hops > 0 and forwarded:
        chain = [p.strip() for p in forwarded.split(",") if p.strip()]
        if chain:
            return chain[-hops] if len(chain) >= hops else chain[0]
    return request.client.host if request.client else "unknown"
