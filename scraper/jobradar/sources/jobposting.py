"""Helpers for sources that publish schema.org `JobPosting` JSON-LD on each job page.

schema.org lets most properties be either one object or a list of them (several offices, several
salary entries), and sites differ in attributes on the <script> tag, so everything here is
defensive: missing or oddly shaped data yields None, never an exception.
"""

from __future__ import annotations

import gzip
import json
import re
from typing import Any

from defusedxml import ElementTree

_LD_JSON = re.compile(
    r"<script[^>]*type=[\"']application/ld\+json[\"'][^>]*>(.*?)</script>",
    re.DOTALL | re.IGNORECASE,
)
UNIT_TO_PERIOD = {"YEAR": "year", "MONTH": "month", "HOUR": "hour"}


def first_dict(value: Any) -> dict[str, Any]:
    """One object from a value that may be an object or a list of objects."""
    if isinstance(value, list):
        value = next((item for item in value if isinstance(item, dict)), {})
    return value if isinstance(value, dict) else {}


def amount(value: Any) -> float | None:
    """A positive number, or None (zero means "no salary" on these sites)."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


def find_job_posting(page_html: str) -> dict[str, Any] | None:
    """The first JobPosting in any JSON-LD block of the page (also inside lists or @graph)."""
    for block in _LD_JSON.findall(page_html):
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict):
            data = data.get("@graph", [data])
        for item in data if isinstance(data, list) else []:
            if isinstance(item, dict) and item.get("@type") == "JobPosting":
                return item
    return None


def salary_fields(posting: dict[str, Any]) -> dict[str, Any]:
    """Salary keyword arguments for RawJob from `baseSalary`.

    The currency and period are only set when real amounts exist: some sites put a default
    currency on every posting even when the salary is hidden ("Negotiable"). Digit-free text
    values are ignored; text with digits is passed on as `salary_text` for the salary parser.
    """
    base = first_dict(posting.get("baseSalary"))
    value = first_dict(base.get("value"))
    low, high = amount(value.get("minValue")), amount(value.get("maxValue"))
    if low is not None or high is not None:
        unit = str(value.get("unitText")).upper()
        return {
            "salary_min": low,
            "salary_max": high,
            "salary_currency": base.get("currency") or "VND",
            "salary_period": UNIT_TO_PERIOD.get(unit),
        }
    text = value.get("value")
    if isinstance(text, str) and re.search(r"\d", text):
        return {"salary_text": text}
    return {}


def location_of(posting: dict[str, Any]) -> str | None:
    address = first_dict(first_dict(posting.get("jobLocation")).get("address"))
    return address.get("addressRegion") or address.get("addressLocality") or None


def split_list(value: Any) -> list[str]:
    """Items of a comma separated string (skills, industries)."""
    if not isinstance(value, str):
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def sitemap_locs(content: bytes) -> list[str]:
    """All <loc> URLs of a sitemap or sitemap index, gzipped or not, in document order."""
    if content[:2] == b"\x1f\x8b":
        content = gzip.decompress(content)
    root = ElementTree.fromstring(content)
    return [el.text.strip() for el in root.iter() if el.tag.endswith("}loc") and el.text]
