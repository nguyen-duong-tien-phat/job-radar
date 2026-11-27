"""We Work Remotely: public RSS feeds, one per category.

The site's /terms page could not be read (Cloudflare challenge), so review it manually
before scheduling. See docs/sources.md. Titles look like "Company: Job title".
"""

from __future__ import annotations

from collections.abc import Iterable
from email.utils import parsedate_to_datetime

from defusedxml import ElementTree

from jobradar.http import HttpClient
from jobradar.models import RawJob
from jobradar.sources.base import Source

FEEDS = (
    "https://weworkremotely.com/categories/remote-programming-jobs.rss",
    "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
)


def _text(item, tag: str) -> str | None:
    node = item.find(tag)
    return node.text.strip() if node is not None and node.text and node.text.strip() else None


def _split_title(title: str) -> tuple[str, str]:
    company, sep, role = title.partition(": ")
    return (company, role) if sep else ("", title)


class WeWorkRemotelySource(Source):
    name = "weworkremotely"
    region = "intl"

    def fetch(self, http: HttpClient) -> Iterable[RawJob]:
        seen: set[str] = set()
        for feed in FEEDS:
            root = ElementTree.fromstring(http.get(feed).content)
            for item in root.iter("item"):
                link = _text(item, "link")
                if not link or link in seen:
                    continue
                seen.add(link)
                yield self._to_raw(item, link)

    def _to_raw(self, item, link: str) -> RawJob:
        company, role = _split_title(_text(item, "title") or "")
        category = _text(item, "category")
        posted = _text(item, "pubDate")
        return RawJob(
            source=self.name,
            region=self.region,
            external_id=link.rsplit("/", 1)[-1],
            url=link,
            title=role,
            company=company,
            location=_text(item, "region"),
            description_html=_text(item, "description"),
            tags=[category] if category else [],
            posted_at=parsedate_to_datetime(posted).isoformat() if posted else None,
        )
