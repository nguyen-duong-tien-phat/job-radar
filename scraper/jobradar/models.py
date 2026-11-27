from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

REGIONS = ("vn", "intl")
SALARY_PERIODS = ("year", "month", "hour")


@dataclass(frozen=True)
class RawJob:
    """A job posting as returned by a source, mapped to the common schema.

    Skills and salary are not normalized yet at this stage.
    """

    source: str  # source slug, e.g. "remoteok"
    region: str  # "vn" | "intl"
    url: str  # original link; required for attribution
    title: str
    company: str
    external_id: str | None = None
    location: str | None = None
    description_html: str | None = None
    tags: list[str] = field(default_factory=list)
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str | None = None
    salary_period: str | None = None  # "year" | "month" | "hour" | None if unknown
    salary_text: str | None = None  # free text; parsed only if the structured fields are empty
    posted_at: str | None = None  # ISO 8601
    raw: dict[str, Any] = field(default_factory=dict, repr=False)

    def __post_init__(self) -> None:
        if self.region not in REGIONS:
            raise ValueError(f"invalid region: {self.region!r}")
        if self.salary_period is not None and self.salary_period not in SALARY_PERIODS:
            raise ValueError(f"invalid salary_period: {self.salary_period!r}")
