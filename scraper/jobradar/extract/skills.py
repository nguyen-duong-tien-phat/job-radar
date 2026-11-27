"""Dictionary-based skill extraction.

Each skill has aliases. An alias matches only as a whole token: it cannot be preceded
by a word character and cannot be followed by a word character, "+" or "#". So "java"
does not match "javascript", "c" does not match "c++", and "git" does not match "github".
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

import yaml

DEFAULT_TAXONOMY = Path(__file__).resolve().parents[2] / "data" / "skills.yaml"
_WHITESPACE = re.compile(r"\s+")


@dataclass(frozen=True)
class Skill:
    slug: str
    name: str
    category: str
    aliases: tuple[str, ...]


def _normalize(text: str) -> str:
    return _WHITESPACE.sub(" ", text.lower()).strip()


def _alias_pattern(aliases: Iterable[str]) -> re.Pattern[str]:
    # Longest alias first, so "asp.net core" wins over "asp.net" at the same position.
    ordered = sorted(aliases, key=len, reverse=True)
    body = "|".join(re.escape(alias) for alias in ordered)
    return re.compile(rf"(?<!\w)(?:{body})(?![\w+#])")


class SkillExtractor:
    def __init__(self, skills: Iterable[Skill]) -> None:
        self._skills = list(skills)
        self._patterns = [(s.slug, _alias_pattern(s.aliases)) for s in self._skills]

    @classmethod
    def from_yaml(cls, path: Path = DEFAULT_TAXONOMY) -> SkillExtractor:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        skills = [
            Skill(
                slug=item["slug"],
                name=item["name"],
                category=item["category"],
                aliases=tuple(a.lower() for a in item["aliases"]),
            )
            for item in data["skills"]
        ]
        seen: set[str] = set()
        for skill in skills:
            if skill.slug in seen:
                raise ValueError(f"duplicate skill slug: {skill.slug}")
            seen.add(skill.slug)
            if not skill.aliases:
                raise ValueError(f"skill {skill.slug} has no aliases")
        return cls(skills)

    @property
    def skills(self) -> list[Skill]:
        return list(self._skills)

    def extract(self, text: str | None) -> list[str]:
        """Return the skill slugs found in `text`, in taxonomy order, without duplicates."""
        if not text:
            return []
        normalized = _normalize(text)
        return [slug for slug, pattern in self._patterns if pattern.search(normalized)]
