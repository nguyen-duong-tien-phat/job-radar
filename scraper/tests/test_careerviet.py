from pathlib import Path

import httpx
import pytest

from jobradar.extract.skills import SkillExtractor
from jobradar.http import HttpClient
from jobradar.normalize import normalize
from jobradar.sources.careerviet import (
    CareerVietSource,
    extract_job_posting,
    extract_vi_job_urls,
    looks_technical,
)

FIXTURES = Path(__file__).parent / "fixtures"
SITEMAP = (FIXTURES / "careerviet_sitemap_sample.xml").read_bytes()
PAGES = {  # job id in the URL -> fixture file
    "35C8F0A9": "careerviet_job_range.html",
    "35C8F08D": "careerviet_job_competitive.html",
    "35C8F0D3": "careerviet_job_smallrange.html",
}


def _client(blocked: set[str] | None = None) -> HttpClient:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/sitemap/job_current_date.xml":
            return httpx.Response(200, content=SITEMAP)
        for job_id, filename in PAGES.items():
            if job_id in request.url.path:
                if blocked and job_id in blocked:
                    return httpx.Response(403)
                return httpx.Response(200, content=(FIXTURES / filename).read_bytes())
        return httpx.Response(404)

    transport = httpx.MockTransport(handler)
    return HttpClient(transport=transport, min_interval=0, sleep=lambda _: None)


@pytest.fixture(scope="module")
def jobs():
    return {job.external_id: job for job in CareerVietSource().fetch(_client())}


def test_sitemap_keeps_only_vietnamese_job_urls():
    urls = extract_vi_job_urls(SITEMAP)
    assert len(urls) == 5  # 3 technical + 2 accounting; the English twin is dropped
    assert all("/vi/tim-viec-lam/" in u for u in urls)


def test_slug_filter_selects_technical_titles_only():
    assert looks_technical("https://careerviet.vn/vi/tim-viec-lam/workday-developer.35C8F08D.html")
    assert looks_technical("https://careerviet.vn/vi/tim-viec-lam/senior-qa-engineer.35C8F0A1.html")
    assert not looks_technical("https://careerviet.vn/vi/tim-viec-lam/ke-toan-thanh-toan.35C8F0A5.html")
    # "it" must be a whole word, not part of another word
    assert not looks_technical("https://careerviet.vn/vi/tim-viec-lam/nhan-vien-kinh-doanh.35C8F0A6.html")


def test_extract_job_posting_returns_none_without_schema():
    assert extract_job_posting("<html><body>nothing</body></html>") is None
    broken = '<script id="job-posting-schema" type="application/ld+json">{oops</script>'
    assert extract_job_posting(broken) is None


def test_fetches_only_technical_candidates(jobs):
    assert set(jobs) == {"35C8F0A9", "35C8F08D", "35C8F0D3"}  # accounting jobs never requested


def test_structured_salary_range(jobs):
    job = jobs["35C8F0A9"]
    assert job.source == "careerviet"
    assert job.region == "vn"
    assert job.title == "Garment Technical Designer (TD)"
    assert job.url.startswith("https://careerviet.vn/vi/tim-viec-lam/")
    assert (job.salary_min, job.salary_max) == (10_000_000, 30_000_000)
    assert (job.salary_currency, job.salary_period) == ("VND", "month")
    assert job.posted_at.startswith("2026-11-27")
    assert "Garment Technical Designer TD" in job.tags


def test_competitive_salary_is_empty_even_though_the_site_sets_a_currency(jobs):
    job = jobs["35C8F08D"]
    assert job.title == "Workday Developer"
    assert (job.salary_min, job.salary_max) == (None, None)
    assert job.salary_currency is None  # the page says USD, but no amount was given
    assert job.salary_period is None
    assert job.salary_text is None  # "Cạnh tranh" has no digits


def test_small_range_keeps_the_pages_currency(jobs):
    job = jobs["35C8F0D3"]
    assert (job.salary_min, job.salary_max) == (1000, 1300)
    assert job.salary_currency == "USD"


def test_a_blocked_job_page_is_skipped_not_fatal():
    result = list(CareerVietSource().fetch(_client(blocked={"35C8F0A9"})))
    assert {job.external_id for job in result} == {"35C8F08D", "35C8F0D3"}


def test_only_jobs_with_known_skills_survive_require_skills(jobs):
    assert CareerVietSource.require_skills is True
    extractor = SkillExtractor.from_yaml()
    with_skills = [j for j in jobs.values() if normalize(j, extractor).skills]
    assert len(with_skills) < len(jobs)  # the garment designer has no tech skill


def test_job_location_given_as_a_list_uses_the_first_place():
    posting = {
        "title": "Backend Developer",
        "hiringOrganization": {"name": "Acme"},
        "jobLocation": [
            {"address": {"addressRegion": "Hà Nội"}},
            {"address": {"addressRegion": "Hồ Chí Minh"}},
        ],
        "baseSalary": [{"currency": "VND", "value": {"minValue": 15_000_000, "unitText": "MONTH"}}],
    }
    url = "https://careerviet.vn/vi/tim-viec-lam/x.35C8F0AA.html"
    job = CareerVietSource()._to_raw(url, posting)
    assert job.location == "Hà Nội"
    assert job.company == "Acme"
    assert (job.salary_min, job.salary_currency, job.salary_period) == (15_000_000, "VND", "month")


def test_a_malformed_posting_is_skipped_not_fatal(monkeypatch):
    original = CareerVietSource._to_raw

    def explode_once(self, url, posting):
        if "35C8F0A9" in url:
            raise TypeError("boom")
        return original(self, url, posting)

    monkeypatch.setattr(CareerVietSource, "_to_raw", explode_once)
    result = list(CareerVietSource().fetch(_client()))
    assert {job.external_id for job in result} == {"35C8F08D", "35C8F0D3"}
