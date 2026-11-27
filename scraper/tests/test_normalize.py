from datetime import UTC, datetime

import pytest

from jobradar.extract.skills import SkillExtractor
from jobradar.models import RawJob
from jobradar.normalize import (
    canonical_url,
    html_to_text,
    make_dedupe_key,
    normalize,
    parse_posted_at,
)


@pytest.fixture(scope="module")
def extractor() -> SkillExtractor:
    return SkillExtractor.from_yaml()


def _raw(**overrides) -> RawJob:
    base = {
        "source": "demo",
        "region": "intl",
        "url": "https://example.com/jobs/1",
        "title": "Backend Engineer",
        "company": "Acme",
        "external_id": "1",
    }
    return RawJob(**{**base, **overrides})


def test_dedupe_key_is_stable_and_source_specific():
    key = make_dedupe_key("demo", "1", "https://example.com/a")
    assert key == make_dedupe_key("demo", "1", "https://other.example/b")  # id wins over url
    assert key != make_dedupe_key("other", "1", "https://example.com/a")
    assert key != make_dedupe_key("demo", "2", "https://example.com/a")
    assert len(key) == 64


def test_dedupe_key_falls_back_to_canonical_url():
    a = make_dedupe_key("demo", None, "https://Example.com/jobs/1/#apply")
    b = make_dedupe_key("demo", None, "https://example.com/jobs/1")
    assert a == b
    assert a != make_dedupe_key("demo", None, "https://example.com/jobs/2")


def test_canonical_url_keeps_query_and_drops_fragment():
    assert canonical_url("HTTPS://Example.com/Jobs/?id=7#top") == "https://example.com/Jobs?id=7"


def test_html_to_text_strips_tags_and_entities():
    assert html_to_text("<p>C&amp;C <b>Python</b></p>").split() == ["C&C", "Python"]
    assert html_to_text(None) == ""


def test_parse_posted_at():
    expected = datetime(2026, 11, 26, 6, 40, 33, tzinfo=UTC)
    assert parse_posted_at("2026-11-26T06:40:33+00:00") == expected
    assert parse_posted_at("2026-11-26T06:40:33") == expected
    assert parse_posted_at("not a date") is None
    assert parse_posted_at(None) is None


def test_skills_come_from_title_tags_and_description(extractor):
    job = normalize(
        _raw(
            title="Senior Python Engineer",
            tags=["docker"],
            description_html="<p>We run on <b>Kubernetes</b> and PostgreSQL.</p>",
        ),
        extractor,
    )
    assert set(job.skills) == {"python", "docker", "kubernetes", "postgresql"}


def test_structured_salary_is_kept(extractor):
    job = normalize(
        _raw(salary_min=80_000, salary_max=90_000, salary_currency="USD", salary_period="year"),
        extractor,
    )
    assert (job.salary_min, job.salary_max, job.salary_currency, job.salary_period) == (
        80_000,
        90_000,
        "USD",
        "year",
    )


def test_salary_text_is_parsed_when_structured_fields_are_empty(extractor):
    job = normalize(_raw(region="vn", salary_text="25-35 triệu"), extractor)
    assert (job.salary_min, job.salary_max) == (25e6, 35e6)
    assert (job.salary_currency, job.salary_period) == ("VND", "month")
    assert job.salary_raw == "25-35 triệu"


def test_structured_salary_wins_over_text(extractor):
    job = normalize(
        _raw(
            salary_min=100_000,
            salary_max=120_000,
            salary_currency="USD",
            salary_period="year",
            salary_text="$1 - $2",
        ),
        extractor,
    )
    assert job.salary_min == 100_000


def test_unparseable_salary_text_leaves_salary_empty(extractor):
    job = normalize(_raw(salary_text="Negotiable"), extractor)
    assert job.salary_min is None
    assert job.salary_currency is None
    assert job.salary_raw == "Negotiable"
