"""Vieclam24h (Vietnam): job URLs from the public sitemap, JobPosting JSON-LD on each page.

robots.txt lists `file/sitemap/sitemap-index.xml`; its `daily/job-*.xml` entries point to the
`job/tintuyendung-N.xml` files that hold the job URLs (about 5,000 each, all industries). The
industry is the first path segment of the URL, so technical jobs are picked by category
(`it-phan-mem`, `it-phan-cung-mang`) before any page is downloaded. The newest ones (highest job
id) are fetched, up to MAX_JOBS per run. The site's terms have not been reviewed yet, so review
them before scheduling (docs/sources.md).
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

log = logging.getLogger("jobradar.vieclam24h")

INDEX_URL = "https://vieclam24h.vn/file/sitemap/sitemap-index.xml"
IT_CATEGORIES = frozenset({"it-phan-mem", "it-phan-cung-mang"})
MAX_JOBS = 120
MAX_CONSECUTIVE_MISSING = 5

_JOB_ID = re.compile(r"id(\d+)\.html$")


def category_of(url: str) -> str:
    parts = url.split("/")
    return parts[3] if len(parts) > 3 else ""


def job_id(url: str) -> int:
    match = _JOB_ID.search(url)
    return int(match.group(1)) if match else 0


def pick_it_jobs(urls: Iterable[str], limit: int = MAX_JOBS) -> list[str]:
    """IT category URLs, newest (highest id) first, without duplicates."""
    it_urls = {u for u in urls if category_of(u) in IT_CATEGORIES and job_id(u)}
    return sorted(it_urls, key=job_id, reverse=True)[:limit]


class Vieclam24hSource(Source):
    name = "vieclam24h"
    region = "vn"
    require_skills = True

    def _job_urls(self, http: HttpClient) -> list[str]:
        index = sitemap_locs(http.get(INDEX_URL).content)
        job_indexes = [u for u in index if "/daily/job-" in u]
        job_lists = [loc for u in job_indexes for loc in sitemap_locs(http.get(u).content)]
        urls: list[str] = []
        for list_url in job_lists:
            urls.extend(sitemap_locs(http.get(list_url).content))
        return urls

    def fetch(self, http: HttpClient) -> Iterable[RawJob]:
        candidates = pick_it_jobs(self._job_urls(http))
        log.info("%d IT job URLs selected", len(candidates))
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
        tags = split_list(posting.get("industry")) + split_list(posting.get("skills"))
        return RawJob(
            source=self.name,
            region=self.region,
            external_id=str(job_id(url)),
            url=url,
            title=posting.get("title") or "",
            company=first_dict(posting.get("hiringOrganization")).get("name") or "",
            location=location_of(posting),
            description_html=posting.get("description"),
            tags=tags,
            posted_at=posting.get("datePosted"),
            **salary_fields(posting),
        )
