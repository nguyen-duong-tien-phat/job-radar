from pathlib import Path

import httpx

from jobradar.extract.salary import parse_salary
from jobradar.http import HttpClient
from jobradar.sources import ALL_SOURCES, get_sources
from jobradar.sources.arbeitnow import ArbeitnowSource
from jobradar.sources.hn_hiring import HNHiringSource
from jobradar.sources.weworkremotely import WeWorkRemotelySource

FIXTURES = Path(__file__).parent / "fixtures"


def _client(routes: dict[str, str]) -> HttpClient:
    """MockTransport that serves fixture files by URL path."""

    def handler(request: httpx.Request) -> httpx.Response:
        for path, filename in routes.items():
            if request.url.path == path:
                return httpx.Response(200, content=(FIXTURES / filename).read_bytes())
        return httpx.Response(404)

    return HttpClient(transport=httpx.MockTransport(handler), min_interval=0, sleep=lambda _: None)


def test_registry_has_unique_names_and_valid_regions():
    names = [s.name for s in ALL_SOURCES]
    assert len(names) == len(set(names))
    assert all(s.region in ("vn", "intl") for s in ALL_SOURCES)
    assert [s.name for s in get_sources(["arbeitnow"])] == ["arbeitnow"]


def test_weworkremotely_parses_items_and_dedupes_across_feeds():
    client = _client(
        {
            "/categories/remote-programming-jobs.rss": "weworkremotely_sample.xml",
            "/categories/remote-devops-sysadmin-jobs.rss": "weworkremotely_sample.xml",
        }
    )
    jobs = list(WeWorkRemotelySource().fetch(client))
    assert len(jobs) == 3  # same 3 items served by both feeds
    first = jobs[0]
    assert first.company == "OpenTrain AI"
    assert first.title == "Full-Stack Engineer"
    assert first.url == "https://weworkremotely.com/remote-jobs/opentrain-ai-full-stack-engineer"
    assert first.external_id == "opentrain-ai-full-stack-engineer"
    assert first.location == "Anywhere in the World"
    assert first.tags == ["Full-Stack Programming"]
    assert first.posted_at.startswith("2026-11-06T20:13:18")
    assert "<p>" in first.description_html  # HTML is decoded from the escaped XML text


def test_arbeitnow_maps_fields_and_unescapes_html():
    jobs = list(ArbeitnowSource().fetch(_client({"/api/job-board-api": "arbeitnow_sample.json"})))
    assert len(jobs) == 6
    for job in jobs:
        assert job.region == "intl"
        assert job.url.startswith("https://www.arbeitnow.com/")
        assert job.external_id
        assert job.posted_at
        assert "&lt;" not in (job.description_html or "")
    assert ArbeitnowSource.require_skills is True


def test_hn_hiring_uses_latest_thread_and_skips_non_postings():
    client = _client(
        {
            "/api/v1/search_by_date": "hn_search_sample.json",
            "/api/v1/items/50338728": "hn_item_sample.json",
        }
    )
    jobs = list(HNHiringSource().fetch(client))
    assert len(jobs) == 5  # the sixth comment has no "|" header
    first = jobs[0]
    assert first.company == "Simple Analytics"
    assert first.title == "DevOps Engineer"
    assert first.url == "https://news.ycombinator.com/item?id=50338732"
    assert first.external_id == "50338732"
    assert first.salary_text is not None  # header contains "€5,000/month"
    parsed = parse_salary(first.salary_text)
    assert (parsed.currency, parsed.min, parsed.period) == ("EUR", 5000, "month")
