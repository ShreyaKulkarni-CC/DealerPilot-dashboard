"""Health/status endpoint -- reports what's actually configured, honestly."""

from fastapi import APIRouter, Depends

from app.config import Settings, get_settings

router = APIRouter()


@router.get("/health")
def health(settings: Settings = Depends(get_settings)):
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "connectors": {
            "vauto_appraisal": "configured" if settings.vauto_appraisal_configured() else "not_configured",
            "vauto_inventory": "configured" if settings.vauto_inventory_configured() else "not_configured",
            "rapid_recon": "configured" if settings.rapidrecon_configured() else "not_configured",
        },
    }
