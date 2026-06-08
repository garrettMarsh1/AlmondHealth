from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import store
from ..models import FormField, FormTemplateCreate

router = APIRouter()


class FormTemplateUpdate(BaseModel):
    name: str | None = None
    fields: list[FormField] | None = None
    category: str | None = None


@router.get("/v1/forms/templates/{template_id}")
def get_template(template_id: str):
    template = store.get_template(template_id)
    if not template:
        raise HTTPException(404, "template not found")
    return template


@router.post("/v1/forms/templates")
def create_template(data: FormTemplateCreate):
    fields = [field.model_dump() for field in data.fields]
    return store.create_template(data.name, fields, category=data.category)


@router.put("/v1/forms/templates/{template_id}")
def update_template(template_id: str, data: FormTemplateUpdate):
    fields = [field.model_dump() for field in data.fields] if data.fields is not None else None
    template = store.update_template(template_id, name=data.name, fields=fields,
                                     category=data.category)
    if not template:
        raise HTTPException(404, "template not found")
    return template
