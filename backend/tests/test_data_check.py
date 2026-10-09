"""
Tests for scripts/data_check.py. No network: vAuto is replaced with fakes.
Run from the backend folder:  python -m pytest tests -q
"""

import argparse
import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
import pytest

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))
sys.path.insert(0, str(BACKEND / "scripts"))

import data_check  # noqa: E402

NOW = datetime(2026, 10, 9, 12, 0, tzinfo=timezone.utc)


def iso(days_ago, hours=0):
    return (NOW - timedelta(days=days_ago, hours=hours)).isoformat().replace("+00:00", "Z")


def inv(i, status="Active", created=None, updated=None, **extra):
    rec = {
        "inventoryId": f"SECRET-ID-{i}",
        "stockNumber": f"STOCK{i}",
        "status": status,
        "vehicle": {"vin": f"VIN-NEVER-PRINT-{i}", "year": 2020, "make": "Ford", "model": "Escape"},
    }
    if created:
        rec["createdOn"] = created
    if updated:
        rec["updatedOn"] = updated
    rec.update(extra)
    return rec


def test_parse_ts_handles_z_offset_and_junk():
    assert data_check.parse_ts("2026-10-01T10:00:00Z") == datetime(2026, 10, 1, 10, tzinfo=timezone.utc)
    assert data_check.parse_ts("2026-10-01T10:00:00") == datetime(2026, 10, 1, 10, tzinfo=timezone.utc)
    assert data_check.parse_ts("not a date") is None
    assert data_check.parse_ts(None) is None


def test_inventory_age_bands_match_dashboard_rules():
    # Day 60 is still 31-60, day 61 starts 61-90, day 90 is 61-90, day 91 is 90+.
    recs = [inv(i, created=iso(d)) for i, d in enumerate([0, 30, 31, 60, 61, 90, 91, 400])]
    s = data_check.summarize_inventory(recs, now=NOW)
    bands = dict(s["createdOn"]["bands"])
    assert bands == {"0-30 days": 2, "31-60 days": 2, "61-90 days": 2, "90+ days": 2}
    assert s["createdOn"]["aged_over_60"] == 4  # 61, 90, 91, 400


def test_inventory_flags_bulk_import_and_createdon_equals_updatedon():
    same = iso(100)
    recs = [inv(i, created=same, updated=same) for i in range(8)] + [inv(99, created=iso(5), updated=iso(1))]
    s = data_check.summarize_inventory(recs, now=NOW)["createdOn"]
    assert s["top_dates"][0][1] == 8
    assert s["top_date_share"] > 85
    assert s["equal_updatedOn"] == 8 and s["with_updatedOn"] == 9


def test_inventory_missing_unreadable_and_future_dates_are_counted():
    recs = [inv(1), inv(2, created="garbage"), inv(3, created=iso(-10)), inv(4, created=iso(3))]
    s = data_check.summarize_inventory(recs, now=NOW)["createdOn"]
    assert s["unparseable"] == 1
    assert s["future"] == 1
    assert s["usable"] == 2
    assert s["present"] == 3


def test_inventory_status_and_fill_rates():
    recs = [inv(1, status="Active"), inv(2, status="Active"), inv(3, status=None, odometer=None)]
    recs[2].pop("status")
    s = data_check.summarize_inventory(recs, now=NOW)
    assert dict(s["statuses"]) == {"Active": 2, "(no status)": 1}
    fills = {f["field"]: f["count"] for f in s["fields"]}
    assert fills["vehicle.make"] == 3 and fills["vehicle.odometer"] == 0 and fills["status"] == 2


def test_appraisal_crosstab_value_and_months():
    recs = [
        {"id": "a1", "centralizedStatus": "Completed", "isCompleted": True, "created": iso(2), "appraisalValue": {"appraisedValue": 10000}},
        {"id": "a2", "centralizedStatus": "Completed", "isCompleted": False, "created": iso(40), "appraisalValue": {}},
        {"id": "a3", "centralizedStatus": "Pending", "created": iso(120)},
    ]
    s = data_check.summarize_appraisals(recs, now=NOW)
    assert s["completed"] == {"yes": 1, "no": 1, "unknown": 1}
    assert dict(s["crosstab"])[("Completed", True)] == 1
    assert s["value"]["count"] == 1 and s["value"]["median"] == 10000
    assert s["created"]["older_than_90_days"] == 1


def test_empty_lists_do_not_crash():
    assert data_check.summarize_inventory([], now=NOW)["count"] == 0
    assert data_check.summarize_appraisals([], now=NOW)["count"] == 0
    assert "(none)" in data_check.render_inventory("x", data_check.summarize_inventory([], now=NOW))[-1]


# ---- gentle paging ----


def run(coro):
    return asyncio.run(coro)


def test_fetch_pages_pages_until_short_page_one_at_a_time():
    calls = []

    async def loader(start, count):
        calls.append(start)
        total = 250
        return [{"i": n} for n in range(start, min(start + count, total + 1))]

    records, truncated = run(data_check.fetch_pages(loader, max_records=20000, pause=0))
    assert len(records) == 250 and truncated is False
    assert calls == [1, 101, 201]


def test_fetch_pages_respects_the_cap():
    async def loader(start, count):
        return [{"i": n} for n in range(count)]

    records, truncated = run(data_check.fetch_pages(loader, max_records=250, pause=0))
    assert truncated is True and len(records) == 300  # whole pages, stops once cap is reached


def _status_error(code):
    req = httpx.Request("GET", "https://example.invalid/x")
    return httpx.HTTPStatusError("boom", request=req, response=httpx.Response(code, request=req))


@pytest.mark.parametrize("code", [429, 500, 503])
def test_fetch_pages_stops_without_retry_and_keeps_partial(code):
    calls = []

    async def loader(start, count):
        calls.append(start)
        if start > 1:
            raise _status_error(code)
        return [{"i": n} for n in range(count)]

    with pytest.raises(data_check.StopCheck) as info:
        run(data_check.fetch_pages(loader, max_records=20000, pause=0))
    message, partial = info.value.args
    assert str(code) in message and "not retrying" in message
    assert len(partial) == 100
    assert calls == [1, 101]  # exactly one failed call, no retry


# ---- whole run with a fake client ----


class FakeSettings:
    ENVIRONMENT = "production"
    VAUTO_CLIENT_ID = "SECRET-CLIENT-ID"
    VAUTO_CLIENT_SECRET = "SECRET-CLIENT-SECRET"

    class _Store:
        def __init__(self, id, name):
            self.id, self.name = id, name

    vauto_stores = [_Store("MP1", "Store One"), _Store("MP2", "Store Two")]

    def vauto_configured(self):
        return True


class Row:
    def __init__(self, d):
        self.d = d

    def model_dump(self, exclude_none=True):
        return self.d


def make_fake_client(fail_on=None, calls=None):
    class FakeClient:
        def __init__(self, settings):
            pass

        async def search_inventory(self, http, entity_logical_id=None, limit="1,25", **kw):
            calls.append(("inventory", entity_logical_id, limit))
            if fail_on == (entity_logical_id, "inventory"):
                raise _status_error(429)
            return [Row(inv(n, created=iso(n % 120))) for n in range(5)]

        async def search_appraisals(self, http, entity_logical_id=None, limit="1,25", **kw):
            calls.append(("appraisals", entity_logical_id, limit))
            return [Row({"id": "SECRET-APPRAISAL", "centralizedStatus": "Pending", "isCompleted": False, "created": iso(3)})]

    return FakeClient


def args(**over):
    base = dict(stores="", kinds="both", max_records=20000, pause=0, out="")
    base.update(over)
    return argparse.Namespace(**base)


def patch_backend(monkeypatch, client_cls):
    import app.config as config
    import app.connectors.vauto as vauto

    monkeypatch.setattr(config, "get_settings", lambda: FakeSettings())
    monkeypatch.setattr(vauto, "VAutoClient", client_cls)


def test_run_prints_summaries_and_never_prints_identifiers_or_secrets(monkeypatch):
    calls = []
    patch_backend(monkeypatch, make_fake_client(calls=calls))
    text = "\n".join(run(data_check.run(args())))
    assert "Store One" in text and "Store Two" in text and "Active" in text and "Pending" in text
    for forbidden in ["SECRET-ID", "STOCK", "VIN-NEVER-PRINT", "SECRET-CLIENT", "SECRET-APPRAISAL"]:
        assert forbidden not in text
    # one request at a time, store by store: S1 inv, S1 appr, S2 inv, S2 appr
    assert [(k, s) for k, s, _ in calls] == [("inventory", "MP1"), ("appraisals", "MP1"), ("inventory", "MP2"), ("appraisals", "MP2")]


def test_run_stops_everything_at_first_rate_limit(monkeypatch):
    calls = []
    patch_backend(monkeypatch, make_fake_client(fail_on=("MP1", "inventory"), calls=calls))
    text = "\n".join(run(data_check.run(args())))
    assert len(calls) == 1  # nothing else was requested after the 429
    assert "429" in text and "Stopped early" in text and "INCOMPLETE" in text


def test_run_respects_store_and_kind_filters(monkeypatch):
    calls = []
    patch_backend(monkeypatch, make_fake_client(calls=calls))
    run(data_check.run(args(stores="MP2", kinds="appraisals")))
    assert [(k, s) for k, s, _ in calls] == [("appraisals", "MP2")]
