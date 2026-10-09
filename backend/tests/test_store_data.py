"""
Tests for the multi-store data layer. No network: vAuto is replaced with
fakes. Run from the backend folder:  python -m pytest tests -q
"""

import asyncio
import sys
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import Settings, get_settings, parse_stores  # noqa: E402
from app.main import app  # noqa: E402
from app.routers.inventory import get_vauto_client  # noqa: E402
from app.services import store_data  # noqa: E402
from app.services.store_data import StoreDataCache, fetch_all_pages  # noqa: E402


def run(coro):
    return asyncio.run(coro)


def make_loader(total):
    calls = []

    async def loader(start, count):
        calls.append((start, count))
        return list(range(start, min(start + count, total + 1)))

    return loader, calls


# --- paging ---


def test_pages_until_short_page():
    loader, calls = make_loader(250)
    records, truncated = run(fetch_all_pages(loader, page_size=100, pause=0))
    assert len(records) == 250 and not truncated
    assert calls == [(1, 100), (101, 100), (201, 100)]


def test_exact_multiple_needs_one_empty_page():
    loader, calls = make_loader(200)
    records, _ = run(fetch_all_pages(loader, page_size=100, pause=0))
    assert len(records) == 200 and len(calls) == 3


def test_empty_store():
    loader, calls = make_loader(0)
    records, truncated = run(fetch_all_pages(loader, page_size=100, pause=0))
    assert records == [] and not truncated and len(calls) == 1


def test_safety_cap_marks_truncated():
    loader, _ = make_loader(10_000)
    records, truncated = run(fetch_all_pages(loader, page_size=100, max_records=300, pause=0))
    assert truncated and len(records) == 300


# --- cache ---


def test_cache_reuses_then_expires_then_refreshes():
    loader, calls = make_loader(5)
    cache = StoreDataCache(ttl_seconds=60)
    t = {"now": 1000.0}
    clock = lambda: t["now"]  # noqa: E731

    first = run(cache.get("inventory", "A", loader, now=clock))
    assert not first["cached"] and len(calls) == 1
    second = run(cache.get("inventory", "A", loader, now=clock))
    assert second["cached"] and len(calls) == 1
    t["now"] += 61
    third = run(cache.get("inventory", "A", loader, now=clock))
    assert not third["cached"] and len(calls) == 2
    run(cache.get("inventory", "A", loader, refresh=True, now=clock))
    assert len(calls) == 3


def test_concurrent_callers_share_one_fetch():
    loader, calls = make_loader(5)
    cache = StoreDataCache(ttl_seconds=60)

    async def both():
        return await asyncio.gather(
            cache.get("inventory", "A", loader), cache.get("inventory", "A", loader)
        )

    run(both())
    assert len(calls) == 1


def test_stores_cached_separately():
    loader, calls = make_loader(5)
    cache = StoreDataCache(ttl_seconds=60)
    run(cache.get("inventory", "A", loader))
    run(cache.get("inventory", "B", loader))
    run(cache.get("appraisals", "A", loader))
    assert len(calls) == 3


# --- store config ---


def test_parse_stores_ok():
    stores = parse_stores("MP1=Candy Cars, MP2=Bridgeland Auto Brokers")
    assert [(s.id, s.name) for s in stores] == [("MP1", "Candy Cars"), ("MP2", "Bridgeland Auto Brokers")]
    assert parse_stores("") == []


@pytest.mark.parametrize("bad", ["MP1", "MP1=", "=Name", "MP1=A,MP1=B", "MP 1=Name", "MP1=Na<me>"])
def test_parse_stores_rejects_bad(bad):
    with pytest.raises(ValueError):
        parse_stores(bad)


def test_sandbox_ignores_configured_stores():
    s = Settings(ENVIRONMENT="sandbox", VAUTO_STORES="MP1=Candy Cars", _env_file=None)
    assert [x.id for x in s.vauto_stores] == ["EXT-TEST-01"]


def test_production_uses_configured_stores():
    s = Settings(ENVIRONMENT="production", VAUTO_STORES="MP1=Candy Cars,MP2=Bridgeland", _env_file=None)
    assert [x.id for x in s.vauto_stores] == ["MP1", "MP2"]


def test_production_falls_back_to_single_entity_id():
    s = Settings(ENVIRONMENT="production", VAUTO_ENTITY_LOGICAL_ID="MP9", _env_file=None)
    assert [x.id for x in s.vauto_stores] == ["MP9"]


# --- endpoints ---


class FakeRow:
    def __init__(self, data):
        self._data = data

    def model_dump(self, **_):
        return dict(self._data)


class FakeVAuto:
    def __init__(self, per_store, failing=()):
        self.per_store = per_store
        self.failing = set(failing)
        self.calls = []

    async def _search(self, kind, http, entity_logical_id, limit, **_):
        self.calls.append((kind, entity_logical_id, limit))
        if entity_logical_id in self.failing:
            request = httpx.Request("GET", "https://example.test")
            raise httpx.HTTPStatusError("boom", request=request, response=httpx.Response(403, text="Forbidden", request=request))
        start, count = (int(x) for x in limit.split(","))
        rows = self.per_store[entity_logical_id]
        return [FakeRow(r) for r in rows[start - 1 : start - 1 + count]]

    async def search_inventory(self, http, entity_logical_id=None, limit="1,25", **kw):
        return await self._search("inventory", http, entity_logical_id, limit, **kw)

    async def search_appraisals(self, http, entity_logical_id=None, limit="1,25", **kw):
        return await self._search("appraisals", http, entity_logical_id, limit, **kw)


@pytest.fixture
def client_factory():
    def make(fake):
        store_data._cache = None
        settings = Settings(ENVIRONMENT="production", VAUTO_STORES="MP1=Candy Cars,MP2=Bridgeland Auto Brokers", _env_file=None)
        app.dependency_overrides[get_settings] = lambda: settings
        app.dependency_overrides[get_vauto_client] = lambda: fake
        return TestClient(app)

    yield make
    app.dependency_overrides.clear()
    store_data._cache = None


def rows(prefix, n):
    return [{"inventoryId": f"{prefix}{i}", "status": "ACTIVE"} for i in range(n)]


def test_combined_endpoint_tags_and_sums(client_factory):
    fake = FakeVAuto({"MP1": rows("a", 130), "MP2": rows("b", 40)})
    body = client_factory(fake).get("/api/all/inventory").json()
    assert len(body["items"]) == 170
    assert {s["id"]: s["count"] for s in body["stores"]} == {"MP1": 130, "MP2": 40}
    assert {i["storeName"] for i in body["items"]} == {"Candy Cars", "Bridgeland Auto Brokers"}
    assert sum(1 for i in body["items"] if i["storeId"] == "MP1") == 130


def test_single_store_selection(client_factory):
    fake = FakeVAuto({"MP1": rows("a", 3), "MP2": rows("b", 4)})
    body = client_factory(fake).get("/api/all/inventory?stores=MP2").json()
    assert [s["id"] for s in body["stores"]] == ["MP2"] and len(body["items"]) == 4


def test_one_store_failing_does_not_hide_the_other(client_factory):
    fake = FakeVAuto({"MP1": rows("a", 3), "MP2": rows("b", 4)}, failing={"MP2"})
    resp = client_factory(fake).get("/api/all/inventory")
    assert resp.status_code == 200
    body = resp.json()
    by_id = {s["id"]: s for s in body["stores"]}
    assert by_id["MP1"]["ok"] and by_id["MP1"]["count"] == 3
    assert not by_id["MP2"]["ok"] and "403" in by_id["MP2"]["error"]
    assert len(body["items"]) == 3


def test_unknown_store_is_rejected_and_never_forwarded(client_factory):
    fake = FakeVAuto({"MP1": rows("a", 1), "MP2": rows("b", 1)})
    resp = client_factory(fake).get("/api/all/inventory?stores=EVIL1")
    assert resp.status_code == 422 and fake.calls == []


def test_second_call_is_served_from_cache(client_factory):
    fake = FakeVAuto({"MP1": rows("a", 3), "MP2": rows("b", 4)})
    client = client_factory(fake)
    client.get("/api/all/inventory")
    n = len(fake.calls)
    body = client.get("/api/all/inventory").json()
    assert len(fake.calls) == n and all(s["cached"] for s in body["stores"])
    client.get("/api/all/inventory?refresh=true")
    assert len(fake.calls) > n


def test_appraisals_endpoint(client_factory):
    fake = FakeVAuto({"MP1": [{"id": "x"}] * 2, "MP2": [{"id": "y"}] * 5})
    body = client_factory(fake).get("/api/all/appraisals").json()
    assert len(body["items"]) == 7


def test_stores_endpoint(client_factory):
    body = client_factory(FakeVAuto({})).get("/api/stores").json()
    assert [s["name"] for s in body["stores"]] == ["Candy Cars", "Bridgeland Auto Brokers"]
