"""Private Vercel Python function for the Garmin Connect bridge."""

from __future__ import annotations

import hmac
import json
import os
from http.server import BaseHTTPRequestHandler
from typing import Any

from scripts.garmin_bridge import classify_error, login, registry_drift, sanitize_error, sync, to_jsonable


class handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:
        expected = os.environ.get("GARMIN_BRIDGE_SHARED_SECRET", "")
        provided = self.headers.get("Authorization", "").removeprefix("Bearer ")
        if not expected or not hmac.compare_digest(provided, expected):
            self._respond(401, {"ok": False, "errorCode": "unauthorized", "message": "Garmin Bridge ist nicht autorisiert."})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            request = json.loads(self.rfile.read(length) or b"{}")
            command = request.get("command")
            payload = request.get("payload") if isinstance(request.get("payload"), dict) else {}
            if command == "login":
                result = login(payload)
            elif command == "sync":
                result = sync(payload)
            elif command == "registry-drift":
                result = registry_drift()
            else:
                self._respond(400, {"ok": False, "errorCode": "unknown_command", "message": "Unbekanntes Garmin-Kommando."})
                return
            self._respond(200, to_jsonable(result))
        except Exception as exc:  # noqa: BLE001 - HTTP boundary
            self._respond(200, {
                "ok": False,
                "errorCode": classify_error(exc),
                "message": sanitize_error(str(exc)),
            })

    def log_message(self, format: str, *args: Any) -> None:
        # Request bodies can contain credentials or session material.
        return

    def _respond(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

