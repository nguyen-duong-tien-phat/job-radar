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


def _streaming_client(chunks: list[bytes], consumed: list[int], status: int = 200):
    def body():
        for i, chunk in enumerate(chunks):
            consumed.append(i)
            yield chunk

    transport = httpx.MockTransport(lambda request: httpx.Response(status, content=body()))
    return HttpClient(transport=transport, sleep=lambda _: None, min_interval=0, retries=1)


def test_get_prefix_stops_reading_after_the_end_marker():
    consumed: list[int] = []
    chunks = [b"<html>", b'<script id="data">{"a":1}</script>', b"x" * 1000, b"y" * 1000]
    client = _streaming_client(chunks, consumed)

    text = client.get_prefix("https://example.com/p", start='id="data"', end="</script>")

    assert '{"a":1}' in text
    assert consumed == [0, 1]  # the two large trailing chunks were never read


def test_get_prefix_stops_at_max_bytes_without_marker():
    consumed: list[int] = []
    client = _streaming_client([b"a" * 600] * 5, consumed)

    text = client.get_prefix("https://example.com/p", start="nope", end="nope", max_bytes=1000)

    assert len(text) == 1200
    assert consumed == [0, 1]


def test_get_prefix_does_not_retry_403():
    consumed: list[int] = []
    client = _streaming_client([b"blocked"], consumed, status=403)

    with pytest.raises(httpx.HTTPStatusError):
        client.get_prefix("https://example.com/p", start="a", end="b")
