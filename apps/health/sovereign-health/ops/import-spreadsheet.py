#!/usr/bin/env python3
"""
Sovereign Health Intelligence — Spreadsheet Measurement Import

Imports health measurement data from ODS/XLSX/CSV files into the
Sovereign Health API. Supports device assignment, protocol tagging,
diet protocols, and deduplication.

Usage:
  python3 import-spreadsheet.py <file> --email <email> --password <password>
  python3 import-spreadsheet.py <file> --email <email> --password <password> --api https://api.sovereignhealth.io
  python3 import-spreadsheet.py <file> --email <email> --password <password> --dry-run
  python3 import-spreadsheet.py <file> --email <email> --password <password> --api https://api-demo.sovereignhealth.io

Arguments:
  file          Path to ODS, XLSX, or CSV file
  --email       User email for authentication
  --password    User password
  --api         API base URL (default: https://api.sovereignhealth.io)
  --dry-run     Parse and validate only, don't upload
  --sheet       Sheet name for ODS/XLSX (default: first sheet)
  --config      Path to column mapping JSON (default: auto-detect)

Column Mapping Config (JSON):
  {
    "date_col": 0,
    "time_col": 1,
    "diet_col": 2,
    "measurement_type_col": 3,
    "notes_col": 4,
    "header_row": 1,
    "data_start_row": 2,
    "markers": {
      "5": { "slug": "weight", "unit": "kg", "device": "Qardio Base" },
      "6": { "slug": "bp_systolic", "unit": "mmHg", "device": "Qardio Arm" }
    },
    "protocols": {
      "Nüchtern": { "protocol_tag": "fasting" },
      "2h nach Essen": { "protocol_tag": "standard", "meal_timing": "2h_after" }
    },
    "diets": {
      "Sardinen 72h": { "diet_protocol": "carnivore", "fasting_protocol": "72h" },
      "Laufende Messung": { "diet_protocol": "carnivore" }
    }
  }
"""

import argparse
import csv
import json
import os
import subprocess
import sys
import tempfile
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

# ─── Default column mapping for the Sovereign Health spreadsheet format ────────

DEFAULT_CONFIG = {
    "date_col": 0,
    "time_col": 1,
    "diet_col": 2,
    "measurement_type_col": 3,
    "notes_col": 4,
    "header_row": 1,
    "data_start_row": 2,
    "markers": {
        "5": {"slug": "weight", "unit": "kg", "device": "Qardio Base"},
        "6": {"slug": "bp_systolic", "unit": "mmHg", "device": "Qardio Arm"},
        "7": {"slug": "bp_diastolic", "unit": "mmHg", "device": "Qardio Arm"},
        "8": {"slug": "heart_rate", "unit": "bpm", "device": "Qardio Arm"},
        "9": {"slug": "glucose", "unit": "mmol/L", "device": "Fora 6"},
        "10": {"slug": "hematocrit", "unit": "%", "device": "Fora 6"},
        "11": {"slug": "hemoglobin", "unit": "mmol/L", "device": "Fora 6"},
        "12": {"slug": "ketones", "unit": "mmol/L", "device": "Fora 6"},
        "13": {"slug": "total_cholesterol", "unit": "mmol/L", "device": "Fora 6"},
        "14": {"slug": "uric_acid", "unit": "µmol/L", "device": "Fora 6"},
    },
    "protocols": {
        "Nüchtern": {"protocol_tag": "fasting"},
        "2h nach Essen": {"protocol_tag": "standard", "meal_timing": "2h_after"},
        "Abendmessung": {"protocol_tag": "standard"},
    },
    "diets": {
        "Sardinen 72h": {"diet_protocol": "carnivore", "fasting_protocol": "72h"},
        "Sardinen 96h": {"diet_protocol": "carnivore", "fasting_protocol": "extended"},
        "Laufende Messung": {"diet_protocol": "carnivore"},
    },
}


# ─── File conversion ──────────────────────────────────────────────────────────

def to_csv(filepath: str, sheet: str | None = None) -> str:
    """Convert ODS/XLSX to CSV using LibreOffice headless. Returns CSV path."""
    ext = Path(filepath).suffix.lower()
    if ext == ".csv":
        return filepath

    tmpdir = tempfile.mkdtemp()
    cmd = f'libreoffice --headless --convert-to "csv:Text - txt - csv (StarCalc):44,34,76,1,,0,false,true,false,false,false,-1" "{filepath}" --outdir "{tmpdir}"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        raise RuntimeError(f"LibreOffice conversion failed: {result.stderr}")

    # Find the output CSV (may have sheet suffix)
    csvs = list(Path(tmpdir).glob("*.csv"))
    if not csvs:
        raise RuntimeError("No CSV output from LibreOffice conversion")

    # If sheet specified, look for it
    if sheet:
        for c in csvs:
            if sheet.lower() in c.stem.lower():
                return str(c)

    # Return first/largest CSV
    return str(max(csvs, key=lambda p: p.stat().st_size))


# ─── CSV parsing ──────────────────────────────────────────────────────────────

def parse_csv(filepath: str, config: dict) -> list[dict]:
    """Parse CSV into measurement records."""
    measurements = []

    with open(filepath, "r", encoding="utf-8") as f:
        reader = list(csv.reader(f))

    data_start = config["data_start_row"]
    date_col = config["date_col"]
    time_col = config["time_col"]
    diet_col = config["diet_col"]
    mtype_col = config["measurement_type_col"]
    notes_col = config["notes_col"]
    marker_map = config["markers"]
    protocol_map = config["protocols"]
    diet_map = config["diets"]

    for row_idx, row in enumerate(reader):
        if row_idx < data_start:
            continue

        # Skip empty rows
        date_str = row[date_col].strip().strip('"') if date_col < len(row) else ""
        if not date_str:
            continue

        # Parse date + time
        time_str = row[time_col].strip().strip('"') if time_col < len(row) else "06:00:00"
        dt = parse_datetime(date_str, time_str)
        if not dt:
            continue

        # Diet / measurement type / notes
        diet = row[diet_col].strip().strip('"') if diet_col < len(row) else ""
        mtype = row[mtype_col].strip().strip('"') if mtype_col < len(row) else ""
        notes = row[notes_col].strip().strip('"') if notes_col < len(row) else ""

        # Protocol mapping
        proto = protocol_map.get(mtype, {"protocol_tag": "standard"})
        protocol_tag = proto.get("protocol_tag", "standard")
        meal_timing = proto.get("meal_timing")

        # Diet mapping
        diet_info = diet_map.get(diet, {})
        diet_protocol = diet_info.get("diet_protocol")
        fasting_protocol = diet_info.get("fasting_protocol")

        # Parse marker values grouped by device
        device_groups: dict[str | None, list[dict]] = {}

        for col_str, marker_def in marker_map.items():
            col_idx = int(col_str)
            if col_idx >= len(row):
                continue

            val_str = row[col_idx].strip().strip('"').replace(",", ".")
            if not val_str or val_str == "-" or val_str == "0":
                continue

            try:
                value = float(val_str)
            except ValueError:
                continue

            device_name = marker_def.get("device")
            if device_name not in device_groups:
                device_groups[device_name] = []
            device_groups[device_name].append({
                "marker_slug": marker_def["slug"],
                "value": value,
            })

        # Create one measurement per device group
        note_text = f"{mtype}: {notes}" if notes and notes != "0" and notes != "-" else mtype
        if not note_text or note_text == "-":
            note_text = None

        for device_name, values in device_groups.items():
            measurements.append({
                "measured_at": dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "protocol_tag": protocol_tag,
                "fasting_protocol": fasting_protocol,
                "diet_protocol": diet_protocol,
                "meal_timing_tag": meal_timing,
                "lifestyle_note": note_text[:300] if note_text else None,
                "device_name": device_name,
                "values": values,
            })

    return measurements


def parse_datetime(date_str: str, time_str: str) -> datetime | None:
    """Parse various date/time formats."""
    # Normalize time
    time_str = time_str.replace(" AM", "").replace(" PM", "").strip()
    if "PM" in time_str.upper() and not time_str.startswith("12"):
        parts = time_str.upper().replace("PM", "").strip().split(":")
        parts[0] = str(int(parts[0]) + 12)
        time_str = ":".join(parts)

    for date_fmt in ["%d.%m.%Y", "%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y"]:
        for time_fmt in ["%H:%M:%S", "%H:%M"]:
            try:
                return datetime.strptime(f"{date_str} {time_str}", f"{date_fmt} {time_fmt}")
            except ValueError:
                continue
    return None


# ─── API client ───────────────────────────────────────────────────────────────

class HealthAPI:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.token = None

    def login(self, email: str, password: str):
        data = json.dumps({"email": email, "password": password}).encode()
        req = urllib.request.Request(
            f"{self.base_url}/auth/login",
            data=data,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())

        if result.get("error"):
            raise RuntimeError(f"Login failed: {result['error']}")

        self.token = result["data"]["token"]
        user = result["data"]["user"]
        print(f"  Logged in as {user['email']} ({user['display_name']}, {user['tier']})")

    def get_devices(self) -> list[dict]:
        return self._get("/devices")["data"]

    def create_measurement(self, payload: dict) -> dict:
        return self._post("/measurements", payload)

    def _get(self, path: str) -> dict:
        req = urllib.request.Request(
            f"{self.base_url}{path}",
            headers={"Authorization": f"Bearer {self.token}"},
        )
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())

    def _post(self, path: str, data: dict) -> dict:
        encoded = json.dumps(data).encode()
        req = urllib.request.Request(
            f"{self.base_url}{path}",
            data=encoded,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}",
            },
        )
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())


# ─── Upload logic ─────────────────────────────────────────────────────────────

def resolve_device_ids(api: HealthAPI, measurements: list[dict]) -> dict[str, str]:
    """Fetch user's devices and map device names to IDs."""
    devices = api.get_devices()
    name_to_id = {}
    for d in devices:
        name_to_id[d["device_name"]] = d["id"]

    # Check which device names we need
    needed = set(m["device_name"] for m in measurements if m.get("device_name"))
    found = {}
    missing = []

    for name in needed:
        # Fuzzy match: check if device name contains our name or vice versa
        matched = None
        for dev_name, dev_id in name_to_id.items():
            if name.lower() in dev_name.lower() or dev_name.lower() in name.lower():
                matched = (dev_name, dev_id)
                break

        if matched:
            found[name] = matched[1]
            print(f"  Device '{name}' → {matched[0]} ({matched[1][:8]}...)")
        else:
            missing.append(name)

    if missing:
        print(f"\n  WARNING: Devices not found: {missing}")
        print(f"  Available devices: {list(name_to_id.keys())}")
        print(f"  Measurements for missing devices will be uploaded without device_id.")

    return found


def upload_measurements(api: HealthAPI, measurements: list[dict], device_map: dict[str, str]):
    """Upload all measurements to the API."""
    success = 0
    failed = 0
    skipped = 0

    for i, m in enumerate(measurements):
        # Build API payload
        payload = {
            "measured_at": m["measured_at"],
            "values": m["values"],
            "protocol_tag": m.get("protocol_tag", "standard"),
        }

        # Optional fields
        for field in ["fasting_protocol", "diet_protocol", "meal_timing_tag", "lifestyle_note"]:
            if m.get(field):
                payload[field] = m[field]

        # Device ID
        device_name = m.get("device_name")
        if device_name and device_name in device_map:
            payload["device_id"] = device_map[device_name]

        # Upload
        try:
            api.create_measurement(payload)
            success += 1
            date = m["measured_at"][:16]
            markers = len(m["values"])
            device = device_name or "manual"
            print(f"  [{i+1:3d}/{len(measurements)}] OK  {date} [{device}] {markers} markers")
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            failed += 1
            date = m["measured_at"][:16]
            # Check for duplicate
            if "already exists" in body.lower() or "duplicate" in body.lower():
                skipped += 1
                failed -= 1
                print(f"  [{i+1:3d}/{len(measurements)}] SKIP {date} (duplicate)")
            else:
                print(f"  [{i+1:3d}/{len(measurements)}] ERR  {date} — {e.code}: {body[:120]}")

    return success, failed, skipped


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Import spreadsheet health data into Sovereign Health")
    parser.add_argument("file", help="Path to ODS, XLSX, or CSV file")
    parser.add_argument("--email", required=True, help="User email")
    parser.add_argument("--password", required=True, help="User password")
    parser.add_argument("--api", default="https://api.sovereignhealth.io", help="API base URL")
    parser.add_argument("--dry-run", action="store_true", help="Parse only, don't upload")
    parser.add_argument("--sheet", default=None, help="Sheet name for ODS/XLSX")
    parser.add_argument("--config", default=None, help="Path to column mapping JSON")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  Sovereign Health — Spreadsheet Import")
    print(f"{'='*60}")
    print(f"  File:   {args.file}")
    print(f"  API:    {args.api}")
    print(f"  Mode:   {'DRY RUN' if args.dry_run else 'LIVE UPLOAD'}")
    print()

    # Load config
    if args.config:
        with open(args.config) as f:
            config = json.load(f)
    else:
        config = DEFAULT_CONFIG

    # Convert to CSV if needed
    print("Step 1: Converting file...")
    csv_path = to_csv(args.file, args.sheet)
    print(f"  CSV: {csv_path}")

    # Parse
    print("\nStep 2: Parsing measurements...")
    measurements = parse_csv(csv_path, config)
    print(f"  Parsed {len(measurements)} measurement records")

    if not measurements:
        print("  No data found. Check your column mapping.")
        sys.exit(1)

    # Summary
    devices = {}
    markers_seen = set()
    for m in measurements:
        d = m.get("device_name", "manual")
        devices[d] = devices.get(d, 0) + 1
        for v in m["values"]:
            markers_seen.add(v["marker_slug"])

    dates = [m["measured_at"][:10] for m in measurements]
    print(f"  Date range: {min(dates)} to {max(dates)}")
    print(f"  Markers: {', '.join(sorted(markers_seen))}")
    print(f"  By device:")
    for d, count in sorted(devices.items()):
        print(f"    {d}: {count} records")

    if args.dry_run:
        print("\n  DRY RUN — no data uploaded.")
        print("\nSample payloads:")
        for m in measurements[:3]:
            print(json.dumps(m, indent=2, ensure_ascii=False))
        sys.exit(0)

    # Login
    print("\nStep 3: Authenticating...")
    api = HealthAPI(args.api)
    api.login(args.email, args.password)

    # Resolve devices
    print("\nStep 4: Resolving devices...")
    device_map = resolve_device_ids(api, measurements)

    # Upload
    print(f"\nStep 5: Uploading {len(measurements)} measurements...\n")
    success, failed, skipped = upload_measurements(api, measurements, device_map)

    print(f"\n{'='*60}")
    print(f"  Results: {success} uploaded, {skipped} skipped (duplicates), {failed} failed")
    print(f"{'='*60}\n")

    sys.exit(1 if failed > 0 else 0)


if __name__ == "__main__":
    main()
