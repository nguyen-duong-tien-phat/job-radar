"""Classify a posting into one role (frontend, backend, devops, ...) from its title.

Rules are checked in order and the first match wins, so the specific roles come before the
generic ones ("React Native Developer" is mobile, not frontend; "Data Scientist" is ai-ml).
Titles are accent-folded first, so Vietnamese titles ("Lập trình viên", "Kỹ sư") match the
unaccented patterns below. A title with no match becomes "software" when the posting has a
known tech skill, otherwise "other".
"""

from __future__ import annotations

import re
import unicodedata

ROLE_SLUGS = (
    "frontend",
    "backend",
    "fullstack",
    "devops",
    "data",
    "ai-ml",
    "mobile",
    "qa",
    "security",
    "embedded",
    "management",
    "software",
    "other",
)

_RULES: tuple[tuple[str, re.Pattern[str]], ...] = tuple(
    (slug, re.compile(pattern))
    for slug, pattern in (
        ("fullstack", r"full[ -]?stack"),
        (
            "ai-ml",
            r"machine learning|\bml\b|\bai\b|deep learning|\bllm\b|\bnlp\b|computer vision|"
            r"artificial intelligence|tri tue nhan tao|data scientist|generative|\bgenai\b",
        ),
        ("data", r"data|\betl\b|\bbi\b|analytics|big data|du lieu|warehouse"),
        (
            "security",
            r"security|secops|pentest|penetration|cyber|infosec|bao mat|an ninh mang|"
            r"an toan thong tin|\bsoc\b",
        ),
        (
            "devops",
            r"devops|devsecops|\bsre\b|site reliability|platform engineer|infrastructure|cloud|"
            r"sysadmin|system admin|systems? engineer|quan tri he thong|quan tri mang|network|"
            r"he thong|kubernetes|\baws\b|\bazure\b",
        ),
        ("mobile", r"android|\bios\b|mobile|flutter|react native|swift|kotlin|di dong"),
        (
            "qa",
            r"\bqa\b|\bqc\b|tester|testing|test engineer|quality assurance|sdet|kiem thu|"
            r"automation test|test automation",
        ),
        ("embedded", r"embedded|firmware|\biot\b|fpga|\bnhung\b|\bplc\b"),
        (
            "frontend",
            r"front[ -]?end|\bfe\b|\breact(js)?\b|\bvue(js)?\b|\bangular\b|\bui\b|\bux\b|"
            r"web developer|html|css|javascript|typescript|giao dien",
        ),
        (
            "backend",
            r"back[ -]?end|\bbe\b|\bjava\b|\bpython\b|\bphp\b|golang|node(js|\.js)?\b|\.net\b|"
            r"dotnet|c#|\bruby\b|\brails\b|\bapi\b|\bspring\b|django|laravel|\bscala\b|\brust\b|"
            r"c\+\+",
        ),
        (
            "management",
            r"engineering manager|tech(nical)? lead|team lead|\bcto\b|head of|director|vp of|"
            r"truong nhom|truong phong|giam doc|\bmanager\b",
        ),
        (
            "software",
            r"software|developer|programmer|lap trinh|\bswe\b|architect|kien truc su|\bdev\b",
        ),
    )
)


def fold(text: str) -> str:
    """Lowercase and strip accents (including Vietnamese đ)."""
    decomposed = unicodedata.normalize("NFKD", text.lower().replace("đ", "d"))
    return "".join(c for c in decomposed if not unicodedata.combining(c))


def classify_role(title: str, skills: list[str] | None = None) -> str:
    folded = fold(title)
    for slug, pattern in _RULES:
        if pattern.search(folded):
            return slug
    return "software" if skills else "other"
