#!/usr/bin/env python3
"""Isolated Garmin Connect bridge.

This module is intentionally the only place that imports python-garminconnect.
It reads JSON from stdin and writes JSON to stdout. Secrets must not be logged.
"""

from __future__ import annotations

import base64
import inspect
import json
import os
import shutil
import sys
import tempfile
import traceback
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Callable

BLOCKED_PREFIXES = (
    "create",
    "add",
    "set",
    "update",
    "edit",
    "delete",
    "remove",
    "upload",
    "import",
    "schedule",
    "unschedule",
    "accept",
    "decline",
    "join",
    "leave",
)

READ_REGISTRY = [
    {"endpointKey": "profile_full_name", "dataDomain": "profile", "methodName": "get_full_name", "parameterStrategy": "none"},
    {"endpointKey": "devices", "dataDomain": "devices", "methodName": "get_devices", "parameterStrategy": "none"},
    {"endpointKey": "daily_stats", "dataDomain": "daily_health", "methodName": "get_stats", "parameterStrategy": "date"},
    {"endpointKey": "sleep", "dataDomain": "sleep", "methodName": "get_sleep_data", "parameterStrategy": "date"},
    {"endpointKey": "hrv", "dataDomain": "hrv", "methodName": "get_hrv_data", "parameterStrategy": "date"},
    {"endpointKey": "stress", "dataDomain": "stress", "methodName": "get_stress_data", "parameterStrategy": "date"},
    {"endpointKey": "body_battery", "dataDomain": "body_battery", "methodName": "get_body_battery", "parameterStrategy": "date"},
    {"endpointKey": "heart_rates", "dataDomain": "heart_rate", "methodName": "get_heart_rates", "parameterStrategy": "date"},
    {"endpointKey": "respiration", "dataDomain": "respiration", "methodName": "get_respiration_data", "parameterStrategy": "date"},
    {"endpointKey": "spo2", "dataDomain": "spo2", "methodName": "get_spo2_data", "parameterStrategy": "date"},
    {"endpointKey": "intensity_minutes", "dataDomain": "intensity_minutes", "methodName": "get_intensity_minutes_data", "parameterStrategy": "date"},
    {"endpointKey": "activities_by_date", "dataDomain": "activities", "methodName": "get_activities_by_date", "parameterStrategy": "date_range"},
    {"endpointKey": "training_readiness", "dataDomain": "training_readiness", "methodName": "get_training_readiness", "parameterStrategy": "date"},
    {"endpointKey": "training_status", "dataDomain": "training_status", "methodName": "get_training_status", "parameterStrategy": "date"},
]


def main() -> None:
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    payload = json.loads(sys.stdin.read() or "{}")

    try:
      if command == "login":
          write_json(login(payload))
      elif command == "sync":
          write_json(sync(payload))
      elif command == "registry-drift":
          write_json(registry_drift())
      else:
          write_json({"ok": False, "errorCode": "unknown_command", "message": "Unbekanntes Garmin-Kommando."})
    except Exception as exc:  # noqa: BLE001 - bridge boundary
        write_json({
            "ok": False,
            "errorCode": classify_error(exc),
            "message": sanitize_error(str(exc)),
            "trace": traceback.format_exc(limit=2) if os.environ.get("GARMIN_DEBUG") == "1" else None,
        })


def login(payload: dict[str, Any]) -> dict[str, Any]:
    email = payload.get("email")
    password = payload.get("password")
    mfa_code = payload.get("mfaCode")

    if not email or not password:
        return {"ok": False, "errorCode": "missing_credentials", "message": "Garmin-E-Mail oder Passwort fehlt."}

    Garmin = import_garmin()
    token_payload: dict[str, str]

    with tempfile.TemporaryDirectory(prefix="garmin-session-") as token_dir:
        api = create_login_client(Garmin, email, password, mfa_code)
        call_fresh_login(api, token_dir)
        token_payload = dump_tokenstore(Path(token_dir))
        profile = read_optional_profile(api)

    return {
        "ok": True,
        "status": "CONNECTED",
        "tokenPayload": token_payload,
        "profile": profile,
    }


def sync(payload: dict[str, Any]) -> dict[str, Any]:
    token_payload = payload.get("tokenPayload")
    if not isinstance(token_payload, dict):
        return {"ok": False, "errorCode": "missing_token_payload", "message": "Garmin-Session fehlt."}

    start_date = parse_date(payload.get("startDate")) or (date.today() - timedelta(days=3))
    end_date = parse_date(payload.get("endDate")) or date.today()
    max_days = int(payload.get("maxDays") or 7)
    selected_registry = payload.get("registry") if isinstance(payload.get("registry"), list) else READ_REGISTRY

    Garmin = import_garmin()

    with tempfile.TemporaryDirectory(prefix="garmin-session-") as token_dir:
        restore_tokenstore(Path(token_dir), token_payload)
        api = Garmin()
        call_token_login(api, token_dir)
        records: list[dict[str, Any]] = []
        errors: list[dict[str, Any]] = []

        for definition in selected_registry:
            if not is_allowed_definition(definition):
                errors.append(endpoint_error(definition, "blocked_method", "Methode ist nicht in der Read-Allowlist erlaubt."))
                continue

            method_name = definition["methodName"]
            method = getattr(api, method_name, None)
            if not callable(method):
                errors.append(endpoint_error(definition, "method_unavailable", "Methode ist in dieser garminconnect-Version nicht verfügbar."))
                continue

            try:
                strategy = definition["parameterStrategy"]
                if strategy == "none":
                    records.append(record(definition, None, None, call_method(method)))
                elif strategy == "date":
                    for current in iter_days(start_date, min(end_date, start_date + timedelta(days=max_days - 1))):
                        records.append(record(definition, current, current, call_method(method, current.isoformat())))
                elif strategy == "date_range":
                    records.append(record(definition, start_date, end_date, call_method(method, start_date.isoformat(), end_date.isoformat())))
                else:
                    errors.append(endpoint_error(definition, "unknown_parameter_strategy", "Unbekannte Parameterstrategie."))
            except Exception as exc:  # noqa: BLE001 - provider endpoints are best effort
                errors.append(endpoint_error(definition, classify_error(exc), sanitize_error(str(exc))))

    return {
        "ok": True,
        "records": records,
        "errors": errors,
        "fetchedAt": datetime.utcnow().isoformat() + "Z",
    }


def registry_drift() -> dict[str, Any]:
    Garmin = import_garmin()
    public_methods = sorted(
        name for name, member in inspect.getmembers(Garmin, predicate=callable)
        if not name.startswith("_")
    )
    classified = {item["methodName"] for item in READ_REGISTRY}
    dangerous = [name for name in public_methods if name.lower().startswith(BLOCKED_PREFIXES)]
    unclassified_read_candidates = [
        name for name in public_methods
        if name not in classified and not name.lower().startswith(BLOCKED_PREFIXES)
    ]

    return {
        "ok": True,
        "publicMethods": public_methods,
        "classifiedMethods": sorted(classified),
        "dangerousMethods": dangerous,
        "unclassifiedReadCandidates": unclassified_read_candidates,
    }


def import_garmin() -> Any:
    try:
        from garminconnect import Garmin  # type: ignore
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("python-garminconnect ist nicht installiert oder nicht importierbar.") from exc

    return Garmin


def create_login_client(Garmin: Any, email: str, password: str, mfa_code: str | None) -> Any:
    def prompt_mfa() -> str:
        if not mfa_code:
            raise RuntimeError("MFA_REQUIRED")
        return str(mfa_code).strip()

    try:
        return Garmin(email, password, prompt_mfa=prompt_mfa)
    except TypeError:
        return Garmin(email, password)


def call_fresh_login(api: Any, token_dir: str) -> None:
    """Authenticate with credentials, then persist the newly issued session."""
    try:
        result = api.login()
    except TypeError:
        result = api.login(None)
    if isinstance(result, tuple) and result[0]:
        raise RuntimeError("MFA_REQUIRED")
    dump_api_tokenstore(api, token_dir)


def call_token_login(api: Any, token_dir: str) -> None:
    """Restore an existing session without falling back to credentials."""
    try:
        api.login(token_dir)
        return
    except TypeError:
        pass

    load = getattr(getattr(api, "garth", None), "load", None)
    if not callable(load):
        load = getattr(getattr(api, "client", None), "load", None)
    if not callable(load):
        raise RuntimeError("Garmin-Session kann mit dieser Bibliotheksversion nicht geladen werden.")
    load(token_dir)
    api.login()


def dump_api_tokenstore(api: Any, token_dir: str) -> None:
    dump = getattr(getattr(api, "client", None), "dump", None)
    if not callable(dump):
        dump = getattr(getattr(api, "garth", None), "dump", None)
    if callable(dump):
        dump(token_dir)
        return

    dump = getattr(api, "dump", None)
    if callable(dump):
        dump(token_dir)
        return
    raise RuntimeError("Garmin-Session kann mit dieser Bibliotheksversion nicht exportiert werden.")


def dump_tokenstore(path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for file_path in path.rglob("*"):
        if file_path.is_file():
            result[str(file_path.relative_to(path))] = base64.b64encode(file_path.read_bytes()).decode("ascii")
    if not result:
        raise RuntimeError("Garmin-Session konnte nicht exportiert werden.")
    return result


def restore_tokenstore(path: Path, token_payload: dict[str, str]) -> None:
    path.mkdir(parents=True, exist_ok=True)
    for relative, encoded in token_payload.items():
        target = path / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(base64.b64decode(encoded))


def read_optional_profile(api: Any) -> dict[str, Any]:
    profile: dict[str, Any] = {}
    for key, method_name in (("displayName", "get_full_name"), ("unitSystem", "get_unit_system")):
        method = getattr(api, method_name, None)
        if callable(method):
            try:
                profile[key] = method()
            except Exception:  # noqa: BLE001
                profile[key] = None
    return profile


def call_method(method: Callable[..., Any], *args: Any) -> Any:
    return to_jsonable(method(*args))


def record(definition: dict[str, Any], start: date | None, end: date | None, payload: Any) -> dict[str, Any]:
    return {
        "endpointKey": definition["endpointKey"],
        "dataDomain": definition["dataDomain"],
        "methodName": definition["methodName"],
        "recordDate": start.isoformat() if start and start == end else None,
        "rangeStart": start.isoformat() if start else None,
        "rangeEnd": end.isoformat() if end else None,
        "requestParameters": {"startDate": start.isoformat() if start else None, "endDate": end.isoformat() if end else None},
        "payload": payload,
    }


def endpoint_error(definition: dict[str, Any], code: str, message: str) -> dict[str, Any]:
    return {
        "endpointKey": definition.get("endpointKey"),
        "dataDomain": definition.get("dataDomain"),
        "methodName": definition.get("methodName"),
        "errorCode": code,
        "message": message,
    }


def is_allowed_definition(definition: dict[str, Any]) -> bool:
    method_name = str(definition.get("methodName") or "")
    return bool(method_name) and not method_name.lower().startswith(BLOCKED_PREFIXES)


def parse_date(value: Any) -> date | None:
    if not value:
        return None
    return date.fromisoformat(str(value)[:10])


def iter_days(start: date, end: date) -> list[date]:
    days: list[date] = []
    current = start
    while current <= end:
        days.append(current)
        current += timedelta(days=1)
    return days


def to_jsonable(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, list):
        return [to_jsonable(item) for item in value]
    if isinstance(value, tuple):
        return [to_jsonable(item) for item in value]
    if isinstance(value, dict):
        return {str(key): to_jsonable(item) for key, item in value.items()}
    return str(value)


def classify_error(exc: Exception) -> str:
    text = str(exc).lower()
    if "mfa_required" in text or "mfa" in text or "2fa" in text:
        return "mfa_required"
    if "401" in text or "unauthorized" in text or "auth" in text:
        return "reauth_required"
    if "429" in text or "rate" in text:
        return "rate_limited"
    if "timeout" in text:
        return "timeout"
    if "not found" in text or "404" in text:
        return "not_available"
    return "garmin_error"


def sanitize_error(message: str) -> str:
    if message == "MFA_REQUIRED":
        return "MFA-Code erforderlich."
    return message.replace("\n", " ")[:400]


def write_json(payload: dict[str, Any]) -> None:
    json.dump(payload, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
