"""
Real (not stubbed) read-only vAuto endpoints. Rapid Recon is intentionally
not merged in yet -- separate scope, on hold (task #3) per explicit
decision to get vAuto running first.
"""

from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import Settings, get_settings
from app.connectors.vauto import VAutoClient, VAutoNotConfiguredError
from app.rate_limit import limiter
from app.validation import validate_filter, validate_id, validate_limit, validate_sort

router = APIRouter()


def get_vauto_client(settings: Settings = Depends(get_settings)) -> VAutoClient:
    return VAutoClient(settings)


@router.get("/api/inventory")
@limiter.limit("30/minute")
async def list_inventory(
    request: Request,
    entity_logical_id: Optional[str] = None,
    filter: Optional[str] = None,
    sort: Optional[str] = None,
    limit: str = "1,25",
    vauto: VAutoClient = Depends(get_vauto_client),
):
    filter = validate_filter(filter)
    sort = validate_sort(sort)
    limit = validate_limit(limit)
    try:
        async with httpx.AsyncClient(timeout=40.0) as http:
            items = await vauto.search_inventory(
                http, entity_logical_id=entity_logical_id, filter_expr=filter, sort=sort, limit=limit
            )
            return {"items": [item.model_dump(exclude_none=True) for item in items]}
    except VAutoNotConfiguredError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="vAuto Inventory API did not respond in time. Try again.")


@router.get("/api/inventory/{inventory_id}")
@limiter.limit("30/minute")
async def get_inventory_detail(
    request: Request,
    inventory_id: str,
    vauto: VAutoClient = Depends(get_vauto_client),
):
    inventory_id = validate_id(inventory_id, "inventory_id")
    try:
        async with httpx.AsyncClient(timeout=40.0) as http:
            item = await vauto.get_inventory_item(http, inventory_id)
            return item.model_dump(exclude_none=True)
    except VAutoNotConfiguredError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="vAuto Inventory API did not respond in time. Try again.")


@router.get("/api/appraisals")
@limiter.limit("30/minute")
async def list_appraisals(
    request: Request,
    entity_logical_id: Optional[str] = None,
    filter: Optional[str] = None,
    sort: Optional[str] = None,
    limit: str = "1,25",
    vauto: VAutoClient = Depends(get_vauto_client),
):
    filter = validate_filter(filter)
    sort = validate_sort(sort)
    limit = validate_limit(limit)
    try:
        async with httpx.AsyncClient(timeout=40.0) as http:
            items = await vauto.search_appraisals(
                http, entity_logical_id=entity_logical_id, filter_expr=filter, sort=sort, limit=limit
            )
            return {"items": [item.model_dump(exclude_none=True) for item in items]}
    except VAutoNotConfiguredError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="vAuto Appraisal API did not respond in time. Try again.")


@router.get("/api/appraisals/{appraisal_id}")
@limiter.limit("30/minute")
async def get_appraisal_detail(
    request: Request,
    appraisal_id: str,
    vauto: VAutoClient = Depends(get_vauto_client),
):
    appraisal_id = validate_id(appraisal_id, "appraisal_id")
    try:
        async with httpx.AsyncClient(timeout=40.0) as http:
            item = await vauto.get_appraisal(http, appraisal_id)
            return item.model_dump(exclude_none=True)
    except VAutoNotConfiguredError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="vAuto Appraisal API did not respond in time. Try again.")
