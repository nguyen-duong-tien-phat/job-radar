"""Arbeitnow: free public JSON API (mostly Germany/EU, many non-IT jobs).

API terms (from the response `meta.terms`): free public API, do not abuse it, link back to
arbeitnow.com, and contact them with a fee proposal for commercial use. This project is a
non-commercial portfolio; the dashboard must link back. Jobs update hourly, newest first,
so only the first page is fetched. See docs/sources.md.
"""

from __future__ import annotations

import html
from collections.abc import Iterable
from datetime import UTC, datetime

from jobradar.http import HttpClient
from jobradar.models import RawJob
from jobradar.sources.base import Source

API_URL = "https://www.arbeitnow.com/api/job-board-api"


class ArbeitnowSource(Source):
    name = "arbeitnow"
    region = "intl"
    require_skills = True  # general board: keep only jobs with a known tech skill

    def fetch(self, http: HttpClient) -> Iterable[RawJob]:
        for item in http.get(API_URL).json().get("data", []):
            created = item.get("created_at")
            # The API returns the HTML escaped once ("&lt;div&gt;...")
            description = html.unescape(item["description"]) if item.get("description") else None
            yield RawJob(
                source=self.name,
                region=self.region,
                external_id=item["slug"],
                url=item["url"],
                title=item.get("title") or "",
                company=item.get("company_name") or "",
                location=item.get("location") or None,
                description_html=description,
                tags=[str(t) for t in (item.get("tags") or []) + (item.get("job_types") or [])],
                posted_at=datetime.fromtimestamp(created, UTC).isoformat() if created else None,
            )
