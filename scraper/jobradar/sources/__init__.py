from jobradar.sources.arbeitnow import ArbeitnowSource
from jobradar.sources.base import Source
from jobradar.sources.careerviet import CareerVietSource
from jobradar.sources.hn_hiring import HNHiringSource
from jobradar.sources.remoteok import RemoteOKSource
from jobradar.sources.topdev import TopDevSource
from jobradar.sources.weworkremotely import WeWorkRemotelySource

# To add a source: create a file in sources/, then add an instance here.
ALL_SOURCES: list[Source] = [
    RemoteOKSource(),
    WeWorkRemotelySource(),
    ArbeitnowSource(),
    HNHiringSource(),
    TopDevSource(),
    CareerVietSource(),
]


def get_sources(names: list[str] | None = None) -> list[Source]:
    if not names:
        return list(ALL_SOURCES)
    by_name = {s.name: s for s in ALL_SOURCES}
    unknown = [n for n in names if n not in by_name]
    if unknown:
        raise ValueError(f"unknown source(s): {', '.join(unknown)}")
    return [by_name[n] for n in names]
