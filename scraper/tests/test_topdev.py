from pathlib import Path

import httpx
import pytest

from jobradar.extract.skills import SkillExtractor
from jobradar.http import HttpClient
from jobradar.normalize import normalize
from jobradar.sources.topdev import TopDevSource, extract_job_links, extract_job_posting

FIXTURES = Path(__file__).parent / "fixtures"
LISTING = (FIXTURES / "topdev_listing_sample.html").read_text(encoding="utf-8")
DETAIL_FILES = ["negotiable", "range", "minonly"]  # same order as the links in the listing


def _http(handler) -> HttpClient:
    transport = httpx.MockTransport(handler)
    return HttpClient(transport=transport, min_interval=0, sleep=lambda _: None)


def _client() -> HttpClient:
    paths = extract_job_links(LISTING)
    by_path = {
        path: FIXTURES / f"topdev_detail_{name}.html"
        for path, name in zip(paths, DETAIL_FILES, strict=True)
    }

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/jobs/search":
            return httpx.Response(200, text=LISTING)
        if request.url.path in by_path:
            return httpx.Response(200, text=by_path[request.url.path].read_text(encoding="utf-8"))
        return httpx.Response(404)

    return _http(handler)


@pytest.fixture(scope="module")
def jobs():
    return list(TopDevSource().fetch(_client()))


def test_extract_job_links_drops_query_and_non_job_links():
    links = extract_job_links(LISTING)
    assert len(links) == 3
    assert all(link.startswith("/detail-jobs/") and "?" not in link for link in links)


def test_extract_job_posting_returns_none_without_json_ld():
    assert extract_job_posting("<html><body>nothing</body></html>") is None


def test_listing_pages_are_deduplicated(jobs):
    # The mock serves the same listing for every request, so many listings still give 3 jobs
    assert len(jobs) == 3


def test_range_salary_is_structured(jobs):
    job = jobs[1]
    assert job.source == "topdev"
    assert job.region == "vn"
    assert job.title.startswith("Agentic Engineer")
    assert job.company == "MBBANK"
    assert job.external_id == "2148851"
    assert job.url.startswith("https://topdev.vn/detail-jobs/")
    assert (job.salary_min, job.salary_max) == (20_000_000, 50_000_000)
    assert (job.salary_currency, job.salary_period) == ("VND", "month")
    assert "Python" in job.tags
    assert job.posted_at == "2026-11-27"


def test_negotiable_salary_is_empty(jobs):
    job = jobs[0]
    assert (job.salary_min, job.salary_max) == (None, None)
    assert (job.salary_currency, job.salary_period) == (None, None)


def test_minimum_only_salary(jobs):
    job = jobs[2]
    assert (job.salary_min, job.salary_max) == (6_000_000, None)
    assert (job.salary_currency, job.salary_period) == ("VND", "month")


def test_source_requires_skills_and_drops_non_it_job(jobs):
    assert TopDevSource.require_skills is True
    extractor = SkillExtractor.from_yaml()
    normalized = [normalize(job, extractor) for job in jobs]
    assert normalized[1].skills  # the backend engineer posting has known skills
    assert normalized[2].skills == []  # milk-tea shop staff: filtered out by run.py


def test_a_failing_detail_page_is_skipped_not_fatal():
    paths = extract_job_links(LISTING)

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/jobs/search":
            return httpx.Response(200, text=LISTING)
        if request.url.path == paths[1]:
            page = (FIXTURES / "topdev_detail_range.html").read_text(encoding="utf-8")
            return httpx.Response(200, text=page)
        return httpx.Response(403)  # other pages blocked: must not abort the whole source

    result = list(TopDevSource().fetch(_http(handler)))
    assert [job.external_id for job in result] == ["2148851"]
