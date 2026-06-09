from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, Header, HTTPException

from . import store
from .entitlements import entitlements_for
from .models import Account, LoginRequest, User

router = APIRouter()

SEED_TOKEN = "pb_demo_token"


def ensure_seed_token() -> None:
    user = store.get_user_by_email("dana@brightsmile.co")
    if user:
        store.store_token(SEED_TOKEN, user.id)


def _account_envelope(account: Account | None) -> dict | None:
    if account is None:
        return None
    return {"id": account.id, "name": account.name, "plan": account.plan,
            "location_count": account.location_count}


@router.post("/v1/auth/login")
def login(data: LoginRequest):
    user = store.verify_credentials(data.email, data.password)
    if not user:
        raise HTTPException(401, "invalid credentials")
    token = f"pb_{secrets.token_urlsafe(24)}"
    store.store_token(token, user.id)
    account = store.account_for_user(user.id)
    return {
        "token": token,
        "user": user,
        "account": _account_envelope(account),
        "entitlements": entitlements_for(account) if account else None,
    }


def current_user(authorization: str | None = Header(default=None)) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    user = store.user_for_token(token)
    if not user:
        raise HTTPException(401, "invalid token")
    return user


def optional_user(authorization: str | None = Header(default=None)) -> User | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    return store.user_for_token(token)


def require_role(*roles: str):
    def dependency(user: User = Depends(current_user)) -> User:
        if roles:
            current = (user.role or "").lower()
            if not any(role.lower() in current for role in roles):
                raise HTTPException(403, "insufficient role")
        return user

    return dependency
