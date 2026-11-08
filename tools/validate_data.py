#!/usr/bin/env python3
"""Check that everything under data/ matches the data contract (docs/DATA_CONTRACT.md).
Run this on the output of any real pipeline before publishing:   python3 tools/validate_data.py
Exit code 0 = valid, 1 = problems found (listed)."""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / "data"
problems = []
def bad(msg): problems.append(msg)
def load(p):
    try: return json.loads((D / p).read_text())
    except Exception as e: bad(f"{p}: cannot read ({e})"); return None

meta, grid, zones = load("meta.json"), load("grid.json"), load("zones.geojson")
if not (meta and grid and zones): sys.exit("\n".join(problems))

n = grid["n"]
if meta.get("schema") != 1: bad(f"meta.schema must be 1, got {meta.get('schema')}")
for key in ("lon", "lat", "zone"):
    if len(grid[key]) != n: bad(f"grid.{key} has {len(grid[key])} entries, expected n={n}")
if any(not (0 <= z < len(grid["zones"])) for z in grid["zone"]): bad("grid.zone has an index outside grid.zones")
codes = [f["properties"]["code"] for f in zones["features"]]
if codes != grid["zones"]: bad(f"zones.geojson codes {codes} must equal grid.zones {grid['zones']} in the same order")
for i, f in enumerate(zones["features"]):
    if f["properties"]["id"] != i: bad(f"zones.geojson feature {i}: properties.id must equal its position")
    for k in ("name_en", "name_fr", "label", "n_pixels", "area_km2"):
        if k not in f["properties"]: bad(f"zones.geojson {f['properties']['code']}: missing property {k}")

dates = meta["dates"]
if not dates: bad("meta.dates is empty")
type_codes = set(meta["pixel_types"].values())
for L in meta["layers"]:
    lid = L["id"]
    for k in ("label_en", "label_fr", "updated", "source"):
        if k not in L: bad(f"layer {lid}: missing {k}")
    if L["type"] == "pixels":
        for k in ("unit", "decimals", "legend_title_en", "legend_title_fr", "tooltip_en", "tooltip_fr", "summary", "classes"):
            if k not in L: bad(f"layer {lid}: missing {k}")
        if L.get("summary") not in ("mean", "p90", "p10"): bad(f"layer {lid}: summary must be mean, p90 or p10")
        for c in L.get("classes", []):
            for k in ("id", "label_en", "label_fr", "min", "max", "color"):
                if k not in c: bad(f"layer {lid} class {c.get('id')}: missing {k}")
    for date in dates:
        path = f"layers/{lid}/{date}.json"
        day = load(path)
        if day is None: continue
        if L["type"] == "pixels":
            if len(day.get("v", [])) != n: bad(f"{path}: v has {len(day.get('v', []))} values, expected {n}")
            if len(day.get("t", [])) != n: bad(f"{path}: t has {len(day.get('t', []))} values, expected {n}")
            if any(t not in type_codes for t in day.get("t", [])): bad(f"{path}: t contains a code not in meta.pixel_types")
            if any(v is not None and not isinstance(v, (int, float)) for v in day.get("v", [])): bad(f"{path}: v must be numbers or null")
        else:
            for code in codes:
                allowed = set(meta["zone_species"].get(code, []))
                extra = set(day.get("zones", {}).get(code, {})) - allowed
                if extra: bad(f"{path}: zone {code} lists species not in meta.zone_species: {sorted(extra)}")

print("OK: data matches the contract" if not problems else "PROBLEMS:\n  - " + "\n  - ".join(problems))
sys.exit(1 if problems else 0)
