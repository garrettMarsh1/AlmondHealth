from __future__ import annotations

import base64

import httpx

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


class OpenDentalConnector(DentalConnector):
    name = "Open Dental"

    def __init__(self, base_url: str, dev_key: str, customer_key: str, timeout: float = 30.0):
        self._client = httpx.Client(
            base_url=base_url,
            timeout=timeout,
            headers={
                "Authorization": f"ODFHIR {dev_key}/{customer_key}",
                "Content-Type": "application/json",
            },
        )

    def _get(self, path: str, params: dict | None = None):
        r = self._client.get(path, params=params)
        r.raise_for_status()
        return r.json()

    def _post(self, path: str, body: dict):
        r = self._client.post(path, json=body)
        r.raise_for_status()
        return r.json()

    def list_providers(self) -> list[Provider]:
        return [
            Provider(id=str(p["ProvNum"]), abbr=p.get("Abbr"),
                     name=f'{p.get("FName", "")} {p.get("LName", "")}'.strip())
            for p in self._get("/providers")
        ]

    def list_operatories(self) -> list[Operatory]:
        return [Operatory(id=str(o["OperatoryNum"]), name=o.get("OpName") or o.get("Abbr"))
                for o in self._get("/operatories")]

    def list_patients(self, last: str | None = None, first: str | None = None) -> list[Patient]:
        params = {}
        if last:
            params["LName"] = last
        if first:
            params["FName"] = first
        return [self._to_patient(p) for p in self._get("/patients", params=params)]

    def get_patient(self, pms_ref: str) -> Patient:
        return self._to_patient(self._get(f"/patients/{pms_ref}"))

    def create_patient(self, data: PatientCreate) -> Patient:
        body: dict = {"LName": data.last, "FName": data.first}
        if data.dob:
            body["Birthdate"] = data.dob.isoformat()
        if data.gender:
            body["Gender"] = data.gender
        if data.phone:
            body["WirelessPhone"] = data.phone
        if data.email:
            body["Email"] = data.email
        return self._to_patient(self._post("/patients", body))

    def list_appointments(self, date_start: str, date_end: str) -> list[Appointment]:
        rows = self._get("/appointments", params={"dateStart": date_start, "dateEnd": date_end})
        return [self._to_appt(a) for a in rows]

    def get_open_slots(self, date_start: str, date_end: str, minutes: int = 60) -> list[Slot]:
        rows = self._get("/appointments/Slots",
                         params={"dateStart": date_start, "dateEnd": date_end, "lengthMinutes": minutes})
        out = []
        for s in rows:
            start = s.get("DateTimeStart") or s.get("dateTimeStart")
            if not start:
                continue
            out.append(Slot(start=start, end=s.get("DateTimeEnd"),
                            provider_id=str(s.get("ProvNum")) if s.get("ProvNum") else None,
                            operatory_id=str(s.get("OpNum")) if s.get("OpNum") else None))
        return out

    def book_appointment(self, data: AppointmentCreate) -> Appointment:
        body: dict = {
            "PatNum": int(data.patient_id),
            "Op": int(data.operatory_id),
            "AptDateTime": data.start.strftime("%Y-%m-%d %H:%M:%S"),
            "Pattern": "//XXXX//",
        }
        if data.provider_id:
            body["ProvNum"] = int(data.provider_id)
        return self._to_appt(self._post("/appointments", body))

    def upload_document(self, patient_pms_ref: str, pdf: bytes, description: str) -> Document:
        body = {
            "PatNum": int(patient_pms_ref),
            "rawBase64": base64.b64encode(pdf).decode(),
            "extension": ".pdf",
            "Description": description,
            "ImgType": "Document",
        }
        d = self._post("/documents/Upload", body)
        return Document(id=str(d.get("DocNum")), patient_id=patient_pms_ref,
                        description=d.get("Description"), type="Document")

    def _to_patient(self, p: dict) -> Patient:
        dob = p.get("Birthdate")
        return Patient(
            id=str(p["PatNum"]),
            first=p.get("FName", ""),
            last=p.get("LName", ""),
            dob=(dob if dob and dob != "0001-01-01" else None),
            gender=p.get("Gender"),
            phone=p.get("WirelessPhone") or p.get("HmPhone") or None,
            email=p.get("Email") or None,
        )

    def _to_appt(self, a: dict) -> Appointment:
        return Appointment(
            id=str(a["AptNum"]),
            patient_id=str(a["PatNum"]),
            start=a["AptDateTime"],
            operatory_id=str(a.get("Op")) if a.get("Op") else None,
            provider_id=str(a.get("ProvNum")) if a.get("ProvNum") else None,
            status=a.get("AptStatus"),
            reason=a.get("ProcDescript") or None,
        )
