"""
OAuth2 client_credentials token client, matching Cox Automotive's confirmed
real pattern (read 2026-09-21 from the actual vAuto Appraisal/Inventory
Product User Guides -- not the generic RFC 6749 body-params variant this
file originally guessed at):

    POST {token_url}
    Authorization: Basic base64(client_id:client_secret)
    Content-Type: application/x-www-form-urlencoded
    Accept: application/json

    grant_type=client_credentials&scope=<space-separated scopes>

Confirmed Cox Automotive token URLs (shared by both the Appraisal and
Inventory APIs):
    Non-prod (Sandbox & Integration): https://authorize.coxautoinc.com/oauth2/aus132uaxy2eomhmi357/v1/token
    Production:                       https://authorize.coxautoinc.com/oauth2/aus132sv79JpAYinE357/v1/token

Tokens are cached in-memory and refreshed a little before actual expiry.
"""

import base64
import time
from dataclasses import dataclass
from typing import Optional

import httpx


@dataclass
class _CachedToken:
    access_token: str
    expires_at: float  # unix timestamp


class OAuthClientCredentialsClient:
    def __init__(
        self,
        token_url: str,
        client_id: str,
        client_secret: str,
        scope: str,
        refresh_skew_seconds: int = 60,
    ):
        self._token_url = token_url
        self._client_id = client_id
        self._client_secret = client_secret
        self._scope = scope
        self._refresh_skew_seconds = refresh_skew_seconds
        self._cached: Optional[_CachedToken] = None

    async def get_token(self, client: httpx.AsyncClient) -> str:
        if self._cached and self._cached.expires_at - self._refresh_skew_seconds > time.time():
            return self._cached.access_token

        basic = base64.b64encode(f"{self._client_id}:{self._client_secret}".encode()).decode()
        resp = await client.post(
            self._token_url,
            headers={
                "Authorization": f"Basic {basic}",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
                "Cache-Control": "no-cache",
            },
            data={"grant_type": "client_credentials", "scope": self._scope},
        )
        resp.raise_for_status()
        payload = resp.json()

        access_token = payload["access_token"]
        expires_in = payload.get("expires_in", 300)  # conservative default only if vendor omits it
        self._cached = _CachedToken(access_token=access_token, expires_at=time.time() + expires_in)
        return access_token
