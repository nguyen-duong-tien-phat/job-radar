import gzip
import re
from pathlib import Path

import httpx
import pytest

from jobradar.extract.skills import SkillExtractor
from jobradar.http import HttpClient
from jobradar.normalize import normalize
from jobradar.sources.careerlink import CareerLinkSource, pick_tech_jobs
from jobradar.sources.jobposting import sitemap_locs

FIXTURES = Path(__file__).parent / "fixtures"
SITEMAP1 = (FIXTURES / "careerlink_sitemap1.xml").read_bytes()
SITEMAP2_GZ = (FIXTURES / "careerlink_sitemap2.xml.gz").read_bytes()
PAGES = {
    "3678271": "careerlink_job_3.html",
    "2190997": "careerlink_job_2.html",
    "1638290": "careerlink_job_1.html",
}


def _client(blocked: set[str] | None = None) -> HttpClient:
    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path == "/sitemaps/sitemap.xml.gz":
            return httpx.Response(200, content=(FIXTURES / "careerlink_index.xml").read_bytes())
        if path == "/sitemaps/sitemap1.xml.gz":
            return httpx.Response(200, content=SITEMAP1)  # served as plain XML
        if path == "/sitemaps/sitemap2.xml.gz":
            return httpx.Response(200, content=SITEMAP2_GZ)  # really gzipped
        job_id = path.rsplit("/", 1)[-1]
        if job_id in PAGES:
            if blocked and job_id in blocked:
                return httpx.Response(403)
            return httpx.Response(200, content=(FIXTURES / PAGES[job_id]).read_bytes())
        return httpx.Response(404)

    transport = httpx.MockTransport(handler)
    return HttpClient(transport=transport, min_interval=0, sleep=lambda _: None)


@pytest.fixture(scope="module")
def jobs():
    return {job.external_id: job for job in CareerLinkSource().fetch(_client())}


def test_sitemap_locs_reads_plain_and_gzipped_sitemaps():
    plain = sitemap_locs(SITEMAP1)
    zipped = sitemap_locs(SITEMAP2_GZ)
    assert plain == sitemap_locs(gzip.compress(SITEMAP1))
    assert "https://www.careerlink.vn" in plain
    assert zipped and all(u.startswith("https://www.careerlink.vn/tim-viec-lam/") for u in zipped)


def test_pick_tech_jobs_filters_sorts_and_dedupes():
    urls = sitemap_locs(SITEMAP1) + sitemap_locs(SITEMAP2_GZ)
    picked = pick_tech_jobs(urls)
    ids = [int(u.rsplit("/", 1)[-1]) for u in picked]
    assert ids == sorted(set(ids), reverse=True)  # newest first, no duplicates
    assert len(ids) == len(set(ids)) == 3
    assert all("/en/" not in u for u in picked)  # English duplicates are ignored


def test_pick_tech_jobs_respects_the_limit():
    urls = sitemap_locs(SITEMAP1) + sitemap_locs(SITEMAP2_GZ)
    assert len(pick_tech_jobs(urls, limit=1)) == 1


def test_fetches_each_technical_job_once(jobs):
    assert set(jobs) == set(PAGES)  # the id in sitemap1 and sitemap2 is fetched once


def test_salary_with_both_ends(jobs):
    job = jobs["3678271"]
    assert (job.salary_min, job.salary_max) == (7_000_000, 13_000_000)
    assert (job.salary_currency, job.salary_period) == ("VND", "month")
    assert job.source == "careerlink"
    assert job.region == "vn"
    assert job.location == "Hồ Chí Minh"
    assert job.posted_at == "2026-11-13"


def test_salary_with_only_a_minimum(jobs):
    job = jobs["2190997"]
    assert (job.salary_min, job.salary_max) == (60_000_000, None)


def test_anonymous_employer_is_stored_with_an_empty_company(jobs):
    job = jobs["1638290"]
    assert job.company == ""
    assert "CareerLink's Client" not in job.company


def test_mislabelled_vnd_salary_is_discarded_during_normalization(jobs):
    # The site says "1,500-2,500 VND" for this senior role; normalization drops it.
    raw = jobs["1638290"]
    assert (raw.salary_min, raw.salary_max, raw.salary_currency) == (1500, 2500, "VND")
    normalized = normalize(raw, SkillExtractor.from_yaml())
    assert normalized.salary_min is None
    assert normalized.dup_key is None  # no company, so it is never merged with other postings


def test_a_blocked_page_is_skipped_not_fatal():
    result = list(CareerLinkSource().fetch(_client(blocked={"3678271"})))
    assert {j.external_id for j in result} == {"2190997", "1638290"}


def test_ids_in_pages_dict_are_all_numeric():
    assert all(re.fullmatch(r"\d+", key) for key in PAGES)


def test_stops_asking_when_the_site_stops_serving_job_data(monkeypatch):
    """After a throttled burst the real site returned an empty shell page for every job."""
    requested: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path == "/sitemaps/sitemap.xml.gz":
            return httpx.Response(200, content=(FIXTURES / "careerlink_index.xml").read_bytes())
        if path == "/sitemaps/sitemap1.xml.gz":
            return httpx.Response(200, content=SITEMAP1)
        if path == "/sitemaps/sitemap2.xml.gz":
            return httpx.Response(200, content=SITEMAP2_GZ)
        requested.append(path)
        return httpx.Response(200, text="<html><title>CareerLink</title></html>")

    from jobradar.sources import careerlink

    many = [
        f"https://www.careerlink.vn/tim-viec-lam/backend-developer-{i}/{3_000_000 + i}"
        for i in range(30)
    ]
    monkeypatch.setattr(careerlink, "pick_tech_jobs", lambda urls, limit=0: many)
    transport = httpx.MockTransport(handler)
    client = HttpClient(transport=transport, min_interval=0, sleep=lambda _: None)
    assert list(CareerLinkSource().fetch(client)) == []

    assert len(requested) == careerlink.MAX_CONSECUTIVE_MISSING  # stopped, did not hit all 30


def test_careerlink_is_paced_more_slowly_than_the_default():
    assert CareerLinkSource.min_interval >= 2.0
