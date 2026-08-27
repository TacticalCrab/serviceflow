"""Upsert 40 fake service requests into the cafe-service SQLite database."""

import argparse
import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path


DEFAULT_DB = Path(os.environ.get("APPDATA", ".")) / "com.pkale.cafe-service" / "cafe-service.sqlite3"
STATUSES = ["waiting_for_device", "diagnosis", "waiting_for_approval", "in_repair",
            "waiting_for_parts", "ready_for_return", "closed", "cancelled"]
NAMES = ["Anna", "Jan", "Maria", "Piotr", "Katarzyna", "Tomasz", "Ewa", "Marek"]
DEVICES = ["Ekspres do kawy", "Młynek", "Spieniacz do mleka", "Czajnik"]


def record(index: int) -> tuple:
    created_at = (datetime.now(timezone.utc) - timedelta(days=index)).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    payload = {
        "requestedCreatedAt": created_at,
        "client": {
            "name": NAMES[index % len(NAMES)], "surname": f"Testowy {index + 1:02}",
            "phone": f"500{index + 1:06}", "email": f"test{index + 1:02}@example.com",
            "note": "FAKE TEST DATA",
        },
        "device": {
            "name": DEVICES[index % len(DEVICES)], "manufacturer": "Test Coffee",
            "model": f"Model-{index + 1:02}", "serialNumber": f"TEST-{index + 1:04}",
            "defect": "Dane testowe — urządzenie nie działa poprawnie",
        },
        "repairTime": "2 dni", "repairSteps": ["Diagnostyka", "Czyszczenie"],
        "additionalCosts": [], "costEstimate": 80 + index * 10, "note": "FAKE TEST DATA",
    }
    return (900001 + index, payload["client"]["name"], payload["client"]["phone"],
            payload["device"]["name"], STATUSES[index % len(STATUSES)],
            json.dumps(payload, ensure_ascii=False), created_at, created_at)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=DEFAULT_DB, help=f"SQLite path (default: {DEFAULT_DB})")
    args = parser.parse_args()
    if not args.database.exists():
        raise SystemExit(f"Database not found: {args.database}\nStart the app once or pass --database PATH.")

    with sqlite3.connect(args.database, timeout=10) as connection:
        connection.executemany("""
            INSERT INTO service_requests
                (id, client_name, client_phone, device_name, status, payload, created_at, status_changed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                client_name=excluded.client_name, client_phone=excluded.client_phone,
                device_name=excluded.device_name, status=excluded.status, payload=excluded.payload,
                created_at=excluded.created_at, status_changed_at=excluded.status_changed_at
        """, [record(index) for index in range(40)])
    print(f"Upserted 40 fake records into {args.database}")


if __name__ == "__main__":
    main()
