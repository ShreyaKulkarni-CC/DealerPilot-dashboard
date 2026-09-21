"""
Configuration for DealerPilot Dashboard.

Base URLs and the token endpoint are CONFIRMED real values (read directly
from the vAuto Appraisal API - 1.0 and vAuto Inventory API - 1.0 API Specs
pages on developer.coxautoinc.com, 2026-09-21) and are safe to default here
-- they are routing information, not secrets. client_id/client_secret are
never defaulted and never logged (SecretStr); they're supplied only via
environment variables / a local .env file that never leaves wherever this
actually runs.

CORRECTED 2026-09-21: the real Applications screen shows the Appraisal and
Inventory APIs registered together under ONE Application ("Bridgeland
Internal Deal Management Application"), alongside Xtime's servicescheduling
API. That means one Client ID / Client Secret pair per environment, shared
across both vAuto APIs -- you just request a different OAuth scope
(va.appraisal.read vs va.inventory.read) depending on which one you're
calling. Originally this file assumed separate credentials per API; fixed
here to match the real screen.
"""

from functools import lru_cache
from typing import Optional

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

# Confirmed real, non-secret values.
VAUTO_TOKEN_URL_NONPROD = "https://authorize.coxautoinc.com/oauth2/aus132uaxy2eomhmi357/v1/token"
VAUTO_TOKEN_URL_PROD = "https://authorize.coxautoinc.com/oauth2/aus132sv79JpAYinE357/v1/token"

VAUTO_APPRAISAL_BASE_URL_SANDBOX = "https://sandbox.api.coxautoinc.com/va/appraisal-vehicle"
VAUTO_APPRAISAL_BASE_URL_PROD = "https://api.coxautoinc.com/va/appraisal-vehicle"

VAUTO_INVENTORY_BASE_URL_SANDBOX = "https://sandbox.api.coxautoinc.com/va/inventory-vehicle"
VAUTO_INVENTORY_BASE_URL_PROD = "https://api.coxautoinc.com/va/inventory-vehicle"

# Sandbox's shared test dealer -- confirmed public/non-secret value.
VAUTO_SANDBOX_ENTITY_LOGICAL_ID = "EXT-TEST-01"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App ---
    PROJECT_NAME: str = "DealerPilot Dashboard"
    LOG_LEVEL: str = "INFO"
    ENVIRONMENT: str = "sandbox"  # sandbox | production -- decided: start on sandbox

    # --- vAuto (one shared Application credential, both APIs) ---
    VAUTO_CLIENT_ID: Optional[SecretStr] = None
    VAUTO_CLIENT_SECRET: Optional[SecretStr] = None
    # Read-only dashboard -- default to the minimal read scopes. Widen only
    # if the dashboard grows write/lookup features.
    VAUTO_APPRAISAL_SCOPE: str = "va.appraisal.read"
    VAUTO_INVENTORY_SCOPE: str = "va.inventory.read"

    # entityLogicalId in vAuto's terms (e.g. "MP12345"). Sandbox test value
    # is the shared "EXT-TEST-01" -- used automatically on sandbox unless
    # overridden.
    VAUTO_ENTITY_LOGICAL_ID: Optional[str] = None

    @property
    def vauto_token_url(self) -> str:
        return VAUTO_TOKEN_URL_PROD if self.ENVIRONMENT == "production" else VAUTO_TOKEN_URL_NONPROD

    @property
    def vauto_appraisal_base_url(self) -> str:
        return VAUTO_APPRAISAL_BASE_URL_PROD if self.ENVIRONMENT == "production" else VAUTO_APPRAISAL_BASE_URL_SANDBOX

    @property
    def vauto_inventory_base_url(self) -> str:
        return VAUTO_INVENTORY_BASE_URL_PROD if self.ENVIRONMENT == "production" else VAUTO_INVENTORY_BASE_URL_SANDBOX

    @property
    def vauto_entity_logical_id(self) -> Optional[str]:
        if self.VAUTO_ENTITY_LOGICAL_ID:
            return self.VAUTO_ENTITY_LOGICAL_ID
        return VAUTO_SANDBOX_ENTITY_LOGICAL_ID if self.ENVIRONMENT == "sandbox" else None

    def vauto_configured(self) -> bool:
        return bool(self.VAUTO_CLIENT_ID and self.VAUTO_CLIENT_SECRET)

    # Kept as separate names for endpoint-specific health/error messages,
    # even though both now check the same single credential pair.
    def vauto_appraisal_configured(self) -> bool:
        return self.vauto_configured()

    def vauto_inventory_configured(self) -> bool:
        return self.vauto_configured()

    # --- Rapid Recon --- (still not confirmed as a REST API -- task #3, on hold)
    RAPIDRECON_CLIENT_ID: Optional[SecretStr] = None
    RAPIDRECON_CLIENT_SECRET: Optional[SecretStr] = None
    RAPIDRECON_TOKEN_URL: Optional[str] = None
    RAPIDRECON_BASE_URL: Optional[str] = None

    def rapidrecon_configured(self) -> bool:
        return bool(
            self.RAPIDRECON_CLIENT_ID
            and self.RAPIDRECON_CLIENT_SECRET
            and self.RAPIDRECON_TOKEN_URL
            and self.RAPIDRECON_BASE_URL
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
