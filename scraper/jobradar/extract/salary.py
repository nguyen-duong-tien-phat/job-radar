"""Parse free-text salary strings into structured amounts.

Rules (see the project plan, phase 1):
- A currency is required: a symbol or code ($, €, £, USD, EUR, GBP, VND, ₫, đ),
  or the Vietnamese unit "triệu" / "tr" (implies VND). Without one, return None.
- Zero amounts mean "no salary" (e.g. "$0 base") and are ignored.
- Amounts keep the source unit (e.g. 25,000,000 VND). Annualizing is a separate step.
- Separators: "1.500" and "1,500" are thousands when exactly three digits follow the
  separator. Otherwise the separator is a decimal point ("1.5k" = 1500).
- Multipliers: k = 1,000; m = 1,000,000; tr / triệu = 1,000,000.
  A multiplier on one end of a range applies to the other end when that end is < 1000
  ("$120–150k" = 120k to 150k).
- Missing period (heuristic): VND defaults to "month", the usual VN convention.
  USD/EUR/GBP amounts >= 10,000 default to "year". Anything else stays None (unknown).
"""

from __future__ import annotations

import re
from dataclasses import dataclass

YEAR, MONTH, HOUR = "year", "month", "hour"
_ANNUAL_FACTOR = {YEAR: 1, MONTH: 12}

_CURRENCY_RULES = (
    ("VND", re.compile(r"\bvnd\b|vnđ|₫|(?<!\w)đ(?!\w)")),
    ("EUR", re.compile(r"€|\beur\b")),
    ("GBP", re.compile(r"£|\bgbp\b")),
    ("USD", re.compile(r"\busd\b|\$")),
)
_MILLION_WORD = re.compile(r"(?<!\w)(?:triệu|trieu|tr)(?!\w)")

# Amount with optional unit. Not followed by a time word such as "5 years" or "2 months":
# those are experience, not salary.
_AMOUNT = re.compile(
    r"(?<![\w.,])(\d+(?:[.,]\d+)*)\s*(triệu|trieu|tr|k|m)?(?!\w)"
    r"(?!\s*(?:\+\s*)?(?:years?|yrs?|months?|days?|năm|ngày)\b)",
    re.IGNORECASE,
)
_MULTIPLIER = {"k": 1e3, "m": 1e6, "tr": 1e6, "triệu": 1e6, "trieu": 1e6}

_HOUR = re.compile(r"per hour|hourly|/\s*hour|/\s*hr\b|/\s*h\b|/\s*giờ|mỗi giờ|theo giờ")
_MONTH = re.compile(
    r"per month|a month|monthly|/\s*month|/\s*mo\b|/\s*tháng|mỗi tháng|theo tháng|hàng tháng"
)
_YEAR = re.compile(
    r"per year|a year|yearly|annual|per annum|/\s*year|/\s*yr\b|/\s*năm|mỗi năm|hàng năm|theo năm"
)
_UP_TO = re.compile(r"up to|upto|tối đa|max\.?$")
_AT_LEAST = re.compile(r"from|at least|tối thiểu|từ$|\+$")


@dataclass(frozen=True)
class Salary:
    min: float | None
    max: float | None
    currency: str  # ISO 4217
    period: str | None  # "year" | "month" | "hour" | None if unknown

    def annualized(self) -> tuple[float | None, float | None] | None:
        """Return (min, max) per year, or None if the period is unknown or hourly."""
        factor = _ANNUAL_FACTOR.get(self.period or "")
        if factor is None:
            return None
        low = self.min * factor if self.min is not None else None
        high = self.max * factor if self.max is not None else None
        return low, high


def _parse_number(raw: str) -> float:
    if "." in raw and "," in raw:
        # The last separator is the decimal point, the other one is a thousands separator.
        decimal = "." if raw.rfind(".") > raw.rfind(",") else ","
        thousands = "," if decimal == "." else "."
        return float(raw.replace(thousands, "").replace(decimal, "."))
    if "." in raw or "," in raw:
        sep = "." if "." in raw else ","
        parts = raw.split(sep)
        if len(parts) > 2 or len(parts[-1]) == 3:  # 1.500 / 1,500 / 1.500.000
            return float(raw.replace(sep, ""))
        return float(raw.replace(sep, "."))
    return float(raw)


def _detect_currency(text: str) -> str | None:
    for code, pattern in _CURRENCY_RULES:
        if pattern.search(text):
            return code
    if _MILLION_WORD.search(text):
        return "VND"
    return None


def _detect_period(text: str, currency: str, high: float | None) -> str | None:
    if _HOUR.search(text):
        return HOUR
    if _MONTH.search(text):
        return MONTH
    if _YEAR.search(text):
        return YEAR
    if currency == "VND":
        return MONTH
    if high is not None and high >= 10_000:
        return YEAR
    return None


def parse_salary(text: str | None) -> Salary | None:
    """Parse one salary string. Return None if there is no usable amount or currency."""
    if not text:
        return None
    lowered = re.sub(r"\s+", " ", text.lower()).strip()
    currency = _detect_currency(lowered)
    if currency is None:
        return None

    # (match, number, unit) for every candidate amount, in text order
    candidates = []
    for m in _AMOUNT.finditer(lowered):
        unit = m.group(2).lower() if m.group(2) else None
        candidates.append((m, _parse_number(m.group(1)), unit))
    if not candidates:
        return None

    # Propagate the unit of one end of a range to a small bare number on the other end.
    shared_unit = next((unit for _, _, unit in candidates if unit), None)
    amounts: list[tuple[re.Match[str], float]] = []
    for m, number, unit in candidates:
        if unit is None and shared_unit and len(candidates) == 2 and number < 1000:
            unit = shared_unit
        value = number * _MULTIPLIER.get(unit or "", 1.0)
        if value > 0:  # zero means "no salary"
            amounts.append((m, value))
    amounts = amounts[:2]
    if not amounts:
        return None
    # A stray number (e.g. "10 open roles | $100k") is far smaller than the real amount.
    if len(amounts) == 2 and min(v for _, v in amounts) < 0.01 * max(v for _, v in amounts):
        amounts = [max(amounts, key=lambda pair: pair[1])]

    if len(amounts) == 2:
        low, high = sorted(value for _, value in amounts)
    else:
        first, only = amounts[0]
        before = lowered[max(0, first.start() - 12) : first.start()].rstrip()
        after = lowered[first.end() : first.end() + 2]
        if _UP_TO.search(before):
            low, high = None, only
        elif _AT_LEAST.search(before) or "+" in after:
            low, high = only, None
        else:
            low, high = only, only

    top = high if high is not None else low
    period = _detect_period(lowered, currency, top)
    if currency != "VND" and period != HOUR and top is not None and top < 10:
        return None  # "$1 - $3" is a number list, not a salary
    return Salary(min=low, max=high, currency=currency, period=period)
