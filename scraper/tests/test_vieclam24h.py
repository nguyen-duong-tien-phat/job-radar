import re
from pathlib import Path

import httpx
import pytest

from jobradar.http import HttpClient
from jobradar.sources.vieclam24h import Vieclam24hSource, category_of, job_id, pick_it_jobs

FIXTURES = Path(__file__).parent / "fixtures"
JOBS_XML = (FIXTURES / "vieclam24h_jobs.xml").read_text(encoding="utf-8")
ALL_URLS = re.findall(r"<loc>([^<]+)</loc>", JOBS_XML)
IT_URLS = pick_it_jobs(ALL_URLS)  # newest first: job_1, job_2, job_3 fixtures
PAGE_BY_ID = {job_id(url): f"vieclam24h_job_{i}.html" for i, url in enumerate(IT_URLS, 1)}


def _client(blocked: set[int] | None = None) -> HttpClient:
    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path == "/file/sitemap/sitemap-index.xml":
            return httpx.Response(200, content=(FIXTURES / "vieclam24h_index.xml").read_bytes())
        if path == "/file/sitemap/daily/job-0.xml":
            return httpx.Response(200, content=(FIXTURES / "vieclam24h_joblist.xml").read_bytes())
        if path == "/file/sitemap/job/tintuyendung-0.xml":
            return httpx.Response(200, content=JOBS_XML.encode())
        found = re.search(r"id(\d+)\.html$", path)
        if found and int(found.group(1)) in PAGE_BY_ID:
            # The real site answers 403 to page requests that prefer JSON over HTML
            if "json" in request.headers.get("accept", "").split(",")[0]:
                return httpx.Response(403)
            if blocked and int(found.group(1)) in blocked:
                return httpx.Response(403)
            page = (FIXTURES / PAGE_BY_ID[int(found.group(1))]).read_bytes()
            return httpx.Response(200, content=page)
        return httpx.Response(404)

    transport = httpx.MockTransport(handler)
    return HttpClient(transport=transport, min_interval=0, sleep=lambda _: None)


@pytest.fixture(scope="module")
def jobs():
    return {job.external_id: job for job in Vieclam24hSource().fetch(_client())}


def test_pick_it_jobs_keeps_it_categories_newest_first_without_duplicates():
    assert len(ALL_URLS) == 6  # 2 other industries + 3 IT + 1 duplicate
    assert len(IT_URLS) == 3
    assert all(category_of(u) in ("it-phan-mem", "it-phan-cung-mang") for u in IT_URLS)
    assert [job_id(u) for u in IT_URLS] == sorted((job_id(u) for u in IT_URLS), reverse=True)


def test_pick_it_jobs_respects_the_limit():
    assert len(pick_it_jobs(ALL_URLS, limit=2)) == 2


def test_fetches_every_it_job_page(jobs):
    assert set(jobs) == {str(job_id(u)) for u in IT_URLS}


def test_page_requests_ask_for_html(jobs):
    # The mock returns 403 when Accept prefers JSON, so getting jobs back proves HTML was asked.
    assert len(jobs) == 3


def test_salary_range_and_fields(jobs):
    job = next(j for j in jobs.values() if j.title == "Chuyên Gia IT Và Chuyển Đổi Số")
    assert job.source == "vieclam24h"
    assert job.region == "vn"
    assert job.url.startswith("https://vieclam24h.vn/it-phan-mem/")
    assert (job.salary_min, job.salary_max) == (10_000_000, 15_000_000)
    assert (job.salary_currency, job.salary_period) == ("VND", "month")
    assert job.company
    assert job.location
    assert job.posted_at == "2026-11-03"


def test_negotiable_salary_has_no_amounts(jobs):
    job = next(j for j in jobs.values() if j.title.startswith("Nhân Viên IT Helpdesk"))
    assert (job.salary_min, job.salary_max, job.salary_text) == (None, None, None)


def test_a_blocked_page_is_skipped_not_fatal():
    blocked = {job_id(IT_URLS[0])}
    result = list(Vieclam24hSource().fetch(_client(blocked=blocked)))
    assert {j.external_id for j in result} == {str(job_id(u)) for u in IT_URLS[1:]}


def test_stops_asking_when_pages_have_no_job_data(monkeypatch):
    from jobradar.sources import vieclam24h

    requested: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path == "/file/sitemap/sitemap-index.xml":
            return httpx.Response(200, content=(FIXTURES / "vieclam24h_index.xml").read_bytes())
        if path == "/file/sitemap/daily/job-0.xml":
            return httpx.Response(200, content=(FIXTURES / "vieclam24h_joblist.xml").read_bytes())
        if path == "/file/sitemap/job/tintuyendung-0.xml":
            return httpx.Response(200, content=JOBS_XML.encode())
        requested.append(path)
        return httpx.Response(200, text="<html><title>empty</title></html>")

    many = [f"https://vieclam24h.vn/it-phan-mem/job-{i}-c1p1id{900 + i}.html" for i in range(30)]
    monkeypatch.setattr(vieclam24h, "pick_it_jobs", lambda urls, limit=0: many)
    transport = httpx.MockTransport(handler)
    client = HttpClient(transport=transport, min_interval=0, sleep=lambda _: None)

    assert list(Vieclam24hSource().fetch(client)) == []
    assert len(requested) == vieclam24h.MAX_CONSECUTIVE_MISSING
