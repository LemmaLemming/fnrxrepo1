from __future__ import annotations

import csv
import json
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: python3 scripts/convert_planw_csv_to_json.py <input.csv> <output.json>")
        return 1

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    if not input_path.exists():
        print(f"missing input file: {input_path}")
        return 1

    rows = []

    with input_path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            din = (row.get("DIN/NPN") or "").strip()
            if len(din) != 8 or not din.isdigit():
                continue

            rows.append(
                {
                    "chemicalName": (row.get("Chemical name") or "").strip(),
                    "brandName": (row.get("Brand name (from Health Canada)") or "").strip(),
                    "strength": (row.get("Strength") or "").strip(),
                    "dosageForm": (row.get("Dosage form") or "").strip(),
                    "din": din,
                    "manufacturer": " ".join((row.get("Manufacturer") or "").split()),
                }
            )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as json_file:
        json.dump(rows, json_file, ensure_ascii=True, indent=2)
        json_file.write("\n")

    print(f"wrote {len(rows)} DIN rows to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
