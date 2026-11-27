"""Shared HTTP client for all sources: per-host rate limiting and retry with backoff.

The User-Agent is never changed to evade blocking. 4xx responses (except 429) are not
retried, since they signal a block or a bad request, and retrying only makes it worse.
"""

from __future__ import annotations

import time
from collections.abc import Callable

import httpx

USER_AGENT = "job-radar/0.1"
RETRY_STATUS = frozenset({429, 500, 502, 503, 504})


class HostRateLimiter:
    """Enforces a minimum interval between two requests to the same host."""

    def __init__(
        self,
        min_interval: float = 1.0,
        *,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self._min_interval = min_interval
        self._clock = clock
        self._sleep = sleep
        self._last: dict[str, float] = {}

    def wait(self, host: str) -> None:
        now = self._clock()
        last = self._last.get(host)
        if last is not None:
            elapsed = now - last
            if elapsed < self._min_interval:
                self._sleep(self._min_interval - elapsed)
                now = self._clock()
        self._last[host] = now


def _read_until(resp: httpx.Response, start: str, end: str, max_bytes: int) -> str:
    start_b, end_b = start.encode(), end.encode()
    buffer = b""
    for chunk in resp.iter_bytes():
        buffer += chunk
        found = buffer.find(start_b)
        if (found >= 0 and buffer.find(end_b, found) >= 0) or len(buffer) >= max_bytes:
            break
    return buffer.decode("utf-8", errors="replace")


class HttpClient:
    def __init__(
        self,
        *,
        min_interval: float = 1.0,
        timeout: float = 20.0,
        retries: int = 3,
        backoff: float = 2.0,
        transport: httpx.BaseTransport | None = None,
        sleep: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._client = httpx.Client(
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json, application/rss+xml, text/html;q=0.9, */*;q=0.8",
            },
            timeout=timeout,
            follow_redirects=True,
            transport=transport,
        )
        self._limiter = HostRateLimiter(min_interval, clock=clock, sleep=sleep)
        self._retries = retries
        self._backoff = backoff
        self._sleep = sleep

    def get(self, url: str, **kwargs: object) -> httpx.Response:
        host = httpx.URL(url).host
        last_error: Exception | None = None
        for attempt in range(self._retries + 1):
            self._limiter.wait(host)
            try:
                resp = self._client.get(url, **kwargs)  # type: ignore[arg-type]
            except httpx.TransportError as exc:
                last_error = exc
            else:
                if resp.status_code not in RETRY_STATUS:
                    resp.raise_for_status()  # non-429 4xx raises immediately, no retry
                    return resp
                last_error = httpx.HTTPStatusError(
                    f"HTTP {resp.status_code} from {host}",
                    request=resp.request,
                    response=resp,
                )
            if attempt < self._retries:
                self._sleep(self._backoff**attempt)
        assert last_error is not None
        raise last_error

    def get_prefix(
        self, url: str, *, start: str, end: str, max_bytes: int = 400_000, **kwargs: object
    ) -> str:
        """GET a page but stop reading once `end` appears after `start`.

        For heavy pages whose useful data sits near the top (a 1.5 MB page with a 4 KB JSON-LD
        block): only the needed prefix is downloaded. Reading also stops at `max_bytes`.
        Same rate limit, retry and error rules as `get`.
        """
        host = httpx.URL(url).host
        last_error: Exception | None = None
        for attempt in range(self._retries + 1):
            self._limiter.wait(host)
            try:
                with self._client.stream("GET", url, **kwargs) as resp:  # type: ignore[arg-type]
                    if resp.status_code not in RETRY_STATUS:
                        resp.raise_for_status()
                        return _read_until(resp, start, end, max_bytes)
                    last_error = httpx.HTTPStatusError(
                        f"HTTP {resp.status_code} from {host}",
                        request=resp.request,
                        response=resp,
                    )
            except httpx.TransportError as exc:
                last_error = exc
            if attempt < self._retries:
                self._sleep(self._backoff**attempt)
        assert last_error is not None
        raise last_error

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> HttpClient:
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()
