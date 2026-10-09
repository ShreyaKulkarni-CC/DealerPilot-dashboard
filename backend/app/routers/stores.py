"""
Multi-store read-only endpoints.

GET /api/stores          the stores this backend is set up for
GET /api/all/inventory   every inventory record for the chosen stores
GET /api/all/appraisals  every appraisal record for the chosen stores

Each store is fetched on its own, so one store failing shows up as an error
on that store only and the others still return data. Only store IDs listed
in the backend's own configuration are accepted, nothing arbitrary is
forwarded to vAuto.
"""

import asyncio
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import Settings, Store, get_settings
from app.connectors.vauto import VAutoClient, VAutoNotConfiguredError, VAutoTokenError
from app.rate_limit import limiter
from app.routers.inventory import get_vauto_client
from app.services.store_data import PAGE_SIZE, get_cache

router = APIRouter()


def _select_stores(settings: Settings, stores_param: Optional[str]) -> list[Store]:
    configured = settings.vauto_stores
    if not configured:
        raise HTTPException(
            status_code=400,
            detail="No stores configured. Set VAUTO_STORES (or VAUTO_ENTITY_LOGICAL_ID) in backend/.env.",
        )
    if not stores_param:
        return configured
    wanted = [s.strip() for s in stores_param.split(",") if s.strip()]
    by_id = {s.id: s for s in configured}
    unknown = [w for w in wanted if w not in by_id]
    if unknown:
        raise HTTPException(status_code=422, detail="Unknown store ID in 'stores'.")
    return [by_id[w] for w in dict.fromkeys(wanted)]


def _explain(exc: Exception) -> str:
    if isinstance(exc, VAutoNotConfiguredError):
        return str(exc)
    if isinstance(exc, VAutoTokenError):
        return str(exc)
    if isinstance(exc, httpx.HTTPStatusError):
        return f"vAuto returned HTTP {exc.response.status_code}: {exc.response.text[:300]}"
    if isinstance(exc, httpx.TimeoutException):
        return "vAuto did not respond in time."
    return f"Unexpected error: {type(exc).__name__}"


async def _load_store(kind: str, store: Store, vauto: VAutoClient, settings: Settings, refresh: bool) -> dict:
    cache = get_cache(settings.VAUTO_CACHE_SECONDS)

    async def loader(start: int, count: int) -> list:
        limit = f"{start},{count}"
        async with httpx.AsyncClient(timeout=40.0) as http:
            if kind == "inventory":
                rows = await vauto.search_inventory(http, entity_logical_id=store.id, limit=limit)
            else:
                rows = await vauto.search_appraisals(http, entity_logical_id=store.id, limit=limit)
        return [r.model_dump(exclude_none=True) for r in rows]

    try:
        entry = await cache.get(kind, store.id, loader, refresh=refresh)
    except Exception as exc:  # isolate per store, report it instead of failing the call
        return {"store": store, "ok": False, "error": _explain(exc), "records": []}
    return {"store": store, "ok": True, "entry": entry, "records": entry["records"]}


async def _all(kind: str, stores_param: Optional[str], refresh: bool, vauto: VAutoClient, settings: Settings) -> dict:
    selected = _select_stores(settings, stores_param)
    results = await asyncio.gather(*[_load_store(kind, s, vauto, settings, refresh) for s in selected])

    items: list = []
    summary: list = []
    for r in results:
        store: Store = r["store"]
        if r["ok"]:
            entry = r["entry"]
            for rec in r["records"]:
                items.append({**rec, "storeId": store.id, "storeName": store.name})
            summary.append(
                {
                    "id": store.id,
                    "name": store.name,
                    "ok": True,
                    "count": len(r["records"]),
                    "cached": entry["cached"],
                    "truncated": entry["truncated"],
                    "fetchedAt": datetime.fromtimestamp(entry["fetched_at"], tz=timezone.utc).isoformat(),
                }
            )
        else:
            summary.append({"id": store.id, "name": store.name, "ok": False, "count": 0, "error": r["error"]})

    return {"environment": settings.ENVIRONMENT, "pageSize": PAGE_SIZE, "stores": summary, "items": items}


@router.get("/api/stores")
def list_stores(settings: Settings = Depends(get_settings)):
    return {
        "environment": settings.ENVIRONMENT,
        "stores": [{"id": s.id, "name": s.name} for s in settings.vauto_stores],
    }


@router.get("/api/all/inventory")
@limiter.limit("10/minute")
async def all_inventory(
    request: Request,
    stores: Optional[str] = None,
    refresh: bool = False,
    vauto: VAutoClient = Depends(get_vauto_client),
    settings: Settings = Depends(get_settings),
):
    return await _all("inventory", stores, refresh, vauto, settings)


@router.get("/api/all/appraisals")
@limiter.limit("10/minute")
async def all_appraisals(
    request: Request,
    stores: Optional[str] = None,
    refresh: bool = False,
    vauto: VAutoClient = Depends(get_vauto_client),
    settings: Settings = Depends(get_settings),
):
    return await _all("appraisals", stores, refresh, vauto, settings)
