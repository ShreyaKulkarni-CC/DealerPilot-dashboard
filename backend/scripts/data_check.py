"""
Read-only data check for the real vAuto data (Production or Sandbox).

It answers the questions the dashboard cannot answer by itself:

  * What are the real status values, and how many records have each?
  * Is `createdOn` really the day the vehicle was stocked in? (Looks for
    signs it is not: many records sharing one date, or createdOn always
    equal to updatedOn.)
  * Which vehicle fields does vAuto really send on LIST records (odometer,
    colours, series, body type, list price, appraised value)?
  * How do appraisal statuses relate to the "completed" flag?

How it stays gentle
  * GET requests only. It never writes anything to vAuto.
  * One request at a time, one store at a time, with a pause between pages.
  * It stops at the first rate-limit (429), server error, timeout or sign-in
    problem and prints what it had collected so far. It never retries.
  * It uses the same credentials and settings as the backend (backend/.env).

What it prints: counts, percentages, status names, date ranges and field
fill rates. It never prints VINs, stock numbers, record IDs, the Client ID,
the Client Secret or any token. The output is safe to paste into a chat.

Usage (from the backend folder, with the backend's virtual environment):
    .venv\\Scripts\\python scripts\\data_check.py
    .venv\\Scripts\\python scripts\\data_check.py --out test-reports\\data_check.txt

Options:
    --stores ID,ID      Only these store IDs (default: every configured store)
    --kinds LIST        inventory, appraisals or both (default: both)
    --max-records N     Stop each list after N records (default 20000, the
                        same safety cap the app uses). Use a small number
                        such as 500 for a quick, lighter first look.
    --pause SECONDS     Wait between pages (default 0.25)
    --out FILE          Also save the report to this file
"""

import argparse
import asyncio
import statistics
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

PAGE_SIZE = 100
AGE_BANDS = [("0-30 days", 0, 30), ("31-60 days", 31, 60), ("61-90 days", 61, 90), ("90+ days", 91, None)]

INVENTORY_FIELDS = [
    ("stockNumber", ("stockNumber",)),
    ("status", ("status",)),
    ("disposition", ("disposition",)),
    ("createdOn", ("createdOn",)),
    ("updatedOn", ("updatedOn",)),
    ("vehicle.vin", ("vehicle", "vin")),
    ("vehicle.year", ("vehicle", "year")),
    ("vehicle.make", ("vehicle", "make")),
    ("vehicle.model", ("vehicle", "model")),
    ("vehicle.series", ("vehicle", "series")),
    ("vehicle.bodyType", ("vehicle", "bodyType")),
    ("vehicle.odometer", ("vehicle", "odometer")),
    ("vehicle.exteriorColor", ("vehicle", "exteriorColor")),
    ("vehicle.interiorColor", ("vehicle", "interiorColor")),
    ("pricing.listPrice", ("pricing", "listPrice")),
    ("certification.certified", ("certification", "certified")),
]

APPRAISAL_FIELDS = [
    ("centralizedStatus", ("centralizedStatus",)),
    ("isCompleted", ("isCompleted",)),
    ("created", ("created",)),
    ("lastModified", ("lastModified",)),
    ("appraisalValue.appraisedValue", ("appraisalValue", "appraisedValue")),
    ("vehicle.vin", ("vehicle", "vin")),
    ("vehicle.year", ("vehicle", "year")),
    ("vehicle.make", ("vehicle", "make")),
    ("vehicle.model", ("vehicle", "model")),
    ("vehicle.series", ("vehicle", "series")),
    ("vehicle.bodyType", ("vehicle", "bodyType")),
    ("vehicle.odometer", ("vehicle", "odometer")),
    ("vehicle.exteriorColor", ("vehicle", "exteriorColor")),
    ("vehicle.interiorColor", ("vehicle", "interiorColor")),
]


# ---------------------------------------------------------------- summaries
# Pure functions: they take plain dicts and return plain dicts, no network.


def parse_ts(value):
    """Parse an ISO date/time from vAuto. Returns an aware datetime or None."""
    if not value or not isinstance(value, str):
        return None
    text = value.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def dig(record, path):
    cur = record
    for key in path:
        if not isinstance(cur, dict) or key not in cur:
            return None
        cur = cur[key]
    return cur


def present(value):
    return value is not None and value != ""


def fill_rates(records, fields):
    total = len(records)
    out = []
    for label, path in fields:
        n = sum(1 for r in records if present(dig(r, path)))
        out.append({"field": label, "count": n, "pct": (100.0 * n / total) if total else 0.0})
    return out


def days_since(dt, now):
    # Same rule the dashboard uses: whole days, never negative.
    return max(0, int((now - dt).total_seconds() // 86400))


def band_of(age):
    for label, lo, hi in AGE_BANDS:
        if age >= lo and (hi is None or age <= hi):
            return label
    return AGE_BANDS[-1][0]


def percentile(sorted_values, p):
    if not sorted_values:
        return None
    idx = min(len(sorted_values) - 1, int(round((len(sorted_values) - 1) * p)))
    return sorted_values[idx]


def status_age_breakdown(records, now, limit=6):
    """Days on lot per status, so DELETED records do not hide how the live ones look.

    Only counts and ages: nothing that identifies a vehicle.
    """
    groups = {}
    for r in records:
        groups.setdefault(r.get("status") or "(no status)", []).append(r)
    rows = []
    for status, recs in groups.items():
        stamps = [c for c in (parse_ts(r.get("createdOn")) for r in recs) if c is not None]
        ages = sorted(days_since(c, now) for c in stamps)
        days = Counter(c.date().isoformat() for c in stamps)
        top = days.most_common(1)
        rows.append(
            {
                "status": status,
                "count": len(recs),
                "usable": len(ages),
                "median": percentile(ages, 0.5),
                "p90": percentile(ages, 0.9),
                "over_60": sum(1 for a in ages if a > 60),
                "top_date_share": (100.0 * top[0][1] / len(stamps)) if top else 0.0,
            }
        )
    rows.sort(key=lambda x: (-x["count"], x["status"]))
    return rows[:limit]


def summarize_inventory(records, now=None):
    now = now or datetime.now(timezone.utc)
    created, bad, future = [], 0, 0
    same_as_updated = within_day = both = 0
    for r in records:
        c_raw = r.get("createdOn")
        c = parse_ts(c_raw)
        if present(c_raw) and c is None:
            bad += 1
        if c is not None:
            if c > now and (c - now).total_seconds() > 86400:
                future += 1
            created.append(c)
            u = parse_ts(r.get("updatedOn"))
            if u is not None:
                both += 1
                if u == c:
                    same_as_updated += 1
                if abs((u - c).total_seconds()) <= 86400:
                    within_day += 1

    ages = sorted(days_since(c, now) for c in created)
    bands = Counter(band_of(a) for a in ages)
    days = Counter(c.date().isoformat() for c in created)
    top_days = days.most_common(5)

    return {
        "count": len(records),
        "statuses": Counter(r.get("status") or "(no status)" for r in records).most_common(),
        "dispositions": Counter(r.get("disposition") or "(none)" for r in records).most_common(),
        "createdOn": {
            "present": len(created) + bad,
            "usable": len(created),
            "unparseable": bad,
            "future": future,
            "age_min": ages[0] if ages else None,
            "age_median": percentile(ages, 0.5),
            "age_p90": percentile(ages, 0.9),
            "age_max": ages[-1] if ages else None,
            "aged_over_60": sum(1 for a in ages if a > 60),
            "bands": [(label, bands.get(label, 0)) for label, _, _ in AGE_BANDS],
            "distinct_dates": len(days),
            "top_dates": top_days,
            "top_date_share": (100.0 * top_days[0][1] / len(created)) if top_days else 0.0,
            "with_updatedOn": both,
            "equal_updatedOn": same_as_updated,
            "within_day_updatedOn": within_day,
        },
        "by_status": status_age_breakdown(records, now),
        "fields": fill_rates(records, INVENTORY_FIELDS),
    }


def summarize_appraisals(records, now=None):
    now = now or datetime.now(timezone.utc)
    statuses = Counter(r.get("centralizedStatus") or "(no status)" for r in records)
    done = Counter({True: 0, False: 0, None: 0})
    cross = Counter()
    for r in records:
        flag = r.get("isCompleted")
        flag = flag if isinstance(flag, bool) else None
        done[flag] += 1
        cross[(r.get("centralizedStatus") or "(no status)", flag)] += 1

    created = [c for c in (parse_ts(r.get("created")) for r in records) if c is not None]
    months = Counter(c.strftime("%Y-%m") for c in created)
    values = sorted(
        v
        for v in (dig(r, ("appraisalValue", "appraisedValue")) for r in records)
        if isinstance(v, (int, float)) and not isinstance(v, bool)
    )

    return {
        "count": len(records),
        "statuses": statuses.most_common(),
        "completed": {"yes": done[True], "no": done[False], "unknown": done[None]},
        "crosstab": sorted(cross.items(), key=lambda kv: (-kv[1], str(kv[0]))),
        "created": {
            "usable": len(created),
            "oldest": min(created).date().isoformat() if created else None,
            "newest": max(created).date().isoformat() if created else None,
            "latest_months": sorted(months.items())[-6:],
            "older_than_90_days": sum(1 for c in created if days_since(c, now) > 90),
        },
        "value": {
            "count": len(values),
            "min": values[0] if values else None,
            "median": statistics.median(values) if values else None,
            "max": values[-1] if values else None,
        },
        "fields": fill_rates(records, APPRAISAL_FIELDS),
    }


# ---------------------------------------------------------------- rendering


def pct_text(count, total):
    return f"{100.0 * count / total:.1f}%" if total else "n/a"


def render_counter(rows, total, limit=25):
    lines = []
    for name, n in rows[:limit]:
        lines.append(f"    {str(name):<34} {n:>7}  {pct_text(n, total):>6}")
    if len(rows) > limit:
        lines.append(f"    ... and {len(rows) - limit} more values")
    return lines


def render_fields(rows, total):
    return [f"    {r['field']:<32} {r['count']:>7}  {r['pct']:>5.1f}%" for r in rows]


def render_inventory(name, s, note=None):
    n = s["count"]
    lines = [f"  INVENTORY ({n} records)" + (f"  [{note}]" if note else "")]
    if not n:
        return lines + ["    (none)"]
    c = s["createdOn"]
    lines += ["  Status values:"] + render_counter(s["statuses"], n)
    lines += ["  Disposition values:"] + render_counter(s["dispositions"], n, 12)
    lines += [
        "  createdOn (used as 'stock-in date' for days on lot):",
        f"    usable dates: {c['usable']} of {n}   unreadable: {c['unparseable']}   dated in the future: {c['future']}",
    ]
    if c["usable"]:
        lines += [
            f"    days on lot: min {c['age_min']}, median {c['age_median']}, 90th percentile {c['age_p90']}, max {c['age_max']}",
            f"    over 60 days: {c['aged_over_60']} ({pct_text(c['aged_over_60'], c['usable'])})",
            "    age bands: " + ", ".join(f"{label} {cnt}" for label, cnt in c["bands"]),
            f"    distinct createdOn dates: {c['distinct_dates']}",
            "    most common createdOn dates: " + ", ".join(f"{d} ({k})" for d, k in c["top_dates"]),
            f"    share of records on the single most common date: {c['top_date_share']:.1f}%",
        ]
        if c["with_updatedOn"]:
            lines.append(
                f"    createdOn equals updatedOn: {c['equal_updatedOn']} of {c['with_updatedOn']}; "
                f"within one day of each other: {c['within_day_updatedOn']}"
            )
    if s["by_status"]:
        lines.append("  Days on lot by status (the dashboard hides DELETED, so check the live ones):")
        for row in s["by_status"]:
            if row["usable"]:
                lines.append(
                    f"    {row['status']}: {row['count']} records, median {row['median']} days, "
                    f"90th percentile {row['p90']}, over 60 days {row['over_60']}, "
                    f"{row['top_date_share']:.0f}% on one date"
                )
            else:
                lines.append(f"    {row['status']}: {row['count']} records, no usable createdOn")
    lines += ["  Field present on list records (count, share):"] + render_fields(s["fields"], n)
    return lines


def render_appraisals(name, s, note=None):
    n = s["count"]
    lines = [f"  APPRAISALS ({n} records)" + (f"  [{note}]" if note else "")]
    if not n:
        return lines + ["    (none)"]
    d, cr, v = s["completed"], s["created"], s["value"]
    lines += ["  Status values (centralizedStatus):"] + render_counter(s["statuses"], n)
    lines += [
        f"  isCompleted: true {d['yes']}, false {d['no']}, missing {d['unknown']}",
        "  Status by isCompleted (value, count):",
    ]
    for (status, flag), cnt in s["crosstab"][:20]:
        label = "completed" if flag is True else "not completed" if flag is False else "completed flag missing"
        lines.append(f"    {str(status):<28} {label:<24} {cnt:>6}")
    lines.append(f"  created: usable {cr['usable']} of {n}; oldest {cr['oldest']}, newest {cr['newest']}; older than 90 days: {cr['older_than_90_days']}")
    if cr["latest_months"]:
        lines.append("    latest months: " + ", ".join(f"{m} ({k})" for m, k in cr["latest_months"]))
    if v["count"]:
        lines.append(f"  appraised value present on {v['count']} of {n} ({pct_text(v['count'], n)}): min {v['min']:,.0f}, median {v['median']:,.0f}, max {v['max']:,.0f}")
    else:
        lines.append("  appraised value: not present on any list record")
    lines += ["  Field present on list records (count, share):"] + render_fields(s["fields"], n)
    return lines


# ---------------------------------------------------------------- fetching


class StopCheck(Exception):
    """Raised to stop the whole check gently (rate limit, server error...)."""


async def fetch_pages(loader, max_records, pause):
    """Page one list, one request at a time. Returns (records, truncated).
    On any problem it raises StopCheck carrying the records collected so far."""
    import httpx  # imported here so the pure functions above need no packages

    records, start = [], 1
    while True:
        try:
            page = await loader(start, PAGE_SIZE)
        except httpx.HTTPStatusError as exc:
            code = exc.response.status_code
            raise StopCheck(f"vAuto answered HTTP {code}. Stopping now and not retrying.", records) from exc
        except httpx.TimeoutException as exc:
            raise StopCheck("vAuto did not answer in time. Stopping now and not retrying.", records) from exc
        except Exception as exc:  # token problems, not configured, network
            raise StopCheck(f"{type(exc).__name__}: {str(exc)[:200]}. Stopping now.", records) from exc
        records.extend(page)
        if len(page) < PAGE_SIZE:
            return records, False
        if len(records) >= max_records:
            return records, True
        start += PAGE_SIZE
        await asyncio.sleep(pause)


async def run(args):
    # Imported here so this file can be tested without the backend installed.
    import httpx

    from app.config import get_settings
    from app.connectors.vauto import VAutoClient

    settings = get_settings()
    out = [
        "DealerPilot data check (read-only)",
        f"Run at: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        f"Environment: {settings.ENVIRONMENT}",
    ]
    if not settings.vauto_configured():
        out.append("vAuto credentials are not set in backend/.env. Nothing was requested.")
        return out
    stores = settings.vauto_stores
    if args.stores:
        wanted = {s.strip() for s in args.stores.split(",") if s.strip()}
        stores = [s for s in stores if s.id in wanted]
    if not stores:
        out.append("No stores to check. Set VAUTO_STORES in backend/.env (or pass --stores).")
        return out
    out.append("Stores: " + ", ".join(f"{s.name} ({s.id})" for s in stores))
    out.append(f"Kinds: {args.kinds}   cap per list: {args.max_records}   pause between pages: {args.pause}s")

    client = VAutoClient(settings)
    stopped = None
    for store in stores:
        out += ["", f"=== {store.name} ({store.id}) ==="]
        for kind in ("inventory", "appraisals"):
            if args.kinds not in ("both", kind):
                continue
            if stopped:
                break

            async def loader(start, count, kind=kind, store=store):
                limit = f"{start},{count}"
                async with httpx.AsyncClient(timeout=40.0) as http:
                    if kind == "inventory":
                        rows = await client.search_inventory(http, entity_logical_id=store.id, limit=limit)
                    else:
                        rows = await client.search_appraisals(http, entity_logical_id=store.id, limit=limit)
                return [r.model_dump(exclude_none=True) for r in rows]

            note = None
            try:
                records, truncated = await fetch_pages(loader, args.max_records, args.pause)
                if truncated:
                    note = f"stopped at the cap of {args.max_records}; there may be more"
            except StopCheck as stop:
                message, records = stop.args
                stopped = message
                note = f"INCOMPLETE: {message}"
            render = render_inventory if kind == "inventory" else render_appraisals
            summ = summarize_inventory if kind == "inventory" else summarize_appraisals
            out += render(store.name, summ(records), note)
        if stopped:
            out += ["", f"Stopped early: {stopped}", "Nothing further was requested. Wait a few minutes before running again."]
            break
    return out


def main():
    p = argparse.ArgumentParser(description="Read-only check of real vAuto data.")
    p.add_argument("--stores", default="")
    p.add_argument("--kinds", choices=["inventory", "appraisals", "both"], default="both")
    p.add_argument("--max-records", type=int, default=20000)
    p.add_argument("--pause", type=float, default=0.25)
    p.add_argument("--out", default="")
    args = p.parse_args()
    if args.max_records < 1 or args.pause < 0:
        p.error("--max-records must be at least 1 and --pause cannot be negative")

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    lines = asyncio.run(run(args))
    text = "\n".join(lines)
    print(text)
    if args.out:
        path = Path(args.out)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text + "\n", encoding="utf-8")
        print(f"\nSaved to {path}")


if __name__ == "__main__":
    main()
