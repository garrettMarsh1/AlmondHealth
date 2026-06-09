from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="ALMOND_", extra="ignore")

    od_base_url: str = "https://api.opendental.com/api/v1"
    od_dev_key: str = "NFF6i0KrXrxDkZHt"
    od_customer_key: str = "VzkmZEaUWOjnQX2z"
    request_timeout: float = 30.0
    form_doc_description: str = "Intake Form (Almond)"
    twilio_sid: str | None = None
    twilio_token: str | None = None
    twilio_from: str | None = None
    practice_name: str = "Bright Smile Dental"
    practice_location: str = "Austin, TX"
    practice_phone: str = "(512) 555-0148"
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None
    stripe_price_core: str | None = None
    stripe_price_pro: str | None = None
    stripe_price_practice_plus: str | None = None
    review_link: str = "https://g.page/r/demo-review"


settings = Settings()
