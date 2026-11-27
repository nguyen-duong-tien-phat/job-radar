from pathlib import Path

import httpx

from jobradar.http import HttpClient
from jobradar.sources.remoteok import API_URL, RemoteOKSource

FIXTURE = Path(__file__).parent / "fixtures" / "remoteok_sample.json"


def _client() -> HttpClient:
    payload = FIXTURE.read_bytes()

    def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == API_URL
        return httpx.Response(200, content=payload, headers={"content-type": "application/json"})

    return HttpClient(transport=httpx.MockTransport(handler), sleep=lambda _: None, min_interval=0)


def test_skips_legal_header_and_parses_jobs():
    jobs = list(RemoteOKSource().fetch(_client()))
    # Fixture: 1 legal header item + 5 jobs
    assert len(jobs) == 5


def test_maps_fields_and_keeps_attribution_url():
    job = next(iter(RemoteOKSource().fetch(_client())))
    assert job.source == "remoteok"
    assert job.region == "intl"
    assert job.url.startswith("https://remoteOK.com/remote-jobs/")
    assert job.external_id is not None and job.external_id.isdigit()
    assert job.title
    assert job.company
    assert job.raw["id"] == job.external_id


def test_salary_is_annual_usd_when_present():
    jobs = list(RemoteOKSource().fetch(_client()))
    with_salary = [j for j in jobs if j.salary_min is not None]
    assert with_salary, "fixture must contain a job with salary"
    for job in with_salary:
        assert job.salary_currency == "USD"
        assert job.salary_period == "year"
        assert job.salary_min > 0


def test_zero_salary_becomes_none():
    jobs = list(RemoteOKSource().fetch(_client()))
    without_salary = [j for j in jobs if j.salary_min is None]
    assert without_salary, "fixture must contain a job without salary"
    for job in without_salary:
        assert job.salary_max is None
        assert job.salary_currency is None
        assert job.salary_period is None
