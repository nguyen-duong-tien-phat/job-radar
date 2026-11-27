"""CareerViet (Vietnam): today's jobs from the public sitemap, schema.org JobPosting JSON-LD.

robots.txt lists `sitemap/sitemap.xml`, which links `job_current_date.xml` (today's postings,
Vietnamese and English URL for each). The site's terms have not been reviewed yet, so review
them before scheduling (docs/sources.md).

Each job page is about 1.5 MB, but the JSON-LD block sits in the first ~100 KB, so pages are
read with `get_prefix` and the download stops right after it. The sitemap mixes every
industry; two filters keep requests down and data relevant: a keyword filter on the URL slug
(before any page is fetched, so recall is limited to titles that look technical) and
`require_skills` (after parsing, so only postings with a known skill are saved).
"""

from __future__ import annotations

import json
import logging
import re
from collections.abc import Iterable
from typing import Any

import httpx
from defusedxml import ElementTree

from jobradar.http import HttpClient
from jobradar.models import RawJob
from jobradar.sources.base import Source

log = logging.getLogger("jobradar.careerviet")

SITEMAP_URL = "https://careerviet.vn/sitemap/job_current_date.xml"
MAX_JOBS = 120  # upper bound on page requests per run (about 12 MB with get_prefix)

_SCHEMA_START = 'id="job-posting-schema"'
_SCHEMA = re.compile(
    r'<script id="job-posting-schema" type="application/ld\+json">(.*?)</script>', re.DOTALL
)
_JOB_ID = re.compile(r"\.([0-9A-Fa-f]+)\.html$")
_UNIT_TO_PERIOD = {"YEAR": "year", "MONTH": "month", "HOUR": "hour"}

# Words in a URL slug (hyphen separated) that suggest a technical job. Deliberately broad:
# false positives cost one request and are dropped later by `require_skills`.
_IT_WORDS = (
    "developer|dev|engineer|programmer|lap-trinh|it|cntt|devops|data|qa|tester|test|automation|"
    "java|python|php|net|dotnet|react|reactjs|node|nodejs|angular|vue|android|ios|mobile|flutter|"
    "frontend|front|backend|back|fullstack|full|software|phan-mem|he-thong|system|network|mang|"
    "security|bao-mat|cyber|ai|ml|machine|cloud|aws|azure|database|dba|sql|golang|embedded|"
    "firmware|sap|erp|odoo|salesforce|ba|analyst|technical|helpdesk|blockchain|unity|game|web"
)
_IT_SLUG = re.compile(rf"(?:^|-)(?:{_IT_WORDS})(?:-|$)")


def extract_vi_job_urls(sitemap_xml: bytes) -> list[str]:
    """Vietnamese job page URLs from the sitemap, in order, without duplicates."""
    root = ElementTree.fromstring(sitemap_xml)
    urls = [
        el.text.strip()
        for el in root.iter()
        if el.tag.endswith("}loc") and el.text and "/vi/tim-viec-lam/" in el.text
    ]
    return list(dict.fromkeys(urls))


def looks_technical(url: str) -> bool:
    slug = url.rsplit("/", 1)[-1].split(".", 1)[0]
    return bool(_IT_SLUG.search(slug))


def extract_job_posting(page_html: str) -> dict[str, Any] | None:
    match = _SCHEMA.search(page_html)
    if not match:
        return None
    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def _first_dict(value: Any) -> dict[str, Any]:
    """schema.org lets many properties be one object or a list of them (e.g. several offices)."""
    if isinstance(value, list):
        value = next((item for item in value if isinstance(item, dict)), {})
    return value if isinstance(value, dict) else {}


def _amount(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


class CareerVietSource(Source):
    name = "careerviet"
    region = "vn"
    require_skills = True

    def fetch(self, http: HttpClient) -> Iterable[RawJob]:
        urls = extract_vi_job_urls(http.get(SITEMAP_URL).content)
        candidates = [u for u in urls if looks_technical(u)][:MAX_JOBS]
        log.info("%d job URLs in the sitemap, %d look technical", len(urls), len(candidates))

        for url in candidates:
            try:
                page = http.get_prefix(url, start=_SCHEMA_START, end="</script>")
            except httpx.HTTPError as exc:
                log.warning("skipping %s: %s", url, exc)
                continue
            posting = extract_job_posting(page)
            if posting is None:
                log.warning("skipping %s: no JobPosting data", url)
                continue
            try:
                yield self._to_raw(url, posting)
            except (AttributeError, KeyError, TypeError, ValueError) as exc:
                # One odd posting must not take down the whole source.
                log.warning("skipping %s: unexpected data (%r)", url, exc)

    def _to_raw(self, url: str, posting: dict[str, Any]) -> RawJob:
        base = _first_dict(posting.get("baseSalary"))
        value = _first_dict(base.get("value"))
        low, high = _amount(value.get("minValue")), _amount(value.get("maxValue"))
        structured = low is not None or high is not None
        # A text such as "Cạnh tranh" (competitive) has no digits; only digits are worth parsing.
        text = value.get("value") if isinstance(value.get("value"), str) else None
        salary_text = text if text and not structured and re.search(r"\d", text) else None

        address = _first_dict(_first_dict(posting.get("jobLocation")).get("address"))
        id_match = _JOB_ID.search(url)
        skills = [s.strip() for s in (posting.get("skills") or "").split(",") if s.strip()]
        return RawJob(
            source=self.name,
            region=self.region,
            external_id=id_match.group(1) if id_match else None,
            url=url,
            title=posting.get("title") or "",
            company=_first_dict(posting.get("hiringOrganization")).get("name") or "",
            location=address.get("addressRegion") or address.get("addressLocality"),
            description_html=posting.get("description"),
            tags=skills,
            salary_min=low,
            salary_max=high,
            # The site puts a default currency even when the salary is hidden: trust it only
            # when real amounts are present.
            salary_currency=(base.get("currency") or "VND") if structured else None,
            salary_period=_UNIT_TO_PERIOD.get(str(value.get("unitText")).upper())
            if structured
            else None,
            salary_text=salary_text,
            posted_at=posting.get("datePosted"),
        )
