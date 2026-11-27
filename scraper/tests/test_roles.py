import pytest

from jobradar.extract.roles import ROLE_SLUGS, classify_role


@pytest.mark.parametrize(
    ("title", "role"),
    [
        ("Senior Frontend Engineer", "frontend"),
        ("Front-End Developer (React)", "frontend"),
        ("React Developer", "frontend"),
        ("Backend Engineer, Foundations", "backend"),
        ("Java Developer", "backend"),
        ("Python Engineer", "backend"),
        ("Full Stack Developer", "fullstack"),
        ("Full-stack engineer (Node/React)", "fullstack"),
        ("DevOps Engineer", "devops"),
        ("Site Reliability Engineer", "devops"),
        ("Cloud Infrastructure Lead", "devops"),
        ("Chuyên viên quản trị hệ thống Microsoft", "devops"),
        ("Data Engineer", "data"),
        ("Senior Data Analyst", "data"),
        ("Machine Learning Engineer", "ai-ml"),
        ("AI Engineer (Agentic team)", "ai-ml"),
        ("Data Scientist", "ai-ml"),  # more specific than "data"
        ("Android Developer", "mobile"),
        ("Senior React Native Developer", "mobile"),  # mobile wins over frontend
        ("iOS Engineer", "mobile"),
        ("QA Engineer", "qa"),
        ("Test Automation Engineer", "qa"),
        ("Kỹ sư kiểm thử phần mềm", "qa"),
        ("Chuyên viên pentest", "security"),
        ("Application Security Engineer", "security"),
        ("Kỹ Sư Phần Mềm Nhúng & IOT (R&D)", "embedded"),
        ("Engineering Manager", "management"),
        ("Tech Lead Backend", "backend"),  # a specific role beats "lead"
        ("Software Engineer", "software"),
        ("Lập trình viên PHP", "backend"),
        ("Lập trình viên", "software"),
        ("Account Executive", "other"),
    ],
)
def test_title_to_role(title, role):
    assert classify_role(title) == role


def test_untitled_match_with_tech_skills_becomes_software():
    assert classify_role("Staff Engineer", ["python"]) == "software"
    assert classify_role("Staff Engineer", []) == "other"


def test_every_returned_role_is_a_known_slug():
    for title in ("Frontend", "Sales Manager", "Cloud", "x", ""):
        assert classify_role(title, ["python"]) in ROLE_SLUGS
