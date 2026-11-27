import pytest

from jobradar.extract.salary import Salary, parse_salary


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        # Vietnamese formats
        ("25-35 triệu", Salary(25e6, 35e6, "VND", "month")),
        ("15 - 20 tr/tháng", Salary(15e6, 20e6, "VND", "month")),
        ("từ 20 triệu", Salary(20e6, None, "VND", "month")),
        ("Up to 30 triệu", Salary(None, 30e6, "VND", "month")),
        ("1.500 - 2.000 USD/tháng", Salary(1500, 2000, "USD", "month")),
        ("25.5 triệu", Salary(25.5e6, 25.5e6, "VND", "month")),
        # International formats
        ("$120k–$150k/yr", Salary(120_000, 150_000, "USD", "year")),
        ("$120–150k", Salary(120_000, 150_000, "USD", "year")),
        ("$80,000 - $90,000", Salary(80_000, 90_000, "USD", "year")),
        ("Salary Band: $80,000 - $90,000", Salary(80_000, 90_000, "USD", "year")),
        ("€50,000 - €60,000 per year", Salary(50_000, 60_000, "EUR", "year")),
        ("£40k a year", Salary(40_000, 40_000, "GBP", "year")),
        ("Up to $750/month, depending on experience", Salary(None, 750, "USD", "month")),
        ("$50/hour", Salary(50, 50, "USD", "hour")),
        ("$120k+", Salary(120_000, None, "USD", "year")),
        ("1.5k - 2k USD per month", Salary(1500, 2000, "USD", "month")),
    ],
)
def test_parses_common_formats(text, expected):
    assert parse_salary(text) == expected


@pytest.mark.parametrize(
    "text",
    [
        None,
        "",
        "Negotiable",
        "Competitive salary",
        "Thương lượng",
        "3 years experience",  # no currency: not a salary
        "Requires 5+ years experience, $0 base",  # "years" must not count as an amount
    ],
)
def test_returns_none_without_usable_salary(text):
    assert parse_salary(text) is None


def test_stray_small_number_is_ignored():
    parsed = parse_salary("Acme | 10 open roles | $100,000")
    assert parsed == Salary(100_000, 100_000, "USD", "year")


def test_tiny_amounts_are_not_salaries():
    assert parse_salary("Distru | $1 - $3") is None


def test_unknown_period_for_small_usd_amount():
    # Under 10,000 USD with no period word: period is unknown, do not guess.
    assert parse_salary("$50 - $60") == Salary(50, 60, "USD", None)


def test_annualized_month_and_year():
    month = parse_salary("1.500 - 2.000 USD/tháng")
    assert month.annualized() == (18_000, 24_000)
    year = parse_salary("$80,000 - $90,000")
    assert year.annualized() == (80_000, 90_000)


def test_annualized_hour_and_unknown_return_none():
    assert parse_salary("$50/hour").annualized() is None
    assert parse_salary("$50 - $60").annualized() is None


@pytest.mark.parametrize(
    ("text", "low", "high"),
    [
        ("1.500 - 2.000 USD", 1500, 2000),  # 3 digits after "." = thousands separator
        ("1,500 - 2,000 USD", 1500, 2000),  # same with ","
        ("2.5k USD", 2500, 2500),  # decimal point before k
        ("1.250.000 VND", 1_250_000, 1_250_000),  # multiple thousands separators
    ],
)
def test_thousands_and_decimal_separators(text, low, high):
    parsed = parse_salary(text)
    assert parsed is not None
    assert (parsed.min, parsed.max) == (low, high)
