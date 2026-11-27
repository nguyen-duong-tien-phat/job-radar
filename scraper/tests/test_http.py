import httpx
import pytest

from jobradar.http import HostRateLimiter, HttpClient


def _client(handler, *, retries=3, sleeps=None):
    return HttpClient(
        transport=httpx.MockTransport(handler),
        sleep=(sleeps.append if sleeps is not None else (lambda _: None)),
        min_interval=0,
        backoff=2.0,
        retries=retries,
    )


def test_retries_503_then_succeeds_with_backoff():
    calls = []
    sleeps: list[float] = []

    def handler(request):
        calls.append(1)
        return httpx.Response(503) if len(calls) < 3 else httpx.Response(200, text="ok")

    resp = _client(handler, sleeps=sleeps).get("https://example.com/x")
    assert resp.text == "ok"
    assert len(calls) == 3
    assert sleeps == [1.0, 2.0]  # backoff**0, backoff**1


def test_retries_transport_error():
    calls = []

    def handler(request):
        calls.append(1)
        if len(calls) == 1:
            raise httpx.ConnectError("boom")
        return httpx.Response(200, text="ok")

    assert _client(handler).get("https://example.com/x").text == "ok"
    assert len(calls) == 2


def test_403_is_not_retried():
    calls = []

    def handler(request):
        calls.append(1)
        return httpx.Response(403)

    with pytest.raises(httpx.HTTPStatusError):
        _client(handler).get("https://example.com/x")
    assert len(calls) == 1


def test_gives_up_after_retries_exhausted():
    calls = []

    def handler(request):
        calls.append(1)
        return httpx.Response(503)

    with pytest.raises(httpx.HTTPStatusError):
        _client(handler, retries=2).get("https://example.com/x")
    assert len(calls) == 3  # first attempt + 2 retries


def test_rate_limit_waits_only_for_same_host():
    now = [0.0]
    sleeps: list[float] = []
    limiter = HostRateLimiter(1.0, clock=lambda: now[0], sleep=sleeps.append)

    limiter.wait("a.com")  # first request: no wait
    now[0] = 0.4
    limiter.wait("a.com")  # 0.6s still needed to reach 1s
    limiter.wait("b.com")  # different host: no wait

    assert sleeps == pytest.approx([0.6])
