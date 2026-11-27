"""RemoteOK: public JSON API.

API terms (found in the `legal` field of the response): you must link back to
remoteok.com (follow, not nofollow) and name "Remote OK" as the source, otherwise API
access is cut off. The dashboard must show this. See docs/sources.md.

Salary in the API is annual USD (verified on a job page: "$8,400 - $9,000/year").
"""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from jobradar.http import HttpClient
from jobradar.models import RawJob
from jobradar.sources.base import Source

API_URL = "https://remoteok.com/api"


def _positive_number(value: Any) -> float | None:
    """RemoteOK uses 0 to mean "no salary". Treat 0 or invalid values as None."""
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)) and value > 0:
        return float(value)
    return None


class RemoteOKSource(Source):
    name = "remoteok"
    region = "intl"

    def fetch(self, http: HttpClient) -> Iterable[RawJob]:
        payload = http.get(API_URL).json()
        for item in payload:
            # The first element is {"last_updated", "legal"}, not a job
            if "legal" in item or "id" not in item:
                continue
            yield self._to_raw(item)

    def _to_raw(self, item: dict[str, Any]) -> RawJob:
        salary_min = _positive_number(item.get("salary_min"))
        salary_max = _positive_number(item.get("salary_max"))
        has_salary = salary_min is not None or salary_max is not None
        return RawJob(
            source=self.name,
            region=self.region,
            external_id=str(item["id"]),
            url=item["url"],
            title=item.get("position") or "",
            company=item.get("company") or "",
            location=item.get("location") or None,
            description_html=item.get("description") or None,
            tags=[str(t) for t in item.get("tags") or []],
            salary_min=salary_min,
            salary_max=salary_max,
            salary_currency="USD" if has_salary else None,
            salary_period="year" if has_salary else None,
            posted_at=item.get("date") or None,
            raw=item,
        )
