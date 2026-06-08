from __future__ import annotations

from ..models import (
    Appointment,
    AppointmentCreate,
    Document,
    Operatory,
    Patient,
    PatientCreate,
    Provider,
    Slot,
)
from .base import DentalConnector

PENDING = (
    "Denticon connector pending partner credentials. Obtain via a single-customer "
    "agreement (info@planetdds.com) sponsored by a Denticon practice, then wire OAuth2 "
    "client-credentials against api.denticon.com. The Denticon API supports the full "
    "loop (patients, availability, book/confirm/cancel, document upload, RCM)."
)


class DenticonConnector(DentalConnector):
    name = "Denticon"

    def __init__(self, client_id: str = "", client_secret: str = "",
                 base_url: str = "https://api.denticon.com"):
        self._client_id = client_id
        self._client_secret = client_secret
        self._base_url = base_url

    def list_providers(self) -> list[Provider]:
        raise NotImplementedError(PENDING)

    def list_operatories(self) -> list[Operatory]:
        raise NotImplementedError(PENDING)

    def list_patients(self, last: str | None = None, first: str | None = None) -> list[Patient]:
        raise NotImplementedError(PENDING)

    def get_patient(self, pms_ref: str) -> Patient:
        raise NotImplementedError(PENDING)

    def create_patient(self, data: PatientCreate) -> Patient:
        raise NotImplementedError(PENDING)

    def list_appointments(self, date_start: str, date_end: str) -> list[Appointment]:
        raise NotImplementedError(PENDING)

    def get_open_slots(self, date_start: str, date_end: str, minutes: int = 60) -> list[Slot]:
        raise NotImplementedError(PENDING)

    def book_appointment(self, data: AppointmentCreate) -> Appointment:
        raise NotImplementedError(PENDING)

    def upload_document(self, patient_pms_ref: str, pdf: bytes, description: str) -> Document:
        raise NotImplementedError(PENDING)
