"""Turn a RawJob into a NormalizedJob ready to store: dedupe key, skills, salary."""

from __future__ import annotations

import hashlib
import html
import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from urllib.parse import urlsplit, urlunsplit

from jobradar.extract.roles import classify_role, fold
from jobradar.extract.salary import parse_salary
from jobradar.extract.skills import SkillExtractor
from jobradar.models import RawJob

# Below this a VND salary is almost certainly a mislabelled USD amount.
MIN_PLAUSIBLE_VND = 100_000

_TAG = re.compile(r"<[^>]+>")
_BRACKETED = re.compile(r"[\(\[\{][^\)\]\}]*[\)\]\}]")
_NON_ALNUM = re.compile(r"[^a-z0-9]+")
# Company legal forms and noise words that differ between sites for the same employer.
_COMPANY_NOISE = re.compile(
    r"\b(cong ty|co phan|cp|tnhh|mtv|jsc|ltd|limited|inc|llc|gmbh|corp|corporation|co|company|"
    r"plc|ag|sa|bv|pte|pty)\b"
)


@dataclass(frozen=True)
class NormalizedJob:
    dedupe_key: str
    source: str
    external_id: str | None
    region: str
    title: str
    company: str
    location: str | None
    url: str
    description_html: str | None
    salary_min: float | None
    salary_max: float | None
    salary_currency: str | None
    salary_period: str | None
    salary_raw: str | None
    posted_at: datetime | None
    role: str
    dup_key: str | None
    skills: list[str] = field(default_factory=list)


def canonical_url(url: str) -> str:
    """Lowercase scheme/host, drop the fragment and any trailing slash. The query is kept."""
    parts = urlsplit(url.strip())
    path = parts.path.rstrip("/")
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), path, parts.query, ""))


def make_dedupe_key(source: str, external_id: str | None, url: str) -> str:
    """Stable id for a posting. Prefer the source's own id; fall back to the canonical URL."""
    basis = f"{source}:id:{external_id}" if external_id else f"{source}:url:{canonical_url(url)}"
    return hashlib.sha256(basis.encode("utf-8")).hexdigest()


def _clean(text: str) -> str:
    return _NON_ALNUM.sub(" ", fold(_BRACKETED.sub(" ", text))).strip()


def make_dup_key(company: str, title: str) -> str | None:
    """Same company + same title on different sites gives the same key.

    Accents, case, punctuation, bracketed text and legal forms ("Công ty TNHH", "Inc.") are
    ignored. Returns None if either part is too short to trust. Limitation: two different
    openings with the same title at the same company count as one posting.
    """
    company_part = _clean(_COMPANY_NOISE.sub(" ", _clean(company)))
    title_part = _clean(title)
    if len(company_part) < 2 or len(title_part) < 3:
        return None
    return hashlib.sha256(f"{company_part}|{title_part}".encode()).hexdigest()


def html_to_text(value: str | None) -> str:
    if not value:
        return ""
    return _TAG.sub(" ", html.unescape(value))


def parse_posted_at(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def normalize(raw: RawJob, extractor: SkillExtractor) -> NormalizedJob:
    salary_min, salary_max = raw.salary_min, raw.salary_max
    currency, period = raw.salary_currency, raw.salary_period
    if salary_min is None and salary_max is None and raw.salary_text:
        parsed = parse_salary(raw.salary_text)
        if parsed is not None:
            salary_min, salary_max = parsed.min, parsed.max
            currency, period = parsed.currency, parsed.period

    # Some sites label USD amounts as VND ("1,500-2,500 VND" for a senior engineer). No real
    # monthly or yearly VND salary is this small, so drop it rather than distort VND statistics.
    amounts = [v for v in (salary_min, salary_max) if v is not None]
    top = max(amounts) if amounts else None
    if currency == "VND" and top is not None and top < MIN_PLAUSIBLE_VND:
        salary_min = salary_max = currency = period = None

    searchable = " ".join([raw.title, " ".join(raw.tags), html_to_text(raw.description_html)])
    skills = extractor.extract(searchable)
    return NormalizedJob(
        dedupe_key=make_dedupe_key(raw.source, raw.external_id, raw.url),
        source=raw.source,
        external_id=raw.external_id,
        region=raw.region,
        title=raw.title,
        company=raw.company,
        location=raw.location,
        url=raw.url,
        description_html=raw.description_html,
        salary_min=salary_min,
        salary_max=salary_max,
        salary_currency=currency,
        salary_period=period,
        salary_raw=raw.salary_text,
        posted_at=parse_posted_at(raw.posted_at),
        role=classify_role(raw.title, skills),
        dup_key=make_dup_key(raw.company, raw.title),
        skills=skills,
    )
