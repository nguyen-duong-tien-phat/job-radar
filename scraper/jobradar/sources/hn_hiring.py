"""Hacker News "Ask HN: Who is hiring?" via the public HN Algolia API.

Finds the latest monthly thread, then reads its top-level comments. By convention each
comment starts with a header line: "Company | Role | Location | Remote | ...".
Parsing is best effort: the header is the only structured part.
"""

from __future__ import annotations

import re
from collections.abc import Iterable

from jobradar.http import HttpClient
from jobradar.models import RawJob
from jobradar.normalize import html_to_text
from jobradar.sources.base import Source

SEARCH_URL = "https://hn.algolia.com/api/v1/search_by_date"
ITEM_URL = "https://hn.algolia.com/api/v1/items/{id}"
HN_ITEM_LINK = "https://news.ycombinator.com/item?id={id}"
_CURRENCY_CHARS = re.compile(r"[$€£]|\b(?:usd|eur|gbp)\b", re.IGNORECASE)


def _header(text_html: str) -> str:
    first = re.split(r"<p>|<br\s*/?>", text_html, maxsplit=1)[0]
    return re.sub(r"\s+", " ", html_to_text(first)).strip()


class HNHiringSource(Source):
    name = "hn_hiring"
    region = "intl"
    require_skills = True

    def _latest_thread_id(self, http: HttpClient) -> str:
        params = {"tags": "story,author_whoishiring", "hitsPerPage": 5}
        for hit in http.get(SEARCH_URL, params=params).json()["hits"]:
            if (hit.get("title") or "").startswith("Ask HN: Who is hiring?"):
                return hit["objectID"]
        raise RuntimeError("no 'Who is hiring?' thread found")

    def fetch(self, http: HttpClient) -> Iterable[RawJob]:
        thread = http.get(ITEM_URL.format(id=self._latest_thread_id(http))).json()
        for comment in thread.get("children", []):
            body = comment.get("text")
            if not body:  # deleted or dead
                continue
            header = _header(body)
            parts = [p.strip() for p in header.split("|") if p.strip()]
            if len(parts) < 2:  # replies and chatter, not a posting
                continue
            comment_id = str(comment["id"])
            yield RawJob(
                source=self.name,
                region=self.region,
                external_id=comment_id,
                url=HN_ITEM_LINK.format(id=comment_id),
                title=parts[1][:200],
                company=parts[0][:200],
                description_html=body,
                salary_text=header if _CURRENCY_CHARS.search(header) else None,
                posted_at=comment.get("created_at"),
            )
