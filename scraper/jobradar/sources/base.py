from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterable

from jobradar.http import HttpClient
from jobradar.models import RawJob


class Source(ABC):
    """A job source. Each source lives in its own file under `jobradar/sources/`."""

    name: str  # unique slug, e.g. "remoteok"
    region: str  # "vn" | "intl"
    # True for general (non-IT) boards: run.py then drops jobs where no known skill is found.
    require_skills: bool = False

    @abstractmethod
    def fetch(self, http: HttpClient) -> Iterable[RawJob]:
        """Return the source's jobs.

        If the whole source fails, raise; run.py catches the error and logs it.
        """
