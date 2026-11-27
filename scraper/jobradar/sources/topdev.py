"""TopDev (Vietnam): listing pages for job links, schema.org JobPosting JSON-LD for data.

robots.txt allows /jobs and /detail-jobs. TopDev's terms have not been reviewed yet, so
review them before scheduling (docs/sources.md). The site's own API returns only a stub
without authentication and is not used. The listing mixes in non-IT jobs, so jobs with no
known skill are dropped (`require_skills`).
"""

from __future__ import annotations

import json
import logging
import re
from collections.abc import Iterable
from typing import Any

import httpx

from jobradar.http import HTML_HEADERS, HttpClient
from jobradar.models import RawJob
from jobradar.sources.base import Source

log = logging.getLogger("jobradar.topdev")

BASE_URL = "https://topdev.vn"
LISTING_URL = BASE_URL + "/jobs/search"
# Listing requests: the generic feed plus one page per technical keyword (about 15 jobs each).
KEYWORDS = ("python", "java", "javascript", "devops", "data", "php", "react", "android", "qa")
LISTING_REQUESTS: tuple[dict[str, object], ...] = (
    {"page": 1},
    {"page": 2},
    *({"keyword": word, "page": 1} for word in KEYWORDS),
)
MAX_JOBS = 100  # job pages fetched per run
MAX_CONSECUTIVE_MISSING = 5

_DETAIL_HREF = re.compile(r'href="(/detail-jobs/[^"?#]+)')
_LD_JSON = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.DOTALL)
_JOB_ID = re.compile(r"-(\d+)$")
_UNIT_TO_PERIOD = {"YEAR": "year", "MONTH": "month", "HOUR": "hour"}


def extract_job_links(listing_html: str) -> list[str]:
    """Unique /detail-jobs/... paths in page order, without query strings."""
    seen: dict[str, None] = {}
    for path in _DETAIL_HREF.findall(listing_html):
        seen.setdefault(path, None)
    return list(seen)


def extract_job_posting(page_html: str) -> dict[str, Any] | None:
    for block in _LD_JSON.findall(page_html):
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict) and data.get("@type") == "JobPosting":
            return data
    return None


def _amount(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


class TopDevSource(Source):
    name = "topdev"
    region = "vn"
    require_skills = True
    min_interval = 1.5

    def fetch(self, http: HttpClient) -> Iterable[RawJob]:
        paths: dict[str, None] = {}
        for params in LISTING_REQUESTS:
            listing = http.get(LISTING_URL, params=params, headers=HTML_HEADERS).text
            for path in extract_job_links(listing):
                paths.setdefault(path, None)

        missing = 0
        for path in list(paths)[:MAX_JOBS]:
            url = BASE_URL + path
            try:
                posting = extract_job_posting(http.get(url, headers=HTML_HEADERS).text)
            except httpx.HTTPError as exc:
                log.warning("skipping %s: %s", url, exc)
                continue
            if posting is None:
                log.warning("skipping %s: no JobPosting data", url)
                missing += 1
                if missing >= MAX_CONSECUTIVE_MISSING:
                    # The site is no longer serving job data to us (throttling): stop asking.
                    log.warning("stopping: %d pages in a row had no job data", missing)
                    return
                continue
            missing = 0
            yield self._to_raw(url, path, posting)

    def _to_raw(self, url: str, path: str, posting: dict[str, Any]) -> RawJob:
        salary = (posting.get("baseSalary") or {}).get("value") or {}
        low, high = _amount(salary.get("minValue")), _amount(salary.get("maxValue"))
        has_salary = low is not None or high is not None
        currency = (posting.get("baseSalary") or {}).get("currency") or "VND"
        period = _UNIT_TO_PERIOD.get(str(salary.get("unitText")).upper())
        address = (posting.get("jobLocation") or {}).get("address") or {}
        id_match = _JOB_ID.search(path)
        skills = [s.strip() for s in (posting.get("skills") or "").split(",") if s.strip()]
        return RawJob(
            source=self.name,
            region=self.region,
            external_id=id_match.group(1) if id_match else None,
            url=url,
            title=posting.get("title") or "",
            company=(posting.get("hiringOrganization") or {}).get("name") or "",
            location=address.get("addressRegion") or address.get("addressLocality"),
            description_html=posting.get("description"),
            tags=skills,
            salary_min=low,
            salary_max=high,
            salary_currency=currency if has_salary else None,
            salary_period=period if has_salary else None,
            posted_at=posting.get("datePosted"),
        )
