from pathlib import Path

import pytest

from jobradar.extract.skills import SkillExtractor

TAXONOMY = Path(__file__).resolve().parents[1] / "data" / "skills.yaml"


@pytest.fixture(scope="module")
def extractor() -> SkillExtractor:
    return SkillExtractor.from_yaml(TAXONOMY)


def test_loads_taxonomy_without_duplicates(extractor):
    slugs = [s.slug for s in extractor.skills]
    assert len(slugs) == len(set(slugs))
    assert len(slugs) >= 60


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("We use Python and PostgreSQL on AWS", {"python", "postgresql", "aws"}),
        ("Experience with C++ and C# required", {"cpp", "csharp"}),
        ("JavaScript engineer", {"javascript"}),  # must not match "java"
        ("GitHub Actions and Docker", {"github-actions", "docker"}),  # not "git"
        ("Go to market strategy for the Go team", set()),  # "go" is not an alias
        ("Strong Golang skills", {"golang"}),
        ("ReactJS, Vue.js and Tailwind CSS", {"react", "vue", "tailwind"}),
        ("Kubernetes (k8s) with Terraform", {"kubernetes", "terraform"}),
        ("postgres replication", {"postgresql"}),
        ("Node.js backend, Express.js API", {"nodejs", "express"}),
        ("Hands-on LLM and LangChain experience", {"llm", "langchain"}),
        ("apache spark and PySpark jobs", {"spark"}),
    ],
)
def test_matches_whole_tokens_only(extractor, text, expected):
    assert set(extractor.extract(text)) == expected


def test_case_and_whitespace_insensitive(extractor):
    assert extractor.extract("PYTHON\n\n   and   \t docker") == ["python", "docker"]


def test_empty_input(extractor):
    assert extractor.extract(None) == []
    assert extractor.extract("") == []


def test_result_follows_taxonomy_order_without_duplicates(extractor):
    result = extractor.extract("docker, python, python3, docker")
    assert result == ["python", "docker"]
