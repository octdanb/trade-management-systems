"""Best-effort address geocoding via Nominatim (OpenStreetMap)."""

import logging

import httpx
from django.conf import settings
from django.utils import timezone

from core.models import GeocodeStatus

logger = logging.getLogger(__name__)

TIMEOUT_S = 5.0


def geocode_address(address: str) -> tuple[float, float] | None:
    """Resolve an address to (lat, lng), or None if it can't be resolved."""
    if not address.strip():
        return None
    params = {"q": address, "format": "jsonv2", "limit": 1}
    if settings.GEOCODER_COUNTRY_CODES:
        params["countrycodes"] = settings.GEOCODER_COUNTRY_CODES
    try:
        response = httpx.get(
            f"{settings.NOMINATIM_URL}/search",
            params=params,
            headers={"User-Agent": settings.GEOCODER_USER_AGENT},
            timeout=TIMEOUT_S,
        )
        response.raise_for_status()
        results = response.json()
    except Exception:
        logger.warning("Geocoding failed for %r", address, exc_info=True)
        return None
    if not results:
        return None
    return float(results[0]["lat"]), float(results[0]["lon"])


def geocode_client(client) -> None:
    """Geocode a Client in place and save the outcome. Never raises."""
    coords = geocode_address(client.address)
    if coords:
        client.lat, client.lng = coords
        client.geocode_status = GeocodeStatus.OK
    else:
        client.lat = client.lng = None
        client.geocode_status = GeocodeStatus.FAILED
    client.geocoded_at = timezone.now()
    client.save(update_fields=["lat", "lng", "geocode_status", "geocoded_at"])


def geocode_profile(profile) -> None:
    """Geocode a BusinessProfile's home address in place. Never raises."""
    coords = geocode_address(profile.home_address)
    if coords:
        profile.home_lat, profile.home_lng = coords
        profile.geocode_status = GeocodeStatus.OK
    else:
        profile.home_lat = profile.home_lng = None
        profile.geocode_status = GeocodeStatus.FAILED
    profile.save(update_fields=["home_lat", "home_lng", "geocode_status"])
