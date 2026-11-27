"""Keyword filter on a URL slug, to pick technical jobs before any job page is downloaded.

Deliberately broad: a false positive costs one request and is dropped later by `require_skills`;
a miss means a technical job whose title has none of these words is never seen.
"""

from __future__ import annotations

import re

_WORDS = (
    "developer|dev|engineer|programmer|lap-trinh|it|cntt|devops|data|qa|tester|test|automation|"
    "java|python|php|net|dotnet|react|reactjs|node|nodejs|angular|vue|android|ios|mobile|flutter|"
    "frontend|front|backend|back|fullstack|full|software|phan-mem|he-thong|system|network|mang|"
    "security|bao-mat|cyber|ai|ml|machine|cloud|aws|azure|database|dba|sql|golang|embedded|"
    "firmware|sap|erp|odoo|salesforce|ba|analyst|technical|helpdesk|blockchain|unity|game|web|"
    "brse|comtor"
)
_PATTERN = re.compile(rf"(?:^|-)(?:{_WORDS})(?:-|$)")


def slug_looks_technical(slug: str) -> bool:
    return bool(_PATTERN.search(slug))
