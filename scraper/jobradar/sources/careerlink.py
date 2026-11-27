"""CareerLink (Vietnam): job URLs from the public sitemaps, JobPosting JSON-LD on each page.

robots.txt lists `sitemaps/sitemap.xml.gz`, an index of gzipped sitemaps that hold the active job
URLs (`/tim-viec-lam/<slug>/<id>`, all industries). A keyword filter on the slug picks technical
titles before any page is downloaded; of those the highest ids (newest listings) are fetched, up to
MAX_JOBS per run. Anonymous employers are published as "CareerLink's Client" and are stored with an
empty company. The site's terms have not been reviewed yet, so review them before scheduling
(docs/sources.md).
"""

from __future__ import annotations

import logging
import re
from collections.abc import Iterable
from typing import Any

import httpx

from jobradar.http import HTML_HEADERS, HttpClient
from jobradar.models import RawJob
from jobradar.sources.base import Source
from jobradar.sources.jobposting import (
    find_job_posting,
    first_dict,
    location_of,
    salary_fields,
    sitemap_locs,
    split_list,
)
from jobradar.sources.techslug import slug_looks_technical

log = logging.getLogger("jobradar.careerlink")

INDEX_URL = "https://www.careerlink.vn/sitemaps/sitemap.xml.gz"
MAX_JOBS = 40  # kept small: the site throttles bursts
MAX_CONSECUTIVE_MISSING = 5

_JOB_URL = re.compile(r"^https://www\.careerlink\.vn/tim-viec-lam/([^/]+)/(\d+)$")
_ANONYMOUS = re.compile(r"careerlink'?s client", re.IGNORECASE)


def pick_tech_jobs(urls: Iterable[str], limit: int = MAX_JOBS) -> list[str]:
    """Technical-looking job URLs (Vietnamese pages only), highest id first, without duplicates."""
    found: dict[str, int] = {}
    for url in urls:
        match = _JOB_URL.match(url)
        if match and slug_looks_technical(match.group(1)):
            found[url] = int(match.group(2))
    return sorted(found, key=found.__getitem__, reverse=True)[:limit]


class CareerLinkSource(Source):
    name = "careerlink"
    region = "vn"
    require_skills = True
    min_interval = 2.0  # the site served empty pages after a burst at 1 request/second

    def _job_urls(self, http: HttpClient) -> list[str]:
        urls: list[str] = []
        for sitemap in sitemap_locs(http.get(INDEX_URL).content):
            urls.extend(sitemap_locs(http.get(sitemap).content))
        return urls

    def fetch(self, http: HttpClient) -> Iterable[RawJob]:
        candidates = pick_tech_jobs(self._job_urls(http))
        log.info("%d technical-looking job URLs selected", len(candidates))
        missing = 0
        for url in candidates:
            try:
                posting = find_job_posting(http.get(url, headers=HTML_HEADERS).text)
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
            try:
                yield self._to_raw(url, posting)
            except (AttributeError, KeyError, TypeError, ValueError) as exc:
                log.warning("skipping %s: unexpected data (%r)", url, exc)

    def _to_raw(self, url: str, posting: dict[str, Any]) -> RawJob:
        company = first_dict(posting.get("hiringOrganization")).get("name") or ""
        return RawJob(
            source=self.name,
            region=self.region,
            external_id=url.rsplit("/", 1)[-1],
            url=url,
            title=posting.get("title") or "",
            company="" if _ANONYMOUS.search(company) else company,
            location=location_of(posting),
            description_html=posting.get("description"),
            tags=split_list(posting.get("industry")),
            posted_at=posting.get("datePosted"),
            **salary_fields(posting),
        )
