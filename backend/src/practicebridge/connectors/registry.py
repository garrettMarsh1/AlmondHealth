from __future__ import annotations

from ..config import settings
from .base import DentalConnector
from .open_dental import OpenDentalConnector

_PRACTICE_PMS = {"demo": "open_dental"}


def connector_for(practice: str = "demo") -> DentalConnector:
    pms = _PRACTICE_PMS.get(practice, "open_dental")
    if pms == "open_dental":
        return OpenDentalConnector(settings.od_base_url, settings.od_dev_key, settings.od_customer_key,
                                   timeout=settings.request_timeout)
    raise ValueError(f"no connector configured for practice '{practice}' (pms={pms})")
