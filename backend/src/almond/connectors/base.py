from __future__ import annotations

from abc import ABC, abstractmethod

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


class DentalConnector(ABC):
    name: str = "base"

    @abstractmethod
    def list_providers(self) -> list[Provider]: ...

    @abstractmethod
    def list_operatories(self) -> list[Operatory]: ...

    @abstractmethod
    def list_patients(self, last: str | None = None, first: str | None = None) -> list[Patient]: ...

    @abstractmethod
    def get_patient(self, pms_ref: str) -> Patient: ...

    @abstractmethod
    def create_patient(self, data: PatientCreate) -> Patient: ...

    @abstractmethod
    def list_appointments(self, date_start: str, date_end: str) -> list[Appointment]: ...

    @abstractmethod
    def get_open_slots(self, date_start: str, date_end: str, minutes: int = 60) -> list[Slot]: ...

    @abstractmethod
    def book_appointment(self, data: AppointmentCreate) -> Appointment: ...

    @abstractmethod
    def upload_document(self, patient_pms_ref: str, pdf: bytes, description: str) -> Document: ...
