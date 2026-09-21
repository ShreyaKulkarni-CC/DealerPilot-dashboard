"""
vAuto connector -- Appraisal API + Inventory API.

Everything in this file is written against CONFIRMED real behavior, read
directly from the vAuto Appraisal API - 1.0 and vAuto Inventory API - 1.0
Product User Guides + API Specs pages on developer.coxautoinc.com
(2026-09-21), not guessed. Key confirmed facts worth keeping in mind:

- Auth: OAuth2 client_credentials, HTTP Basic (base64 client_id:secret),
  scope requested explicitly per call (see app/auth/oauth_client.py).
- Appraisal API requires a non-empty `User-Agent` header on every request --
  omitting it gets a 403 from the API gateway before the request is even
  evaluated. Sent on Inventory calls too since it doesn't hurt there.
- Appraisal reads REQUIRE `X-CoxAuto-ConsistentRead: true` -- eventually
  consistent reads aren't supported yet and error without it. Inventory
  reads accept the same header but default to eventually-consistent if
  omitted; we pass `true` on both for predictability.
- Appraisal API field-level permission model: a field your credentials
  aren't authorized for is OMITTED from the response entirely (not null).
  A field you ARE authorized for but that has no data is `null`. Our
  Pydantic models below make every non-baseline field Optional for exactly
  this reason -- absence is expected, not a bug.
- Dealer identity: `entityLogicalId` (e.g. "MP12345"; sandbox shared value
  "EXT-TEST-01") or `commonOrgId` as an alternative.

Base URLs, token URL, and scopes come from app/config.py (confirmed, not
secret). Only client_id/client_secret are sensitive and those are never
read, logged, or echoed by this file.
"""

from typing import Any, Optional

import httpx
from pydantic import BaseModel

from app.auth.oauth_client import OAuthClientCredentialsClient
from app.config import Settings

_HEADERS_BASE = {
    "Accept": "application/vnd.coxauto.v1+json",
    "X-CoxAuto-ConsistentRead": "true",
    "User-Agent": "DealerPilotDashboard/0.1",
}


class VAutoNotConfiguredError(RuntimeError):
    pass


# --- Normalized response models (fields Optional per the confirmed
# permission-visibility model -- absence means "not authorized for this
# field", not a parsing failure) ---


class VehicleInfo(BaseModel):
    vin: Optional[str] = None
    year: Optional[int] = None
    make: Optional[str] = None
    model: Optional[str] = None
    series: Optional[str] = None
    bodyType: Optional[str] = None
    odometer: Optional[float] = None
    exteriorColor: Optional[str] = None
    interiorColor: Optional[str] = None


class OrganizationInfo(BaseModel):
    entityLogicalId: Optional[str] = None


class InventoryItem(BaseModel):
    inventoryId: str
    status: Optional[str] = None
    stockNumber: Optional[str] = None
    disposition: Optional[str] = None
    createdOn: Optional[str] = None
    updatedOn: Optional[str] = None
    organization: Optional[OrganizationInfo] = None
    vehicle: Optional[VehicleInfo] = None
    pricing: Optional[dict] = None  # {listPrice, currency}
    certification: Optional[dict] = None  # {certified, program}


class Appraisal(BaseModel):
    id: str
    isCompleted: Optional[bool] = None
    created: Optional[str] = None
    lastModified: Optional[str] = None
    centralizedStatus: Optional[str] = None
    organization: Optional[OrganizationInfo] = None
    vehicle: Optional[VehicleInfo] = None
    appraisalValue: Optional[dict] = None  # {appraisedValue} -- requires APPRAISAL_READ_FINANCIAL_INFO


class VAutoClient:
    """One shared Client ID/Secret (confirmed real: both APIs live under the
    same Application on the Storefront), but two separate token requests --
    each asks for only the scope it needs (va.appraisal.read vs
    va.inventory.read), per vAuto's own guidance to request the minimal
    scope per integration. Two OAuthClientCredentialsClient instances so
    each caches its own token independently."""

    def __init__(self, settings: Settings):
        self._settings = settings
        self._appraisal_oauth: Optional[OAuthClientCredentialsClient] = None
        self._inventory_oauth: Optional[OAuthClientCredentialsClient] = None

        if settings.vauto_configured():
            client_id = settings.VAUTO_CLIENT_ID.get_secret_value()
            client_secret = settings.VAUTO_CLIENT_SECRET.get_secret_value()
            self._appraisal_oauth = OAuthClientCredentialsClient(
                token_url=settings.vauto_token_url,
                client_id=client_id,
                client_secret=client_secret,
                scope=settings.VAUTO_APPRAISAL_SCOPE,
            )
            self._inventory_oauth = OAuthClientCredentialsClient(
                token_url=settings.vauto_token_url,
                client_id=client_id,
                client_secret=client_secret,
                scope=settings.VAUTO_INVENTORY_SCOPE,
            )

    # --- Inventory API ---

    async def _inventory_get(self, http: httpx.AsyncClient, path: str, params: Optional[dict] = None) -> Any:
        if not self._inventory_oauth:
            raise VAutoNotConfiguredError(
                "VAUTO_INVENTORY_CLIENT_ID/SECRET not set. See docs/INTEGRATION_TODO.md."
            )
        token = await self._inventory_oauth.get_token(http)
        resp = await http.get(
            f"{self._settings.vauto_inventory_base_url}{path}",
            headers={**_HEADERS_BASE, "Authorization": f"Bearer {token}"},
            params=params or {},
        )
        resp.raise_for_status()
        return resp.json()

    async def get_inventory_item(self, http: httpx.AsyncClient, inventory_id: str, expand_images: bool = False) -> InventoryItem:
        params = {"expand": "im.m"} if expand_images else {}
        raw = await self._inventory_get(http, f"/inventory/id/{inventory_id}", params)
        return InventoryItem.model_validate(raw)

    async def search_inventory(
        self,
        http: httpx.AsyncClient,
        entity_logical_id: Optional[str] = None,
        filter_expr: Optional[str] = None,
        sort: Optional[str] = None,
        select: Optional[str] = None,
        limit: str = "1,25",
    ) -> list[InventoryItem]:
        entity_logical_id = entity_logical_id or self._settings.vauto_entity_logical_id
        if not entity_logical_id:
            raise ValueError("entity_logical_id is required (no VAUTO_ENTITY_LOGICAL_ID configured either)")
        params = {"entityLogicalId": entity_logical_id, "limit": limit}
        if filter_expr:
            params["filter"] = filter_expr
        if sort:
            params["sort"] = sort
        if select:
            params["select"] = select
        raw = await self._inventory_get(http, "/inventory", params)
        return [InventoryItem.model_validate(item) for item in raw.get("items", [])]

    # --- Appraisal API ---

    async def _appraisal_get(self, http: httpx.AsyncClient, path: str, params: Optional[dict] = None) -> Any:
        if not self._appraisal_oauth:
            raise VAutoNotConfiguredError(
                "VAUTO_APPRAISAL_CLIENT_ID/SECRET not set. See docs/INTEGRATION_TODO.md."
            )
        token = await self._appraisal_oauth.get_token(http)
        resp = await http.get(
            f"{self._settings.vauto_appraisal_base_url}{path}",
            headers={**_HEADERS_BASE, "Authorization": f"Bearer {token}"},
            params=params or {},
        )
        resp.raise_for_status()
        return resp.json()

    async def get_appraisal(self, http: httpx.AsyncClient, appraisal_id: str) -> Appraisal:
        raw = await self._appraisal_get(http, f"/appraisals/id/{appraisal_id}")
        return Appraisal.model_validate(raw)

    async def search_appraisals(
        self,
        http: httpx.AsyncClient,
        entity_logical_id: Optional[str] = None,
        filter_expr: Optional[str] = None,
        sort: Optional[str] = None,
        select: Optional[str] = None,
        limit: str = "1,25",
    ) -> list[Appraisal]:
        entity_logical_id = entity_logical_id or self._settings.vauto_entity_logical_id
        if not entity_logical_id:
            raise ValueError("entity_logical_id is required (no VAUTO_ENTITY_LOGICAL_ID configured either)")
        params = {"entityLogicalId": entity_logical_id, "limit": limit}
        if filter_expr:
            params["filter"] = filter_expr
        if sort:
            params["sort"] = sort
        if select:
            params["select"] = select
        raw = await self._appraisal_get(http, "/appraisals", params)
        return [Appraisal.model_validate(item) for item in raw.get("items", [])]
